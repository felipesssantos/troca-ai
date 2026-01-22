import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { Repeat, Zap, Shield, Rocket } from 'lucide-react'

export default function LandingPage() {
    // Determine where to redirect based on hostname (although this page is for the landing domain)
    // If we are here, we are likely on the landing domain.
    // The "Enter" button should take to the app domain.
    // Assuming for now simple navigation or external link if domains are strictly separated.
    // For this implementation, we assume we are handling everything in the same SPA but logically separated.
    const navigate = useNavigate()

    const handleLogin = () => {
        // If we are using subdomains properly, this should be:
        // window.location.href = 'https://app.trocaai.net/auth'
        // For development/testing or single domain, we simulate:
        navigate('/auth')
    }

    const handleWebapp = () => {
        navigate('/auth')
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
            {/* Navbar */}
            <header className="py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100 relative">
                <div className="flex items-center gap-2 invisible">
                    {/* Placeholder to keep layout height/spacing if needed, though absolute nav handles center */}
                    <div className="h-10 w-10"></div>
                </div>
                <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600 absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
                    <a href="#features" className="hover:text-green-600 transition-colors">Como funciona</a>
                    <a href="#benefits" className="hover:text-green-600 transition-colors">Benefícios</a>
                    <a href="#premium" className="hover:text-green-600 transition-colors">Premium</a>
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

            {/* Hero Section */}
            <section className="flex-1 flex flex-col justify-start items-center text-center px-6 pt-4 pb-20 md:pt-10 md:pb-32 bg-gradient-to-b from-white to-green-50">
                <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center">
                    <img src="/logo.png" alt="Troca Aí" className="h-64 w-auto mb-4" />
                    <div className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold tracking-wide uppercase mb-2">
                        Nova Era das Trocas
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                        Complete seu álbum <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
                            com Inteligência Artificial
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        Esqueça as listas de papel e planilhas confusas. O Troca Aí gerencia suas figurinhas repetidas e encontra a troca perfeita para você.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white h-12 px-8 text-lg shadow-lg hover:shadow-xl transition-all" onClick={handleWebapp}>
                            Criar Conta Grátis
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-lg border-gray-200 hover:bg-gray-50" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                            Saber mais
                        </Button>
                    </div>

                    {/* Abstract UI representation / Mockup placeholder */}
                    <div className="mt-16 relative mx-auto max-w-5xl rounded-xl shadow-2xl overflow-hidden border border-gray-200 bg-white p-2">
                        <div className="bg-gray-100 rounded-lg aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                            {/* Simple UI Mockup using CSS/Divs to match minimalist style */}
                            <div className="absolute inset-x-0 top-0 h-12 bg-white border-b flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="grid grid-cols-3 gap-6 p-12 pt-20 w-full h-full text-left opacity-80">
                                <div className="col-span-1 bg-white p-4 rounded shadow-sm h-48">
                                    <div className="w-12 h-12 bg-green-100 rounded-full mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                </div>
                                <div className="col-span-1 bg-white p-4 rounded shadow-sm h-48 border-2 border-green-500 relative">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded">AI Match</div>
                                    <div className="flex justify-between mb-4">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                    </div>
                                    <div className="flex justify-center items-center h-20 text-green-600 font-bold">Troca Confirmada</div>
                                </div>
                                <div className="col-span-1 bg-white p-4 rounded shadow-sm h-48">
                                    <div className="w-full h-24 bg-gray-100 rounded mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Por que usar o Troca Aí?</h2>
                        <p className="text-gray-500 mt-4 max-w-xl mx-auto">
                            Simplificamos todo o processo de colecionar, desde o controle até completar seu álbum.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-10">
                        <FeatureCard
                            icon={<Repeat className="text-green-600 w-8 h-8" />}
                            title="Controle Automático"
                            description="Marque duas vezes que tem a figurinha e ela vai automaticamente para sua lista de repetidas."
                        />
                        <FeatureCard
                            icon={<Zap className="text-green-600 w-8 h-8" />}
                            title="AI Match"
                            description="Nossa inteligência cruza seus dados com milhares de colecionadores para encontrar quem precisa do que você tem."
                        />
                        <FeatureCard
                            icon={<Shield className="text-green-600 w-8 h-8" />}
                            title="Comunidade Segura"
                            description="Perfis verificados e sistema de reputação para garantir que suas trocas sejam seguras e justas."
                        />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="benefits" className="py-20 bg-gray-50 border-y border-gray-100">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-8">
                            <h3 className="text-3xl font-bold text-gray-900">Como funciona</h3>
                            <Step number="1" title="Crie sua conta" desc="Gratuito e rápido. Importe seu álbum em segundos." />
                            <Step number="2" title="Marque suas figurinhas" desc="Painel intuitivo para gerenciar o que tem, o que falta e o que sobra." />
                            <Step number="3" title="Receba propostas" desc="Nós encontramos as trocas para você. É só aceitar e combinar a entrega." />
                        </div>
                        <div className="flex-1">
                            {/* Illustration placeholder */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-4">
                                        <div>
                                            <p className="font-bold text-lg">Proposta de Troca</p>
                                            <p className="text-sm text-gray-500">Você envia 5, recebe 5</p>
                                        </div>
                                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Perfect Match</div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="text-center">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                                            <p className="font-medium">Você</p>
                                        </div>
                                        <Repeat className="text-gray-400" />
                                        <div className="text-center">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                                            <p className="font-medium">@colecionador</p>
                                        </div>
                                    </div>
                                    <Button className="w-full bg-green-600 hover:bg-green-700">Aceitar Troca</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24 bg-gray-900 text-white text-center px-6">
                <div className="max-w-2xl mx-auto space-y-8">
                    <Rocket className="w-16 h-16 text-green-400 mx-auto" />
                    <h2 className="text-4xl font-bold">Pronto para completar seu álbum?</h2>
                    <p className="text-gray-400 text-lg">
                        Junte-se a milhares de colecionadores que já estão trocando figurinhas de forma inteligente.
                    </p>
                    <Button size="lg" className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold h-14 px-10 text-xl rounded-full" onClick={handleWebapp}>
                        Começar Agora Grátis
                    </Button>
                    <p className="text-xs text-gray-500">Não é necessário cartão de crédito.</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 px-6 border-t border-gray-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-sm text-gray-500 flex flex-col items-center md:items-start gap-1">
                        <p>&copy; {new Date().getFullYear()} Troca Aí. Todos os direitos reservados.</p>
                        <p className="text-xs text-gray-400">CNPJ: 34.600.915/0001-50</p>
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

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <Card className="border-none shadow-none hover:shadow-lg transition-shadow duration-300 bg-gray-50/50">
            <CardHeader>
                <div className="mb-4 bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                    {icon}
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-gray-500 leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    )
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                {number}
            </div>
            <div>
                <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
                <p className="text-gray-500">{desc}</p>
            </div>
        </div>
    )
}
