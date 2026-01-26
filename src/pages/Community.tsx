import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTour } from '@/hooks/useTour'
import { MapPin, Clock, Instagram, Store, Layers, Ticket, Loader2, Phone, ChevronRight, Lock, Bot } from 'lucide-react'
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
    // Perfect Match State
    const [isPremium, setIsPremium] = useState(false)
    const [matches, setMatches] = useState<any[]>([])
    const [matchCount, setMatchCount] = useState<number | null>(null)
    const [loadingMatches, setLoadingMatches] = useState(false)
    const [userAlbums, setUserAlbums] = useState<any[]>([])
    const [selectedMatchAlbumId, setSelectedMatchAlbumId] = useState<string | null>(null)

    // Standard State (Restored)
    const [activeTab, setActiveTab] = useState<'users' | 'stores' | 'matches'>('users')
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

            // 0. Check Premium Status & Current User Info
            if (user) {
                const { data: myProfile } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single()

                if (myProfile) setIsPremium(myProfile.is_premium || false)

                // Fetch User Albums for matching selection
                const { data: myAlbums } = await supabase
                    .from('user_albums')
                    .select('id, nickname, album_template_id, album:albums(name)')
                    .eq('user_id', user.id)

                if (myAlbums && myAlbums.length > 0) {
                    setUserAlbums(myAlbums)
                    // Select first one by default if not set
                    if (!selectedMatchAlbumId) {
                        setSelectedMatchAlbumId(myAlbums[0].id)
                    }
                }
            }

            // A. Fetch Users
            const { data: userData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, city, state')
                .eq('is_public', true)
                .neq('id', user?.id || '')
                .eq('account_type', 'user') // Explicitly only normal users

            // B. Fetch Stores (with stock) - ONLY from Premium or Partner users
            const { data: storeData } = await supabase
                .from('stores')
                .select(`
                    id, name, address, city, state, opening_hours, instagram, whatsapp, show_whatsapp,
                    owner_id,
                    owner:profiles(is_premium, is_partner),
                    stock:store_stock(has_packets, has_singles)
                `)
            // The !inner join automatically filters stores where the profile doesn't match the condition if we add a filter
            // But Supabase JS filter syntax on joined tables can be tricky.
            // A simpler way often used is filtering in the application layer if data size is small, but for security/scale:
            // Let's rely on the query response. If we filter in JS it handles the OR logic easier.

            if (userData) {
                setUsers(userData.map(u => ({ ...u, is_store: false })))
            }

            if (storeData) {
                // Filter verified stores (Premium OR Partner)
                const verifiedStores = storeData.filter((s: any) => {
                    const isPrem = s.owner?.is_premium === true
                    const isPart = s.owner?.is_partner === true
                    return isPrem || isPart
                })

                // Process stock badges (aggregated)
                const processedStores = verifiedStores.map((s: any) => {
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

    // Load Matches when tab changes or album selection changes
    useEffect(() => {
        if (activeTab === 'matches' && user && selectedMatchAlbumId) {
            setMatches([]) // Clear previous results immediately
            const loadMatches = async () => {
                setLoadingMatches(true)
                try {
                    if (isPremium) {
                        const { data: matchData, error } = await supabase.rpc('get_perfect_matches', {
                            p_user_id: user.id,
                            p_user_album_id: selectedMatchAlbumId
                        })

                        if (error) throw error
                        if (matchData) setMatches(matchData)
                    } else {
                        // Free: Fetch Count Only (Teaser)
                        console.log('Fetching match count (Teaser) for:', selectedMatchAlbumId)
                        const { data: count, error } = await supabase.rpc('get_perfect_matches_count', {
                            p_user_id: user.id,
                            p_user_album_id: selectedMatchAlbumId,
                            p_city: cityFilter || null,
                            p_state: stateFilter || null
                        })
                        console.log('Match Count Result:', count, error)

                        if (error) throw error
                        setMatchCount(count)
                    }

                } catch (err) {
                    console.error('Error loading matches', err)
                } finally {
                    setLoadingMatches(false)
                }
            }
            loadMatches()
        }
    }, [activeTab, user, isPremium, selectedMatchAlbumId, cityFilter, stateFilter])

    // 2. Filter Logic
    useEffect(() => {
        let source: Item[] = []

        if (activeTab === 'users') source = users
        if (activeTab === 'stores') source = stores
        // Matches are handled separately in render for now, or we can unify
        if (activeTab === 'matches') {
            // If premium, we use matches state. If not, we don't display items here (teaser handled in render)
            setDisplayItems([])
            return
        }

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
    }, [activeTab, users, stores, matches, searchTerm, cityFilter, stateFilter])


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
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'matches' ? 'bg-white shadow text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('matches')}
                    >
                        AI Match <Bot size={16} />
                    </button>
                    <button
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'stores' ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('stores')}
                    >
                        Lojas 🏪
                    </button>
                </div>

                {/* FILTERS */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                        type="text"
                        placeholder={activeTab === 'stores' ? "Buscar Loja..." : activeTab === 'matches' ? "Filtrar por nome..." : "Buscar usuário (@)..."}
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

                {/* CONTENT AREA */}
                {/* CONTENT AREA */}
                {activeTab === 'matches' ? (
                    <div className="space-y-4">
                        {/* Album Selector (If multiple) or Badge */}
                        {userAlbums.length > 0 && (
                            <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">Comparar com meu álbum:</span>
                                <select
                                    className="flex-1 p-1.5 border rounded text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-pink-500"
                                    value={selectedMatchAlbumId || ''}
                                    onChange={(e) => setSelectedMatchAlbumId(e.target.value)}
                                >
                                    {userAlbums.map((ua) => (
                                        <option key={ua.id} value={ua.id}>
                                            {ua.album?.name} {ua.nickname ? `- ${ua.nickname}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isPremium ? (
                            <div className="space-y-4">
                                {loadingMatches ? (
                                    <div className="text-center py-10"><Loader2 className="animate-spin h-8 w-8 mx-auto text-pink-500" /> Buscando matches...</div>
                                ) : matches.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-8 text-center text-gray-500">
                                            <p className="text-lg">Nenhum "AI Match" encontrado ainda.</p>
                                            <p className="text-sm mt-2">Isso acontece quando ninguém tem o que você quer E quer o que você tem ao mesmo tempo.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid gap-3">
                                        <div className="bg-pink-50 border border-pink-100 p-3 rounded text-sm text-pink-800 flex items-center gap-2">
                                            <span className="text-lg">🎯</span>
                                            Estes usuários têm figurinhas que você precisa E precisam das suas repetidas!
                                        </div>
                                        {matches
                                            .filter(match => {
                                                const matchesCity = cityFilter ? match.city?.toLowerCase().includes(cityFilter.toLowerCase()) : true
                                                const matchesState = stateFilter ? match.state?.toLowerCase() === stateFilter.toLowerCase() : true
                                                return matchesCity && matchesState
                                            })
                                            .map((match: any) => (
                                                <Card
                                                    key={match.match_user_id}
                                                    className="cursor-pointer hover:shadow-md transition-all border-pink-100"
                                                    onClick={() => navigate(`/user/${match.username}`, {
                                                        state: {
                                                            myAlbumId: selectedMatchAlbumId,
                                                            theirAlbumId: match.their_album_id
                                                        }
                                                    })}
                                                >
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <Avatar className="h-12 w-12 border-2 border-pink-100">
                                                                <AvatarImage src={match.avatar_url} />
                                                                <AvatarFallback>{match.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <h3 className="font-bold text-gray-800">@{match.username}</h3>
                                                                {(match.city || match.state) && (
                                                                    <p className="text-xs text-gray-500 flex items-center mb-1">
                                                                        <MapPin className="w-3 h-3 mr-1" />
                                                                        {[match.city, match.state].filter(Boolean).join(', ')}
                                                                    </p>
                                                                )}
                                                                <div className="flex gap-2 text-xs">
                                                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">Você recebe: {match.stickers_i_receive}</span>
                                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">Você dá: {match.stickers_i_give}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="text-pink-500"><ChevronRight /></Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative border rounded-lg bg-pink-50 overflow-hidden flex flex-col items-center justify-center p-8 min-h-[400px]">
                                {/* BLURRED BACKGROUND (Fake Results) */}
                                <div className="absolute inset-0 z-0 opacity-40 blur-sm pointer-events-none p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <Card key={i} className="h-32 bg-white/80 border-pink-100" />
                                        ))}
                                    </div>
                                </div>

                                {/* MODAL / CONTENT */}
                                <div className="relative z-10 bg-white p-8 rounded-xl shadow-xl max-w-md w-full space-y-5 text-center border-2 border-pink-100">
                                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
                                        <Lock className="w-8 h-8 text-pink-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Funcionalidade Premium</h3>
                                        <p className="text-sm text-gray-500 mt-1">Desbloqueie o poder do AI Match</p>
                                    </div>

                                    {loadingMatches ? (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-pink-500" /></div>
                                    ) : matchCount !== null && matchCount > 0 ? (
                                        <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                                            <p className="text-gray-800 mb-1">Encontramos para você:</p>
                                            <p className="text-3xl font-bold text-pink-600">{matchCount}</p>
                                            <p className="text-sm text-gray-600 font-medium">Pessoas com trocas perfeitas!</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-600">
                                            O <span className="font-semibold">AI Match</span> cruza seus dados com toda a comunidade e encontra quem quer trocar exatamente com você.
                                        </p>
                                    )}

                                    <Button
                                        onClick={() => navigate('/premium')}
                                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <span className="md:hidden">Seja Premium 🚀</span>
                                        <span className="hidden md:inline">Seja Premium e Troque Agora 🚀</span>
                                    </Button>
                                    <p className="text-xs text-gray-400">Economize horas procurando manualmente.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* ORIGINAL LIST RENDER (Users / Stores) */}
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
                    </>
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
