import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Attention: Pour des opérations d'administration qui contournent les RLS (Row Level Security),
// il est recommandé d'utiliser SUPABASE_SERVICE_ROLE_KEY côté serveur uniquement.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
