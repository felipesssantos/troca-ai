import dotenv from 'dotenv';
dotenv.config();

export const config = {
    geminiApiKey: process.env.GEMINI_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Service role required to bypass RLS for phone lookup
    port: process.env.PORT || 3000
};

if (!config.geminiApiKey || !config.supabaseUrl || !config.supabaseServiceKey) {
    console.error('Missing required environment variables. Please check your .env file.');
    process.exit(1);
}
