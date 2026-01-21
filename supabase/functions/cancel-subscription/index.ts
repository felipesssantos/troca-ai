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
        // 2. Parse Body and Init Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { user_id } = await req.json()

        if (!user_id) throw new Error('User ID is required')

        // 3. Get User's Customer ID
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('asaas_customer_id')
            .eq('id', user_id)
            .single()

        if (!profile || !profile.asaas_customer_id) {
            throw new Error('Customer not found')
        }

        // 4. Find Active Subscription
        console.log(`Finding active subscription for customer ${profile.asaas_customer_id}...`)
        const subRes = await fetch(`${ASAAS_API_URL}/subscriptions?customer=${profile.asaas_customer_id}&status=ACTIVE`, {
            headers: { 'access_token': ASAAS_API_KEY }
        })
        const subData = await subRes.json()

        if (!subData.data || subData.data.length === 0) {
            // Already canceled or none found?
            console.log('No active subscription found.')
            return new Response(JSON.stringify({ message: 'No active subscription found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const subscriptionId = subData.data[0].id
        console.log(`Canceling subscription ${subscriptionId}...`)

        // 5. Cancel Subscription
        const deleteRes = await fetch(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
            headers: { 'access_token': ASAAS_API_KEY }
        })

        // Asaas returns separate json for delete confirmation
        const deleteData = await deleteRes.json()

        if (deleteData.deleted) {
            // Update DB immediately for instant UI feedback
            await supabaseAdmin
                .from('profiles')
                .update({ subscription_status: 'canceled' })
                .eq('id', user_id)

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        } else {
            throw new Error('Failed to cancel subscription')
        }

    } catch (error: any) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
