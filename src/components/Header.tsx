import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Header() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [pendingTradesCount, setPendingTradesCount] = useState(0)
    const [profile, setProfile] = useState<{ username: string, avatar_url: string } | null>(null)

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
        <div className="bg-white shadow-sm sticky top-0 z-50 p-4">
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800 cursor-pointer" onClick={() => navigate('/')}>
                        Copa 2026 🇧🇷
                    </h1>
                    <div className="flex gap-2 items-center">
                        <Button variant="default" size="sm" onClick={() => navigate('/trades')} className="relative mr-2">
                            📩 Propostas
                            {pendingTradesCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                                    {pendingTradesCount}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/community')} className="mr-2">Comunidade</Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
