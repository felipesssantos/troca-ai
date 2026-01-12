import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
// import { Button } from '@/components/ui/button'
// import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Removed hardcoded TOTAL_STICKERS

interface StickerData {
    sticker_number: number
    count: number
}

// Custom imports
import { useParams } from 'react-router-dom'

// ... (existing imports)

export default function Album() {
    const { user } = useAuthStore()
    const { albumId } = useParams()
    const [stickers, setStickers] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)
    const [totalStickers, setTotalStickers] = useState(670) // Default fallback
    const [filter, setFilter] = useState<'all' | 'missing' | 'repeated'>('all')

    // Load initial data
    useEffect(() => {
        if (!user || !albumId) return

        const fetchData = async () => {
            setLoading(true)

            // 1. Get Album Info (Total Stickers)
            const { data: albumData } = await supabase
                .from('user_albums')
                .select('album_template_id, albums(total_stickers)')
                .eq('id', albumId)
                .single()

            if (albumData?.albums) {
                // @ts-ignore
                setTotalStickers(albumData.albums.total_stickers)
            }

            // 2. Get User Stickers
            const { data, error } = await supabase
                .from('user_stickers')
                .select('sticker_number, count')
                .eq('user_id', user.id)
                .eq('user_album_id', albumId)

            if (error) {
                console.error('Error fetching stickers:', error)
            } else {
                const stickerMap: Record<number, number> = {}
                data?.forEach((s: StickerData) => {
                    stickerMap[s.sticker_number] = s.count
                })
                setStickers(stickerMap)
            }
            setLoading(false)
        }

        fetchData()
    }, [user, albumId])

    // Handle interactions
    const updateStickerCount = async (num: number, increment: boolean) => {
        if (!user || !albumId) return

        const currentCount = stickers[num] || 0
        let newCount = increment ? currentCount + 1 : currentCount - 1

        if (newCount < 0) newCount = 0 // Cannot have negative

        // Optimistic Update
        setStickers((prev) => ({ ...prev, [num]: newCount }))

        // Save to DB
        const { error } = await supabase
            .from('user_stickers')
            .upsert({
                user_id: user.id,
                user_album_id: albumId,
                sticker_number: num,
                count: newCount
            }, { onConflict: 'user_album_id, sticker_number' })

        if (error) {
            console.error('Error saving sticker:', error)
            // Rollback state in real app
        }
    }

    const handleLeftClick = (num: number) => {
        updateStickerCount(num, true)
    }

    const handleRightClick = (e: React.MouseEvent, num: number) => {
        e.preventDefault() // Prevent context menu
        updateStickerCount(num, false)
    }

    // Calculate stats
    const totalOwned = Object.values(stickers).filter(c => c > 0).length
    const totalRepeated = Object.values(stickers).filter(c => c > 1).reduce((acc, c) => acc + (c - 1), 0)
    const percentage = totalStickers > 0 ? Math.round((totalOwned / totalStickers) * 100) : 0

    // Filter Logic
    const getVisibleStickers = () => {
        const list = Array.from({ length: totalStickers }, (_, i) => i + 1)
        if (filter === 'all') return list
        if (filter === 'missing') return list.filter(n => !stickers[n])
        if (filter === 'repeated') return list.filter(n => (stickers[n] || 0) > 1)
        return list
    }



    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Stats */}
            <div className="max-w-4xl mx-auto pt-4 px-4">
                {/* Stats Panel */}

                <div className="flex gap-4 text-sm justify-between bg-gray-100 p-3 rounded-lg">
                    <div className="text-center">
                        <div className="font-bold text-green-600">{totalOwned}</div>
                        <div className="text-xs text-gray-500">Tenho</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-blue-600">{totalRepeated}</div>
                        <div className="text-xs text-gray-500">Repetidas</div>
                    </div>
                    <div className="text-center">
                        <div className="font-bold text-gray-700">{percentage}%</div>
                        <div className="text-xs text-gray-500">Completo</div>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    <Badge
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                        className="cursor-pointer"
                    >
                        Todas
                    </Badge>
                    <Badge
                        variant={filter === 'missing' ? 'default' : 'outline'}
                        onClick={() => setFilter('missing')}
                        className="cursor-pointer"
                    >
                        Faltam ({totalStickers - totalOwned})
                    </Badge>
                    <Badge
                        variant={filter === 'repeated' ? 'default' : 'outline'}
                        onClick={() => setFilter('repeated')}
                        className="cursor-pointer"
                    >
                        Repetidas ({totalRepeated})
                    </Badge>
                </div>
            </div>


            {/* Grid */}
            <div className="max-w-4xl mx-auto p-4">
                {loading ? (
                    <p className="text-center py-10 text-gray-500">Carregando figurinhas...</p>
                ) : (
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                        {getVisibleStickers().map((num) => {
                            const count = stickers[num] || 0
                            return (
                                <button
                                    key={num}
                                    onClick={() => handleLeftClick(num)}
                                    onContextMenu={(e) => handleRightClick(e, num)}
                                    className={`
                    aspect-square rounded-md flex flex-col items-center justify-center font-bold text-sm transition-all select-none
                    ${count === 0 ? 'bg-white border text-gray-300 hover:border-gray-400' : ''}
                    ${count === 1 ? 'bg-green-500 text-white border-green-600 shadow-md transform scale-105' : ''}
                    ${count > 1 ? 'bg-blue-500 text-white border-blue-600 shadow-md' : ''}
                    `}
                                >
                                    {num}
                                    {count > 1 && (
                                        <span className="text-[10px] bg-white text-blue-600 px-1 rounded-full mt-1">
                                            +{count - 1}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div >
    )
}
