import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Check, Star, Zap, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import Header from '@/components/Header'

export default function Premium() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    // Price IDs (Stripe Test)
    const PRICE_RECURRING = 'price_1SrTrxBO4pSaKfzn2Vd3JQy7'
    const PRICE_OT = 'price_1SrTtyBO4pSaKfznMs9RATfz'

    const [selectedPlan, setSelectedPlan] = useState<{ id: string, isSubscription: boolean }>({
        id: PRICE_RECURRING,
        isSubscription: true
    })

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('success') === 'true') {
            toast({
                title: "Assinatura Confirmada! 🎉",
                description: "Seu acesso Premium foi ativado. Aproveite!",
                duration: 5000,
            })
            window.history.replaceState({}, document.title, window.location.pathname)
        }
        if (params.get('canceled') === 'true') {
            toast({
                title: "Pagamento Cancelado",
                description: "Você não foi cobrado.",
                variant: 'destructive'
            })
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }, [toast])

    const handleSubscribe = async () => {
        if (!user) return
        setLoading(true)
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
                body: {
                    user_id: user.id,
                    email: user.email,
                    price_id: selectedPlan.id,
                    is_subscription: selectedPlan.isSubscription
                }
            })

            if (error) {
                // Try to parse detailed error
                const body = await error.context?.json().catch(() => ({}))
                throw new Error(body.error || error.message || 'Erro ao comunicar com servidor')
            }

            if (data?.url) {
                window.location.href = data.url
            } else {
                throw new Error('Erro ao gerar link de pagamento')
            }

        } catch (error: any) {
            console.error(error)
            toast({
                title: "Erro",
                description: error.message || "Falha ao conectar com Stripe",
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-800 text-white py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">
                        Desbloqueie o Poder Total do Troca.ai
                    </h1>
                    <p className="text-lg md:text-xl text-green-100 max-w-2xl mx-auto">
                        Complete seus álbuns mais rápido com ferramentas exclusivas para colecionadores sérios.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 -mt-10">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Free Plan */}
                    <Card className="p-6 md:p-8 relative border shadow-sm bg-white">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-t-lg" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Grátis</h3>
                        <div className="text-3xl font-bold text-gray-900 mb-6">R$ 0<span className="text-sm font-normal text-muted-foreground">/sempre</span></div>

                        <ul className="space-y-4 mb-8 text-sm md:text-base">
                            <li className="flex items-center gap-3">
                                <Check className="h-5 w-5 text-green-600" />
                                <span>3 Álbuns no painel</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="h-5 w-5 text-green-600" />
                                <span>3 Trocas simultâneas</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Check className="h-5 w-5 text-green-600" />
                                <span>Busca básica</span>
                            </li>
                        </ul>

                        <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                            Continuar Grátis
                        </Button>
                    </Card>

                    {/* Premium Plan */}
                    <Card className="p-6 md:p-8 relative border-2 border-green-500 shadow-xl bg-white">
                        <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-sm font-bold rounded-bl-lg rounded-tr-sm">
                            RECOMENDADO
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>

                        <div className="mb-6 space-y-4">
                            <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all group ${selectedPlan.id === PRICE_RECURRING ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-green-300'}`}
                                onClick={() => setSelectedPlan({ id: PRICE_RECURRING, isSubscription: true })}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPlan.id === PRICE_RECURRING ? 'border-green-500' : 'border-gray-300'}`}>
                                            {selectedPlan.id === PRICE_RECURRING && <div className="h-2 w-2 rounded-full bg-green-500" />}
                                        </div>
                                        <span className="font-semibold text-green-900">Mensal Recorrente</span>
                                    </div>
                                    <span className="font-bold text-xl text-green-700">R$ 9,90</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-6">Renova todo mês. Cancele quando quiser.</p>
                            </div>

                            <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all group ${selectedPlan.id === PRICE_OT ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-green-300'}`}
                                onClick={() => setSelectedPlan({ id: PRICE_OT, isSubscription: false })}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPlan.id === PRICE_OT ? 'border-green-500' : 'border-gray-300'}`}>
                                            {selectedPlan.id === PRICE_OT && <div className="h-2 w-2 rounded-full bg-green-500" />}
                                        </div>
                                        <span className="font-semibold text-gray-700">Avulso (30 dias)</span>
                                    </div>
                                    <span className="font-bold text-xl text-gray-600">R$ 19,90</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-6">Pagamento único. Não renova automaticamente.</p>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 text-sm md:text-base">
                            <li className="flex items-center gap-3">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">Álbuns Ilimitados</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">Trocas Ilimitadas</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">Match Inteligente</span>
                            </li>
                        </ul>

                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                            onClick={handleSubscribe}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                            Assinar Agora
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            Pagamento seguro via Stripe.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}
