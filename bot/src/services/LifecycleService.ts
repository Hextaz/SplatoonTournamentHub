import { Client, Guild, ChannelType, CategoryChannel, PermissionFlagsBits, OverwriteData } from 'discord.js';
import { supabase } from '../lib/supabase';

export class LifecycleService {
  /**
   * Lance le tournoi : crée la catégorie Discord et un salon textuel de bienvenue.
   */
  static async launchTournament(tournamentId: string, guildId: string, discordClient: Client): Promise<boolean> {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (error || !tournament) throw new Error('Tournament not found');

      const guild: Guild | undefined = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => undefined);
      if (!guild) throw new Error(`Guild ${guildId} not found by bot.`);

      // 1. Définir les permissions de base (Catégorie fermée au public, visible pour tous temporairement ou pour T.O. etc)
      const permissions: OverwriteData[] = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ];

      // Si y a un rôle TO, on lui donne tout accès
      if (tournament.discord_to_role_id) {
        permissions.push({
          id: tournament.discord_to_role_id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        });
      }

      // Si y a un rôle Capitaine, on lui donne accès en lecture pour l'instant
      if (tournament.discord_captain_role_id) {
        permissions.push({
          id: tournament.discord_captain_role_id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          deny: [PermissionFlagsBits.SendMessages],
        });
      }

      // 2. Créer la catégorie
      const categoryName = `🏆 ${tournament.name}`;
      const category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: permissions,
      });

      console.log(`[LifecycleService] Created category ${category.name} (${category.id}) for tournament ${tournamentId}`);

      // 3. Créer un salon "#informations" dans la catégorie
      const infoChannel = await guild.channels.create({
        name: 'informations',
        type: ChannelType.GuildText,
        parent: category.id,
      });

      const messagePayload: any = {
        embeds: [{
          title: "🚀 Le Tournoi commence !",
          description: `Bienvenue dans la zone sécurisée de l'évènement **${tournament.name}**.\nLes salons de match ainsi que l'arbre final seront générés ici sous peu.\n\nRestez à l'écoute des annonces !`,
          color: 0x3b82f6, // Blue
        }]
      };

      if (tournament.discord_captain_role_id) {
        messagePayload.content = `<@&${tournament.discord_captain_role_id}>`;
      }

      await infoChannel.send(messagePayload);

      // (Optionnel) Si y a un salon d'annonce général, on ping tout le monde
      if (tournament.discord_announcement_channel_id) {
        const annChannel = await guild.channels.fetch(tournament.discord_announcement_channel_id).catch(() => null);
        if (annChannel && annChannel.isTextBased()) {
          await annChannel.send(`🏆 **${tournament.name}** est maintenant actif ! Les joueurs concernés ont accès à leur salon privatif.`);
        }
      }

      // 4. Mettre à jour la DB
      await supabase
        .from('tournaments')
        .update({ 
          status: 'ACTIVE',
          discord_category_id: category.id 
        })
        .eq('id', tournamentId);

      const { data: phasesIds_1 } = await supabase.from("phases").select("id").eq("tournament_id", tournamentId);
      if (phasesIds_1 && phasesIds_1.length > 0) {
         for (const p of phasesIds_1) {
            await this.syncPhaseChannels(p.id, guildId, discordClient).catch(err => console.error(err));
         }
      }

      return true;

    } catch (error) {
      console.error('[LifecycleService] Error launching tournament:', error);
      throw error;
    }
  }

  /**
   * Clôture le tournoi : supprime la catégorie Discord et tous ses salons enfants.
   */
  static async closeTournament(tournamentId: string, guildId: string, discordClient: Client): Promise<boolean> {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (error || !tournament) throw new Error('Tournament not found');

      const guild: Guild | undefined = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => undefined);
      if (!guild) {
        console.warn(`[LifecycleService] Guild ${guildId} not found, proceeding with local DB update only.`);
      } else if (tournament.discord_category_id) {
        // Find category and its children
        const category = guild.channels.cache.get(tournament.discord_category_id) as CategoryChannel | undefined;
        if (category) {
          // Delete children first
          for (const [_, child] of category.children.cache) {
            await child.delete('Tournament Closure').catch(e => console.error(`Failed to delete channel ${child.id}:`, e));
          }
          // Delete category
          await category.delete('Tournament Closure').catch(e => console.error(`Failed to delete category ${category.id}:`, e));
          console.log(`[LifecycleService] Deleted category and children for tournament ${tournamentId}`);
        } else {
            console.warn(`[LifecycleService] Category ${tournament.discord_category_id} not found on Discord.`);
        }
      }

      // Modifier le statut à "COMPLETED" (Optionnel de clear discord_category_id, on garde pr l'historique potentiellement)
      await supabase
        .from('tournaments')
        .update({ 
          status: 'COMPLETED'
        })
        .eq('id', tournamentId);

      return true;
    } catch (error) {
      console.error('[LifecycleService] Error closing tournament:', error);
      throw error;
    }
  }

  /**
   * Synchronise les channels Discord spécifiques à une phase 
   * (un channel global pour l'arbre ou un channel par poule)
   */
  static async syncPhaseChannels(phaseId: string, guildId: string, discordClient: Client): Promise<boolean> {
    try {
      // 1. Fetch Phase, related Tournament, Groups, and Participants
      const { data: phase, error: phaseErr } = await supabase
        .from('phases')
        .select(`
          *,
          tournaments ( id, name, discord_category_id, discord_to_role_id ),
          groups ( id, name, discord_channel_id )
        `)
        .eq('id', phaseId)
        .single();
        
      if (phaseErr || !phase) throw new Error('Phase not found');
      
      const tournament = phase.tournaments;
      if (!tournament.discord_category_id) {
        throw new Error('Tournament does not have an active Discord Category. Please launch the tournament first.');
      }

      const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId).catch(() => undefined);
      if (!guild) throw new Error(`Guild ${guildId} not found.`);

      // 2. Fetch all teams in this phase to get Captain IDs
      const { data: ptData, error: ptErr } = await supabase
        .from('phase_teams')
        .select('group_id, teams ( id, captain_discord_id )')
        .eq('phase_id', phaseId);
      
      if (ptErr) throw ptErr;

      const isBracket = phase.format === 'SINGLE_ELIM' || phase.format === 'DOUBLE_ELIM';
      
      // Base permissions (everyone denied, TO allowed)
      const getBasePerms = (): OverwriteData[] => {
        const perms: OverwriteData[] = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel], // Lock it by default just in case
          }
        ];
        if (tournament.discord_to_role_id) {
          perms.push({
            id: tournament.discord_to_role_id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
          });
        }
        return perms;
      };

      if (isBracket) {
        // Create ONE channel for the whole phase
        let channelId = phase.discord_channel_id;

        const perms = getBasePerms();
        // Add all captains from this phase
        for (const pt of (ptData || [])) {
          const teamDetails: any = Array.isArray(pt.teams) ? pt.teams[0] : pt.teams;
          if (teamDetails?.captain_discord_id) {
            perms.push({
              id: teamDetails.captain_discord_id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            });
          }
        }

        if (!channelId) {
          // Create channel
          const phaseChannel = await guild.channels.create({
            name: `bracket-${phase.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            type: ChannelType.GuildText,
            parent: tournament.discord_category_id,
            permissionOverwrites: perms,
          });
          channelId = phaseChannel.id;

          // Update DB
          await supabase.from('phases').update({ discord_channel_id: channelId }).eq('id', phaseId);
          
          await phaseChannel.send(`🏁 Bienvenue dans le bracket **${phase.name}** ! Cet espace est réservé aux capitaines de cette phase.`);
        } else {
          // Update permissions of existing channel
          const phaseChannel = guild.channels.cache.get(channelId);
          if (phaseChannel && phaseChannel.isTextBased() && 'permissionOverwrites' in phaseChannel) {
             await phaseChannel.permissionOverwrites.set(perms);
          }
        }
      } else {
        // Round Robin / Swiss -> One channel per group
        const groups = phase.groups || [];
        
        for (const group of groups) {
          let channelId = group.discord_channel_id;
          
          // Find captains for this specific group
          const captainsInGroup = (ptData || [])
            .map(pt => ({
              group_id: pt.group_id,
              teamDetails: Array.isArray(pt.teams) ? pt.teams[0] : pt.teams
            }))
            .filter(pt => pt.group_id === group.id && pt.teamDetails?.captain_discord_id)
            .map(pt => pt.teamDetails!.captain_discord_id);

          const perms = getBasePerms();
          for (const capId of captainsInGroup) {
            perms.push({
              id: capId,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            });
          }

          if (!channelId) {
            // Create channel
            const groupChannel = await guild.channels.create({
              name: `groupe-${group.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              type: ChannelType.GuildText,
              parent: tournament.discord_category_id,
              permissionOverwrites: perms,
            });
            channelId = groupChannel.id;

            // Update DB
            await supabase.from('groups').update({ discord_channel_id: channelId }).eq('id', group.id);
            
            await groupChannel.send(`⚔️ Bienvenue dans le **Groupe ${group.name}** de la phase ${phase.name} ! Coordonnez vos matchs ici.`);
          } else {
            // Update perms
            const groupChannel = guild.channels.cache.get(channelId);
            if (groupChannel && groupChannel.isTextBased() && 'permissionOverwrites' in groupChannel) {
              await groupChannel.permissionOverwrites.set(perms);
            }
          }
        }
      }

      return true;

    } catch (error) {
      console.error('[LifecycleService] Error syncing phase channels:', error);
      throw error;
    }
  }
}