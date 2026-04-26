import { Client } from "discord.js";
import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function retryWithBackoff<T>(fn: () => Promise<T>, label: string): Promise<T | undefined> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRateLimit = e?.code === 429 || e?.httpStatus === 429;
      const isMissingAccess = e?.code === 50013;
      const retryable = isRateLimit || isMissingAccess;

      if (!retryable || attempt === MAX_RETRIES) {
        logger.error(`${label} failed (attempt ${attempt}/${MAX_RETRIES}):`, e);
        return undefined;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      const retryAfter = e?.retryAfter ? e.retryAfter * 1000 : 0;
      const waitMs = Math.max(delay, retryAfter);
      logger.warn(`${label} retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
  return undefined;
}

export class PresenceRolesService {
  private client: Client;
  private initialized = false;
  private channel: RealtimeChannel | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  public init() {
    if (this.initialized) {
      logger.warn("[PresenceRoles] init() called twice — ignoring duplicate.");
      return;
    }
    this.initialized = true;

    logger.info("Initializing Presence Roles Realtime Listener...");

    // Unsubscribe previous channel if it exists
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase
      .channel('public:teams_presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, async (payload) => {
        try {
          await this.handleTeamChange(payload);
        } catch (error) {
          logger.error("Error handling team presence change:", error);
        }
      })
      .subscribe();
  }

  public destroy() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.initialized = false;
  }

  private async handleTeamChange(payload: any) {
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    if (eventType === "INSERT") {
      if (newRecord.is_checked_in && newRecord.captain_discord_id) {
        await this.applyPresence(newRecord);
      }
    } else if (eventType === "UPDATE") {
      const wasCheckedIn = oldRecord.is_checked_in;
      const isCheckedIn = newRecord.is_checked_in;
      const oldCaptain = oldRecord.captain_discord_id;
      const newCaptain = newRecord.captain_discord_id;
      const oldName = oldRecord.name;
      const newName = newRecord.name;

      if (!wasCheckedIn && isCheckedIn) {
        if (newCaptain) await this.applyPresence(newRecord);
      } else if (wasCheckedIn && !isCheckedIn) {
        if (oldCaptain) await this.removePresence(oldRecord);
      } else if (isCheckedIn && wasCheckedIn) {
        if (oldCaptain !== newCaptain) {
          if (oldCaptain) await this.removePresence(oldRecord);
          if (newCaptain) await this.applyPresence(newRecord);
        } else if (oldName !== newName) {
          if (newCaptain) await this.applyPresence(newRecord);
        }
      }
    } else if (eventType === "DELETE") {
      if (oldRecord.is_checked_in && oldRecord.captain_discord_id) {
        await this.removePresence(oldRecord);
      }
    }
  }

  private async getTournamentInfo(tournamentId: string) {
    const { data: tourney } = await supabase
      .from("tournaments")
      .select("guild_id, discord_captain_role_id")
      .eq("id", tournamentId)
      .single();
    return tourney;
  }

  private async applyPresence(team: any) {
    const tourney = await this.getTournamentInfo(team.tournament_id);
    if (!tourney || !tourney.guild_id) return;

    const guild = await retryWithBackoff(
      () => this.client.guilds.fetch(tourney.guild_id),
      `PresenceRoles: fetch guild ${tourney.guild_id}`
    );
    if (!guild) return;

    const member = await retryWithBackoff(
      () => guild.members.fetch(team.captain_discord_id),
      `PresenceRoles: fetch member ${team.captain_discord_id}`
    );
    if (!member) return;

    // 1. Apply Nickname (Team Name)
    if (member.manageable) {
      let nickname = team.name;
      if (nickname.length > 32) nickname = nickname.substring(0, 32);

      if (member.nickname !== nickname && member.user.displayName !== nickname) {
        await retryWithBackoff(
          () => member!.setNickname(nickname, "Check-in au Tournoi"),
          `PresenceRoles: set nickname for ${team.captain_discord_id}`
        );
      }
    }

    // 2. Apply Role
    if (tourney.discord_captain_role_id) {
      const role = guild.roles.cache.get(tourney.discord_captain_role_id);
      if (role && !member.roles.cache.has(role.id)) {
        await retryWithBackoff(
          () => member!.roles.add(role, "Check-in au Tournoi"),
          `PresenceRoles: add role to ${team.captain_discord_id}`
        );
      }
    }
  }

  private async removePresence(team: any) {
    const tourney = await this.getTournamentInfo(team.tournament_id);
    if (!tourney || !tourney.guild_id) return;

    const guild = await retryWithBackoff(
      () => this.client.guilds.fetch(tourney.guild_id),
      `PresenceRoles: fetch guild ${tourney.guild_id}`
    );
    if (!guild) return;

    const member = await retryWithBackoff(
      () => guild.members.fetch(team.captain_discord_id),
      `PresenceRoles: fetch member ${team.captain_discord_id}`
    );
    if (!member) return;

    // 1. Remove Nickname
    if (member.manageable && member.nickname === team.name.substring(0, 32)) {
      await retryWithBackoff(
        () => member!.setNickname(null, "Annulation du Check-in / Changement d'équipe"),
        `PresenceRoles: remove nickname for ${team.captain_discord_id}`
      );
    }

    // 2. Remove Role
    if (tourney.discord_captain_role_id) {
      const role = guild.roles.cache.get(tourney.discord_captain_role_id);
      if (role && member.roles.cache.has(role.id)) {
        await retryWithBackoff(
          () => member!.roles.remove(role, "Annulation du Check-in / Changement d'équipe"),
          `PresenceRoles: remove role from ${team.captain_discord_id}`
        );
      }
    }
  }
}
