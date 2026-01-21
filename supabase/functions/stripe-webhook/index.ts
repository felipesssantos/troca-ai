import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature')

    // Verify Signature
    const body = await req.text()
    let event
    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
            undefined,
            cryptoProvider // Needed for Deno
        )
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`)
        return new Response(err.message, { status: 400 })
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle Events
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                const customerId = session.customer

                // Retrieve User
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (profile) {
                    let validUntil = new Date()
                    validUntil.setDate(validUntil.getDate() + 30) // Default 30 days

                    // If subscription, maybe fetched better info, but 30 days is safe for now
                    // or we rely on invoice.payment_succeeded for subs

                    await supabaseAdmin.from('profiles').update({
                        is_premium: true,
                        subscription_status: 'active',
                        stripe_subscription_id: session.subscription, // Can be null for one-time
                        premium_valid_until: validUntil.toISOString()
                    }).eq('id', profile.id)
                }
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object
                const customerId = invoice.customer

                // Renewal!
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (profile) {
                    // Add 30 days from NOW (or from period_end)
                    // Ideally we check invoice.lines.data[0].period.end
                    const periodEnd = new Date(invoice.lines.data[0].period.end * 1000)

                    await supabaseAdmin.from('profiles').update({
                        is_premium: true,
                        subscription_status: 'active',
                        premium_valid_until: periodEnd.toISOString()
                    }).eq('id', profile.id)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                const customerId = subscription.customer

                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .single()

                if (profile) {
                    await supabaseAdmin.from('profiles').update({
                        subscription_status: 'canceled',
                        is_premium: false // Revoke immediately? Or check current_period_end?
                        // Let's assume deleted means "Expired/Revoked"
                    }).eq('id', profile.id)
                }
                break
            }

            case 'customer.subscription.updated': {
                // Handle explicit "Cancel at period end"
                const subscription = event.data.object
                if (subscription.cancel_at_period_end) {
                    const customerId = subscription.customer
                    await supabaseAdmin.from('profiles').update({
                        subscription_status: 'canceled',
                        // Content remains accessible until valid_until, which logic already handles
                    }).eq('stripe_customer_id', customerId)
                }
                break
            }
        }
    } catch (err) {
        console.error(err)
        return new Response('Error processing event', { status: 400 })
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
    })
})
