import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Bell, Check } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'

type Notification = {
    id: string
    title: string
    message: string
    read: boolean
    created_at: string
    type: 'trade' | 'system' | 'request_update'
}

export default function NotificationBell() {
    const { user } = useAuthStore()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    const fetchNotifications = async () => {
        if (!user) return

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) {
            setNotifications(data as Notification[])
            setUnreadCount(data.filter((n: Notification) => !n.read).length)
        }
    }

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
    }

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
        if (unreadIds.length === 0) return

        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)

        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds)
    }

    useEffect(() => {
        if (!user) return

        fetchNotifications()

        // Realtime subscription
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification
                    setNotifications(prev => [newNotif, ...prev])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-600 rounded-full animate-pulse border-2 border-white box-content" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <DropdownMenuLabel className="flex justify-between items-center">
                    Notificações
                    {unreadCount > 0 && (
                        <Button variant="ghost" className="h-6 px-2 text-xs text-blue-600" onClick={markAllAsRead}>
                            Marcar lidas
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            Nenhuma notificação recente.
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${notif.read ? 'opacity-70' : 'bg-blue-50/50'}`}
                                onClick={() => markAsRead(notif.id)}
                            >
                                <div className="flex justify-between w-full font-medium text-sm">
                                    <span className={notif.read ? '' : 'text-blue-700'}>{notif.title}</span>
                                    {notif.type === 'request_update' && <Check className="h-3 w-3 text-green-600" />}
                                </div>
                                <p className="text-xs text-muted-foreground leading-snug">
                                    {notif.message}
                                </p>
                                <span className="text-[10px] text-gray-400 self-end">
                                    {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
