import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Request = {
    id: string
    user_id: string
    album_name: string
    description: string
    status: 'pending' | 'approved' | 'rejected' | 'completed'
    created_at: string
    profile: {
        username: string
        avatar_url: string
    }
}

export default function AdminRequests() {
    const [requests, setRequests] = useState<Request[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRequests = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('album_requests')
            .select(`
                *,
                profile:profiles(username, avatar_url)
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
        } else {
            // Safe cast or format
            setRequests(data as any[])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const updateStatus = async (id: string, newStatus: string, userId: string, albumName: string) => {
        // 1. Update Status
        const { error } = await supabase
            .from('album_requests')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            alert('Erro ao atualizar status: ' + error.message)
            return
        }

        // 2. Notify User
        let title = 'Atualização do Pedido'
        let message = `O status do seu pedido para o álbum "${albumName}" mudou.`

        if (newStatus === 'completed') {
            title = 'Álbum Disponível! 🎉'
            message = `O álbum "${albumName}" que você pediu já está disponível na plataforma!`
        } else if (newStatus === 'rejected') {
            title = 'Pedido Recusado'
            message = `Infelizmente não podemos adicionar o álbum "${albumName}" no momento.`
        }

        await supabase.from('notifications').insert({
            user_id: userId,
            title,
            message,
            type: 'request_update'
        })

        fetchRequests()
    }

    if (loading) return <div>Carregando solicitações...</div>

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Solicitações de Álbuns</h2>
                <p className="text-muted-foreground">Veja o que os usuários estão pedindo.</p>
            </div>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <Card><CardContent className="p-6">Nenhuma solicitação encontrada.</CardContent></Card>
                ) : (
                    requests.map(req => (
                        <Card key={req.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{req.album_name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <span>Por @{req.profile?.username}</span>
                                            <span>•</span>
                                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                        </CardDescription>
                                    </div>
                                    <Badge variant={
                                        req.status === 'completed' ? 'default' : // Green-ish usually default or success
                                            req.status === 'rejected' ? 'destructive' :
                                                req.status === 'approved' ? 'secondary' :
                                                    'outline'
                                    }>
                                        {req.status.toUpperCase()}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {req.description && (
                                    <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm flex gap-2">
                                        <MessageSquare size={16} className="text-gray-400 mt-0.5" />
                                        <p>{req.description}</p>
                                    </div>
                                )}

                                {req.status === 'pending' && (
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => updateStatus(req.id, 'rejected', req.user_id, req.album_name)}
                                        >
                                            <X className="mr-2 h-4 w-4" /> Rejeitar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-green-600 text-green-600 hover:bg-green-50"
                                            onClick={() => updateStatus(req.id, 'completed', req.user_id, req.album_name)}
                                        >
                                            <Check className="mr-2 h-4 w-4" /> Marcar como Feito
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
