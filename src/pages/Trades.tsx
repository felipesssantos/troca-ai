import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTour } from '@/hooks/useTour'
import { MessageCircle } from 'lucide-react'

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
    receiver?: {
        username: string
        avatar_url: string
    }
    sender_album?: {
        album_template_id: string
        template: {
            name: string
        }
    }
}

export default function Trades() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [trades, setTrades] = useState<Trade[]>([])
    const [loading, setLoading] = useState(true)

    // Mapping: TemplateID -> { Number -> DisplayCode }
    const [codeMap, setCodeMap] = useState<Record<string, Record<number, string>>>({})

    useTour('trades', [
        {
            element: '#trades-tabs',
            popover: { title: 'Abas de Propostas', description: 'Alterne entre propostas que você recebeu e as que você enviou.', side: "bottom", align: 'start' }
        },
        {
            element: '#trades-list > div:first-child',
            popover: { title: 'Proposta', description: 'Gerencie suas trocas aqui. Aceite, rejeite ou cancele propostas.', side: "top", align: 'start' }
        }
    ])

    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')

    useEffect(() => {
        if (!user) return

        const fetchTrades = async () => {
            setLoading(true)

            // Fetch RECEIVED trades
            const { data: receivedData } = await supabase
                .from('trades')
                .select(`*, sender:sender_id(username, avatar_url), sender_album:sender_album_id(album_template_id, template:albums(name))`)
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false })

            // Fetch SENT trades
            const { data: sentData } = await supabase
                .from('trades')
                .select(`*, receiver:receiver_id(username, avatar_url), sender_album:sender_album_id(album_template_id, template:albums(name))`)
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false })

            const processedReceived = (receivedData || []).map((t: any) => ({ ...t, type: 'received', otherUser: t.sender }))
            const processedSent = (sentData || []).map((t: any) => ({ ...t, type: 'sent', otherUser: t.receiver }))

            const allTrades = [...processedReceived, ...processedSent]
            setTrades(allTrades)

            // 2. Fetch Stickers Metadata for all involved Templates
            const templateIds = new Set<string>()
            allTrades.forEach((t: any) => {
                const tid = t.sender_album?.album_template_id
                if (tid) templateIds.add(tid)
            })

            if (templateIds.size > 0) {
                const { data: metaData } = await supabase
                    .from('stickers')
                    .select('album_id, sticker_number, display_code')
                    .in('album_id', Array.from(templateIds))

                if (metaData) {
                    const newMap: Record<string, Record<number, string>> = {}
                    metaData.forEach(m => {
                        if (!newMap[m.album_id]) newMap[m.album_id] = {}
                        newMap[m.album_id][m.sticker_number] = m.display_code
                    })
                    setCodeMap(newMap)
                }
            }

            setLoading(false)
        }

        fetchTrades()
    }, [user])

    // Acceptance State
    const [myAlbums, setMyAlbums] = useState<{ id: string, nickname: string | null, template: { name: string }, album_template_id: string }[]>([])
    const [tradeToAccept, setTradeToAccept] = useState<string | null>(null) // ID of trade being accepted
    const [destinationAlbumId, setDestinationAlbumId] = useState<string>('')
    const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false)

    useEffect(() => {
        if (!user) return
        supabase.from('user_albums').select('id, nickname, template:albums(name), album_template_id').eq('user_id', user.id)
            .then(({ data }) => {
                if (data) {
                    setMyAlbums(data as any)
                }
            })
    }, [user])

    const initiateAccept = (trade: Trade) => {
        setTradeToAccept(trade.id)

        // Auto-select the first matching album
        const templateId = trade.sender_album?.album_template_id
        if (templateId) {
            const match = myAlbums.find(a => a.album_template_id === templateId)
            if (match) setDestinationAlbumId(match.id)
            else setDestinationAlbumId('') // No matching album found (should warn user)
        }

        setIsAcceptDialogOpen(true)
    }

    const confirmAccept = async () => {
        if (!tradeToAccept || !destinationAlbumId) return

        try {
            // Call Procedure to Execute Trade
            const { error } = await supabase.rpc('execute_trade', {
                p_trade_id: tradeToAccept,
                p_receiver_album_id: destinationAlbumId
            })

            if (error) throw error

            alert('Troca realizada com sucesso! Seus álbuns foram atualizados.')
            setTrades(prev => prev.map(t => t.id === tradeToAccept ? { ...t, status: 'accepted' } : t))
            setIsAcceptDialogOpen(false)
            setTradeToAccept(null)

        } catch (error: any) {
            alert('Erro ao processar troca: ' + error.message)
            console.error(error)
        }
    }

    const handleReject = async (tradeId: string) => {
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

    // Helper to get Label
    const getLabel = (trade: Trade, stickerNum: number) => {
        const templateId = trade.sender_album?.album_template_id
        if (templateId && codeMap[templateId] && codeMap[templateId][stickerNum]) {
            return codeMap[templateId][stickerNum]
        }
        return stickerNum.toString()
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

                <div id="trades-tabs" className="flex gap-2 p-1 bg-gray-200 rounded-lg">
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
                    <div id="trades-list" className="grid gap-4">
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
                                    <div className="text-xs text-gray-400 mt-1 pl-10">
                                        Referente ao álbum: <span className="font-semibold text-gray-600">{trade.sender_album?.template?.name || 'Desconhecido'}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-red-50 p-2 rounded border border-red-100">
                                        <span className="font-bold text-red-700 block mb-1">
                                            {activeTab === 'received' ? 'Ele te dá:' : 'Você dá:'}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.offer_stickers.map((n: number) => (
                                                <span key={n} className="px-1 bg-white border rounded text-xs">
                                                    {getLabel(trade, n)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <span className="font-bold text-green-700 block mb-1">
                                            {activeTab === 'received' ? 'Você dá:' : 'Ele te dá:'}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {trade.request_stickers.map((n: number) => (
                                                <span key={n} className="px-1 bg-white border rounded text-xs">
                                                    {getLabel(trade, n)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 pt-0">
                                    {activeTab === 'received' && trade.status === 'pending' && (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/inbox?userId=${trade.sender_id}`)} title="Enviar Mensagem">
                                                <MessageCircle className="h-5 w-5 text-gray-500" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleReject(trade.id)}>Rejeitar</Button>
                                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => initiateAccept(trade)}>Aceitar</Button>
                                        </>
                                    )}
                                    {activeTab === 'sent' && trade.status === 'pending' && (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/inbox?userId=${trade.receiver_id}`)} title="Enviar Mensagem">
                                                <MessageCircle className="h-5 w-5 text-gray-500" />
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleCancelTrade(trade.id)}>Cancelar Proposta</Button>
                                        </>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

            </div>

            {/* Accept Modal */}
            {isAcceptDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Aceitar Troca</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Em qual álbum você deseja colar as figurinhas recebidas?
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500">Álbum de Destino:</label>
                                <select
                                    className="w-full border rounded p-2 mt-1"
                                    value={destinationAlbumId}
                                    onChange={(e) => setDestinationAlbumId(e.target.value)}
                                >
                                    {myAlbums
                                        .filter(a => {
                                            // Filter only albums that match the trade template
                                            if (!tradeToAccept) return true
                                            const tradeObj = trades.find(t => t.id === tradeToAccept)
                                            return tradeObj?.sender_album?.album_template_id === a.album_template_id
                                        })
                                        .map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.template.name}{a.nickname ? ` (${a.nickname})` : ''}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setIsAcceptDialogOpen(false)}>Cancelar</Button>
                                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={confirmAccept}>Confirmar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
