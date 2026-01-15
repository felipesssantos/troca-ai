import type { ComponentProps } from 'react'
import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, BookOpen, LogOut, Menu } from 'lucide-react'

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
    const navigate = useNavigate()
    const location = useLocation()
    const isActive = (path: string) => location.pathname === path

    return (
        <div className={`flex flex-col h-full bg-[#004d25] text-white ${className}`} {...props}>
            <div className="p-6">
                <h1 className="text-xl font-bold">Painel Admin</h1>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                <Link to="/admin">
                    <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-[#004d25] hover:bg-white/90 ${isActive('/admin') ? 'text-[#004d25]' : 'text-white'}`}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                </Link>
                <Link to="/admin/albums">
                    <Button variant={isActive('/admin/albums') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-[#004d25] hover:bg-white/90 ${isActive('/admin/albums') ? 'text-[#004d25]' : 'text-white'}`}>
                        <BookOpen className="mr-2 h-4 w-4" /> Álbuns
                    </Button>
                </Link>
                <Link to="/admin/requests">
                    <Button variant={isActive('/admin/requests') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-[#004d25] hover:bg-white/90 ${isActive('/admin/requests') ? 'text-[#004d25]' : 'text-white'}`}>
                        <BookOpen className="mr-2 h-4 w-4" /> Solicitações
                    </Button>
                </Link>
                <Link to="/admin/users">
                    <Button variant={isActive('/admin/users') ? 'secondary' : 'ghost'} className={`w-full justify-start hover:text-[#004d25] hover:bg-white/90 ${isActive('/admin/users') ? 'text-[#004d25]' : 'text-white'}`}>
                        <Users className="mr-2 h-4 w-4" /> Usuários
                    </Button>
                </Link>
            </nav>

            <div className="p-4 border-t border-[#003d1d]">
                <Button variant="outline" className="w-full text-[#004d25] border-white hover:bg-white/90" onClick={() => navigate('/')}>
                    <LogOut className="mr-2 h-4 w-4" /> Voltar ao Site
                </Button>
            </div>
        </div>
    )
}

export default function AdminLayout() {
    const [open, setOpen] = useState(false)

    return (
        <div className="min-h-screen flex bg-gray-100 relative">
            {/* Desktop Sidebar (Visible on Desktop) */}
            <aside className="hidden md:flex flex-col w-64 fixed h-full z-10">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar (Overlay + Content) */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden
                ${open ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent onClick={() => setOpen(false)} />
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col md:pl-64 h-screen w-full">

                {/* Mobile Header (Visible on Mobile) */}
                <header className="md:hidden bg-[#004d25] text-white p-4 flex items-center justify-between sticky top-0 z-20">
                    <h1 className="font-bold">Painel Admin</h1>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-[#003d1d]" onClick={() => setOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
