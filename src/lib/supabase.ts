import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      imported_files: {
        Row: {
          id: string
          canal: string
          tipo: string
          ano: string
          competencia: string
          periodo_inicial: string
          periodo_final: string
          arquivo: string
          original_name: string
          size: number
          data_upload: string
          data: any[]
          columns: string[]
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canal: string
          tipo: string
          ano: string
          competencia: string
          periodo_inicial: string
          periodo_final: string
          arquivo: string
          original_name: string
          size: number
          data_upload?: string
          data: any[]
          columns: string[]
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canal?: string
          tipo?: string
          ano?: string
          competencia?: string
          periodo_inicial?: string
          periodo_final?: string
          arquivo?: string
          original_name?: string
          size?: number
          data_upload?: string
          data?: any[]
          columns?: string[]
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}