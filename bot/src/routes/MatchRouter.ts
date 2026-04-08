import { Router } from "express";
import { supabase } from "../lib/supabase";
import { ScoreService } from "../services/ScoreService";
import { TextChannel } from "discord.js";

export const matchRouter = Router();

matchRouter.put("/:id/force-score", async (req, res) => {
  try {
    const matchId = req.params.id;
    const { team1_score, team2_score } = req.body;

    if (typeof team1_score !== 'number' || typeof team2_score !== 'number') {
      return res.status(400).json({ error: "team1_score and team2_score must be numbers" });
    }

    // 1. Update match scores and status in DB
    const { data: updatedMatch, error: updateError } = await supabase
      .from("matches")
      .update({
        team1_score,
        team2_score,
        status: "COMPLETED"
      })
      .eq("id", matchId)
      .select()
      .single();

    if (updateError) throw updateError;
    if (!updatedMatch) return res.status(404).json({ error: "Match not found" });

    // 2. Fetch the channel if possible to send notifications (optional but good)
    const discordClient = req.app.locals.discordClient;
    let channel: TextChannel | undefined;
    
    if (discordClient && updatedMatch.discord_channel_id) {
      try {
        const fetchedChannel = await discordClient.channels.fetch(updatedMatch.discord_channel_id);
        if (fetchedChannel && fetchedChannel.isTextBased()) {
          channel = fetchedChannel as TextChannel;
        }
      } catch (err) {
         console.warn(`Could not fetch channel ${updatedMatch.discord_channel_id} for match ${matchId}`);
      }
    }

    // 3. Progress teams in the bracket
    // @ts-ignore - accessing private static method or ensuring we can call it.
    // In TS, if progressTeams is private, we might need to bypass it or make it public.
    // Let's assume it can be called via ScoreService['progressTeams'] or we use a public wrapper.
    // If it's private, we use ts-ignore.
    await ScoreService["progressTeams"](updatedMatch, channel as any);

    res.status(200).json({ message: "Score forced and bracket updated", match: updatedMatch });
  } catch (error: any) {
    console.error("Force Score Error:", error);
    res.status(500).json({ error: error.message });
  }
});
