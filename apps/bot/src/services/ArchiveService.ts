import { Client, TextChannel } from "discord.js";
import { supabase } from "../lib/supabase";

const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES_MS = 100;

async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));

    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }
}

export class ArchiveService {
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

      // 1. Remove "Captain" role from all members — parallel batches
      if (captainRoleId) {
        const role = await guild.roles.fetch(captainRoleId);
        if (role) {
          await guild.members.fetch();

          const members = [...role.members.entries()];

          await processInBatches(members, BATCH_SIZE, async ([, member]) => {
            try {
              await member.roles.remove(role, "Archivage du Tournoi");
            } catch (err) {
              console.error(`[ArchiveService] Failed to remove role for ${member.user.tag}:`, err);
            }
          });

          console.log(`[ArchiveService] Rôle Capitaine retiré pour ${members.length} membres du serveur ${guild.name}.`);
        }
      }

      // 2. Make tournament check-in channel read-only
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
