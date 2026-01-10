import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    // Don't throw here to avoid white screen of death on startup, 
    // allow UI to render (maybe showing an error state later)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
