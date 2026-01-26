import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Search, Share2, ChevronsDown, ChevronsUp } from 'lucide-react'

interface StickerMetadata {
    sticker_number: number
    display_code: string
    section: string
}

interface StickerData {
    sticker_number: number
    count: number
}

export default function Album() {
    const { user } = useAuthStore()
    const { albumId } = useParams()

    // State
    const [userDistricts, setUserDistricts] = useState<Record<number, number>>({}) // Map: ID -> Count
    const [metadata, setMetadata] = useState<StickerMetadata[]>([])
    const [loading, setLoading] = useState(true)
    const [totalStickers, setTotalStickers] = useState(670)
    const [albumName, setAlbumName] = useState('')
    const [filter, setFilter] = useState<'all' | 'missing' | 'repeated' | 'completed'>('all')

    // UI State
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

    // Load initial data
    useEffect(() => {
        if (!user || !albumId) return

        const fetchData = async () => {
            setLoading(true)

            // 1. Get Album Info
            const { data: albumData } = await supabase
                .from('user_albums')
                .select('nickname, album_template_id, albums(name, total_stickers)')
                .eq('id', albumId)
                .single()

            if (albumData?.albums) {
                // @ts-ignore
                setTotalStickers(albumData.albums.total_stickers)
                // @ts-ignore
                const name = albumData.albums.name
                const nick = albumData.nickname
                setAlbumName(nick ? `${name} - ${nick}` : name)
            }

            // 2. Get Metadata (Sticker Codes & Sections)
            if (albumData?.album_template_id) {
                const { data: metaData } = await supabase
                    .from('stickers')
                    .select('sticker_number, display_code, section')
                    .eq('album_id', albumData.album_template_id)
                    .order('sticker_number', { ascending: true })

                if (metaData) setMetadata(metaData)
            }

            // 3. Get User Stickers (Ownership)
            const { data: userData, error } = await supabase
                .from('user_stickers')
                .select('sticker_number, count')
                .eq('user_id', user.id)
                .eq('user_album_id', albumId)

            if (!error && userData) {
                const stickerMap: Record<number, number> = {}
                userData.forEach((s: StickerData) => {
                    stickerMap[s.sticker_number] = s.count
                })
                setUserDistricts(stickerMap)
            }
            setLoading(false)
        }

        fetchData()
    }, [user, albumId])

    // Interactions
    const updateStickerCount = async (num: number, increment: boolean) => {
        if (!user || !albumId) return

        const currentCount = userDistricts[num] || 0
        let newCount = increment ? currentCount + 1 : currentCount - 1
        if (newCount < 0) newCount = 0

        // Optimistic
        setUserDistricts((prev) => ({ ...prev, [num]: newCount }))

        // DB
        await supabase
            .from('user_stickers')
            .upsert({
                user_id: user.id,
                user_album_id: albumId,
                sticker_number: num,
                count: newCount
            }, { onConflict: 'user_album_id, sticker_number' })
    }

    const handleLeftClick = (num: number) => updateStickerCount(num, true)
    const handleRightClick = (e: React.MouseEvent, num: number) => {
        e.preventDefault()
        updateStickerCount(num, false)
    }

    // Derived state for sections (needed for toggle all)
    const allSections = Array.from(new Set(metadata.map(s => s.section)))
    const areAllExpanded = allSections.length > 0 && allSections.every(s => expandedSections[s])

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }))
    }

    const toggleAllSections = () => {
        if (areAllExpanded) {
            setExpandedSections({})
        } else {
            const newMap: Record<string, boolean> = {}
            allSections.forEach(s => newMap[s] = true)
            setExpandedSections(newMap)
        }
    }

    const handleShareRepeated = () => {
        const repeated = Object.entries(userDistricts)
            .filter(([_, count]) => count > 1)
            .map(([num]) => num)
            .sort((a, b) => Number(a) - Number(b))

        if (repeated.length === 0) {
            alert('Você não tem figurinhas repetidas neste álbum para compartilhar.')
            return
        }

        const text = `Olha minhas repetidas do álbum ${albumName}:\n${repeated.join(', ')}`

        navigator.clipboard.writeText(text)
            .then(() => alert('Lista de repetidas copiada para a área de transferência!'))
            .catch(() => alert('Erro ao copiar.'))
    }

    // Stats
    const totalOwned = Object.values(userDistricts).filter(c => c > 0).length
    const totalRepeated = Object.values(userDistricts).filter(c => c > 1).reduce((acc, c) => acc + (c - 1), 0)
    const percentage = totalStickers > 0 ? Math.round((totalOwned / totalStickers) * 100) : 0

    // Grouping Logic
    const renderContent = () => {
        // If we have metadata, use sections
        if (metadata.length > 0) {
            const sections: Record<string, StickerMetadata[]> = {}
            const sectionOrder: string[] = []

            metadata.forEach(s => {
                if (!sections[s.section]) {
                    sections[s.section] = []
                    sectionOrder.push(s.section)
                }

                // Apply Filters
                const count = userDistricts[s.sticker_number] || 0
                let visible = true
                if (filter === 'missing' && count > 0) visible = false
                if (filter === 'repeated' && count <= 1) visible = false

                if (visible) sections[s.section].push(s)
            })

            // Filter SECTIONS based on criteria
            const filteredSections = sectionOrder.filter(secTitle => {
                const stickersInSec = sections[secTitle]

                // Search Filter
                if (searchTerm && !secTitle.toLowerCase().includes(searchTerm.toLowerCase())) return false

                // Completed Filter (Show ONLY sections where user has ALL stickers)
                if (filter === 'completed') {
                    const isComplete = stickersInSec.every(s => (userDistricts[s.sticker_number] || 0) > 0)
                    return isComplete
                }

                return true
            })

            if (filteredSections.length === 0) {
                return (
                    <div className="text-center py-10 text-gray-400">
                        {filter === 'completed'
                            ? "Nenhuma seção 100% completa ainda. Continue trocando!"
                            : "Nenhuma seção encontrada."}
                    </div>
                )
            }

            return (
                <div className="space-y-4">
                    {filteredSections.map(secTitle => {
                        const stickersInSec = sections[secTitle]

                        // Filter ITEMS within section (for non-completed filters)
                        const visibleStickers = stickersInSec.filter(s => {
                            if (filter === 'completed') return true // Already filtered section

                            const count = userDistricts[s.sticker_number] || 0
                            if (filter === 'missing' && count > 0) return false
                            if (filter === 'repeated' && count <= 1) return false
                            return true
                        })

                        if (visibleStickers.length === 0) return null

                        const isExpanded = expandedSections[secTitle]

                        return (
                            <div key={secTitle} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => toggleSection(secTitle)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                        {secTitle}
                                        {filter === 'completed' && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Completa! ✅</span>}
                                        <span className="text-xs font-normal text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                            {visibleStickers.length}
                                        </span>
                                    </h3>
                                </button>

                                {/* ... sticker grid content ... */}

                                {isExpanded && (
                                    <div className="p-3 bg-white border-t border-gray-100">
                                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                            {stickersInSec.map((s) => (
                                                <StickerButton
                                                    key={s.sticker_number}
                                                    id={s.sticker_number}
                                                    label={s.display_code}
                                                    count={userDistricts[s.sticker_number] || 0}
                                                    onLeftClick={handleLeftClick}
                                                    onRightClick={handleRightClick}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
        }

        // Fallback: Legacy Grid (1..N)
        const list = Array.from({ length: totalStickers }, (_, i) => i + 1)
        const filteredList = list.filter(n => {
            const c = userDistricts[n] || 0
            if (filter === 'missing') return c === 0
            if (filter === 'repeated') return c > 1
            return true
        })

        return (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {filteredList.map(num => (
                    <StickerButton
                        key={num}
                        id={num}
                        label={num.toString()}
                        count={userDistricts[num] || 0}
                        onLeftClick={handleLeftClick}
                        onRightClick={handleRightClick}
                    />
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Stats & Tools */}
            <div className="max-w-6xl mx-auto pt-4 px-4 sticky top-0 bg-gray-50 z-10 pb-2 space-y-3">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="p-0 hover:bg-transparent text-gray-400 -ml-1">
                            <ChevronDown className="rotate-90 h-5 w-5" />
                        </Button>
                        <h1 className="text-xl font-bold text-gray-800 truncate leading-tight max-w-[200px] sm:max-w-md">
                            {albumName}
                        </h1>
                    </div>
                    <Button variant="ghost" onClick={handleShareRepeated} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-2">
                        <span className="hidden sm:inline text-sm font-medium">Compartilhar Repetidas</span>
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex gap-4 text-sm justify-between bg-white border p-3 rounded-lg shadow-sm">
                    <div className="text-center">
                        <div className="font-bold text-green-600 text-lg">{totalOwned}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Tenho</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-blue-600 text-lg">{totalRepeated}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Repetidas</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-gray-700 text-lg">{percentage}%</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Completo</div>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <Badge variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')} className="cursor-pointer whitespace-nowrap">
                        Todas
                    </Badge>
                    <Badge variant={filter === 'missing' ? 'default' : 'outline'} onClick={() => setFilter('missing')} className="cursor-pointer whitespace-nowrap">
                        Faltam ({totalStickers - totalOwned})
                    </Badge>
                    <Badge variant={filter === 'repeated' ? 'default' : 'outline'} onClick={() => setFilter('repeated')} className="cursor-pointer whitespace-nowrap">
                        Repetidas ({totalRepeated})
                    </Badge>
                    <Badge
                        variant={filter === 'completed' ? 'default' : 'outline'}
                        onClick={() => setFilter('completed')}
                        className={`cursor-pointer whitespace-nowrap ${filter === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-700 hover:bg-green-50'}`}
                    >
                        Completas ✅
                    </Badge>
                </div>

                {/* Search Bar & Toggle */}
                <div className="flex gap-2">
                    <div className="relative shadow-sm flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar time ou seção..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm transition duration-150 ease-in-out"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={toggleAllSections} className="px-3" title={areAllExpanded ? "Recolher Tudo" : "Expandir Tudo"}>
                        {areAllExpanded ? <ChevronsUp size={18} /> : <ChevronsDown size={18} />}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>
        </div>
    )
}

// Subcomponent for Sticker Button
function StickerButton({ id, label, count, onLeftClick, onRightClick }: any) {
    return (
        <button
            onClick={() => onLeftClick(id)}
            onContextMenu={(e) => onRightClick(e, id)}
            className={`
                aspect-[4/5] rounded-md flex flex-col items-center justify-center font-bold text-sm transition-all select-none relative
                ${count === 0 ? 'bg-white border-2 border-gray-200 text-gray-400 hover:border-gray-300' : ''}
                ${count === 1 ? 'bg-green-500 text-white border-2 border-green-600 shadow-md transform scale-[1.02]' : ''}
                ${count > 1 ? 'bg-blue-500 text-white border-2 border-blue-600 shadow-md' : ''}
            `}
        >
            <span className="z-10">{label}</span>
            {count > 1 && (
                <span className="absolute -top-2 -right-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full shadow-sm border border-white z-20">
                    +{count - 1}
                </span>
            )}
        </button>
    )
}
