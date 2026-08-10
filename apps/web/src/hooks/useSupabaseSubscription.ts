"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseSupabaseSubscriptionOptions {
  table: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  onChange: (payload: any) => void;
  enabled?: boolean;
}

export function useSupabaseSubscription({
  table,
  filter,
  event = "*",
  schema = "public",
  onChange,
  enabled = true,
}: UseSupabaseSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stableCallback = useCallback((payload: any) => {
    onChangeRef.current(payload);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `${schema}:${table}:${filter || "all"}:${Date.now()}`;

    let channel = supabase.channel(channelName);

    const config: any = { event, schema, table };
    if (filter) config.filter = filter;

    channel = channel.on("postgres_changes", config, stableCallback).subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, event, schema, enabled, stableCallback]);
}
