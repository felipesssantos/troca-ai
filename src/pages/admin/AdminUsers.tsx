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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { Eye, Ban, CheckCircle } from 'lucide-react'

interface Profile {
    id: string
    username: string
    first_name?: string
    last_name?: string
    avatar_url?: string
    created_at: string
    is_admin: boolean
    role?: string // 'user' | 'admin' | 'super_admin'
    is_premium?: boolean
    is_partner?: boolean
    is_blocked?: boolean
    city?: string
    state?: string
    phone?: string
}

export default function AdminUsers() {
    const { user: currentUser } = useAuthStore()
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<string>('user')
    const [error, setError] = useState<string | null>(null)
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    useEffect(() => {
        if (currentUser) {
            fetchUsers()
            fetchMyRole()
        }
    }, [currentUser])

    const fetchMyRole = async () => {
        if (!currentUser) return
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()

        if (data) setCurrentUserRole(data.role || 'user')
    }

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

        const is_admin = newRole !== 'user'
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: newRole, is_admin })
            .eq('id', userId)

        if (updateError) {
            alert('Erro ao atualizar cargo: ' + updateError.message)
        } else {
            alert(`@${username} atualizado para ${roleLabel} com sucesso!`)
            fetchUsers()
        }
    }

    const handleToggleStatus = async (userId: string, username: string, field: 'is_premium' | 'is_partner' | 'is_blocked', currentValue: boolean) => {
        let action = !currentValue ? 'ativar' : 'remover'
        let label = ''

        if (field === 'is_premium') label = 'Premium 💎'
        if (field === 'is_partner') label = 'Parceiro 🤝'
        if (field === 'is_blocked') {
            action = !currentValue ? 'BLOQUEAR' : 'DESBLOQUEAR'
            label = 'o acesso deste usuário 🚫'
        }

        if (!window.confirm(`Deseja realmente ${action} ${label} para @${username}?`)) return

        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: !currentValue } : u))

        const { error } = await supabase
            .from('profiles')
            .update({ [field]: !currentValue })
            .eq('id', userId)

        if (error) {
            alert('Erro ao atualizar status: ' + error.message)
            fetchUsers() // Revert on error
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
                    Você é um <strong>Admin</strong>. Gerencie usuários e lojas.
                </div>
            )}

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">Avatar</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead className="w-[100px]">Data</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead className="text-center">Premium</TableHead>
                            <TableHead className="text-center">Parceiro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">Carregando...</TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-red-500">Erro: {error}</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const role = user.role || (user.is_admin ? 'admin' : 'user')
                                return (
                                    <TableRow key={user.id} className={user.is_blocked ? 'bg-red-50' : ''}>
                                        <TableCell>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className={user.is_blocked ? 'text-red-600 line-through' : ''}>@{user.username}</span>
                                                {user.first_name && <span className="text-xs text-gray-500">{user.first_name}</span>}
                                                {user.is_blocked && <span className="text-[10px] text-red-600 font-bold">BLOQUEADO</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {role === 'super_admin' && <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px]">Super</Badge>}
                                            {role === 'admin' && <Badge className="bg-blue-600 hover:bg-blue-700 text-[10px]">Admin</Badge>}
                                            {role === 'user' && <Badge variant="secondary" className="text-[10px]">User</Badge>}
                                        </TableCell>

                                        {/* Premium Toggle */}
                                        <TableCell className="text-center">
                                            <div
                                                onClick={() => handleToggleStatus(user.id, user.username, 'is_premium', !!user.is_premium)}
                                                className={`cursor-pointer inline-flex px-2 py-0.5 rounded-full text-xs font-semibold select-none transition-colors border ${user.is_premium
                                                    ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                {user.is_premium ? 'Sim 💎' : 'Não'}
                                            </div>
                                        </TableCell>

                                        {/* Partner Toggle */}
                                        <TableCell className="text-center">
                                            <div
                                                onClick={() => handleToggleStatus(user.id, user.username, 'is_partner', !!user.is_partner)}
                                                className={`cursor-pointer inline-flex px-2 py-0.5 rounded-full text-xs font-semibold select-none transition-colors border ${user.is_partner
                                                    ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                                            >
                                                {user.is_partner ? 'Sim 🤝' : 'Não'}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* Role Management */}
                                                {(role === 'user' || role === 'admin') && currentUserRole === 'super_admin' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        title={role === 'user' ? "Promover a Admin" : "Rebaixar a User"}
                                                        onClick={() => handleRoleUpdate(user.id, user.username, role === 'user' ? 'admin' : 'user')}
                                                    >
                                                        <Badge variant="outline" className="text-[10px] px-1">{role === 'user' ? '⬆️' : '⬇️'}</Badge>
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    title="Ver Detalhes"
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setIsDetailsOpen(true)
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 text-gray-500" />
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className={`h-8 w-8 p-0 ${user.is_blocked ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-red-500 hover:text-red-600 hover:bg-red-50'}`}
                                                    title={user.is_blocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                                                    onClick={() => handleToggleStatus(user.id, user.username, 'is_blocked', !!user.is_blocked)}
                                                >
                                                    {user.is_blocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Usuário</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={selectedUser.avatar_url} />
                                    <AvatarFallback>{selectedUser.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-lg font-bold">@{selectedUser.username}</h3>
                                    <p className="text-gray-500">{selectedUser.first_name || 'Sem nome'} {selectedUser.last_name || ''}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold block text-gray-500">Cadastro</span>
                                    {new Date(selectedUser.created_at).toLocaleString()}
                                </div>
                                <div>
                                    <span className="font-semibold block text-gray-500">ID</span>
                                    <span className="text-xs font-mono">{selectedUser.id}</span>
                                </div>
                                <div>
                                    <span className="font-semibold block text-gray-500">Localização</span>
                                    {selectedUser.city ? `${selectedUser.city} - ${selectedUser.state}` : 'Não informada'}
                                </div>
                                <div>
                                    <span className="font-semibold block text-gray-500">Status</span>
                                    {selectedUser.is_blocked ? (
                                        <span className="text-red-600 font-bold flex items-center gap-1"><Ban className="h-3 w-3" /> Bloqueado</span>
                                    ) : (
                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ativo</span>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <span className="font-semibold block text-gray-500">Contato</span>
                                    {selectedUser.phone || 'Telefone não informado'}
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-3 rounded-md text-xs text-yellow-800 border border-yellow-200">
                                <strong>Nota:</strong> O e-mail do usuário não está visível publicamente por questões de privacidade do Supabase.
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
