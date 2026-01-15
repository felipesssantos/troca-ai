import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle, Store, MapPin } from 'lucide-react'

interface StoreType {
    id: string
    name: string
    city: string
    state: string
}

export default function MyStores() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [stores, setStores] = useState<StoreType[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return

        const fetchStores = async () => {
            const { data } = await supabase
                .from('stores')
                .select('id, name, city, state')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })

            if (data) setStores(data)
            setLoading(false)
        }

        fetchStores()
    }, [user])

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Minhas Lojas</h1>
                        <p className="text-muted-foreground">Gerencie seus pontos de troca.</p>
                    </div>
                    <Button onClick={() => navigate('/my-stores/new')} className="bg-indigo-600 hover:bg-indigo-700">
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Loja
                    </Button>
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : stores.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Store className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Nenhuma loja criada</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm">
                                Se você tem um estabelecimento comercial e aceita trocas de figurinhas, cadastre-o aqui para aparecer na Comunidade!
                            </p>
                            <Button variant="outline" onClick={() => navigate('/my-stores/new')}>
                                Cadastrar Ponto de Troca
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {stores.map((store) => (
                            <Card
                                key={store.id}
                                className="cursor-pointer hover:shadow-md transition-shadow border-indigo-100"
                                onClick={() => navigate(`/my-stores/${store.id}`)}
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-indigo-100 p-3 rounded-full">
                                            <Store className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-indigo-900">{store.name}</h3>
                                            <p className="text-sm text-gray-500 flex items-center">
                                                <MapPin size={12} className="mr-1" />
                                                {store.city} - {store.state}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">Editar →</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
