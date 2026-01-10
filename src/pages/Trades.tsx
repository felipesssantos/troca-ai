import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Trade {
    id: string
    sender_id: string
    offer_stickers: number[]
    request_stickers: number[]
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
    created_at: string
    sender?: {
        username: string
        avatar_url: string
    }
}

export default function Trades() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [trades, setTrades] = useState<Trade[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchTrades = async () => {
            setLoading(true)

            // Fetch trades where I am the receiver
            const { data, error } = await supabase
                .from('trades')
                .select(`
            *,
            sender:sender_id (
                username,
                avatar_url
            )
        `)
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching trades:', error)
            } else {
                // Supabase returns joined data as object or array depending on relation, usually object here
                setTrades(data as any || [])
            }
            setLoading(false)
        }

        fetchTrades()
    }, [user])

    const handleUpdateStatus = async (tradeId: string, newStatus: 'accepted' | 'rejected') => {
        // Optimistic update
        setTrades(prev => prev.filter(t => t.id !== tradeId))

        if (newStatus === 'accepted') {
            const confirmAccept = confirm("Ao aceitar, as figurinhas serão trocadas automaticamente. Confirmar?")
            if (!confirmAccept) {
                window.location.reload()
                return
            }

            // Call Procedure to Execute Trade
            const { error } = await supabase.rpc('execute_trade', { p_trade_id: tradeId })

            if (error) {
                alert('Erro ao processar troca: ' + error.message)
                console.error(error)
                return
            }

            alert('Troca realizada com sucesso! Seus álbuns foram atualizados.')
            // Refresh
            setTrades(prev => prev.filter(t => t.id !== tradeId))
        } else {
            // Reject Logic (Simple Status Update)
            const { error } = await supabase
                .from('trades')
                .update({ status: 'rejected' })
                .eq('id', tradeId)

            if (error) {
                console.error(error)
                alert('Erro ao rejeitar.')
            }
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Propostas Recebidas 📩</h1>
                    <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
                </div>

                {loading ? (
                    <p>Carregando propostas...</p>
                ) : trades.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-gray-500">
                            Nenhuma proposta pendente no momento.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {trades.map((trade) => (
                            <Card key={trade.id} className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={trade.sender?.avatar_url} />
                                                <AvatarFallback>{trade.sender?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-bold">@{trade.sender?.username}</span> quer trocar:
                                        </div>
                                        <Badge variant="outline">{new Date(trade.created_at).toLocaleDateString()}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-red-50 p-2 rounded border border-red-100">
                                        <span className="font-bold text-red-700 block mb-1">Ele te dá:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.offer_stickers.map(n => <span key={n} className="px-1 bg-white border rounded text-xs">{n}</span>)}
                                        </div>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <span className="font-bold text-green-700 block mb-1">Você dá:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.request_stickers.map(n => <span key={n} className="px-1 bg-white border rounded text-xs">{n}</span>)}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 pt-0">
                                    <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(trade.id, 'rejected')}>Rejeitar</Button>
                                    <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(trade.id, 'accepted')}>Aceitar Troca</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
