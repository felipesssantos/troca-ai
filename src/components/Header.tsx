import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import NotificationBell from '@/components/NotificationBell'
import { SubscriptionManager } from '@/components/SubscriptionManager'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTour } from '@/hooks/useTour'

export default function Header() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [pendingTradesCount, setPendingTradesCount] = useState(0)
    const [profile, setProfile] = useState<{ username: string, avatar_url: string } | null>(null)

    useTour('main', [
        {
            popover: {
                title: 'Bem-vindo ao Troca.ai! 🏆',
                description: 'Sua plataforma definitiva para completar álbuns de figurinhas. Vamos fazer um tour rápido?',
            }
        },
        {
            element: '#main-header',
            popover: {
                title: 'Navegação Principal',
                description: 'Aqui você acessa suas propostas, a área de troca e seu perfil.',
                side: "bottom", align: 'start'
            }
        },
        {
            element: 'button[data-tour="community-btn"]',
            popover: {
                title: 'Área de Troca',
                description: 'Encontre outros colecionadores, veja os álbuns deles e inicie negociações.',
                side: "bottom", align: 'start'
            }
        },
        {
            element: 'button[data-tour="trades-btn"]',
            popover: {
                title: 'Suas Propostas',
                description: 'Gerencie as trocas que você enviou e recebeu. Fique de olho na bolinha de notificações! 🔴🟢',
                side: "bottom", align: 'start'
            }
        },
        {
            popover: {
                title: 'Como Controlar as Figurinhas? 🔢',
                description: `<div style="font-size: 14px; line-height: 1.6;"><strong>🖱️ No Computador:</strong><br/>• Clique <b>Esquerdo</b>: Adiciona (+1)<br/>• Clique <b>Direito</b>: Remove (-1)<br/><br/><strong>📱 No Celular:</strong><br/>• <b>Toque</b>: Adiciona (+1)<br/>• <b>Segure</b>: Remove (-1)</div>`
            }
        },
        {
            element: 'button[data-tour="profile-menu"]',
            popover: {
                title: 'Seu Perfil',
                description: 'Mude sua foto e gerencie seus dados aqui.',
                side: "bottom", align: 'start'
            }
        }
    ])

    const isActive = (path: string) => location.pathname === path

    useEffect(() => {
        if (!user) return

        // Fetch Profile for Avatar
        const fetchProfile = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single()
            if (data) setProfile(data)
        }
        fetchProfile()

        const fetchTradesCount = async () => {
            const { count } = await supabase
                .from('trades')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
            setPendingTradesCount(count || 0)
        }
        fetchTradesCount()

        // Subscribe to new trades (Realtime)
        const channel = supabase
            .channel('public:trades-header')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades', filter: `receiver_id=eq.${user.id}` },
                () => setPendingTradesCount(prev => prev + 1)
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [user])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/auth')
    }

    return (
        <div id="main-header" className="bg-white shadow-sm sticky top-0 z-50 p-2 sm:p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center sm:gap-4 flex-wrap">
                    <div className="cursor-pointer" onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="Troca.ai" className="h-12 w-auto object-contain" />
                    </div>
                    <div className="flex gap-1 sm:gap-2 items-center mt-1 sm:mt-0">
                        <Button
                            data-tour="trades-btn"
                            variant={isActive('/trades') ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => navigate('/trades')}
                            className={`relative ${isActive('/trades') ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}
                        >
                            Propostas
                            {pendingTradesCount > 0 && (
                                <span className={`absolute top-0 right-0 text-[10px] rounded-full h-4 w-4 flex items-center justify-center animate-bounce ${isActive('/trades') ? 'bg-white text-green-600' : 'bg-green-600 text-white'}`}>
                                    {pendingTradesCount}
                                </span>
                            )}
                        </Button>
                        <Button
                            data-tour="community-btn"
                            variant={isActive('/community') ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => navigate('/community')}
                            className={`mr-2 ${isActive('/community') ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}
                        >
                            <span className="hidden sm:inline">Área de Troca</span>
                            <span className="sm:hidden">Trocas</span>
                        </Button>

                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button data-tour="profile-menu" variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={profile?.avatar_url} alt={profile?.username} />
                                        <AvatarFallback>{profile?.username?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{profile?.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/profile/setup')}>
                                    👤 Editar Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/my-stores')}>
                                    🏪 Minhas Lojas
                                </DropdownMenuItem>
                                <SubscriptionManager />
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/faq')}>
                                    ❓ Perguntas Frequentes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/terms')}>
                                    📜 Termos de Uso
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/update-password')}>
                                    🔒 Alterar Senha
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                    🚪 Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    )
}
