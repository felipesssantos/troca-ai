import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, BookOpen } from 'lucide-react'

// Types
type AlbumTemplate = {
    id: string
    name: string
    total_stickers: number
    cover_image: string | null
}

type UserAlbum = {
    id: string
    nickname: string | null
    album_template_id: string
    template: AlbumTemplate // Joined data
}

export default function Dashboard() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

    // Data
    const [userAlbums, setUserAlbums] = useState<UserAlbum[]>([])
    const [templates, setTemplates] = useState<AlbumTemplate[]>([])

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [nickname, setNickname] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (!user) return

        const fetchData = async () => {
            try {
                // 1. Check Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single()

                if (!profile?.username) {
                    navigate('/profile/setup')
                    return
                }

                // 2. Fetch Templates
                const { data: templatesData } = await supabase
                    .from('albums')
                    .select('*')

                if (templatesData) setTemplates(templatesData)

                // 3. Fetch User Albums
                const { data: albumsData } = await supabase
                    .from('user_albums')
                    .select(`
                        id,
                        nickname,
                        album_template_id,
                        template:albums ( * )
                    `)
                    .eq('user_id', user.id)

                if (albumsData) {
                    // Start formatting as UserAlbum (casting because Supabase join return type inference can be tricky)
                    setUserAlbums(albumsData as unknown as UserAlbum[])
                }

            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [user, navigate])

    const handleCreateAlbum = async () => {
        if (!user || !selectedTemplate) return
        setCreating(true)

        try {
            const { error } = await supabase
                .from('user_albums')
                .insert({
                    user_id: user.id,
                    album_template_id: selectedTemplate,
                    nickname: nickname || null
                })

            if (error) throw error

            // Refresh list
            const { data: albumsData } = await supabase
                .from('user_albums')
                .select(`
                    id,
                    nickname,
                    album_template_id,
                    template:albums ( * )
                `)
                .eq('user_id', user.id)

            if (albumsData) setUserAlbums(albumsData as unknown as UserAlbum[])

            // Close and reset
            setIsDialogOpen(false)
            setNickname('')
            setSelectedTemplate('')

        } catch (err: any) {
            alert('Erro ao criar álbum: ' + err.message)
        } finally {
            setCreating(false)
        }
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Carregando painel...</div>
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Meus Álbuns</h2>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Novo Álbum
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Álbum</DialogTitle>
                            <DialogDescription>
                                Escolha uma das edições disponíveis para começar sua coleção.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="template">Edição / Modelo</Label>
                                <select
                                    id="template"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                >
                                    <option value="" disabled>Selecione um álbum...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.total_stickers} figs)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">Apelido (Opcional)</Label>
                                <Input
                                    id="nickname"
                                    placeholder="Ex: Para Trocas, Do meu filho..."
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={creating}>Cancelar</Button>
                            <Button onClick={handleCreateAlbum} disabled={!selectedTemplate || creating}>
                                {creating ? 'Criando...' : 'Adicionar Álbum'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {userAlbums.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-600">Nenhum álbum encontrado</h3>
                    <p className="text-gray-400 mb-4">Adicione seu primeiro álbum para começar a colecionar!</p>
                    <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                        Criar Álbum
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userAlbums.map(album => (
                        <Card
                            key={album.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500 group"
                            onClick={() => {
                                navigate(`/album/${album.id}`)
                            }}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        {album.template.name}
                                    </CardTitle>
                                    <BookOpen className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                                </div>
                                <CardDescription>
                                    {album.nickname ? (
                                        <span className="font-semibold text-blue-600">{album.nickname}</span>
                                    ) : (
                                        "Álbum Principal"
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="relative w-full h-32 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                                    {album.template.cover_image ? (
                                        <img src={album.template.cover_image} alt={album.template.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-green-100 flex items-center justify-center">
                                            <span className="text-4xl">⚽</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-between text-sm text-gray-600">
                                    <span>{album.template.total_stickers} figurinhas</span>
                                    <span className="font-bold text-blue-600">Abrir →</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
