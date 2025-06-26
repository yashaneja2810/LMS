import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Add better error handling and logging
console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing')
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl)
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Present' : 'Missing')
  throw new Error('Missing Supabase environment variables. Please check your Vercel environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          message: string
          response: string
          context: any
          created_at: string
        }
        Insert: {
          user_id: string
          message: string
          response: string
          context?: any
        }
      }
      test_results: {
        Row: {
          id: string
          user_id: string
          test_title: string
          score: number
          total_questions: number
          answers: any
          feedback: string
          created_at: string
        }
        Insert: {
          user_id: string
          test_title: string
          score: number
          total_questions: number
          answers: any
          feedback: string
        }
      }
      uploaded_content: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          file_type: string
          created_at: string
        }
        Insert: {
          user_id: string
          title: string
          content: string
          file_type: string
        }
      }
    }
  }
}