import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/minio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function ProfileSetup() {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [phone, setPhone] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')

    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (user) {
            // Check if profile already exists
            const fetchProfile = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, phone, city, state')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    if (data.username) setUsername(data.username)
                    if (data.avatar_url) setPreviewUrl(data.avatar_url)
                    if (data.phone) setPhone(data.phone)
                    if (data.city) setCity(data.city)
                    if (data.state) setState(data.state)
                }
            }
            fetchProfile()
        }
    }, [user])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setPreviewUrl(URL.createObjectURL(selectedFile))
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setLoading(true)

        try {
            // 0. Validate Username Uniqueness
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', user.id) // Exclude current user
                .single()

            if (existingUser) {
                alert('Este nome de usuário já está em uso. Por favor, escolha outro.')
                setLoading(false)
                return
            }

            let avatarUrl = previewUrl

            if (file) {
                const fileName = `avatars/${user.id}/${Date.now()}-${file.name}`
                // Use the new helper that uses AWS SDK v3
                avatarUrl = await uploadFile(file, fileName)
            }

            // 2. Update Supabase Profile
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    username,
                    phone,
                    city,
                    state,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })

            if (error) throw error

            navigate('/')
        } catch (err: any) {
            alert(`Erro ao salvar perfil: ${err.message}`)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Seu Perfil</CardTitle>
                    <CardDescription>Escolha um nome único e uma foto para o álbum.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">

                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="w-24 h-24 border-2 border-gray-200">
                                <AvatarImage src={previewUrl || ''} />
                                <AvatarFallback>{username.slice(0, 2).toUpperCase() || 'EU'}</AvatarFallback>
                            </Avatar>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full max-w-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username (@)</Label>
                            <Input
                                id="username"
                                placeholder="ex: felipesssantos"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone / WhatsApp</Label>
                            <Input
                                id="phone"
                                placeholder="(11) 99999-9999"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Cidade</Label>
                                <Input
                                    id="city"
                                    placeholder="São Paulo"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">Estado (UF)</Label>
                                <Input
                                    id="state"
                                    placeholder="SP"
                                    maxLength={2}
                                    value={state}
                                    onChange={(e) => setState(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Salvando...' : 'Entrar no Álbum'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
