import schedule from "node-schedule";
import {
  type Client,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { supabase } from "../lib/supabase";

export class SchedulerService {
  private static activeJobs: Map<string, schedule.Job> = new Map();
  private static client: Client;

  public static async init(client: Client) {
    this.client = client;
    console.log("[Scheduler] Initializing SchedulerService...");

    // Au démarrage, on récupère tous les tournois dont la phase de check-in est dans le futur
    const { data: tournaments, error } = await supabase
      .from("tournaments")
      .select("*")
      .gte("checkin_end_at", new Date().toISOString());

    if (error) {
      console.error("[Scheduler] Error fetching active tournaments:", error);
      return;
    }

    if (tournaments && tournaments.length > 0) {
      console.log(
        `[Scheduler] Found ${tournaments.length} active tournaments to schedule.`,
      );
      for (const t of tournaments) {
        if (t.checkin_start_at && t.checkin_end_at && t.guild_id) {
          this.scheduleTournament(t);
        }
      }
    }
  }

  public static scheduleTournament(tournament: any) {
    // 1. Annuler les anciens jobs si on reschedule
    this.cancelTournamentJobs(tournament.id);

    const now = new Date();
    const startAt = new Date(tournament.checkin_start_at);
    const endAt = new Date(tournament.checkin_end_at);

    // --- Action Ouverture ---
    if (now < startAt) {
      const openJob = schedule.scheduleJob(startAt, async () => {
        await this.handleOpenCheckin(tournament);
      });
      this.activeJobs.set(`${tournament.id}_open`, openJob);
    } else if (now >= startAt && now < endAt) {
      // Le bot a restarté pendant la phase de check-in, on assure que les messages sont toujours ok
      // On pourrait relancer handleOpenCheckin s'il n'y a pas de checkin_message_id, à voir.
    }

    // --- Actions Rappels ---
    // Calcul de la durée en minutes
    const diffMs = endAt.getTime() - startAt.getTime();
    const durationMin = Math.floor(diffMs / 60000);

    // Rappel - 30 min (si la durée totale est > 30min)
    if (durationMin >= 30) {
      const remind30Time = new Date(endAt.getTime() - 30 * 60000);
      if (now < remind30Time) {
        const remind30Job = schedule.scheduleJob(remind30Time, async () => {
          await this.handleReminders(tournament, 30);
        });
        this.activeJobs.set(`${tournament.id}_remind30`, remind30Job);
      }
    }

    // Rappel - 10 min
    if (durationMin >= 10) {
      const remind10Time = new Date(endAt.getTime() - 10 * 60000);
      if (now < remind10Time) {
        const remind10Job = schedule.scheduleJob(remind10Time, async () => {
          await this.handleReminders(tournament, 10);
        });
        this.activeJobs.set(`${tournament.id}_remind10`, remind10Job);
      }
    }

    // --- Action Fermeture ---
    if (now < endAt) {
      const closeJob = schedule.scheduleJob(endAt, async () => {
        await this.handleCloseCheckin(tournament);
      });
      this.activeJobs.set(`${tournament.id}_close`, closeJob);
    }

    console.log(
      `[Scheduler] Programmed check-in jobs for tournament ${tournament.id} (Open: ${startAt.toISOString()}, Close: ${endAt.toISOString()})`,
    );
  }

  public static cancelTournamentJobs(tournamentId: string) {
    const jobKeys = [
      `${tournamentId}_open`,
      `${tournamentId}_remind30`,
      `${tournamentId}_remind10`,
      `${tournamentId}_close`,
    ];
    for (const key of jobKeys) {
      const job = this.activeJobs.get(key);
      if (job) {
        job.cancel();
        this.activeJobs.delete(key);
      }
    }
  }

  // ============== HANDLERS D'ACTIONS ==============

  private static async handleOpenCheckin(tournament: any) {
    try {
      console.log(
        `[Scheduler] Executing Check-in Open for tournament ${tournament.id}`,
      );

      const { data: settings } = await supabase
        .from("server_settings")
        .select("checkin_channel_id")
        .eq("guild_id", tournament.guild_id)
        .single();

      if (!settings?.checkin_channel_id) return;

      const channel = (await this.client.channels.fetch(
        settings.checkin_channel_id,
      )) as TextChannel;
      if (!channel || !("send" in channel)) return;

      const checkinEmbed = new EmbedBuilder()
        .setTitle("✅ Check-in Ouvert !")
        .setDescription(
          `Le check-in pour le tournoi commence maintenant.\nCapitaines, cliquez sur le bouton ci-dessous pour confirmer votre présence.\n\nFermeture prévue : <t:${Math.floor(new Date(tournament.checkin_end_at).getTime() / 1000)}:R>`,
        )
        .setColor(0x00ff00);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("btn_checkin")
          .setLabel("Valider ma présence")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✅"),
      );

      const msg = await channel.send({
        embeds: [checkinEmbed],
        components: [row],
      });

      // Save message ID to DB
      await supabase
        .from("tournaments")
        .update({ checkin_message_id: msg.id })
        .eq("id", tournament.id);
    } catch (e) {
      console.error("[Scheduler] Failed opening checkin:", e);
    }
  }

  private static async handleReminders(tournament: any, minutesLeft: number) {
    try {
      console.log(
        `[Scheduler] Warning Check-in closes in ${minutesLeft}min for tournament ${tournament.id}`,
      );

      // Get settings for channel
      const { data: settings } = await supabase
        .from("server_settings")
        .select("checkin_channel_id")
        .eq("guild_id", tournament.guild_id)
        .single();
      if (!settings?.checkin_channel_id) return;

      // Get teams that haven't checked in
      const { data: teams } = await supabase
        .from("teams")
        .select("captain_discord_id")
        .eq("tournament_id", tournament.id)
        .eq("is_checked_in", false);

      if (!teams || teams.length === 0) return; // All checked in

      const channel = (await this.client.channels.fetch(
        settings.checkin_channel_id,
      )) as TextChannel;
      if (!channel || !("send" in channel)) return;

      const mentions = teams.map((t) => `<@${t.captain_discord_id}>`).join(" ");
      await channel.send(
        `⚠️ **Rappel** : Il reste ${minutesLeft} minutes pour faire votre Check-in !\n${mentions}`,
      );
    } catch (e) {
      console.error("[Scheduler] Failed sending reminders:", e);
    }
  }

  private static async handleCloseCheckin(tournament: any) {
    try {
      console.log(
        `[Scheduler] Closing checkin for tournament ${tournament.id}`,
      );

      // Refresh tournament data to get the latest message_id
      const { data: latestTournament } = await supabase
        .from("tournaments")
        .select("checkin_message_id, guild_id")
        .eq("id", tournament.id)
        .single();

      if (!latestTournament?.checkin_message_id) return;

      const { data: settings } = await supabase
        .from("server_settings")
        .select("checkin_channel_id")
        .eq("guild_id", latestTournament.guild_id)
        .single();
      if (!settings?.checkin_channel_id) return;

      const channel = (await this.client.channels.fetch(
        settings.checkin_channel_id,
      )) as TextChannel;
      if (!channel || !("messages" in channel)) return;

      const msg = await channel.messages.fetch(
        latestTournament.checkin_message_id,
      );
      if (msg) {
        const checkinEmbed = new EmbedBuilder()
          .setTitle("🛑 Check-in Terminé !")
          .setDescription(`Le check-in pour ce tournoi est maintenant clos.`)
          .setColor(0xff0000);

        await msg.edit({
          content: "Le check-in est terminé.",
          embeds: [checkinEmbed],
          components: [],
        });
      }
    } catch (e) {
      console.error("[Scheduler] Failed closing checkin:", e);
    }
  }
}
