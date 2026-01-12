import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/minio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload } from 'lucide-react'

export default function AdminAlbumForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEditing = !!id

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(!!id)

    // Form State
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [totalStickers, setTotalStickers] = useState(670)
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null)

    useEffect(() => {
        if (isEditing) {
            const fetchAlbum = async () => {
                const { data, error } = await supabase
                    .from('albums')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) {
                    alert('Erro ao carregar álbum')
                    navigate('/admin/albums')
                    return
                }

                if (data) {
                    setName(data.name)
                    setSlug(data.slug)
                    setTotalStickers(data.total_stickers)
                    if (data.cover_image) {
                        setExistingCoverUrl(data.cover_image)
                        setPreviewUrl(data.cover_image)
                    }
                }
                setFetching(false)
            }
            fetchAlbum()
        }
    }, [id, isEditing, navigate])

    const handleNameChange = (val: string) => {
        setName(val)
        // Auto-generate slug only if creating new (optional choice, but better for editing not to change URL)
        if (!isEditing) {
            setSlug(val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''))
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0]
            setFile(selected)
            setPreviewUrl(URL.createObjectURL(selected))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let coverImageUrl = existingCoverUrl

            if (file) {
                const fileName = `covers/${Date.now()}-${file.name}`
                coverImageUrl = await uploadFile(file, fileName)
            }

            const payload = {
                name,
                slug,
                description: 'Álbum oficial',
                region: 'Global',
                total_stickers: Number(totalStickers),
                cover_image: coverImageUrl
            }

            let error

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('albums')
                    .update(payload)
                    .eq('id', id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('albums')
                    .insert(payload)
                error = insertError
            }

            if (error) throw error

            navigate('/admin/albums')
        } catch (err: any) {
            alert('Erro ao salvar álbum: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return <div className="p-8 text-center">Carregando dados do álbum...</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('/admin/albums')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <h1 className="text-2xl font-bold">{isEditing ? 'Editar Álbum' : 'Novo Álbum (Template)'}</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalhes do Álbum</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome do Álbum</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Ex: Copa do Mundo 2026"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (Identificador)</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="copa-2026"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="total">Total de Figurinhas</Label>
                            <Input
                                id="total"
                                type="number"
                                value={totalStickers}
                                onChange={(e) => setTotalStickers(Number(e.target.value))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Capa do Álbum</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="h-40 object-contain" />
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500">Clique para selecionar uma imagem</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Álbum')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
