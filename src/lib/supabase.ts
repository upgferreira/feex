import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uhvpyitrwxuapfzyelqb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVodnB5aXRyd3h1YXBmenllbHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDgxMzYsImV4cCI6MjA5NjYyNDEzNn0.fCLd47aigDVnBpaD3AyVazOL7aORaZmC9WLwC7kN-_I'

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
