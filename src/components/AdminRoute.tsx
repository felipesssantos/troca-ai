import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminRoute() {
    const { user } = useAuthStore()
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setLoading(false)
                return
            }

            const { data } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single()

            setIsAdmin(data?.is_admin || false)
            setLoading(false)
        }

        checkAdmin()
    }, [user])

    if (loading) return <div className="p-10 text-center">Verificando permissões...</div>

    if (!user || !isAdmin) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
