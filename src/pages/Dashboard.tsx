import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, BookOpen, MoreVertical, Pencil, Eye, EyeOff, RotateCcw } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    is_public: boolean
}

export default function Dashboard() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

    // Data
    const [userAlbums, setUserAlbums] = useState<UserAlbum[]>([])
    const [templates, setTemplates] = useState<AlbumTemplate[]>([])

    // Create State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [nickname, setNickname] = useState('')
    const [creating, setCreating] = useState(false)

    // Rename State
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [albumToRename, setAlbumToRename] = useState<UserAlbum | null>(null)
    const [newNickname, setNewNickname] = useState('')

    // Request State
    const [requestMode, setRequestMode] = useState(false)
    const [reqName, setReqName] = useState('')
    const [reqDesc, setReqDesc] = useState('')

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
                        is_public,
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

        // 1. Check Limits (Free vs Premium)
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', user.id)
                .single()

            const isPremium = profile?.is_premium || false

            if (!isPremium) {
                // Check Global Limit (Max 3)
                if (userAlbums.length >= 3) {
                    navigate('/premium')
                    return
                }

                // Check Template Limit (Max 1 of this edition)
                const alreadyHasTemplate = userAlbums.some(a => a.album_template_id === selectedTemplate)
                if (alreadyHasTemplate) {
                    alert('Usuários Grátis só podem ter 1 álbum de cada edição. Seja Premium para ter ilimitados!')
                    navigate('/premium')
                    return
                }
            }
        } catch (err) {
            console.error('Error checking limits', err)
        }

        setCreating(true)

        try {
            const { error } = await supabase
                .from('user_albums')
                .insert({
                    user_id: user.id,
                    album_template_id: selectedTemplate,
                    nickname: nickname || null,
                    is_public: true // Default public
                })

            if (error) throw error

            // Refresh list
            const { data: albumsData } = await supabase
                .from('user_albums')
                .select(`
                    id,
                    nickname,
                    album_template_id,
                    is_public,
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

    const handleRequestAlbum = async () => {
        if (!user || !reqName) return
        setLoading(true)
        try {
            const { error } = await supabase
                .from('album_requests')
                .insert({
                    user_id: user.id,
                    album_name: reqName,
                    description: reqDesc
                })

            if (error) throw error
            if (error) throw error
            alert('Solicitação enviada com sucesso! \n\nVocê será notificado pelo app (🔔) assim que tivermos novidades sobre seu pedido.')
            setIsDialogOpen(false)
            setRequestMode(false)
            setReqName('')
            setReqDesc('')
        } catch (e: any) {
            alert('Erro: ' + e.message)
        } finally {
            setLoading(false)
        }
    }

    // ACTIONS
    const handleRenameAlbum = async () => {
        if (!albumToRename) return
        try {
            const { error } = await supabase
                .from('user_albums')
                .update({ nickname: newNickname || null })
                .eq('id', albumToRename.id)

            if (error) throw error

            setUserAlbums(prev => prev.map(a => a.id === albumToRename.id ? { ...a, nickname: newNickname || null } : a))
            setIsRenameOpen(false)
        } catch (e: any) {
            alert('Erro ao renomear: ' + e.message)
        }
    }

    const handleResetAlbum = async (e: React.MouseEvent, albumId: string) => {
        e.stopPropagation()
        const confirmText = prompt('ATENÇÃO: Você perderá TODAS as figurinhas marcadas neste álbum.\nDigite "RESETAR" para confirmar:')
        if (confirmText !== 'RESETAR') return

        try {
            const { error } = await supabase.rpc('reset_album_progress', { p_user_album_id: albumId })
            if (error) throw error
            alert('Álbum resetado com sucesso.')
        } catch (e: any) {
            alert('Erro ao resetar: ' + e.message)
        }
    }

    const toggleAlbumVisibility = async (e: React.MouseEvent, albumId: string, currentStatus: boolean) => {
        e.stopPropagation()
        // Logic moved inside Dropdown for better UX, but kept function if needed or call directly
        try {
            const { error } = await supabase
                .from('user_albums')
                .update({ is_public: !currentStatus })
                .eq('id', albumId)

            if (error) throw error

            setUserAlbums(prev => prev.map(a => a.id === albumId ? { ...a, is_public: !currentStatus } : a))
        } catch (err: any) {
            alert('Erro ao atualizar privacidade: ' + err.message)
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
                        {requestMode ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Solicitar Novo Álbum</DialogTitle>
                                    <DialogDescription>
                                        Informe qual álbum você gostaria de ver no Troca.ai.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Nome do Álbum</Label>
                                        <Input
                                            placeholder="Ex: Campeonato Mineiro 2025"
                                            value={reqName}
                                            onChange={(e) => setReqName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Descrição / Links (Opcional)</Label>
                                        <Input
                                            placeholder="Ex: Álbum virtual oficial..."
                                            value={reqDesc}
                                            onChange={(e) => setReqDesc(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setRequestMode(false)}>Voltar</Button>
                                    <Button onClick={handleRequestAlbum} disabled={!reqName}>Enviar Solicitação</Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
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

                                    <div className="text-center text-sm">
                                        <span className="text-gray-500">Não encontrou? </span>
                                        <button
                                            className="text-blue-600 hover:underline font-medium"
                                            onClick={() => setRequestMode(true)}
                                        >
                                            Solicitar Álbum
                                        </button>
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
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* RENAME DIALOG */}
                <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Renomear Álbum</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <Label>Novo Apelido</Label>
                            <Input
                                value={newNickname}
                                onChange={(e) => setNewNickname(e.target.value)}
                                placeholder="Ex: Álbum Principal"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>Cancelar</Button>
                            <Button onClick={handleRenameAlbum}>Salvar</Button>
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
                            className={`cursor-pointer hover:shadow-lg transition-shadow border-2 group relative ${!album.is_public ? 'border-dashed border-gray-300 bg-gray-50' : 'hover:border-blue-500'}`}
                            onClick={() => {
                                navigate(`/album/${album.id}`)
                            }}
                        >
                            {/* ACTIONS DROPDOWN */}
                            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white shadow-sm rounded-full">
                                            <MoreVertical size={16} className="text-gray-600" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Opções do Álbum</DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem onClick={(e) => toggleAlbumVisibility(e, album.id, album.is_public)}>
                                            {album.is_public ? (
                                                <><EyeOff size={16} className="mr-2" /> Tornar Privado</>
                                            ) : (
                                                <><Eye size={16} className="mr-2" /> Tornar Público</>
                                            )}
                                        </DropdownMenuItem>

                                        <DropdownMenuItem onClick={() => {
                                            setAlbumToRename(album)
                                            setNewNickname(album.nickname || '')
                                            setIsRenameOpen(true)
                                        }}>
                                            <Pencil size={16} className="mr-2" /> Renomear
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={(e) => handleResetAlbum(e, album.id)}
                                        >
                                            <RotateCcw size={16} className="mr-2" /> Resetar (Limpar)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="flex items-center gap-2 text-base pr-8">
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
                                        <img src={album.template.cover_image} alt={album.template.name} className={`w-full h-full object-cover ${!album.is_public ? 'grayscale opacity-70' : ''}`} />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br from-yellow-100 to-green-100 flex items-center justify-center ${!album.is_public ? 'grayscale' : ''}`}>
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
