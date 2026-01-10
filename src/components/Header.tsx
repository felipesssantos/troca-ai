import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function Header() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [pendingTradesCount, setPendingTradesCount] = useState(0)

    useEffect(() => {
        if (!user) return
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
                    <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={() => navigate('/trades')} className="relative">
                            📩 Propostas
                            {pendingTradesCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                                    {pendingTradesCount}
                                </span>
                            )}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/community')}>Comunidade</Button>
                        <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
