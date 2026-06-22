import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Utilisation de la clé Service Role pour le bot (contourne les RLS)
console.log(`[Supabase] URL: ${supabaseUrl}`);
console.log(`[Supabase] Service Role Key present: ${!!supabaseServiceKey} (length: ${supabaseServiceKey.length})`);

export const supabase = createClient(supabaseUrl, supabaseServiceKey);