import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Store, ArrowRightLeft } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        stores: 0,
        tradesToday: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            // 1. Parallel KPI Requests
            const [usersRes, storesRes, tradesTodayRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('stores').select('*', { count: 'exact', head: true }),
                supabase.from('trades').select('*', { count: 'exact', head: true })
                    .gte('created_at', today.toISOString())
            ])

            // 2. Fetch Data for Chart (New Users last 30 days)
            const { data: usersHistory } = await supabase
                .from('profiles')
                .select('created_at, is_premium')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: true })

            // Process Chart Data
            const dailyData = new Map<string, { total: number, premium: number }>()

            // Initialize last 30 days with 0
            for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
                dailyData.set(d.toISOString().split('T')[0], { total: 0, premium: 0 })
            }

            usersHistory?.forEach(u => {
                const date = u.created_at.split('T')[0]
                if (dailyData.has(date)) {
                    const current = dailyData.get(date)!
                    dailyData.set(date, {
                        total: current.total + 1,
                        premium: current.premium + (u.is_premium ? 1 : 0)
                    })
                }
            })

            const processedChartData = Array.from(dailyData.entries()).map(([date, counts]) => ({
                date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                users: counts.total,
                premium: counts.premium
            }))

            setStats({
                users: usersRes.count || 0,
                stores: storesRes.count || 0,
                tradesToday: tradesTodayRes.count || 0
            })
            setChartData(processedChartData)
            setLoading(false)
        }

        fetchStats()
    }, [])

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h2>

            {/* KPIs */}
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
                        <CardTitle className="text-sm font-medium">Trocas Hoje</CardTitle>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : stats.tradesToday}</div>
                        <p className="text-xs text-muted-foreground">Negociações iniciadas hoje</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lojas Ativas</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : stats.stores}</div>
                        <p className="text-xs text-muted-foreground">Pontos de troca cadastrados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Growth Chart */}
            <div className="grid gap-4 md:grid-cols-1">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Crescimento de Usuários</CardTitle>
                        <CardDescription>
                            Novos cadastros (Total vs Premium) nos últimos 30 dias
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    Carregando gráfico...
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="users"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorUsers)"
                                            name="Novos Usuários"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="premium"
                                            stroke="#fbbf24"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorPremium)"
                                            name="Novos Premium"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
