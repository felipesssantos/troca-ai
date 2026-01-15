import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTour } from '@/hooks/useTour'
import { MapPin, Clock, Instagram, Store, Layers, Ticket, Loader2, Phone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Item {
    id: string
    username?: string // for Profiles
    avatar_url?: string // for Profiles
    // Common
    city: string | null
    state: string | null
    // Store specific
    name?: string
    address?: string
    opening_hours?: string
    instagram?: string
    whatsapp?: string
    show_whatsapp?: boolean
    stock_badges?: { has_packets: boolean, has_singles: boolean }
    // Type discriminator implicit
    is_store?: boolean
}

export default function Community() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'users' | 'stores'>('users')
    const [loading, setLoading] = useState(true)

    // Data
    const [users, setUsers] = useState<Item[]>([])
    const [stores, setStores] = useState<Item[]>([])
    const [displayItems, setDisplayItems] = useState<Item[]>([])

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [stateFilter, setStateFilter] = useState('')

    // Store Modal State
    const [selectedStore, setSelectedStore] = useState<Item | null>(null)
    const [storeDetails, setStoreDetails] = useState<any[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)

    const handleStoreClick = async (store: Item) => {
        setSelectedStore(store)
        setLoadingDetails(true)
        setStoreDetails([])

        try {
            const { data } = await supabase
                .from('store_stock')
                .select(`
                    has_packets,
                    has_singles,
                    price_packet,
                    album:albums(name)
                `)
                .eq('store_id', store.id)

            if (data) {
                // Flatten the structure for easier display
                const formatted = data.map((item: any) => ({
                    name: item.album?.name,
                    has_packets: item.has_packets,
                    has_singles: item.has_singles,
                    price_packet: item.price_packet
                }))
                setStoreDetails(formatted)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingDetails(false)
        }
    }

    useTour('community', [
        {
            element: '#community-grid',
            popover: { title: 'Colecionadores', description: 'Aqui você encontra outros usuários. Veja quais álbuns eles têm disponíveis.', side: "bottom", align: 'start' }
        }
    ])

    // 1. Fetch Data
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)

            // A. Fetch Users
            const { data: userData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, city, state')
                .eq('is_public', true)
                .neq('id', user?.id || '')
                .eq('account_type', 'user') // Explicitly only normal users

            // B. Fetch Stores (with stock)
            const { data: storeData } = await supabase
                .from('stores')
                .select(`
                    id, name, address, city, state, opening_hours, instagram, whatsapp, show_whatsapp,
                    stock:store_stock(has_packets, has_singles)
                `)

            if (userData) {
                setUsers(userData.map(u => ({ ...u, is_store: false })))
            }

            if (storeData) {
                // Process stock badges (aggregated)
                const processedStores = storeData.map((s: any) => {
                    const hasPackets = s.stock.some((st: any) => st.has_packets)
                    const hasSingles = s.stock.some((st: any) => st.has_singles)
                    return {
                        id: s.id,
                        name: s.name,
                        address: s.address,
                        city: s.city,
                        state: s.state,
                        opening_hours: s.opening_hours,
                        instagram: s.instagram,
                        whatsapp: s.whatsapp,
                        show_whatsapp: s.show_whatsapp,
                        stock_badges: { has_packets: hasPackets, has_singles: hasSingles },
                        is_store: true
                    }
                })
                setStores(processedStores)
            }

            setLoading(false)
        }
        fetchAll()
    }, [user])

    // 2. Filter Logic
    useEffect(() => {
        const source = activeTab === 'users' ? users : stores

        const filtered = source.filter(item => {
            const matchesCity = cityFilter ? item.city?.toLowerCase().includes(cityFilter.toLowerCase()) : true
            const matchesState = stateFilter ? item.state?.toLowerCase() === stateFilter.toLowerCase() : true

            let matchesSearch = true
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                if (item.is_store) {
                    matchesSearch = item.name?.toLowerCase().includes(term) || false
                } else {
                    matchesSearch = item.username?.toLowerCase().includes(term) || false
                }
            }

            return matchesCity && matchesState && matchesSearch
        })

        setDisplayItems(filtered)
    }, [activeTab, users, stores, searchTerm, cityFilter, stateFilter])


    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Comunidade</h1>
                    <Button variant="outline" onClick={() => navigate('/')}>Meu Álbum</Button>
                </div>

                {/* TABS */}
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <button
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'users' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Colecionadores
                    </button>
                    <button
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'stores' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('stores')}
                    >
                        Pontos de Troca 🏪
                    </button>
                </div>

                {/* FILTERS */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                        type="text"
                        placeholder={activeTab === 'stores' ? "Buscar Loja..." : "Buscar usuário (@)..."}
                        className="flex-1 p-2 border rounded-md shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Cidade"
                        className="w-full sm:w-32 p-2 border rounded-md shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                    />
                    <select
                        className="w-full sm:w-24 p-2 border rounded-md shadow-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                    >
                        <option value="">UF</option>
                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : displayItems.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-gray-500">
                            Nenhum resultado encontrado.
                        </CardContent>
                    </Card>
                ) : (
                    <div id="community-grid" className="grid gap-4 md:grid-cols-1">
                        {displayItems.map((item) => (
                            <Card
                                key={item.id}
                                className={`cursor-pointer hover:shadow-md transition-shadow ${item.is_store ? 'border-indigo-100 bg-indigo-50/30' : ''}`}
                                onClick={() => item.is_store ? handleStoreClick(item) : navigate(`/user/${item.username}`)}
                            >
                                <CardContent className="p-4 flex items-start gap-4">
                                    {/* AVATAR / ICON */}
                                    <Avatar className={`h-14 w-14 text-sm ${item.is_store ? 'border-2 border-indigo-200 bg-white' : 'bg-gray-200'}`}>
                                        {item.is_store ? (
                                            <AvatarFallback className="bg-white"><Store className="text-indigo-500 h-6 w-6" /></AvatarFallback>
                                        ) : (
                                            <>
                                                <AvatarImage src={item.avatar_url} />
                                                <AvatarFallback>{item.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </>
                                        )}
                                    </Avatar>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                {item.is_store ? (
                                                    <>
                                                        <h3 className="font-bold text-lg text-indigo-900">{item.name}</h3>
                                                        {/* BADGES */}
                                                        <div className="flex gap-2 mt-1 mb-2">
                                                            {item.stock_badges?.has_packets && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                                                    <Layers size={10} className="mr-1" /> PACOTINHOS
                                                                </span>
                                                            )}
                                                            {item.stock_badges?.has_singles && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                                    <Ticket size={10} className="mr-1" /> AVULSAS
                                                                </span>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <h3 className="font-semibold text-lg">@{item.username}</h3>
                                                )}
                                            </div>
                                        </div>

                                        {(item.city || item.state) && (
                                            <p className="text-xs text-gray-500 mb-2 flex items-center">
                                                <MapPin size={12} className="mr-1" />
                                                {item.city} - {item.state}
                                            </p>
                                        )}

                                        {item.is_store && (
                                            <div className="mt-2 space-y-1 text-sm text-gray-700 bg-white/50 p-2 rounded">
                                                {item.address && (
                                                    <p className="flex items-start text-xs"><MapPin size={12} className="mr-1.5 mt-0.5" /> {item.address}</p>
                                                )}
                                                {item.opening_hours && (
                                                    <p className="flex items-center text-xs text-green-700"><Clock size={12} className="mr-1.5" /> {item.opening_hours}</p>
                                                )}
                                                {item.instagram && (
                                                    <p className="flex items-center text-xs text-pink-600 font-medium"><Instagram size={12} className="mr-1.5" /> {item.instagram}</p>
                                                )}
                                                {item.whatsapp && item.show_whatsapp && (
                                                    <p className="flex items-center text-xs text-green-600 font-medium"><Phone size={12} className="mr-1.5" /> {item.whatsapp}</p>
                                                )}
                                            </div>
                                        )}

                                        {!item.is_store && <p className="text-sm text-blue-600 font-medium mt-1">Ver álbum e trocas</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* STORE DETAILS MODAL */}
            <Dialog open={!!selectedStore} onOpenChange={(open) => !open && setSelectedStore(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-900">
                            <Store className="h-5 w-5" />
                            {selectedStore?.name}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedStore?.city} - {selectedStore?.state}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedStore && (
                        <div className="space-y-4">
                            {/* Contact Info */}
                            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                {selectedStore.address && <p>📍 {selectedStore.address}</p>}
                                {selectedStore.opening_hours && <p>🕒 {selectedStore.opening_hours}</p>}
                                {selectedStore.instagram && <p className="text-pink-600 font-medium">📸 {selectedStore.instagram}</p>}
                                {selectedStore.whatsapp && selectedStore.show_whatsapp && (
                                    <p className="text-green-600 font-medium flex items-center gap-1">
                                        <Phone size={14} /> {selectedStore.whatsapp}
                                    </p>
                                )}
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">Álbuns e Produtos Disponíveis</h4>

                                {loadingDetails ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="animate-spin text-indigo-600" />
                                    </div>
                                ) : storeDetails.length === 0 ? (
                                    <p className="text-gray-500 italic text-center text-sm">Nenhuma informação de estoque disponível.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {storeDetails.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                <div className="flex flex-col items-end gap-1">
                                                    {item.has_singles && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                                                            AVULSAS
                                                        </span>
                                                    )}
                                                    {item.has_packets && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">
                                                            PACOTINHO {item.price_packet ? `R$ ${Number(item.price_packet).toFixed(2)}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
