import { Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function PublicLayout() {

    const handleLogin = () => {
        // Redirect to app login
        window.location.href = 'https://app.trocaai.net/auth'
    }

    const handleWebapp = () => {
        // Redirect to app signup
        window.location.href = 'https://app.trocaai.net/auth'
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
            {/* Navbar */}
            <header className="py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 relative">
                <div className="flex items-center gap-2">
                    {/* Show Logo here for internal pages? Or keep invisible?
                         User removed from landing, but for subpages might be useful. 
                         For consistency, let's keep invisible or show a small one. 
                         Let's show a small logo for subpages to allow navigating back home. */}
                    <a href="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Troca Aí" className="h-8 w-auto" />
                    </a>
                </div>
                <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600 absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
                    <a href="/#features" className="hover:text-green-600 transition-colors">Como funciona</a>
                    <a href="/#benefits" className="hover:text-green-600 transition-colors">Benefícios</a>
                    <a href="/#premium" className="hover:text-green-600 transition-colors">Premium</a>
                </nav>
                <div className="flex gap-4">
                    <Button variant="ghost" className="text-gray-600 hover:text-green-600" onClick={handleLogin}>
                        Entrar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleWebapp}>
                        Começar Agora
                    </Button>
                </div>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white py-12 px-6 border-t border-gray-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-sm text-gray-500 flex flex-col items-center md:items-start gap-1">
                        <p>&copy; {new Date().getFullYear()} Troca Aí. Todos os direitos reservados.</p>
                        <p className="text-xs text-gray-400">CNPJ: 34.600.915/0001-50</p>
                        <p className="text-xs text-gray-400">Tel: +55 (75) 99190-1239</p>
                        <p className="text-xs text-gray-400">E-mail: contato@trocaai.net</p>
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-gray-600">
                        <a href="/terms" className="hover:text-green-600">Termos de Uso</a>
                        <a href="/privacy" className="hover:text-green-600">Privacidade</a>
                        <a href="/faq" className="hover:text-green-600">FAQ</a>
                        <a href="https://instagram.com/troca.ai.app" target="_blank" rel="noopener noreferrer" className="hover:text-green-600">Instagram</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
