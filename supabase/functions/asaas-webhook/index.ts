import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Secret token configured in Asaas Webhook settings for security
const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET')

serve(async (req) => {
    try {
        // 1. Security Check
        const token = req.headers.get('asaas-access-token')
        if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
            return new Response('Unauthorized', { status: 401 })
        }

        const reqObject = await req.json()
        const { event, payment } = reqObject

        // 2. Init Supabase Admin
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`Received event: ${event} for customer ${payment?.customer || 'unknown'}`)

        const asaasCustomerId = payment?.customer || (event === 'SUBSCRIPTION_DELETED' ? reqObject.payment?.customer : null)

        if (!asaasCustomerId) {
            // Some events might have different structure
            return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
        }

        // Find User
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('asaas_customer_id', asaasCustomerId)
            .single()

        if (!profile) {
            console.error(`User not found for Asaas Customer ${asaasCustomerId}`)
            return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
        }

        if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
            // Calculate 30 days from now (or from payment date if available)
            const validUntil = new Date()
            validUntil.setDate(validUntil.getDate() + 30)

            await supabaseAdmin
                .from('profiles')
                .update({
                    is_premium: true,
                    subscription_status: 'active',
                    premium_valid_until: validUntil.toISOString()
                })
                .eq('id', profile.id)

            console.log(`Premium activated for user ${profile.id} until ${validUntil.toISOString()}`)

        } else if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_REFUNDED') {
            await supabaseAdmin
                .from('profiles')
                .update({
                    is_premium: false,
                    subscription_status: 'inactive'
                })
                .eq('id', profile.id)
            console.log(`Premium revoked for user ${profile.id} (Overdue/Refunded)`)

        } else if (event === 'SUBSCRIPTION_DELETED') {
            // User canceled future charges, but keeps access until valid_until expires
            await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_status: 'canceled'
                })
                .eq('id', profile.id)
            console.log(`Subscription canceled for user ${profile.id}. Status: canceled. Premium remains until expiration.`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
