import { createClient } from "@supabase/supabase-js";
import { getSession } from "next-auth/react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      let session;
      try {
        session = await getSession();
      } catch {
        // Server-side — no NextAuth session available
      }

      const access_token = (session as any)?.supabaseAccessToken;

      if (!access_token && typeof window !== "undefined") {
        // Client-side with no valid session — token expired or missing.
        // The request will proceed without auth header and likely fail with RLS,
        // but we don't force-redirect here to avoid loops on public pages.
        // Components should check session validity themselves.
      }

      const headers = new Headers(options.headers);
      if (access_token) {
        headers.set("Authorization", `Bearer ${access_token}`);
      }

      return fetch(url, { ...options, headers });
    },
  },
});
