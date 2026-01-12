import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

interface Profile {
    id: string
    username: string
    first_name?: string
    avatar_url?: string
    created_at: string
    is_admin: boolean
    role?: string // 'user' | 'admin' | 'super_admin'
}

export default function AdminUsers() {
    const { user: currentUser } = useAuthStore()
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<string>('user')

    useEffect(() => {
        fetchUsers()
        fetchMyRole()
    }, [currentUser])

    const fetchMyRole = async () => {
        if (!currentUser) return
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()

        if (data) {
            setCurrentUserRole(data.role || 'user')
        }
    }

    const [error, setError] = useState<string | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        setError(null)
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (fetchError) {
            console.error('Error fetching users:', fetchError)
            setError(fetchError.message)
        } else if (data) {
            setUsers(data)
        }
        setLoading(false)
    }

    const handleRoleUpdate = async (userId: string, username: string, newRole: string) => {
        const action = newRole === 'user' ? 'rebaixar' : 'promover'
        const roleLabel = newRole === 'admin' ? 'Administrador' : (newRole === 'super_admin' ? 'Super Admin' : 'Usuário')

        if (!window.confirm(`Tem certeza que deseja ${action} @${username} para ${roleLabel}?`)) return

        // Update both role AND is_admin for compatibility
        const is_admin = newRole !== 'user'

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: newRole, is_admin })
            .eq('id', userId)

        if (updateError) {
            alert('Erro ao atualizar usuário: ' + updateError.message)
        } else {
            alert(`@${username} atualizado para ${roleLabel} com sucesso!`)
            fetchUsers()
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>

            {currentUserRole === 'super_admin' ? (
                <div className="bg-purple-100 text-purple-800 p-4 rounded-md mb-4">
                    Você é um <strong>Super Admin</strong>. Você tem permissão total.
                </div>
            ) : (
                <div className="bg-blue-100 text-blue-800 p-4 rounded-md mb-4">
                    Você é um <strong>Admin</strong>. Funções de gerenciamento de usuários são limitadas.
                </div>
            )}

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Avatar</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Data Cadastro</TableHead>
                            <TableHead>Nível de Acesso</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">Carregando...</TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-red-500">Erro: {error}</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const role = user.role || (user.is_admin ? 'admin' : 'user') // Fallback
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <Avatar>
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            @{user.username}
                                            {user.first_name && <span className="text-gray-500 ml-2">({user.first_name})</span>}
                                        </TableCell>
                                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            {role === 'super_admin' && <Badge className="bg-purple-600 hover:bg-purple-700">Super Admin</Badge>}
                                            {role === 'admin' && <Badge className="bg-blue-600 hover:bg-blue-700">Admin</Badge>}
                                            {role === 'user' && <Badge variant="secondary">User</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Only Super Admin can change roles */}
                                            {currentUserRole === 'super_admin' && user.id !== currentUser?.id && (
                                                <div className="flex justify-end gap-2">
                                                    {role === 'user' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleRoleUpdate(user.id, user.username, 'admin')}
                                                        >
                                                            Promover Admin
                                                        </Button>
                                                    )}
                                                    {role === 'admin' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-500 hover:text-red-600"
                                                                onClick={() => handleRoleUpdate(user.id, user.username, 'user')}
                                                            >
                                                                Rebaixar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="bg-purple-600 hover:bg-purple-700"
                                                                onClick={() => handleRoleUpdate(user.id, user.username, 'super_admin')}
                                                            >
                                                                Virar Super
                                                            </Button>
                                                        </>
                                                    )}
                                                    {role === 'super_admin' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-500 hover:text-red-600"
                                                            onClick={() => handleRoleUpdate(user.id, user.username, 'admin')}
                                                        >
                                                            Rebaixar p/ Admin
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
