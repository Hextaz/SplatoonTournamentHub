"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeMatchesOptions {
  initialMatches: any[];
  phaseId?: string;
  tournamentId?: string;
  enabled?: boolean;
}

export function useRealtimeMatches({
  initialMatches,
  phaseId,
  tournamentId,
  enabled = true,
}: UseRealtimeMatchesOptions) {
  const [matches, setMatches] = useState<any[]>(initialMatches);
  const [recentlyUpdatedMatchId, setRecentlyUpdatedMatchId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Sync state if initialMatches prop updates from server revalidation
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  const handleMatchChange = useCallback(async (payload: any) => {
    const { eventType, new: newMatch, old: oldMatch } = payload;

    if (eventType === "DELETE") {
      setMatches((prev) => prev.filter((m) => m.id !== oldMatch.id));
      return;
    }

    // Fetch relational team data for newly inserted or updated match if needed
    let matchData = newMatch;
    if (newMatch.team1_id || newMatch.team2_id) {
      const { data: populated } = await supabase
        .from("matches")
        .select("*, team1:team1_id(*), team2:team2_id(*), phase:phase_id(name, phase_order)")
        .eq("id", newMatch.id)
        .single();

      if (populated) {
        matchData = populated;
      }
    }

    setMatches((prev) => {
      const index = prev.findIndex((m) => m.id === matchData.id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...matchData };
        return updated;
      }
      return [matchData, ...prev];
    });

    // Flash highlight effect on updated match
    setRecentlyUpdatedMatchId(matchData.id);
    setTimeout(() => {
      setRecentlyUpdatedMatchId((current) => (current === matchData.id ? null : current));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-matches:${phaseId || tournamentId || "global"}:${Date.now()}`;
    let channel = supabase.channel(channelName);

    const config: any = {
      event: "*",
      schema: "public",
      table: "matches",
    };

    if (phaseId) {
      config.filter = `phase_id=eq.${phaseId}`;
    }

    channel = channel
      .on("postgres_changes", config, handleMatchChange)
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [phaseId, tournamentId, enabled, handleMatchChange]);

  return {
    matches,
    recentlyUpdatedMatchId,
    isConnected,
  };
}
