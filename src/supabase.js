import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  document.body.innerHTML = `
    <div style="font-family:Arial;padding:40px">
      <h2>Supabase configuration missing</h2>
      <p>VITE_SUPABASE_URL: ${url ? 'FOUND' : 'MISSING'}</p>
      <p>VITE_SUPABASE_ANON_KEY: ${key ? 'FOUND' : 'MISSING'}</p>
    </div>
  `
  throw new Error('Supabase environment variables are missing')
}

export const supabase = createClient(url, key)
