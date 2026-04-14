import { createClient } from "@supabase/supabase-js";
import { getSession } from "next-auth/react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Attention: Pour des opérations d'administration qui contournent les RLS (Row Level Security),
// il est recommandé d'utiliser SUPABASE_SERVICE_ROLE_KEY côté serveur uniquement.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      // getSession() fonctionne de maniÃ¨re asynchrone cÃ´tÃ© client pour rÃ©cupÃ©rer la session NextAuth
      let session;
      try {
        session = await getSession();
      } catch (e) {
        // Ignorer l'erreur si on l'appelle cÃ´tÃ© serveur
      }

      const access_token = (session as any)?.supabaseAccessToken;
      
      const headers = new Headers(options.headers);
      if (access_token) {
        headers.set("Authorization", `Bearer ${access_token}`);
      }

      return fetch(url, { ...options, headers });
    },
  },
});
