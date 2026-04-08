import { Client, Guild, TextChannel, CategoryChannel, PermissionFlagsBits } from "discord.js";
import { supabase } from "../lib/supabase";

export class ArchiveService {
  /**
   * Performs the background Discord cleanup (removing roles, making channels read-only)
   * while the HTTP request can immediately return.
   */
  public static async backgroundDiscordCleanup(
    client: Client,
    guildId: string,
    captainRoleId: string | null
  ) {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        console.error(`[ArchiveService] Guild ${guildId} not found.`);
        return;
      }

      // 1. Remove "Captain" role from all members
      if (captainRoleId) {
        const role = await guild.roles.fetch(captainRoleId);
        if (role) {
          // Fetch members to ensure we have the cached list
          await guild.members.fetch();
          
          for (const [memberId, member] of role.members) {
            try {
              await member.roles.remove(role, "Archivage du Tournoi");
              // Rate limit safeguard: wait explicitly 500ms between each member
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (err) {
              console.error(`[ArchiveService] Échec du retrait du rôle pour ${member.user.tag}:`, err);
            }
          }
          console.log(`[ArchiveService] Rôle Capitaine retiré pour le serveur ${guild.name}.`);
        }
      }

      // 2. Make tournament check-in channel read-only
      // In the future, we could find the tournament category and make it all read-only.
      // For now, let's fetch the server settings to lock the checkin channel.
      const { data: settings } = await supabase
        .from("server_settings")
        .select("checkin_channel_id")
        .eq("guild_id", guildId)
        .single();

      if (settings?.checkin_channel_id) {
        const checkinChannel = await guild.channels.fetch(settings.checkin_channel_id).catch(() => null);
        if (checkinChannel && checkinChannel.isTextBased() && !checkinChannel.isThread()) {
          const textChannel = checkinChannel as TextChannel;
          await textChannel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false,
          }, { reason: "Archivage du Tournoi" });
          console.log(`[ArchiveService] Salon ${textChannel.name} passé en lecture seule.`);
        }
      }

      console.log(`[ArchiveService] Nettoyage asynchrone terminé avec succès.`);
    } catch (error) {
      console.error("[ArchiveService] Erreur lors du nettoyage background:", error);
    }
  }
}
