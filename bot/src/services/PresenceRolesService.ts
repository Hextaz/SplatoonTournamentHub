import { Client } from "discord.js";
import { supabase } from "../lib/supabase";
import { logger } from "../utils/logger";

export class PresenceRolesService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public init() {
    logger.info("Initializing Presence Roles Realtime Listener...");
    
    supabase
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
        // Just checked in
        if (newCaptain) await this.applyPresence(newRecord);
      } else if (wasCheckedIn && !isCheckedIn) {
        // Un-checked in
        if (oldCaptain) await this.removePresence(oldRecord);
      } else if (isCheckedIn && wasCheckedIn) {
        // Checked in all along, but maybe captain or name changed
        if (oldCaptain !== newCaptain) {
          if (oldCaptain) await this.removePresence(oldRecord);
          if (newCaptain) await this.applyPresence(newRecord);
        } else if (oldName !== newName) {
          // Name changed, update nickname
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

    try {
      const guild = await this.client.guilds.fetch(tourney.guild_id);
      if (!guild) return;

      const member = await guild.members.fetch(team.captain_discord_id).catch(() => null);
      if (!member) return;

      // 1. Apply Nickname (Team Name)
      if (member.manageable) {
        let nickname = team.name;
        // Discord limits nickname to 32 max chars
        if (nickname.length > 32) nickname = nickname.substring(0, 32);

        if (member.nickname !== nickname && member.user.displayName !== nickname) {
          await member.setNickname(nickname, "Check-in au Tournoi").catch((e) => logger.error(`Failed to set nickname for ${team.captain_discord_id}:`, e));
        }
      }

      // 2. Apply Role
      if (tourney.discord_captain_role_id) {
        const role = guild.roles.cache.get(tourney.discord_captain_role_id);
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role, "Check-in au Tournoi").catch((e) => logger.error(`Failed to assign role to ${team.captain_discord_id}:`, e));
        }
      }
    } catch (e) {
      logger.error(`Error applying presence for team ${team.id}:`, e);
    }
  }

  private async removePresence(team: any) {
    const tourney = await this.getTournamentInfo(team.tournament_id);
    if (!tourney || !tourney.guild_id) return;

    try {
      const guild = await this.client.guilds.fetch(tourney.guild_id);
      if (!guild) return;

      const member = await guild.members.fetch(team.captain_discord_id).catch(() => null);
      if (!member) return;

      // 1. Remove Nickname
      if (member.manageable && member.nickname === team.name.substring(0, 32)) {
        await member.setNickname(null, "Annulation du Check-in / Changement d'équipe").catch((e) => logger.error(`Failed to remove nickname for ${team.captain_discord_id}:`, e));
      }

      // 2. Remove Role
      if (tourney.discord_captain_role_id) {
        const role = guild.roles.cache.get(tourney.discord_captain_role_id);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role, "Annulation du Check-in / Changement d'équipe").catch((e) => logger.error(`Failed to remove role from ${team.captain_discord_id}:`, e));
        }
      }
    } catch (e) {
      logger.error(`Error removing presence for team ${team.id}:`, e);
    }
  }
}
