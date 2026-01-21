import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ASAAS_API_URL = Deno.env.get('ASAAS_ENV') === 'sandbox'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://www.asaas.com/api/v3'

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // USE SERVICE ROLE KEY FOR EVERYTHING (Bypasses RLS/JWT issues)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Parse Body
        const jsonData = await req.json()
        console.log('[create-subscription] Payload received')

        const { user_id, cpf, email, name, phone } = jsonData

        if (!user_id || !cpf) {
            throw new Error('User ID and CPF are required')
        }

        const cpfClean = cpf.replace(/\D/g, '')

        // 3. Get/Create Customer
        console.log(`[create-subscription] resolving Asaas Customer for User ${user_id}...`)

        let customerId = null
        // Use Admin client to check profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('asaas_customer_id')
            .eq('id', user_id)
            .single()

        if (profileError) {
            console.warn('[create-subscription] Profile fetch warning:', profileError.message)
        }

        if (profile?.asaas_customer_id) {
            customerId = profile.asaas_customer_id
            console.log(`[create-subscription] Found ID in Supabase DB: ${customerId}`)
        } else {
            // Not in DB? Check if exists in Asaas by CPF to avoid "Customer already exists" error
            console.log(`[create-subscription] Searching Asaas for CPF ${cpfClean}...`)
            const searchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cpfClean}`, {
                headers: { 'access_token': ASAAS_API_KEY }
            })
            const searchData = await searchRes.json()

            if (searchData.data && searchData.data.length > 0) {
                customerId = searchData.data[0].id
                console.log(`[create-subscription] Found existing Customer in Asaas: ${customerId}`)
            } else {
                // Not found anywhere? Create new.
                console.log(`[create-subscription] Creating NEW Asaas Customer...`)
                const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
                    body: JSON.stringify({ name, email, cpfCnpj: cpfClean, mobilePhone: phone })
                })
                const customerData = await customerRes.json()

                if (customerData.errors) {
                    console.error('[create-subscription] Customer Creation Error:', JSON.stringify(customerData.errors))
                    throw new Error('Asaas Customer Error: ' + customerData.errors[0].description)
                }
                customerId = customerData.id
            }

            // Save ID to DB (Sync)
            if (customerId) {
                await supabaseAdmin.from('profiles').update({ asaas_customer_id: customerId }).eq('id', user_id)
            }
        }

        // 4. Create Subscription
        console.log(`[create-subscription] Creating Subscription for ${customerId}...`)
        const subscriptionRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
            body: JSON.stringify({
                customer: customerId,
                billingType: 'PIX',
                value: 9.90,
                nextDueDate: new Date().toISOString().split('T')[0],
                cycle: 'MONTHLY',
                description: 'Assinatura Troca.ai Premium'
            })
        })
        const subData = await subscriptionRes.json()

        if (subData.errors) {
            console.error('[create-subscription] Subscription Creation Error:', JSON.stringify(subData.errors))
            // Check if existing subscription active?
            if (subData.errors[0].code === 'CUSTOMER_HAS_ACTIVE_SUBSCRIPTION') {
                // Handle gracefully? For now just error.
            }
            throw new Error('Asaas Subscription Error: ' + subData.errors[0].description)
        }

        // 5. Get Payment Code
        console.log(`[create-subscription] Getting Pix Code for Sub ${subData.id}...`)
        const paymentsRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subData.id}/payments`, {
            headers: { 'access_token': ASAAS_API_KEY }
        })
        const payData = await paymentsRes.json()

        if (!payData.data || payData.data.length === 0) {
            throw new Error('No payments found for created subscription.')
        }

        const firstPayment = payData.data[0]

        const pixRes = await fetch(`${ASAAS_API_URL}/payments/${firstPayment.id}/pixQrCode`, {
            headers: { 'access_token': ASAAS_API_KEY }
        })
        const pixData = await pixRes.json()

        console.log('[create-subscription] Success!')

        return new Response(
            JSON.stringify({
                subscriptionId: subData.id,
                paymentId: firstPayment.id,
                payload: pixData.payload,
                encodedImage: pixData.encodedImage
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('[create-subscription] FINAL ERROR CATCH:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
