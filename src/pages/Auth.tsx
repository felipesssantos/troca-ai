import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

type AuthView = 'login' | 'signup' | 'forgot_password'

export default function AuthPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [view, setView] = useState<AuthView>('login')
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (view === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                setMessage('Verifique seu e-mail para confirmar o cadastro!')
            } else if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error

                // Check if there is a redirect param
                const params = new URLSearchParams(window.location.search)
                const redirect = params.get('redirect')
                navigate(redirect || '/dashboard')
            } else if (view === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/update-password`,
                })
                if (error) throw error
                setMessage('Verifique seu e-mail para redefinir sua senha.')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                }
            })
            if (error) throw error
        } catch (err: any) {
            setError(err.message)
        }
    }

    const renderForm = () => {
        if (view === 'forgot_password') {
            return (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="button" variant="link" className="px-0" onClick={() => setView('login')}>
                        Voltar para o login
                    </Button>
                </>
            )
        }

        return (
            <>
                <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        <Button
                            type="button"
                            variant="link"
                            className="px-0 h-auto text-xs"
                            onClick={() => setView('forgot_password')}
                        >
                            Esqueci minha senha
                        </Button>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
            </>
        )
    }

    const getTitle = () => {
        switch (view) {
            case 'login': return 'Entrar na Plataforma'
            case 'signup': return 'Criar Conta'
            case 'forgot_password': return 'Recuperar Senha'
        }
    }

    const getDescription = () => {
        switch (view) {
            case 'login': return 'Bem-vindo de volta! Faça login para continuar.'
            case 'signup': return 'Preencha os dados para começar sua coleção.'
            case 'forgot_password': return 'Digite seu e-mail para receber um link de redefinição.'
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex justify-center mb-4">
                        <img src="/logo.png" alt="Troca.ai" className="h-16 w-auto" />
                    </CardTitle>
                    <CardTitle className="text-center">
                        {getTitle()}
                    </CardTitle>
                    <CardDescription>
                        {getDescription()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        {renderForm()}

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {message && <p className="text-sm text-green-600 font-medium">{message}</p>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Carregando...' :
                                view === 'login' ? 'Entrar' :
                                    view === 'signup' ? 'Cadastrar' : 'Enviar Link'}
                        </Button>

                        {view !== 'forgot_password' && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-muted-foreground">Ou continue com</span>
                                    </div>
                                </div>
                                <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                    </svg>
                                    Google
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    {view !== 'forgot_password' && (
                        <Button variant="link" onClick={() => setView(view === 'login' ? 'signup' : 'login')}>
                            {view === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem uma conta? Entrar'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
