import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, BookOpen, LogOut } from 'lucide-react'

export default function AdminLayout() {
    const navigate = useNavigate()
    const location = useLocation()

    const isActive = (path: string) => location.pathname === path

    return (
        <div className="min-h-screen flex bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold">Admin Panel 🛡️</h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link to="/admin">
                        <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-slate-900 ${isActive('/admin') ? '' : 'text-white'}`}>
                            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                        </Button>
                    </Link>
                    <Link to="/admin/albums">
                        <Button variant={isActive('/admin/albums') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-slate-900 ${isActive('/admin/albums') ? '' : 'text-white'}`}>
                            <BookOpen className="mr-2 h-4 w-4" /> Álbuns
                        </Button>
                    </Link>
                    <Link to="/admin/users">
                        <Button variant={isActive('/admin/users') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-slate-900 ${isActive('/admin/users') ? '' : 'text-white'}`}>
                            <Users className="mr-2 h-4 w-4" /> Usuários
                        </Button>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-700">
                    <Button variant="outline" className="w-full text-slate-900" onClick={() => navigate('/')}>
                        <LogOut className="mr-2 h-4 w-4" /> Voltar ao Site
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}
