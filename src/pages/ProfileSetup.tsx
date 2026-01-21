import { useState, useEffect } from 'react'
import { formatPhone } from '@/lib/utils'
// Profile Setup Page
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { uploadFile, deleteFileFromUrl } from '@/lib/minio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Check, X } from 'lucide-react'

export default function ProfileSetup() {
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [phone, setPhone] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [isPublic, setIsPublic] = useState(true)

    // Validation State
    const [isCheckingUsername, setIsCheckingUsername] = useState(false)
    const [usernameError, setUsernameError] = useState<string | null>(null)
    const [isUsernameValid, setIsUsernameValid] = useState(false)

    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)

    // Initial Data Fetch
    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, phone, city, state, is_public, first_name, last_name, birth_date')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    if (data.username) {
                        setUsername(data.username)
                        setIsUsernameValid(true) // Assumes current own username is valid
                    }
                    if (data.avatar_url) {
                        setPreviewUrl(data.avatar_url)
                        setCurrentAvatarUrl(data.avatar_url)
                    }
                    if (data.phone) setPhone(formatPhone(data.phone))
                    if (data.city) setCity(data.city)
                    if (data.state) setState(data.state)
                    if (data.first_name) setFirstName(data.first_name)
                    if (data.last_name) setLastName(data.last_name)
                    if (data.birth_date) setBirthDate(data.birth_date)
                    if (data.is_public !== undefined) setIsPublic(data.is_public)
                }
            }
            fetchProfile()
        }
    }, [user])

    // ... (Debounced Username Check - KEEP AS IS) ...

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

        // Block if invalid
        if (!isUsernameValid) {
            alert('Por favor, escolha um nome de usuário válido.')
            return
        }

        // Validate Phone (Must be 15 chars: (XX) XXXXX-XXXX)
        if (phone.length < 15) {
            alert('O telefone deve ter 11 dígitos (formato celular).')
            return
        }

        setLoading(true)

        try {
            let avatarUrl = previewUrl

            if (file) {
                if (currentAvatarUrl) {
                    await deleteFileFromUrl(currentAvatarUrl)
                }

                const fileName = `avatars/${user.id}/${Date.now()}-${file.name}`
                avatarUrl = await uploadFile(file, fileName)
            }

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    birth_date: birthDate,
                    phone: phone.replace(/\D/g, ''), // Save only numbers
                    city,
                    state,
                    is_public: isPublic,
                    avatar_url: avatarUrl,
                    updated_at: new Date().toISOString(),
                })

            if (error) throw error

            navigate('/')
        } catch (err: any) {
            alert(`Erro ao salvar perfil: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Seu Perfil</CardTitle>
                    <CardDescription>Configure seus dados para ser encontrado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">

                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="w-24 h-24 border-2 border-gray-200">
                                <AvatarImage src={previewUrl || ''} />
                                <AvatarFallback>{username?.slice(0, 2).toUpperCase() || 'EU'}</AvatarFallback>
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
                            <div className="relative">
                                <Input
                                    id="username"
                                    placeholder="ex: felipesssantos"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                    maxLength={30}
                                    className={usernameError ? "border-red-500 pr-10" : "pr-10"}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {isCheckingUsername && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                                    {!isCheckingUsername && username.length >= 3 && isUsernameValid && <Check className="h-4 w-4 text-green-500" />}
                                    {!isCheckingUsername && username.length >= 3 && !isUsernameValid && <X className="h-4 w-4 text-red-500" />}
                                </div>
                            </div>
                            {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Nome</Label>
                                <Input
                                    id="firstName"
                                    placeholder="João"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Sobrenome</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Silva"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birthDate">Data de Nascimento</Label>
                            <Input
                                id="birthDate"
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone / WhatsApp</Label>
                            <Input
                                id="phone"
                                placeholder="(11) 99999-9999"
                                value={phone}
                                onChange={(e) => setPhone(formatPhone(e.target.value))}
                                required
                                minLength={15}
                                maxLength={15}
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

                        <div className="flex items-center space-x-2 bg-white p-3 rounded border">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="isPublic" className="font-bold">
                                    Perfil Público
                                </Label>
                                <p className="text-sm text-gray-500">
                                    Se desmarcado, você não aparecerá na lista da Comunidade.
                                </p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading || !isUsernameValid}>
                            {loading ? 'Salvando...' : 'Salvar Perfil'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
