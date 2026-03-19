import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

function required(name: string): string {
  throw new Error(
    `${name} is missing. Add it to a .env file (see .env.example) and restart the dev server.`,
  )
}

export const supabase = createClient(
  supabaseUrl ?? required('VITE_SUPABASE_URL'),
  supabaseAnonKey ?? required('VITE_SUPABASE_ANON_KEY'),
)

