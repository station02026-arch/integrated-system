// frontend/utils/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

// .env.localから環境変数を読み込む
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Supabaseクライアントのインスタンスを作成・エクスポート
export const supabase = createClient(supabaseUrl, supabaseAnonKey)