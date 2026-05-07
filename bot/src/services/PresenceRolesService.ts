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
      const isUnknownMember = e?.code === 10007;
      const isUnknownGuild = e?.code === 10004;
      const retryable = isRateLimit || isMissingAccess;

      logger.error(`${label} failed (attempt ${attempt}/${MAX_RETRIES}):`, {
        error: e?.message || e,
        code: e?.code,
        httpStatus: e?.httpStatus,
        isRateLimit,
        isMissingAccess,
        isUnknownMember,
        isUnknownGuild,
        retryable
      });

      if (!retryable || attempt === MAX_RETRIES) {
        logger.error(`${label} failed permanently after ${attempt} attempts`);
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

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

    this.setupRealtimeChannel();
  }

  private setupRealtimeChannel() {
    logger.info("[PresenceRoles] Setting up realtime channel...");

    this.channel = supabase
      .channel('public:teams_presence', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, async (payload) => {
        try {
          await this.handleTeamChange(payload);
        } catch (error) {
          logger.error("Error handling team presence change:", error);
        }
      })
      .subscribe((status, err) => {
        logger.info(`[PresenceRoles] Realtime channel status: ${status}`);

        if (err) {
          logger.error(`[PresenceRoles] Realtime channel error:`, err);
        }

        if (status === 'SUBSCRIBED') {
          logger.info("[PresenceRoles] Successfully subscribed to teams table changes");
          this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        } else if (status === 'CLOSED') {
          logger.warn(`[PresenceRoles] Channel closed, attempting to reconnect...`);
          this.handleReconnect();
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`[PresenceRoles] Channel error, attempting to reconnect...`);
          this.handleReconnect();
        } else if (status === 'TIMED_OUT') {
          logger.error(`[PresenceRoles] Channel timed out, attempting to reconnect...`);
          this.handleReconnect();
        } else if (status === 'JOINING') {
          logger.info(`[PresenceRoles] Channel joining...`);
        }
      });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`[PresenceRoles] Max reconnection attempts (${this.maxReconnectAttempts}) reached, giving up`);
      logger.error(`[PresenceRoles] Please check: 1) Supabase URL and Service Role Key are correct, 2) Realtime is enabled in Supabase, 3) Network connectivity`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    logger.info(`[PresenceRoles] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      try {
        logger.info(`[PresenceRoles] Attempting to reconnect...`);
        if (this.channel) {
          supabase.removeChannel(this.channel);
          logger.info(`[PresenceRoles] Old channel removed`);
        }
        this.setupRealtimeChannel();
      } catch (error) {
        logger.error("[PresenceRoles] Error during reconnection:", error);
        this.handleReconnect();
      }
    }, delay);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized) {
        logger.warn("[PresenceRoles] Health check failed - Service not initialized");
        return false;
      }

      if (!this.channel) {
        logger.warn("[PresenceRoles] Health check failed - No channel");
        return false;
      }

      // Check if channel is still subscribed
      const state = String(this.channel.state);
      logger.info(`[PresenceRoles] Health check - Channel state: ${state}`);

      // Check if the channel is in a subscribed state
      const isHealthy = state === 'SUBSCRIBED';

      if (!isHealthy) {
        logger.warn(`[PresenceRoles] Health check failed - Channel not subscribed (state: ${state})`);
        logger.warn(`[PresenceRoles] Possible causes: 1) Supabase Realtime not enabled, 2) Network issues, 3) Invalid Supabase credentials`);
      }

      return isHealthy;
    } catch (error) {
      logger.error("[PresenceRoles] Health check error:", error);
      return false;
    }
  }

  public async diagnoseConnection(): Promise<{ success: boolean; details: any }> {
    const details: any = {
      initialized: this.initialized,
      channelExists: !!this.channel,
      channelState: this.channel ? String(this.channel.state) : 'N/A',
      reconnectAttempts: this.reconnectAttempts,
      supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'missing',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
    };

    try {
      // Test basic Supabase connection
      const { error } = await supabase.from('teams').select('count').limit(1);
      details.supabaseConnection = error ? 'failed' : 'success';
      details.supabaseError = error?.message;

      if (error) {
        logger.error(`[PresenceRoles] Supabase connection test failed:`, error);
      } else {
        logger.info(`[PresenceRoles] Supabase connection test successful`);
      }

      details.success = !error && this.channel && String(this.channel.state) === 'SUBSCRIBED';
    } catch (error: any) {
      details.error = error?.message || 'Unknown error';
      details.success = false;
      logger.error(`[PresenceRoles] Diagnostics error:`, error);
    }

    return details;
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

    logger.info(`[PresenceRoles] Team change detected - Event: ${eventType}, Team ID: ${newRecord?.id || oldRecord?.id}`);

    if (eventType === "INSERT") {
      logger.info(`[PresenceRoles] INSERT - Team: ${newRecord.name}, CheckedIn: ${newRecord.is_checked_in}, Captain: ${newRecord.captain_discord_id}`);
      if (newRecord.is_checked_in && newRecord.captain_discord_id) {
        await this.applyPresence(newRecord);
      } else {
        logger.info(`[PresenceRoles] INSERT - Skipping presence application (is_checked_in: ${newRecord.is_checked_in}, captain: ${newRecord.captain_discord_id})`);
      }
    } else if (eventType === "UPDATE") {
      const wasCheckedIn = oldRecord.is_checked_in;
      const isCheckedIn = newRecord.is_checked_in;
      const oldCaptain = oldRecord.captain_discord_id;
      const newCaptain = newRecord.captain_discord_id;
      const oldName = oldRecord.name;
      const newName = newRecord.name;

      logger.info(`[PresenceRoles] UPDATE - Team: ${newRecord.name}, wasCheckedIn: ${wasCheckedIn}, isCheckedIn: ${isCheckedIn}, oldCaptain: ${oldCaptain}, newCaptain: ${newCaptain}, oldName: ${oldName}, newName: ${newName}`);

      if (!wasCheckedIn && isCheckedIn) {
        logger.info(`[PresenceRoles] UPDATE - Check-in detected, applying presence`);
        if (newCaptain) await this.applyPresence(newRecord);
      } else if (wasCheckedIn && !isCheckedIn) {
        logger.info(`[PresenceRoles] UPDATE - Check-out detected, removing presence`);
        if (oldCaptain) await this.removePresence(oldRecord);
      } else if (isCheckedIn && wasCheckedIn) {
        if (oldCaptain !== newCaptain) {
          logger.info(`[PresenceRoles] UPDATE - Captain changed, removing old and adding new presence`);
          if (oldCaptain) await this.removePresence(oldRecord);
          if (newCaptain) await this.applyPresence(newRecord);
        } else if (oldName !== newName) {
          logger.info(`[PresenceRoles] UPDATE - Team name changed, updating nickname`);
          if (newCaptain) await this.applyPresence(newRecord);
        } else {
          logger.info(`[PresenceRoles] UPDATE - No relevant changes detected`);
        }
      }
    } else if (eventType === "DELETE") {
      logger.info(`[PresenceRoles] DELETE - Team: ${oldRecord.name}, CheckedIn: ${oldRecord.is_checked_in}, Captain: ${oldRecord.captain_discord_id}`);
      if (oldRecord.is_checked_in && oldRecord.captain_discord_id) {
        await this.removePresence(oldRecord);
      }
    }
  }

  private async getTournamentInfo(tournamentId: string) {
    logger.info(`[PresenceRoles] getTournamentInfo - Fetching tournament info for: ${tournamentId}`);
    const { data: tourney, error } = await supabase
      .from("tournaments")
      .select("guild_id, discord_captain_role_id")
      .eq("id", tournamentId)
      .single();

    if (error) {
      logger.error(`[PresenceRoles] getTournamentInfo - Error fetching tournament:`, error);
      return null;
    }

    if (!tourney) {
      logger.warn(`[PresenceRoles] getTournamentInfo - Tournament not found: ${tournamentId}`);
      return null;
    }

    logger.info(`[PresenceRoles] getTournamentInfo - Tournament found: ${tourney.guild_id}, Captain Role: ${tourney.discord_captain_role_id}`);
    return tourney;
  }

  private async applyPresence(team: any) {
    logger.info(`[PresenceRoles] applyPresence - Team: ${team.name}, Captain: ${team.captain_discord_id}, Tournament: ${team.tournament_id}`);

    const tourney = await this.getTournamentInfo(team.tournament_id);
    if (!tourney || !tourney.guild_id) {
      logger.error(`[PresenceRoles] applyPresence - Tournament not found or missing guild_id: ${team.tournament_id}`);
      return;
    }

    logger.info(`[PresenceRoles] applyPresence - Tournament found: ${tourney.guild_id}, Captain Role: ${tourney.discord_captain_role_id}`);

    const guild = await retryWithBackoff(
      () => this.client.guilds.fetch(tourney.guild_id),
      `PresenceRoles: fetch guild ${tourney.guild_id}`
    );
    if (!guild) {
      logger.error(`[PresenceRoles] applyPresence - Failed to fetch guild: ${tourney.guild_id}`);
      return;
    }

    logger.info(`[PresenceRoles] applyPresence - Guild fetched successfully: ${guild.name}`);

    const member = await retryWithBackoff(
      () => guild.members.fetch(team.captain_discord_id),
      `PresenceRoles: fetch member ${team.captain_discord_id}`
    );
    if (!member) {
      logger.error(`[PresenceRoles] applyPresence - Failed to fetch member: ${team.captain_discord_id}`);
      return;
    }

    logger.info(`[PresenceRoles] applyPresence - Member fetched successfully: ${member.user.tag}, Manageable: ${member.manageable}`);

    // 1. Apply Nickname (Team Name)
    if (member.manageable) {
      let nickname = team.name;
      if (nickname.length > 32) nickname = nickname.substring(0, 32);

      logger.info(`[PresenceRoles] applyPresence - Current nickname: ${member.nickname}, Target nickname: ${nickname}`);

      if (member.nickname !== nickname && member.user.displayName !== nickname) {
        try {
          await retryWithBackoff(
            () => member!.setNickname(nickname, "Check-in au Tournoi"),
            `PresenceRoles: set nickname for ${team.captain_discord_id}`
          );
          logger.info(`[PresenceRoles] applyPresence - Nickname set successfully: ${nickname}`);
        } catch (error: any) {
          logger.error(`[PresenceRoles] applyPresence - Failed to set nickname:`, error);
        }
      } else {
        logger.info(`[PresenceRoles] applyPresence - Nickname already set to target value`);
      }
    } else {
      logger.warn(`[PresenceRoles] applyPresence - Member is not manageable, skipping nickname update`);
    }

    // 2. Apply Role
    if (tourney.discord_captain_role_id) {
      const role = guild.roles.cache.get(tourney.discord_captain_role_id);
      if (role) {
        logger.info(`[PresenceRoles] applyPresence - Role found: ${role.name} (${role.id}), Has role: ${member.roles.cache.has(role.id)}`);

        if (!member.roles.cache.has(role.id)) {
          try {
            await retryWithBackoff(
              () => member!.roles.add(role, "Check-in au Tournoi"),
              `PresenceRoles: add role to ${team.captain_discord_id}`
            );
            logger.info(`[PresenceRoles] applyPresence - Role added successfully: ${role.name}`);
          } catch (error: any) {
            logger.error(`[PresenceRoles] applyPresence - Failed to add role:`, error);
          }
        } else {
          logger.info(`[PresenceRoles] applyPresence - Member already has the role`);
        }
      } else {
        logger.error(`[PresenceRoles] applyPresence - Role not found in cache: ${tourney.discord_captain_role_id}`);
      }
    } else {
      logger.warn(`[PresenceRoles] applyPresence - No captain role configured for tournament`);
    }

    logger.info(`[PresenceRoles] applyPresence - Completed for team: ${team.name}`);
  }

  private async removePresence(team: any) {
    logger.info(`[PresenceRoles] removePresence - Team: ${team.name}, Captain: ${team.captain_discord_id}, Tournament: ${team.tournament_id}`);

    const tourney = await this.getTournamentInfo(team.tournament_id);
    if (!tourney || !tourney.guild_id) {
      logger.error(`[PresenceRoles] removePresence - Tournament not found or missing guild_id: ${team.tournament_id}`);
      return;
    }

    logger.info(`[PresenceRoles] removePresence - Tournament found: ${tourney.guild_id}, Captain Role: ${tourney.discord_captain_role_id}`);

    const guild = await retryWithBackoff(
      () => this.client.guilds.fetch(tourney.guild_id),
      `PresenceRoles: fetch guild ${tourney.guild_id}`
    );
    if (!guild) {
      logger.error(`[PresenceRoles] removePresence - Failed to fetch guild: ${tourney.guild_id}`);
      return;
    }

    logger.info(`[PresenceRoles] removePresence - Guild fetched successfully: ${guild.name}`);

    const member = await retryWithBackoff(
      () => guild.members.fetch(team.captain_discord_id),
      `PresenceRoles: fetch member ${team.captain_discord_id}`
    );
    if (!member) {
      logger.error(`[PresenceRoles] removePresence - Failed to fetch member: ${team.captain_discord_id}`);
      return;
    }

    logger.info(`[PresenceRoles] removePresence - Member fetched successfully: ${member.user.tag}, Manageable: ${member.manageable}`);

    // 1. Remove Nickname
    if (member.manageable && member.nickname === team.name.substring(0, 32)) {
      logger.info(`[PresenceRoles] removePresence - Current nickname matches team name, removing`);
      try {
        await retryWithBackoff(
          () => member!.setNickname(null, "Annulation du Check-in / Changement d'équipe"),
          `PresenceRoles: remove nickname for ${team.captain_discord_id}`
        );
        logger.info(`[PresenceRoles] removePresence - Nickname removed successfully`);
      } catch (error: any) {
        logger.error(`[PresenceRoles] removePresence - Failed to remove nickname:`, error);
      }
    } else {
      logger.info(`[PresenceRoles] removePresence - Nickname does not match team name or member not manageable, skipping`);
    }

    // 2. Remove Role
    if (tourney.discord_captain_role_id) {
      const role = guild.roles.cache.get(tourney.discord_captain_role_id);
      if (role) {
        logger.info(`[PresenceRoles] removePresence - Role found: ${role.name} (${role.id}), Has role: ${member.roles.cache.has(role.id)}`);

        if (member.roles.cache.has(role.id)) {
          try {
            await retryWithBackoff(
              () => member!.roles.remove(role, "Annulation du Check-in / Changement d'équipe"),
              `PresenceRoles: remove role from ${team.captain_discord_id}`
            );
            logger.info(`[PresenceRoles] removePresence - Role removed successfully: ${role.name}`);
          } catch (error: any) {
            logger.error(`[PresenceRoles] removePresence - Failed to remove role:`, error);
          }
        } else {
          logger.info(`[PresenceRoles] removePresence - Member does not have the role`);
        }
      } else {
        logger.error(`[PresenceRoles] removePresence - Role not found in cache: ${tourney.discord_captain_role_id}`);
      }
    } else {
      logger.warn(`[PresenceRoles] removePresence - No captain role configured for tournament`);
    }

    logger.info(`[PresenceRoles] removePresence - Completed for team: ${team.name}`);
  }
}
