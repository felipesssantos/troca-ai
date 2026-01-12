import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'


// Hardcoded TOTAL_STICKERS removed

interface StickerData {
    sticker_number: number
    count: number
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

    const [targetUser, setTargetUser] = useState<Profile | null>(null)
    const [stickers, setStickers] = useState<Record<number, number>>({}) // Target user's stickers

    const [loading, setLoading] = useState(true)
    const [totalStickers, setTotalStickers] = useState(670) // Default fallback

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
                setSelectedAlbumId(data[0].id) // Default to first
            }
        }
        fetchMyAlbums()
    }, [currentUser])

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

                // C. Find THEIR matching albums (Same Template)
                const { data: theirAlbumsData } = await supabase
                    .from('user_albums')
                    .select('id, nickname')
                    .eq('user_id', profileData.id)
                    .eq('album_template_id', currentTemplateId)

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
                // @ts-ignore
                const validIds = theirAlbumsData.map(a => a.id)
                if (!targetId || !validIds.includes(targetId)) {
                    // @ts-ignore
                    targetId = theirAlbumsData[0].id
                    setSelectedTargetAlbumId(targetId)
                }

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
    }, [username, currentUser, navigate, selectedAlbumId, selectedTargetAlbumId])


    // Handlers
    const toggleGive = (num: number) => {
        setGiving(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])
    }

    const toggleReceive = (num: number) => {
        setReceiving(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])
    }

    const handleProposeTrade = async () => {
        if (!currentUser || !targetUser || !selectedAlbumId) return
        if (giving.length === 0 && receiving.length === 0) return

        if (!confirm('Deseja realmente enviar essa proposta de troca?')) return

        setLoading(true)
        try {
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 1. Navbar / Header */}
            <div className="bg-white border-b py-2 px-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/community')}>← Voltar</Button>
                    <span className="font-bold">@{targetUser?.username}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 hidden sm:inline">Meus Álbuns:</span>
                    <select
                        className="text-sm border rounded p-1 max-w-[150px]"
                        value={selectedAlbumId}
                        onChange={(e) => setSelectedAlbumId(e.target.value)}
                    >
                        {myAlbums.map(album => (
                            <option key={album.id} value={album.id}>
                                {album.template.name}{album.nickname ? ` (${album.nickname})` : ''}
                            </option>
                        ))}
                    </select>

                    {targetUserAlbums.length > 1 && (
                        <>
                            <span className="text-xs text-gray-500 hidden sm:inline ml-2">Álbum dele(a):</span>
                            <select
                                className="text-sm border rounded p-1 max-w-[150px]"
                                value={selectedTargetAlbumId}
                                onChange={(e) => setSelectedTargetAlbumId(e.target.value)}
                            >
                                {targetUserAlbums.map((album: any) => (
                                    <option key={album.id} value={album.id}>
                                        {album.nickname || `Álbum ${album.id.slice(0, 4)}`}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* 2. Match Summary Card */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center text-lg">
                            <span>Resumo da Troca</span>
                            <Button
                                onClick={handleProposeTrade}
                                disabled={giving.length === 0 && receiving.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700"
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
                                <div className="flex flex-wrap gap-1">
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
                                                {n}
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
                                <div className="flex flex-wrap gap-1">
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
                                                {n}
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
                    <h3 className="font-bold text-gray-700 mb-4">Álbum de @{targetUser?.username} (Visão Completa)</h3>
                    {loading ? <p>Carregando...</p> : (
                        <div className="grid grid-cols-8 md:grid-cols-10 gap-1 opacity-80">
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
                    )}
                </div>

            </div>
        </div>
    )
}
