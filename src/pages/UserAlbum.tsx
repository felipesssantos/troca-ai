import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useTour } from '@/hooks/useTour'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'


// Hardcoded TOTAL_STICKERS removed

interface StickerData {
    sticker_number: number
    count: number
}

interface StickerMetadata {
    sticker_number: number
    display_code: string
    section: string
}

interface Profile {
    id: string
    username: string
    avatar_url: string
}

interface MyAlbum {
    id: string
    nickname: string | null
    template: { name: string }
}

export default function UserAlbum() {
    const { username } = useParams()
    const { user: currentUser } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const stateParams = location.state as { myAlbumId?: string, theirAlbumId?: string } | null

    const [targetUser, setTargetUser] = useState<Profile | null>(null)
    const [stickers, setStickers] = useState<Record<number, number>>({}) // Target user's stickers

    const [loading, setLoading] = useState(true)
    const [totalStickers, setTotalStickers] = useState(670) // Default fallback

    // Metadata State
    const [metadata, setMetadata] = useState<StickerMetadata[]>([])
    const [idToCode, setIdToCode] = useState<Record<number, string>>({})

    // UI State (Search & Collapse)
    const [searchTerm, setSearchTerm] = useState('')
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})


    // Trade Proposal State
    const [giving, setGiving] = useState<number[]>([]) // Stickers I give
    const [receiving, setReceiving] = useState<number[]>([]) // Stickers I get (dupes they have, I need)

    // Potentials (for UI highlights)
    const [potentialGive, setPotentialGive] = useState<number[]>([])
    const [potentialReceive, setPotentialReceive] = useState<number[]>([])

    const [myAlbums, setMyAlbums] = useState<MyAlbum[]>([])
    const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
    const [targetUserAlbums, setTargetUserAlbums] = useState<{ id: string, nickname: string | null }[]>([])
    const [selectedTargetAlbumId, setSelectedTargetAlbumId] = useState<string>('')

    useTour('album-compare', [
        {
            element: '#my-album-select',
            popover: { title: 'Seu Álbum', description: 'Selecione qual dos seus álbuns você quer usar para comparar e capturar figurinhas.', side: "bottom", align: 'end' }
        },
        {
            element: '#target-album-select',
            popover: { title: 'Álbum Dele(a)', description: 'Selecione qual álbum desse usuário você quer visualizar.', side: "bottom", align: 'end' }
        },
        {
            // Fallback to body or a known container if grid selector fails, but let's try a broad selector for stickers
            element: '.grid',
            popover: { title: 'Figurinhas', description: 'Clique nas figurinhas coloridas para propor uma troca. (Verde = Você precisa, Azul = Você tem repetida).', side: "top", align: 'start' }
        }
    ])

    // 1. Fetch My Albums
    useEffect(() => {
        if (!currentUser) return
        const fetchMyAlbums = async () => {
            const { data } = await supabase
                .from('user_albums')
                .select('id, nickname, template:albums(name)')
                .eq('user_id', currentUser.id)

            if (data && data.length > 0) {
                setMyAlbums(data as any)
                setSelectedAlbumId(prev => {
                    // Priority: 1. State Param, 2. Current Prev (if valid), 3. First available
                    if (stateParams?.myAlbumId) {
                        const fromState = data.find((a: any) => a.id === stateParams.myAlbumId)
                        if (fromState) return fromState.id
                    }

                    const valid = data.find((a: any) => a.id === prev)
                    return valid ? prev : data[0].id
                })
            }
        }
        fetchMyAlbums()
    }, [currentUser?.id])

    // 2. Main Data Fetching
    useEffect(() => {
        if (!username || !currentUser || !selectedAlbumId) return // Wait for album selection

        const fetchData = async () => {
            setLoading(true)
            setStickers({}) // Reset previous
            setPotentialGive([])
            setPotentialReceive([])
            setGiving([])
            setReceiving([])
            setMetadata([])
            setIdToCode({})

            try {
                // A. Get Target User ID
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .eq('username', username)
                    .single()

                if (profileError || !profileData) {
                    alert('Usuário não encontrado')
                    navigate('/community')
                    return
                }
                setTargetUser(profileData)

                // B. Get MY Selected Album Template info
                const { data: myAlbumData } = await supabase
                    .from('user_albums')
                    .select('album_template_id, albums(total_stickers)')
                    .eq('id', selectedAlbumId)
                    .single()

                if (!myAlbumData) return

                // @ts-ignore
                const currentTemplateId = myAlbumData.album_template_id
                // @ts-ignore
                const albumTotal = myAlbumData.albums?.total_stickers || 670

                setTotalStickers(albumTotal) // Update dynamic total

                // B.1 Fetch Metadata for this template
                if (currentTemplateId) {
                    const { data: metaData } = await supabase
                        .from('stickers')
                        .select('sticker_number, display_code, section')
                        .eq('album_id', currentTemplateId)
                        .order('sticker_number', { ascending: true })

                    if (metaData && metaData.length > 0) {
                        setMetadata(metaData)
                        const map: Record<number, string> = {}
                        metaData.forEach(m => map[m.sticker_number] = m.display_code)
                        setIdToCode(map)
                    }
                }


                // C. Find THEIR matching albums (Same Template)
                let query = supabase
                    .from('user_albums')
                    .select('id, nickname')
                    .eq('user_id', profileData.id)
                    .eq('album_template_id', currentTemplateId)

                // If viewing someone else, respect privacy
                if (currentUser.id !== profileData.id) {
                    query = query.eq('is_public', true)
                }

                const { data: theirAlbumsData } = await query

                if (!theirAlbumsData || theirAlbumsData.length === 0) {
                    setTargetUserAlbums([])
                    setSelectedTargetAlbumId('')
                    setStickers({})
                    setLoading(false)
                    return
                }

                // @ts-ignore
                setTargetUserAlbums(theirAlbumsData)

                // Select first one if none selected or if selected is not in the list
                let targetId = selectedTargetAlbumId

                // Priority Check for Their Album
                if (stateParams?.theirAlbumId) {
                    // @ts-ignore
                    if (theirAlbumsData.some(a => a.id === stateParams.theirAlbumId)) {
                        targetId = stateParams.theirAlbumId
                    }
                }

                // @ts-ignore
                const validIds = theirAlbumsData.map(a => a.id)
                if (!targetId || !validIds.includes(targetId)) {
                    // @ts-ignore
                    targetId = theirAlbumsData[0].id
                }

                setSelectedTargetAlbumId(targetId)

                // D. Fetch THEIR stickers (from THEIR matching album)
                const theirMap: Record<number, number> = {}
                if (targetId) {
                    const { data: theirStickers } = await supabase
                        .from('user_stickers')
                        .select('sticker_number, count')
                        .eq('user_id', profileData.id)
                        .eq('user_album_id', targetId)

                    theirStickers?.forEach((s: StickerData) => theirMap[s.sticker_number] = s.count)
                    setStickers(theirMap)
                }

                // E. Fetch MY stickers (from SELECTED album)
                const { data: myStickersData } = await supabase
                    .from('user_stickers')
                    .select('sticker_number, count')
                    .eq('user_id', currentUser.id)
                    .eq('user_album_id', selectedAlbumId)

                const myMap: Record<number, number> = {}
                myStickersData?.forEach((s: StickerData) => myMap[s.sticker_number] = s.count)


                // F. Get Locked Stickers (Pending Trades)
                const { data: pendingTrades } = await supabase
                    .from('trades')
                    .select('offer_stickers')
                    .eq('sender_id', currentUser.id)
                    .eq('status', 'pending')
                    .eq('sender_album_id', selectedAlbumId)

                const lockedSet = new Set<number>()
                pendingTrades?.forEach(t => {
                    (t.offer_stickers as number[]).forEach(n => lockedSet.add(n))
                })

                // G. Calculate Matches
                // Can Give: I have duplicate (>1), they need (==0), not locked
                const pGive = Object.keys(myMap).filter(n => {
                    const num = Number(n)
                    return (myMap[num] > 1) && (!theirMap[num]) && (!lockedSet.has(num))
                }).map(Number)

                // Can Receive: They have duplicate (>1), I need (==0)
                const pReceive = Object.keys(theirMap).filter(n => {
                    const num = Number(n)
                    return (theirMap[num] > 1) && (!myMap[num])
                }).map(Number)

                setPotentialGive(pGive)
                setPotentialReceive(pReceive)

                // Auto-select all available matches
                setGiving(pGive)
                setReceiving(pReceive)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [username, currentUser?.id, navigate, selectedAlbumId, selectedTargetAlbumId])


    // Handlers
    const toggleGive = (num: number) => {
        setGiving(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])
    }

    const toggleReceive = (num: number) => {
        setReceiving(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])
    }

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }

    const handleProposeTrade = async () => {
        if (!currentUser || !targetUser || !selectedAlbumId) return
        if (giving.length === 0 && receiving.length === 0) return

        if (!confirm('Deseja realmente enviar essa proposta de troca?')) return

        setLoading(true)
        try {
            // 1. Check Premium Limits
            const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', currentUser.id).single()
            const isPremium = profile?.is_premium || false

            if (!isPremium) {
                // Count PENDING trades sent by me
                const { count, error } = await supabase
                    .from('trades')
                    .select('*', { count: 'exact', head: true })
                    .eq('sender_id', currentUser.id)
                    .eq('status', 'pending')

                if (error) throw error

                if ((count || 0) >= 3) {
                    alert('Você atingiu o limite de 3 trocas simultâneas do plano Grátis. Finalize algumas ou vire Premium!')
                    navigate('/premium')
                    return
                }
            }

            const { error } = await supabase
                .from('trades')
                .insert({
                    sender_id: currentUser.id,
                    receiver_id: targetUser.id,
                    offer_stickers: giving,
                    request_stickers: receiving,
                    status: 'pending',
                    sender_album_id: selectedAlbumId // Save MY source album
                })

            if (error) throw error

            alert('Proposta enviada com sucesso! 🚀')
            navigate('/community')
        } catch (e: any) {
            console.error(e)
            alert('Erro ao enviar proposta: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    // Helper to get display label
    const getLabel = (num: number) => idToCode[num] || num.toString()

    // Render Helpers
    const renderFullAlbum = () => {
        if (loading) return <p>Carregando...</p>

        // 1. If Metadata exists, use Sections
        if (metadata.length > 0) {
            const sections: Record<string, StickerMetadata[]> = {}
            const sectionOrder: string[] = []

            metadata.forEach(s => {
                if (!sections[s.section]) {
                    sections[s.section] = []
                    sectionOrder.push(s.section)
                }
                sections[s.section].push(s)
            })

            const filteredSections = sectionOrder.filter(secTitle =>
                searchTerm === '' || secTitle.toLowerCase().includes(searchTerm.toLowerCase())
            )

            if (filteredSections.length === 0) {
                return <div className="text-center py-4 text-gray-400">Nenhuma seção encontrada.</div>
            }

            return (
                <div className="space-y-4">
                    {filteredSections.map(secTitle => {
                        const stickersInSec = sections[secTitle]
                        const isCollapsed = collapsedSections[secTitle]

                        return (
                            <div key={secTitle} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => toggleSection(secTitle)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                        {secTitle}
                                        <span className="text-xs font-normal text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                            {stickersInSec.length}
                                        </span>
                                    </h3>
                                </button>

                                {!isCollapsed && (
                                    <div className="p-3 bg-white border-t border-gray-100">
                                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1 opacity-90">
                                            {stickersInSec.map(s => {
                                                const num = s.sticker_number
                                                const count = stickers[num] || 0
                                                const isGold = potentialReceive.includes(num)
                                                const isBlue = potentialGive.includes(num)

                                                return (
                                                    <div key={num}
                                                        className={`
                                                            aspect-square rounded flex items-center justify-center text-[10px] font-bold select-none
                                                            ${isGold ? 'bg-yellow-400 text-yellow-900 border-2 border-yellow-600 z-10 scale-110 shadow-lg' :
                                                                isBlue ? 'bg-blue-400 text-white border-2 border-blue-600 z-10 scale-110 shadow-lg' :
                                                                    count > 0 ? 'bg-gray-300 text-gray-600' : 'bg-gray-100 text-gray-300'}
                                                        `}
                                                    >
                                                        {s.display_code}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
        }

        // 2. Fallback Grid
        return (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1 opacity-80">
                {Array.from({ length: totalStickers }, (_, i) => i + 1).map(num => {
                    const count = stickers[num] || 0
                    const isGold = potentialReceive.includes(num) // They have dupe, I need
                    const isBlue = potentialGive.includes(num) // I have dupe, they need

                    return (
                        <div
                            key={num}
                            className={`
                        aspect-square rounded flex items-center justify-center text-[10px] font-bold
                        ${isGold ? 'bg-yellow-400 text-yellow-900 border-2 border-yellow-600 z-10 scale-110 shadow-lg' :
                                    isBlue ? 'bg-blue-400 text-white border-2 border-blue-600 z-10 scale-110 shadow-lg' :
                                        count > 0 ? 'bg-gray-300 text-gray-600' : 'bg-gray-100 text-gray-300'}
                    `}
                        >
                            {num}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 1. Navbar / Header */}
            <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="max-w-4xl mx-auto py-2 px-4 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/community')}>← Voltar</Button>
                        <span className="font-bold truncate max-w-[150px]">@{targetUser?.username}</span>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-1 min-w-[140px]">
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-gray-500 whitespace-nowrap">Meu Álbum:</span>
                            <select
                                id="my-album-select"
                                className="text-sm border rounded p-1 max-w-[140px] truncate"
                                value={selectedAlbumId}
                                onChange={(e) => setSelectedAlbumId(e.target.value)}
                            >
                                {myAlbums.map(album => (
                                    <option key={album.id} value={album.id}>
                                        {album.template.name}{album.nickname ? ` (${album.nickname})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {targetUserAlbums.length > 1 && (
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-xs text-gray-500 whitespace-nowrap">Álbum dele(a):</span>
                                <select
                                    id="target-album-select"
                                    className="text-sm border rounded p-1 max-w-[140px] truncate"
                                    value={selectedTargetAlbumId}
                                    onChange={(e) => setSelectedTargetAlbumId(e.target.value)}
                                >
                                    {targetUserAlbums.map((album: any) => (
                                        <option key={album.id} value={album.id}>
                                            {album.nickname || `Álbum ${album.id.slice(0, 4)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* 2. Match Summary Card */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-lg">
                            <span>Resumo da Troca</span>
                            <Button
                                onClick={handleProposeTrade}
                                disabled={giving.length === 0 && receiving.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
                            >
                                Enviar Proposta
                            </Button>
                        </CardTitle>
                        <p className="text-sm text-gray-500">Clique nas figurinhas para selecionar/remover da troca.</p>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">

                        {/* RECEIVE SECTION (Green) */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-green-700">Você Recebe ({receiving.length})</h3>
                                <span className="text-xs text-gray-400">Disponíveis: {potentialReceive.length}</span>
                            </div>
                            {potentialReceive.length === 0 ? (
                                <p className="text-gray-400 text-sm">Nada para receber deste usuário.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                                    {potentialReceive.map(n => {
                                        const isSelected = receiving.includes(n)
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => toggleReceive(n)}
                                                className={`
                                                    px-2 py-1 rounded font-mono text-xs font-bold transition-all border
                                                    ${isSelected
                                                        ? 'bg-green-100 text-green-800 border-green-200 shadow-sm'
                                                        : 'bg-gray-50 text-gray-300 border-dashed border-gray-200 scale-95'}
                                                `}
                                            >
                                                {getLabel(n)}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* GIVE SECTION (Blue) */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-blue-700">Você Dá ({giving.length})</h3>
                                <span className="text-xs text-gray-400">Disponíveis: {potentialGive.length}</span>
                            </div>
                            {potentialGive.length === 0 ? (
                                <p className="text-gray-400 text-sm">Nada para enviar para este usuário.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                                    {potentialGive.map(n => {
                                        const isSelected = giving.includes(n)
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => toggleGive(n)}
                                                className={`
                                                    px-2 py-1 rounded font-mono text-xs font-bold transition-all border
                                                    ${isSelected
                                                        ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm'
                                                        : 'bg-gray-50 text-gray-300 border-dashed border-gray-200 scale-95'}
                                                `}
                                            >
                                                {getLabel(n)}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Full Album View Grid */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Álbum de @{targetUser?.username} (Visão Completa)</h3>
                        {/* Search Bar for Full View */}
                        <div className="relative shadow-sm max-w-[200px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="block w-full pl-8 pr-2 py-1 border border-gray-300 rounded-lg text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {renderFullAlbum()}
                </div>

            </div>
        </div>
    )
}
