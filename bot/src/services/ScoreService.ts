import { ModalSubmitInteraction, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { supabase } from "../lib/supabase";
import { LeaderboardService } from "./LeaderboardService";

function isValidScore(val: number): boolean {
  return Number.isInteger(val) && val >= 0 && val <= 99;
}

export class ScoreService {
  public static async handleSelectMenu(interaction: StringSelectMenuInteraction) {
    if (interaction.customId !== 'select_match_to_score') return;

    const matchId = interaction.values[0];
    const captainId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    const { data: match } = await supabase
      .from('matches')
      .select('*, teamA:teams!matches_team1_id_fkey(id, name, captain_discord_id), teamB:teams!matches_team2_id_fkey(id, name, captain_discord_id)')
      .eq('id', matchId)
      .single();

    if (!match) {
      return interaction.editReply({ content: '❌ Match introuvable.' });
    }

    if (match.status !== 'PENDING' && match.status !== 'IN_PROGRESS') {
      return interaction.editReply({ content: '❌ Ce match n\'est plus en attente de résultat.' });
    }

    const isTeam1 = match.teamA?.captain_discord_id === captainId;
    const isTeam2 = match.teamB?.captain_discord_id === captainId;

    if (!isTeam1 && !isTeam2) {
      return interaction.editReply({ content: '❌ Vous n\'êtes pas capitaine dans ce match.' });
    }

    const myTeamId = isTeam1 ? match.team1_id : match.team2_id;
    const myName = isTeam1 ? match.teamA?.name : match.teamB?.name;
    const oppName = isTeam1 ? match.teamB?.name || 'Inconnu' : match.teamA?.name || 'Inconnu';

    const modal = new ModalBuilder()
      .setCustomId(`modal_score_${matchId}_${myTeamId}`)
      .setTitle('Signaler le score');

    const myScoreInput = new TextInputBuilder()
      .setCustomId('my_score')
      .setLabel(`Score de votre équipe (${myName})`)
      .setPlaceholder('Exemple : 2')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(2)
      .setRequired(true);

    const oppScoreInput = new TextInputBuilder()
      .setCustomId('opponent_score')
      .setLabel(`Score adverse (${oppName})`)
      .setPlaceholder('Exemple : 0')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(2)
      .setRequired(true);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(myScoreInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(oppScoreInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
  }

  public static async handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith("modal_score_")) return;

    const parts = interaction.customId.split("_");
    const matchId = parts[2];
    const reporterTeamId = parts[3];

    const myScoreRaw = interaction.fields.getTextInputValue("my_score");
    const oppScoreRaw = interaction.fields.getTextInputValue("opponent_score");
    const myScore = parseInt(myScoreRaw, 10);
    const oppScore = parseInt(oppScoreRaw, 10);

    if (isNaN(myScore) || isNaN(oppScore) || !isValidScore(myScore) || !isValidScore(oppScore)) {
      return interaction.reply({ content: "❌ Les scores doivent être des nombres entiers entre 0 et 99.", ephemeral: true });
    }

    // Defer immediately to avoid 3-second timeout
    await interaction.deferReply();

    // 1. Check Match
    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
    if (!match) return interaction.editReply({ content: "❌ Match introuvable." });

    if (match.status !== 'PENDING' && match.status !== 'IN_PROGRESS') {
      return interaction.editReply({ content: '❌ Ce match n\'est plus en attente de résultat.' });
    }

    const isTeamA = match.team1_id === reporterTeamId;
    const team1Score = isTeamA ? myScore : oppScore;
    const team2Score = isTeamA ? oppScore : myScore;
    const opponentTeamId = isTeamA ? match.team2_id : match.team1_id;

    // 2. Update DB => WAITING_VALIDATION
    const { error } = await supabase.from("matches")
      .update({
        team1_score: team1Score,
        team2_score: team2Score,
        status: "WAITING_VALIDATION",
        reported_by_team_id: reporterTeamId
      })
      .eq("id", matchId);

    if (error) {
      return interaction.editReply({ content: "❌ Erreur interne lors de la mise à jour des scores." });
    }

    // 3. Avertir l'autre capitaine
    const { data: oppTeam } = await supabase.from("teams").select("name, captain_discord_id").eq("id", opponentTeamId).single();
    const { data: myTeam } = await supabase.from("teams").select("name").eq("id", reporterTeamId).single();

    if (!oppTeam) {
      return interaction.editReply({ content: "Score déclaré, mais impossible de trouver l'équipe adverse." });
    }

    const embed = new EmbedBuilder()
      .setTitle("⏳ Score en attente de validation")
      .setDescription(`L'équipe **${myTeam?.name}** a déclaré le score suivant :\n\n🔹 **${isTeamA ? myTeam?.name : oppTeam.name}** : ${team1Score}\n🔹 **${isTeamA ? oppTeam.name : myTeam?.name}** : ${team2Score}`)
      .setColor(0xFFA500);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_score_val_${matchId}_${opponentTeamId}`)
        .setLabel("Valider")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId(`btn_score_deny_${matchId}_${opponentTeamId}`)
        .setLabel("Contester")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );

    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({
        content: `Attention <@${oppTeam.captain_discord_id}>, veuillez valider ou contester ce score ci-dessous.`,
        embeds: [embed],
        components: [row]
      });
      await interaction.deleteReply();
    } else {
      await interaction.editReply({ content: "Score déclaré, mais impossible de notifier l'adversaire ici." });
    }
  }

  public static async handleButton(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("btn_score_")) return;

    const parts = interaction.customId.split("_");
    const action = parts[2]; // 'val' or 'deny'
    const matchId = parts[3];
    const expectedCaptainTeamId = parts[4];

    await interaction.deferReply();

    const { data: team } = await supabase.from("teams").select("name, captain_discord_id").eq("id", expectedCaptainTeamId).single();

    if (!team || team.captain_discord_id !== interaction.user.id) {
      return interaction.editReply({ content: "❌ Seul le capitaine adverse peut valider ou contester ce score." });
    }

    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
    if (!match) return interaction.editReply({ content: "❌ Match introuvable." });

    if (action === "deny") {
      await supabase.from("matches").update({ status: "CONTESTED" }).eq("id", matchId);

      const { data: settings } = await supabase.from("server_settings").select("to_role_id").eq("guild_id", interaction.guildId).single();
      const toPing = settings?.to_role_id ? `<@&${settings.to_role_id}>` : "TO (Arbitre)";

      const embedBase = interaction.message.embeds[0];
      if (!embedBase) return interaction.editReply({ content: "❌ Embed original introuvable." });

      const updatedEmbed = EmbedBuilder.from(embedBase)
        .setTitle("❌ Score Contesté !")
        .setColor(0xFF0000)
        .setFooter({ text: "Le score a été contesté et est bloqué." });

      await interaction.editReply({ content: `**SCORE CONTESTÉ** - Appel aux arbitres : ${toPing}`, embeds: [updatedEmbed], components: [] });

    } else if (action === "val") {
      let winnerId = null;
      let loserId = null;

      if (match.team1_score > match.team2_score) {
        winnerId = match.team1_id;
        loserId = match.team2_id;
      } else if (match.team2_score > match.team1_score) {
        winnerId = match.team2_id;
        loserId = match.team1_id;
      }

      const updatePayload: any = { status: "COMPLETED" };
      if (winnerId) updatePayload.winner_id = winnerId;
      if (loserId) updatePayload.loser_id = loserId;

      await supabase.from("matches").update(updatePayload).eq("id", matchId);

      const embedBase = interaction.message.embeds[0];
      if (!embedBase) return interaction.editReply({ content: "✅ Score validé." });

      const updatedEmbed = EmbedBuilder.from(embedBase)
        .setTitle("✅ Score Validé (Match Terminé)")
        .setColor(0x00FF00)
        .setDescription(`Résultat final validé par l'équipe **${team.name}**:\n\n**Équipe A : ${match.team1_score}**\n**Équipe B : ${match.team2_score}**`)
        .setFooter({ text: "Progression du bracket en cours..." });

      await interaction.editReply({ content: "Match terminé !", embeds: [updatedEmbed], components: [] });

      // Leaderboard calculation for group matches
      if (match.group_id) {
        LeaderboardService.calculateGroupStandings(match.group_id).catch(console.error);
      }

      // Auto-routing in bracket
      if (interaction.channel && 'send' in interaction.channel) {
        await this.progressTeams(match, interaction.channel as TextChannel, winnerId, loserId, interaction.client);
      }
    }
  }

  public static async progressTeams(match: any, channel: TextChannel | undefined, winnerId: string | null, loserId: string | null, discordClient?: any) {
    // 0. Handle Swiss format auto-progression
    if (match.phase_id) {
      const { data: phase } = await supabase
        .from("phases")
        .select("*")
        .eq("id", match.phase_id)
        .single();

      if (phase && phase.format === "SWISS") {
        // Recalculate Swiss standings to make sure they are up-to-date
        await LeaderboardService.calculateSwissStandings(match.phase_id).catch(console.error);

        // Check if all matches in the current round are completed (COMPLETED or BYE)
        const { data: roundMatches } = await supabase
          .from("matches")
          .select("status")
          .eq("phase_id", match.phase_id)
          .eq("round_number", match.round_number);

        if (roundMatches) {
          const isRoundFinished = roundMatches.every(m => m.status === "COMPLETED" || m.status === "BYE");
          if (isRoundFinished) {
            const maxRounds = phase.settings?.swiss_rounds_count || 3;
            const currentRound = match.round_number;
            const client = discordClient || channel?.client;
            
            // Try to find the guild and phase channel to announce things
            let targetChannel: TextChannel | undefined = channel;
            if (!targetChannel && phase.discord_channel_id && client) {
              try {
                const fetched = await client.channels.fetch(phase.discord_channel_id);
                if (fetched && fetched.isTextBased()) {
                  targetChannel = fetched as TextChannel;
                }
              } catch (err) {
                console.error(`[ScoreService] Failed to fetch Swiss phase channel:`, err);
              }
            }

            if (currentRound < maxRounds) {
              // Generate next round
              const nextRound = currentRound + 1;
              const { SwissGeneratorService } = require("./SwissGeneratorService");
              await SwissGeneratorService.generateNextRound(match.phase_id, nextRound);

              // Sync phase channel permissions
              const { LifecycleService } = require("./LifecycleService");
              if (client && phase.tournament_id) {
                const { data: tournament } = await supabase.from("tournaments").select("guild_id").eq("id", phase.tournament_id).single();
                if (tournament?.guild_id) {
                  await LifecycleService.syncPhaseChannels(match.phase_id, tournament.guild_id, client).catch(console.error);
                }
              }

              // Post round announcement and captain pings in the Swiss channel
              if (targetChannel) {
                const { data: nextMatches } = await supabase
                  .from("matches")
                  .select(`
                    id, match_number, status, team1_id, team2_id,
                    teamA:teams!matches_team1_id_fkey(name, captain_discord_id),
                    teamB:teams!matches_team2_id_fkey(name, captain_discord_id)
                  `)
                  .eq("phase_id", match.phase_id)
                  .eq("round_number", nextRound);

                if (nextMatches && nextMatches.length > 0) {
                  const embed = new EmbedBuilder()
                    .setTitle(`🇨🇭 Ronde ${nextRound} générée !`)
                    .setDescription(`Le Round ${currentRound} est terminé. Voici les nouveaux affrontements pour le Round ${nextRound} :`)
                    .setColor(0x0099FF);

                  const pings: string[] = [];
                  const matchesList: string[] = [];

                  nextMatches.forEach(m => {
                    const tA: any = Array.isArray(m.teamA) ? m.teamA[0] : m.teamA;
                    const tB: any = Array.isArray(m.teamB) ? m.teamB[0] : m.teamB;

                    if (m.status === "BYE") {
                      const taName = tA?.name || "Inconnu";
                      matchesList.push(`🔹 **Match #${m.match_number}** : **${taName}** est **BYE** (Victoire automatique 1 - 0)`);
                      if (tA?.captain_discord_id) {
                        pings.push(`<@${tA.captain_discord_id}>`);
                      }
                    } else {
                      const taName = tA?.name || "Inconnu";
                      const tbName = tB?.name || "Inconnu";
                      matchesList.push(`⚔️ **Match #${m.match_number}** : **${taName}** vs **${tbName}**`);
                      if (tA?.captain_discord_id) pings.push(`<@${tA.captain_discord_id}>`);
                      if (tB?.captain_discord_id) pings.push(`<@${tB.captain_discord_id}>`);
                    }
                  });

                  embed.addFields({ name: "Matchs de la Ronde", value: matchesList.join("\n") });

                  await targetChannel.send({
                    content: `🔔 Attention aux capitaines : ${pings.join(" ")}, vos nouveaux matchs de la Ronde ${nextRound} sont prêts !`,
                    embeds: [embed]
                  });
                }
              }
            } else {
              // All rounds finished! Let's end the Swiss phase.
              if (targetChannel) {
                const { data: standings } = await supabase
                  .from("phase_teams")
                  .select(`
                    points, wins, draws, played,
                    team:teams(name)
                  `)
                  .eq("phase_id", match.phase_id)
                  .order("points", { ascending: false })
                  .order("wins", { ascending: false });

                if (standings && standings.length > 0) {
                  const embed = new EmbedBuilder()
                    .setTitle(`🏁 Rondes Suisses Terminées !`)
                    .setDescription(`La phase **${phase.name}** s'est achevée après ${maxRounds} rondes. Voici le classement final :`)
                    .setColor(0xFFD700);

                  const standingsText = standings.map((s, idx) => {
                    const t: any = Array.isArray(s.team) ? s.team[0] : s.team;
                    const tName = t?.name || "Inconnu";
                    return `${idx + 1}. **${tName}** - ${s.points} pts (${s.wins} V, ${s.played} Joués)`;
                  }).join("\n");

                  embed.addFields({ name: "Classement Final", value: standingsText });

                  await targetChannel.send({
                    content: `🎉 **Félicitations à tous les participants !** La phase de Rondes Suisses est officiellement terminée.`,
                    embeds: [embed]
                  });
                }
              }
            }
          }
        }
        return; // Done with Swiss, do not execute normal bracket routing
      }
    }

    if (!winnerId || !loserId) {
      if (channel) {
        const { data: settings } = await supabase.from("server_settings").select("to_role_id").eq("guild_id", channel.guildId).single();
        const toPing = settings?.to_role_id ? `<@&${settings.to_role_id}>` : "TO (Arbitre)";
        await channel.send(`⚠️ **MATCH NUL** pour le Match #${match.match_number || '?'}.\nLe système ne peut pas déterminer de vainqueur pour l'auto-routing.\n${toPing} - Une intervention manuelle est requise via le panel web.`);
      }
      return;
    }

    if (match.next_match_winner_id) {
      await this.assignTeamToNextMatch(match.next_match_winner_id, winnerId, channel);
    }
    if (match.next_match_loser_id) {
      await this.assignTeamToNextMatch(match.next_match_loser_id, loserId, channel);
    }
  }

  private static async assignTeamToNextMatch(targetMatchId: string, teamId: string, channel: TextChannel | undefined) {
    // Use atomic RPC function to prevent race conditions
    const { data: result, error } = await supabase.rpc('assign_team_to_match', {
      p_target_match_id: targetMatchId,
      p_team_id: teamId
    });

    if (error) {
      console.error('[ScoreService] Error in atomic assign_team_to_match:', error);
      // Fallback: try the old non-atomic way
      const { data: targetMatch } = await supabase.from("matches").select("*").eq("id", targetMatchId).single();
      if (!targetMatch) return;

      const updateData: any = {};
      if (!targetMatch.team1_id) {
        updateData.team1_id = teamId;
      } else if (!targetMatch.team2_id && targetMatch.team1_id !== teamId) {
        updateData.team2_id = teamId;
      } else {
        return;
      }
      await supabase.from("matches").update(updateData).eq("id", targetMatchId);

      // Check if match is now full for notification
      const newTeamA = targetMatch.team1_id || updateData.team1_id;
      const newTeamB = targetMatch.team2_id || updateData.team2_id;
      if (newTeamA && newTeamB) {
        await this.notifyMatchReady(newTeamA, newTeamB, channel);
      }
      return;
    }

    if (!result || result.length === 0) {
      console.log(`[ScoreService] Team ${teamId} could not be assigned to match ${targetMatchId} (already full or conflict)`);
      return;
    }

    // Check if the match is now fully assigned after our atomic operation
    const { data: updatedMatch } = await supabase.from("matches").select("team1_id, team2_id").eq("id", targetMatchId).single();
    if (updatedMatch?.team1_id && updatedMatch?.team2_id) {
      await this.notifyMatchReady(updatedMatch.team1_id, updatedMatch.team2_id, channel);
    }
  }

  private static async notifyMatchReady(team1Id: string, team2Id: string, channel: TextChannel | undefined) {
    const [{ data: ta }, { data: tb }] = await Promise.all([
      supabase.from("teams").select("captain_discord_id, name").eq("id", team1Id).single(),
      supabase.from("teams").select("captain_discord_id, name").eq("id", team2Id).single()
    ]);

    if (ta && tb && channel) {
      await channel.send(`⚔️ **NOUVEAU MATCH DE BRACKET** ⚔️\n👉 L'équipe **${ta.name}** (<@${ta.captain_discord_id}>) affronte l'équipe **${tb.name}** (<@${tb.captain_discord_id}>) !\nPréparez-vous.`);
    }
  }
}
