import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTour } from '@/hooks/useTour'

interface Profile {
    id: string
    username: string
    avatar_url: string
    city: string | null
    state: string | null
}

export default function Community() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    useTour('community', [
        {
            element: '#community-grid > div:first-child',
            popover: { title: 'Colecionadores', description: 'Aqui você encontra outros usuários. Veja quais álbuns eles têm disponíveis.', side: "bottom", align: 'start' }
        },
        {
            element: '#community-grid > div:first-child button',
            popover: { title: 'Ver Álbuns', description: 'Clique aqui para ver as figurinhas repetidas e faltantes desse usuário.', side: "bottom", align: 'start' }
        }
    ])

    const [searchTerm, setSearchTerm] = useState('')
    const [cityFilter, setCityFilter] = useState('')
    const [stateFilter, setStateFilter] = useState('')

    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true)
            // Fetch all profiles except my own
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, city, state')
                .neq('id', user?.id || '')

            if (error) {
                console.error(error)
            } else {
                setProfiles(data || [])
            }
            setLoading(false)
        }

        if (user) fetchProfiles()
    }, [user])

    const filteredProfiles = profiles.filter(profile => {
        const matchesUsername = profile.username.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCity = cityFilter ? profile.city?.toLowerCase().includes(cityFilter.toLowerCase()) : true
        const matchesState = stateFilter ? profile.state?.toLowerCase() === stateFilter.toLowerCase() : true

        return matchesUsername && matchesCity && matchesState
    })

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Comunidade</h1>
                    <Button variant="outline" onClick={() => navigate('/')}>Meu Álbum</Button>
                </div>

                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                        type="text"
                        placeholder="Buscar usuário (@)..."
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
                    <p>Carregando usuários...</p>
                ) : filteredProfiles.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-gray-500">
                            {searchTerm ? 'Nenhum usuário encontrado com esse nome.' : 'Nenhum outro usuário encontrado. Convide amigos!'}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {filteredProfiles.map((profile) => (
                            <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/user/${profile.username}`)}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-12 w-12 text-sm bg-gray-200">
                                        <AvatarImage src={profile.avatar_url} />
                                        <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">@{profile.username}</h3>
                                        {(profile.city || profile.state) && (
                                            <p className="text-xs text-gray-500 mb-1">
                                                {profile.city ? profile.city : ''}
                                                {profile.city && profile.state ? ' - ' : ''}
                                                {profile.state ? profile.state : ''}
                                            </p>
                                        )}
                                        <p className="text-sm text-blue-600 font-medium">Ver álbum e trocas</p>
                                    </div>
                                    <Button size="sm">Ver Trocas</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
