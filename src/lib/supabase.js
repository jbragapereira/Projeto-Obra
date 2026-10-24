import { createClient } from '@supabase/supabase-js'

// As chaves entram no .env.local na etapa do banco. Até lá o app roda com
// os dados de exemplo e esta conexão fica desligada (null).
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...).
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
