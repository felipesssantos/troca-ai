import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const TOTAL_STICKERS = 980

interface StickerData {
    sticker_number: number
    count: number
}

interface Profile {
    id: string
    username: string
    avatar_url: string
}

export default function UserAlbum() {
    const { username } = useParams()
    const { user: currentUser } = useAuthStore()
    const navigate = useNavigate()

    const [targetUser, setTargetUser] = useState<Profile | null>(null)
    const [targetStickers, setTargetStickers] = useState<Record<number, number>>({})
    const [myStickers, setMyStickers] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)

    const [potentialGive, setPotentialGive] = useState<number[]>([])
    const [potentialReceive, setPotentialReceive] = useState<number[]>([])
    const [selectedGive, setSelectedGive] = useState<number[]>([])
    const [selectedReceive, setSelectedReceive] = useState<number[]>([])

    useEffect(() => {
        if (!username || !currentUser) return

        const loadData = async () => {
            setLoading(true)
            try {
                // 1. Get Target User ID
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

                // 2. Get Target User Stickers
                const { data: targetData } = await supabase
                    .from('user_stickers')
                    .select('sticker_number, count')
                    .eq('user_id', profileData.id)

                const targetMap: Record<number, number> = {}
                targetData?.forEach((s: StickerData) => targetMap[s.sticker_number] = s.count)
                setTargetStickers(targetMap)

                // 3. Get My Stickers (for Comparison)
                const { data: myData } = await supabase
                    .from('user_stickers')
                    .select('sticker_number, count')
                    .eq('user_id', currentUser.id)

                const myMap: Record<number, number> = {}
                myData?.forEach((s: StickerData) => myMap[s.sticker_number] = s.count)
                setMyStickers(myMap)

                // 4. Get Locked Stickers (Pending Trades)
                const { data: pendingTrades } = await supabase
                    .from('trades')
                    .select('offer_stickers')
                    .eq('sender_id', currentUser.id)
                    .eq('status', 'pending')

                const lockedSet = new Set<number>()
                pendingTrades?.forEach(t => {
                    (t.offer_stickers as number[]).forEach(n => lockedSet.add(n))
                })

                // CALCULATE MATCHES
                const give = Object.keys(myMap).filter(n => {
                    const num = Number(n)
                    // Must have dupe AND target needs it AND it's not locked in another trade
                    return (myMap[num] > 1) && (!targetMap[num]) && (!lockedSet.has(num))
                }).map(Number)

                const receive = Object.keys(targetMap).filter(n => {
                    const num = Number(n)
                    return (targetMap[num] > 1) && (!myMap[num])
                }).map(Number)

                setPotentialGive(give)
                setPotentialReceive(receive)
                // Default: Select ALL
                setSelectedGive(give)
                setSelectedReceive(receive)

            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [username, currentUser, navigate])

    const toggleGive = (num: number) => {
        setSelectedGive(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])
    }

    const toggleReceive = (num: number) => {
        setSelectedReceive(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])
    }

    const handleProposeTrade = async () => {
        if (!currentUser || !targetUser) return

        if (!confirm('Deseja realmente enviar essa proposta de troca?')) return

        setLoading(true)
        const { error } = await supabase
            .from('trades')
            .insert({
                sender_id: currentUser.id,
                receiver_id: targetUser.id,
                offer_stickers: selectedGive,
                request_stickers: selectedReceive,
                status: 'pending'
            })

        setLoading(false)

        if (error) {
            console.error(error)
            alert('Erro ao enviar proposta.')
        } else {
            alert('Proposta enviada com sucesso! 🚀')
            // Optional: Redirect to a "My Trades" page
            navigate('/community')
        }
    }


    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white shadow-sm sticky top-0 z-10 p-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/community')}>← Voltar</Button>
                    {targetUser && (
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">@{targetUser.username}</span>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={targetUser.avatar_url} />
                                <AvatarFallback>{targetUser.username[0]}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Match Summary Card */}
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Resumo da Troca</span>
                            <Button onClick={handleProposeTrade} disabled={selectedGive.length === 0 && selectedReceive.length === 0}>
                                Enviar Proposta
                            </Button>
                        </CardTitle>
                        <p className="text-sm text-gray-500">Clique nas figurinhas para selecionar/remover da troca.</p>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">

                        {/* RECEIVE SECTION */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-green-700">Você Recebe ({selectedReceive.length})</h3>
                                <span className="text-xs text-gray-400">Disponíveis: {potentialReceive.length}</span>
                            </div>
                            {potentialReceive.length === 0 ? (
                                <p className="text-gray-400 text-sm">Nada para receber deste usuário.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1">
                                    {potentialReceive.map(n => {
                                        const isSelected = selectedReceive.includes(n)
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

                        {/* GIVE SECTION */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-blue-700">Você Dá ({selectedGive.length})</h3>
                                <span className="text-xs text-gray-400">Disponíveis: {potentialGive.length}</span>
                            </div>
                            {potentialGive.length === 0 ? (
                                <p className="text-gray-400 text-sm">Nada para enviar para este usuário.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1">
                                    {potentialGive.map(n => {
                                        const isSelected = selectedGive.includes(n)
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

                {/* Full Album View (Optional, maybe just showing match is enough for MVP, but let's show grid) */}
                <div className="mt-8">
                    <h3 className="font-bold text-gray-700 mb-4">Álbum de @{targetUser?.username}</h3>
                    {loading ? <p>Carregando...</p> : (
                        <div className="grid grid-cols-8 md:grid-cols-10 gap-1 opacity-80">
                            {Array.from({ length: TOTAL_STICKERS }, (_, i) => i + 1).map(num => {
                                const count = targetStickers[num] || 0
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
