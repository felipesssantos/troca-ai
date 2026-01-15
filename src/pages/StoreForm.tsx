import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'

// Types
interface StoreData {
    id?: string
    name: string
    description: string
    address: string
    city: string
    state: string
    opening_hours: string
    instagram: string
    whatsapp: string
    show_whatsapp: boolean
}

interface StockItem {
    id?: string // store_stock id
    album_id: string
    template_name?: string
    has_packets: boolean
    has_singles: boolean
    price_packet: number | null
}

export default function StoreForm() {
    const { id } = useParams() // If ID exists, we are editing
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const isEditing = !!id && id !== 'new'

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<StoreData>({
        name: '', description: '', address: '', city: '', state: '', opening_hours: '', instagram: '', whatsapp: '', show_whatsapp: true
    })

    // Stock
    const [templates, setTemplates] = useState<{ id: string, name: string }[]>([])
    const [stock, setStock] = useState<StockItem[]>([])

    // New Item State
    const [selectedAlbumId, setSelectedAlbumId] = useState('')
    const [newItemHasSingles, setNewItemHasSingles] = useState(false)
    const [newItemHasPackets, setNewItemHasPackets] = useState(false)
    const [newItemPacketPrice, setNewItemPacketPrice] = useState('')

    // 1. Fetch Store Data + Available Templates
    useEffect(() => {
        if (!user) return

        const init = async () => {
            setLoading(true)

            // A. Fetch Album Templates (for Stock)
            const { data: tmpls } = await supabase.from('albums').select('id, name')
            if (tmpls) setTemplates(tmpls)

            // B. If Editing, fetch Store + Stock
            if (isEditing) {
                const { data: store } = await supabase
                    .from('stores').select('*').eq('id', id).single()

                if (store) {
                    setFormData(store)

                    const { data: stockData } = await supabase
                        .from('store_stock')
                        .select('*')
                        .eq('store_id', id)

                    if (stockData) {
                        // Map existing stock
                        const existingStock: StockItem[] = stockData.map(s => ({
                            ...s, template_name: tmpls?.find(t => t.id === s.album_id)?.name
                        }))
                        setStock(existingStock)
                    }
                }
            }
            setLoading(false)
        }
        init()
    }, [id, user])

    // Handlers
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setLoading(true)

        try {
            let storeId = id

            // 1. Upsert Store
            const storePayload = {
                owner_id: user.id,
                ...formData
            }

            if (isEditing) {
                await supabase.from('stores').update(storePayload).eq('id', id)
            } else {
                const { data, error } = await supabase.from('stores').insert(storePayload).select().single()
                if (error) throw error
                storeId = data.id
            }

            // 2. Upsert Stock (Loop through local stock state)
            for (const item of stock) {
                // If it has at least one checked or price, save it. If false/false/null, maybe delete? 
                // For simplicity, we just upsert.
                const payload = {
                    store_id: storeId,
                    album_id: item.album_id,
                    has_packets: item.has_packets,
                    has_singles: item.has_singles,
                    price_packet: item.price_packet || null,
                    last_updated: new Date().toISOString()
                }

                // Check if exists to determine insert/update key constraint
                // Actually upsert on unique(store_id, album_id) should work if unique constraint exists
                const { error } = await supabase.from('store_stock')
                    .upsert(payload, { onConflict: 'store_id, album_id' })

                if (error) console.error('Error saving stock', error)
            }

            navigate('/my-stores')

        } catch (error: any) {
            alert('Erro: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Tem certeza? Isso apagará a loja e todo o estoque.')) return
        await supabase.from('stores').delete().eq('id', id)
        navigate('/my-stores')
    }

    // Stock Handlers
    // Stock Handlers
    const handleAddStockItem = () => {
        if (!selectedAlbumId) return
        const template = templates.find(t => t.id === selectedAlbumId)

        const newItem: StockItem = {
            album_id: selectedAlbumId,
            template_name: template?.name,
            has_singles: newItemHasSingles,
            has_packets: newItemHasPackets,
            price_packet: newItemPacketPrice ? parseFloat(newItemPacketPrice) : null
        }

        setStock(prev => [...prev, newItem])

        // Reset inputs
        setSelectedAlbumId('')
        setNewItemHasSingles(false)
        setNewItemHasPackets(false)
        setNewItemPacketPrice('')
    }

    const handleRemoveStockItem = (albumId: string) => {
        if (confirm('Remover este álbum do estoque?')) {
            setStock(prev => prev.filter(s => s.album_id !== albumId))
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 pb-20">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Editar Loja' : 'Nova Loja'}</CardTitle>
                        <CardDescription>Preencha os dados do seu estabelecimento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">

                            <div className="space-y-4 border-b pb-6">
                                <h3 className="font-semibold text-gray-700">Dados Gerais</h3>
                                <div className="space-y-2">
                                    <Label>Nome da Loja</Label>
                                    <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Banca da Praça" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição</Label>
                                    <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Ponto de encontro aos sabados" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cidade</Label>
                                        <Input required value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Estado (UF)</Label>
                                        <Input required maxLength={2} value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Endereço Completo</Label>
                                    <Input required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Rua, Número, Bairro" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Horário de Funcionamento</Label>
                                    <Input required value={formData.opening_hours} onChange={e => setFormData({ ...formData, opening_hours: e.target.value })} placeholder="Seg-Sex 08h-18h" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Instagram (Opcional)</Label>
                                        <Input value={formData.instagram} onChange={e => setFormData({ ...formData, instagram: e.target.value })} placeholder="@instagram" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>WhatsApp (Opcional)</Label>
                                        <Input
                                            value={formData.whatsapp}
                                            onChange={e => {
                                                // Allow only numbers, spaces, dashes, parenthesis
                                                const val = e.target.value
                                                if (/^[\d\s()+-]*$/.test(val)) {
                                                    setFormData({ ...formData, whatsapp: val })
                                                }
                                            }}
                                            placeholder="(11) 99999-9999"
                                        />
                                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer pt-1">
                                            <input
                                                type="checkbox"
                                                checked={formData.show_whatsapp}
                                                onChange={e => setFormData({ ...formData, show_whatsapp: e.target.checked })}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            Mostrar WhatsApp no perfil da loja
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* SEÇÃO DE ESTOQUE */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                    📦 Estoque de Figurinhas
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Adicione os álbuns que você vende ou troca em sua loja.
                                </p>

                                {/* FORMULÁRIO DE ADIÇÃO */}
                                <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 space-y-4">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-indigo-900">Selecione o Álbum</Label>
                                            <select
                                                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={selectedAlbumId}
                                                onChange={(e) => setSelectedAlbumId(e.target.value)}
                                            >
                                                <option value="">Escolha um álbum...</option>
                                                {templates
                                                    .filter(t => !stock.find(s => s.album_id === t.id)) // Oculta já adicionados
                                                    .map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>

                                    {selectedAlbumId && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={newItemHasSingles}
                                                        onChange={e => setNewItemHasSingles(e.target.checked)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm font-medium">Vendo Avulsas</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded border hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={newItemHasPackets}
                                                        onChange={e => setNewItemHasPackets(e.target.checked)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-sm font-medium">Vendo Pacotinhos</span>
                                                </label>

                                                {newItemHasPackets && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-700">Preço do Pacote: R$</span>
                                                        <input
                                                            type="number"
                                                            step="0.10"
                                                            placeholder="0.00"
                                                            className="w-24 h-9 text-sm border rounded px-2"
                                                            value={newItemPacketPrice}
                                                            onChange={e => setNewItemPacketPrice(e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handleAddStockItem}
                                                disabled={!newItemHasSingles && !newItemHasPackets}
                                                className="w-full sm:w-auto"
                                            >
                                                Adicionar ao Estoque
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* LISTA DE ESTOQUE */}
                                <div className="space-y-2">
                                    {stock.length === 0 && (
                                        <p className="text-center text-sm text-gray-400 py-4 italic">
                                            Nenhum álbum adicionado ao estoque ainda.
                                        </p>
                                    )}
                                    {stock.map(item => (
                                        <div key={item.album_id} className="flex items-center justify-between bg-white p-3 rounded border shadow-sm">
                                            <div>
                                                <p className="font-semibold text-gray-800">{item.template_name}</p>
                                                <div className="flex gap-2 text-xs text-gray-500 mt-1">
                                                    {item.has_singles && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Avulsas</span>}
                                                    {item.has_packets && (
                                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                            Pacotinhos {item.price_packet ? `(R$ ${Number(item.price_packet).toFixed(2)})` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveStockItem(item.album_id)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="submit" disabled={loading} className="flex-1 w-full bg-indigo-600 hover:bg-indigo-700">
                                    {loading ? 'Salvando...' : 'Salvar Loja'}
                                </Button>
                                {isEditing && (
                                    <Button type="button" variant="destructive" onClick={handleDelete} className="w-12">
                                        <Trash2 size={18} />
                                    </Button>
                                )}
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
