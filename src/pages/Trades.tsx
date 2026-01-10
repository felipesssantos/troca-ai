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

    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')

    useEffect(() => {
        if (!user) return

        const fetchTrades = async () => {
            setLoading(true)

            // Fetch RECEIVED trades
            const { data: receivedData } = await supabase
                .from('trades')
                .select(`*, sender:sender_id(username, avatar_url)`)
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false })

            // Fetch SENT trades
            const { data: sentData } = await supabase
                .from('trades')
                .select(`*, receiver:receiver_id(username, avatar_url)`)
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false })

            // Combine or separate? Storing in one state with filter is easier, or two states.
            // Let's use a single state but typed with 'direction'.
            // Actually, simpler to just map them to a display structure.

            const processedReceived = (receivedData || []).map((t: any) => ({ ...t, type: 'received', otherUser: t.sender }))
            const processedSent = (sentData || []).map((t: any) => ({ ...t, type: 'sent', otherUser: t.receiver }))

            setTrades([...processedReceived, ...processedSent])
            setLoading(false)
        }

        fetchTrades()

        // Subscribe to changes (simplified for now: just refresh on action)
    }, [user])

    const handleUpdateStatus = async (tradeId: string, newStatus: 'accepted' | 'rejected') => {
        if (newStatus === 'accepted') {
            const confirmAccept = confirm("Ao aceitar, as figurinhas serão trocadas automaticamente. Confirmar?")
            if (!confirmAccept) return

            // Call Procedure to Execute Trade
            const { error } = await supabase.rpc('execute_trade', { p_trade_id: tradeId })

            if (error) {
                alert('Erro ao processar troca: ' + error.message)
                console.error(error)
                return
            }

            alert('Troca realizada com sucesso! Seus álbuns foram atualizados.')
            // Update state to show as Accepted instead of removing
            setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: 'accepted' } : t))

        } else {
            // Reject Logic
            if (!confirm("Tem certeza que deseja rejeitar esta proposta?")) return

            const { error } = await supabase
                .from('trades')
                .update({ status: 'rejected' })
                .eq('id', tradeId)

            if (error) {
                console.error(error)
                alert('Erro ao rejeitar.')
            } else {
                setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: 'rejected' } : t))
            }
        }
    }

    const handleCancelTrade = async (tradeId: string) => {
        if (!confirm('Deseja cancelar esta proposta?')) return

        // Safety Check: Only update if status is still 'pending'
        const { data, error } = await supabase
            .from('trades')
            .update({ status: 'cancelled' })
            .eq('id', tradeId)
            .eq('status', 'pending') // CRITICAL: Prevents cancelling if already accepted
            .select()

        if (error) {
            alert('Erro ao cancelar: ' + error.message)
        } else if (data.length === 0) {
            // If no rows returned, it means it wasn't pending anymore
            alert('Não foi possível cancelar: Esta proposta já foi aceita ou processada pelo outro usuário.')
            // Refresh list to show true status
            window.location.reload()
        } else {
            setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: 'cancelled' } : t))
        }
    }

    const filteredTrades = trades.filter(t => {
        if (activeTab === 'received') return (t as any).type === 'received'
        return (t as any).type === 'sent'
    })

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Trocas</h1>
                    <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
                </div>

                <div className="flex gap-2 p-1 bg-gray-200 rounded-lg">
                    <button
                        className={`flex-1 py-1 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'received' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setActiveTab('received')}
                    >
                        Recebidas
                    </button>
                    <button
                        className={`flex-1 py-1 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'sent' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        onClick={() => setActiveTab('sent')}
                    >
                        Enviadas
                    </button>
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : filteredTrades.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-gray-500">
                            Nenhuma troca {activeTab === 'received' ? 'recebida' : 'enviada'}.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredTrades.map((trade: any) => (
                            <Card key={trade.id} className={`border-l-4 ${trade.status === 'pending' ? 'border-l-yellow-500' : trade.status === 'accepted' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={trade.otherUser?.avatar_url} />
                                                <AvatarFallback>{trade.otherUser?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-bold">@{trade.otherUser?.username}</span>
                                            <span className="text-gray-500 text-sm">
                                                {activeTab === 'received' ? 'quer trocar' : (trade.status === 'pending' ? 'está analisando' : `(${trade.status})`)}
                                            </span>
                                        </div>
                                        <Badge variant={trade.status === 'pending' ? 'outline' : 'secondary'}>
                                            {trade.status === 'pending' ? 'Pendente' : trade.status === 'accepted' ? 'Aceita' : trade.status === 'cancelled' ? 'Cancelada' : 'Rejeitada'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-red-50 p-2 rounded border border-red-100">
                                        <span className="font-bold text-red-700 block mb-1">
                                            {activeTab === 'received' ? 'Ele te dá:' : 'Você dá:'}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.offer_stickers.map((n: number) => <span key={n} className="px-1 bg-white border rounded text-xs">{n}</span>)}
                                        </div>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <span className="font-bold text-green-700 block mb-1">
                                            {activeTab === 'received' ? 'Você dá:' : 'Ele te dá:'}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.request_stickers.map((n: number) => <span key={n} className="px-1 bg-white border rounded text-xs">{n}</span>)}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 pt-0">
                                    {activeTab === 'received' && trade.status === 'pending' && (
                                        <>
                                            <Button variant="destructive" size="sm" onClick={() => handleUpdateStatus(trade.id, 'rejected')}>Rejeitar</Button>
                                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(trade.id, 'accepted')}>Aceitar</Button>
                                        </>
                                    )}
                                    {activeTab === 'sent' && trade.status === 'pending' && (
                                        <Button variant="destructive" size="sm" onClick={() => handleCancelTrade(trade.id)}>Cancelar Proposta</Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
