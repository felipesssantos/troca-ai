import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Copy, ArrowRightLeft } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        albums: 0,
        trades: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)

            // Parallel requests for speed
            const [usersRes, albumsRes, tradesRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('user_albums').select('*', { count: 'exact', head: true }),
                supabase.from('trades').select('*', { count: 'exact', head: true })
            ])

            setStats({
                users: usersRes.count || 0,
                albums: albumsRes.count || 0,
                trades: tradesRes.count || 0
            })
            setLoading(false)
        }

        fetchStats()
    }, [])

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h2>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : stats.users}</div>
                        <p className="text-xs text-muted-foreground">Cadastrados na plataforma</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Álbuns Ativos</CardTitle>
                        <Copy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : stats.albums}</div>
                        <p className="text-xs text-muted-foreground">Coleções de usuários criadas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Trocas Realizadas</CardTitle>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : stats.trades}</div>
                        <p className="text-xs text-muted-foreground">Total de negociações (inbox)</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
