import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const { product_id, product_name, new_quantity, min_quantity, location } = payload

        if (!product_id || !product_name) {
            throw new Error('Missing product_id or product_name')
        }

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:quentin@bruneau27.com'
        const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
        const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            throw new Error('VAPID keys not configured in Edge Function')
        }

        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Notify administrators (or all subscribed users for now)
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
            console.log('No subscriptions found')
            return new Response(JSON.stringify({ success: true, message: 'No subscriptions found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log(`Found ${subscriptions.length} subscription(s)`)

        const title = '⚠️ Rupture de stock'
        const body = `${product_name} est passé sous le seuil d'alerte. Quantité actuelle : ${new_quantity} (Min: ${min_quantity}) à ${location}.`

        const notificationPayload = JSON.stringify({
            title,
            body,
            icon: '/stock-android-chrome-512x512_(1).png',
            badge: '/stock-android-chrome-512x512_(1).png',
            data: {
                url: `/`,
                product_id
            }
        })

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                }

                try {
                    const result = await webpush.sendNotification(pushSubscription, notificationPayload)
                    return { endpoint: sub.endpoint, success: true }
                } catch (err: any) {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
                    }
                    throw err
                }
            })
        )

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Error sending push notification:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
