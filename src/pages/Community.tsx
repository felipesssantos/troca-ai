import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Profile {
    id: string
    username: string
    avatar_url: string
}

export default function Community() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)

    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true)
            // Fetch all profiles except my own
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
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

    const filteredProfiles = profiles.filter(profile =>
        profile.username.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold">Comunidade</h1>
                    <Button variant="outline" onClick={() => navigate('/')}>Meu Álbum</Button>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar usuário..."
                        className="w-full p-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                    <div className="grid gap-4">
                        {filteredProfiles.map((profile) => (
                            <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/user/${profile.username}`)}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Avatar className="h-12 w-12 text-sm bg-gray-200">
                                        <AvatarImage src={profile.avatar_url} />
                                        <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">@{profile.username}</h3>
                                        <p className="text-sm text-gray-500">Ver álbum e trocas</p>
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
