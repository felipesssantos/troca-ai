import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface AlbumTemplate {
    id: string
    name: string
    total_stickers: number
    cover_image: string
}

export default function AdminAlbums() {
    const navigate = useNavigate()
    const [albums, setAlbums] = useState<AlbumTemplate[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAlbums()
    }, [])

    const fetchAlbums = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('albums')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) {
            setAlbums(data)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Gerenciar Álbuns</h2>
                <Button onClick={() => navigate('/admin/albums/new')}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Álbum
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Capa</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Total de Figurinhas</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10">Carregando...</TableCell>
                            </TableRow>
                        ) : albums.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Nenhum álbum cadastrado.</TableCell>
                            </TableRow>
                        ) : (
                            albums.map((album) => (
                                <TableRow key={album.id}>
                                    <TableCell>
                                        <img src={album.cover_image} alt={album.name} className="h-12 w-8 object-cover rounded bg-gray-200" />
                                    </TableCell>
                                    <TableCell className="font-medium">{album.name}</TableCell>
                                    <TableCell>{album.total_stickers}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/albums/edit/${album.id}`)}>
                                            Editar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
