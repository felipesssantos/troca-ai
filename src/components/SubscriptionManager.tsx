import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CreditCard } from "lucide-react"

export function SubscriptionManager() {
    const { user } = useAuthStore()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'active' | 'inactive' | 'canceled'>('inactive')
    const [validUntil, setValidUntil] = useState<string | null>(null)
    const [open, setOpen] = useState(false)

    const [stripeId, setStripeId] = useState<string | null>(null)

    const fetchStatus = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('subscription_status, premium_valid_until, is_premium, stripe_customer_id')
            .eq('id', user?.id)
            .single()

        if (data) {
            setStatus(data.subscription_status as any || 'inactive')
            setValidUntil(data.premium_valid_until)
            setStripeId(data.stripe_customer_id)
        }
    }

    useEffect(() => {
        if (open) fetchStatus()
    }, [open])

    const handleData = async () => {
        if (stripeId) {
            // Stripe Portal
            setLoading(true)
            try {
                const { data, error } = await supabase.functions.invoke('create-stripe-portal', {
                    body: { user_id: user?.id }
                })
                if (error) throw error
                if (data?.url) window.location.href = data.url
            } catch (err: any) {
                toast({
                    title: "Erro",
                    description: "Não foi possível abrir o portal.",
                    variant: "destructive"
                })
            } finally {
                setLoading(false)
            }
        } else {
            // Legacy Asaas Cancel
            handleCancel()
        }
    }

    const handleCancel = async () => {
        if (!confirm('Tem certeza? Você continuará Premium até o fim do período, mas não será cobrado novamente.')) return

        setLoading(true)
        try {
            const { error } = await supabase.functions.invoke('cancel-subscription', {
                body: { user_id: user?.id }
            })

            if (error) {
                const msg = await error.context.json()
                throw new Error(msg.error || 'Erro ao cancelar')
            }

            toast({
                title: "Assinatura Cancelada",
                description: "Sua renovação automática foi desligada.",
            })
            fetchStatus() // Refresh
        } catch (err: any) {
            toast({
                title: "Erro no cancelamento",
                description: err.message,
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }



    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-accent rounded-sm">
                    <CreditCard className="h-4 w-4" />
                    Gerenciar Assinatura
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gerenciar Assinatura</DialogTitle>
                    <DialogDescription>
                        Status atual do seu plano Premium.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between border p-4 rounded-lg bg-gray-50">
                        <span className="font-semibold">Status:</span>
                        <Badge variant={status === 'active' ? 'default' : 'secondary'} className={status === 'active' ? 'bg-green-500' : ''}>
                            {status === 'active' ? 'ATIVO' : status.toUpperCase()}
                        </Badge>
                    </div>

                    {validUntil && (
                        <p className="text-sm text-center text-muted-foreground">
                            {status === 'active' ? 'Próxima renovação' : 'Acesso válido'} até {new Date(validUntil).toLocaleDateString('pt-BR')}.
                        </p>
                    )}

                    {status === 'active' || (validUntil && new Date(validUntil) > new Date() && stripeId) ? (
                        <Button
                            variant={stripeId ? "outline" : "destructive"}
                            className="w-full"
                            onClick={handleData}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {stripeId ? "Gerenciar Pagamento (Stripe)" : "Cancelar Assinatura"}
                        </Button>
                    ) : (
                        <Button className="w-full" onClick={() => window.location.href = '/premium'}>
                            Reassinar Premium
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
