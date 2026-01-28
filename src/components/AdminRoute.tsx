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
                console.log('AdminRoute: Sem usuário logado.')
                setLoading(false)
                return
            }

            console.log('AdminRoute: Verificando usuário:', user.id)
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin, role')
                .eq('id', user.id)
                .single()

            console.log('AdminRoute: Resultado:', { data, error })

            // Check both legacy is_admin flag OR role
            const hasAdminAccess = data?.is_admin || data?.role === 'admin' || data?.role === 'super_admin'
            setIsAdmin(!!hasAdminAccess)
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
