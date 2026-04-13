import { ModalSubmitInteraction, ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { supabase } from "../lib/supabase";

export class ScoreService {
  public static async handleSelectMenu(interaction: StringSelectMenuInteraction) {
    if (interaction.customId !== 'select_match_to_score') return;

    const matchId = interaction.values[0];
    const captainId = interaction.user.id;

    // Use aliases for join to prevent ambiguity
    const { data: match } = await supabase
      .from('matches')
      .select('*, teamA:teams!matches_team1_id_fkey(id, name, captain_discord_id), teamB:teams!matches_team2_id_fkey(id, name, captain_discord_id)')
      .eq('id', matchId)
      .single();

    if (!match) {
      return interaction.reply({ content: '❌ Match introuvable.', ephemeral: true });
    }

    if (match.status !== 'PENDING' && match.status !== 'IN_PROGRESS') {
      return interaction.reply({ content: '❌ Ce match n\'est plus en attente de résultat.', ephemeral: true });
    }

    const isTeam1 = match.teamA?.captain_discord_id === captainId;
    const isTeam2 = match.teamB?.captain_discord_id === captainId;

    if (!isTeam1 && !isTeam2) {
      return interaction.reply({ content: '❌ Vous n\'êtes pas capitaine dans ce match.', ephemeral: true });
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

    if (isNaN(myScore) || isNaN(oppScore)) {
      return interaction.reply({ content: "❌ Les scores doivent être des nombres entiers.", ephemeral: true });
    }

    // 1. Check Match
    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
    if (!match) return interaction.reply({ content: "❌ Match introuvable.", ephemeral: true });

    if (match.status !== 'PENDING' && match.status !== 'IN_PROGRESS') {
      return interaction.reply({ content: '❌ Ce match n\'est plus en attente de résultat.', ephemeral: true });
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
       return interaction.reply({ content: "❌ Erreur interne lors de la mise à jour des scores.", ephemeral: true });
    }

    // 3. Avertir l'autre capitaine
    const { data: oppTeam } = await supabase.from("teams").select("name, captain_discord_id").eq("id", opponentTeamId).single();
    const { data: myTeam } = await supabase.from("teams").select("name").eq("id", reporterTeamId).single();

    if (!oppTeam) return;

    await interaction.deferReply(); // To acknowledge the modal correctly

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
      // Delete the deferred reply ("thinking..." loading state)
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

    // Vérifier l'identité : c'est bien l'équipe à qui on demande de valider
    const { data: team } = await supabase.from("teams").select("name, captain_discord_id").eq("id", expectedCaptainTeamId).single();

    if (!team || team.captain_discord_id !== interaction.user.id) {
       return interaction.reply({ content: "❌ Seul le capitaine adverse peut valider ou contester ce score.", ephemeral: true });
    }

    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
    if (!match) return;

    if (action === "deny") {
       // update status to CONTESTED
       await supabase.from("matches").update({ status: "CONTESTED" }).eq("id", matchId);
       
       // Ping TO role
       const { data: settings } = await supabase.from("server_settings").select("to_role_id").eq("guild_id", interaction.guildId).single();
       const toPing = settings?.to_role_id ? `<@&${settings.to_role_id}>` : "TO (Arbitre)";

       const embedBase = interaction.message.embeds[0];
       if (!embedBase) return;

       const updatedEmbed = EmbedBuilder.from(embedBase)
          .setTitle("❌ Score Contesté !")
          .setColor(0xFF0000)
          .setFooter({ text: "Le score a été contesté et est bloqué." });

       await interaction.update({ content: `**SCORE CONTESTÉ** - Appel aux arbitres : ${toPing}`, embeds: [updatedEmbed], components: [] });

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

       // update status to COMPLETED and save winner/loser
       const updatePayload: any = { status: "COMPLETED" };
       if (winnerId) updatePayload.winner_id = winnerId;
       if (loserId) updatePayload.loser_id = loserId;

       await supabase.from("matches").update(updatePayload).eq("id", matchId);

       const embedBase = interaction.message.embeds[0];
       if (!embedBase) return;

       const updatedEmbed = EmbedBuilder.from(embedBase)
          .setTitle("✅ Score Validé (Match Terminé)")
          .setColor(0x00FF00)
          .setDescription(`Résultat final validé par l'équipe **${team.name}**:\n\n**Équipe A : ${match.team1_score}**\n**Équipe B : ${match.team2_score}**`)
          .setFooter({ text: "Progression du bracket en cours..." });

       await interaction.update({ content: "Match terminé !", embeds: [updatedEmbed], components: [] });

       // ROUTING AUTOMATIQUE ! 🚀
       if (interaction.channel && 'send' in interaction.channel) {
          await this.progressTeams(match, interaction.channel as TextChannel, winnerId, loserId);
       }
    }
  }

  public static async progressTeams(match: any, channel: TextChannel, winnerId: string | null, loserId: string | null) {
    if (!winnerId || !loserId) {
       // Egalité stricte, ce qui est rare dans un bracket. Le TO devra forcer l'avancée.
       const { data: settings } = await supabase.from("server_settings").select("to_role_id").eq("guild_id", channel.guildId).single();
       const toPing = settings?.to_role_id ? `<@&${settings.to_role_id}>` : "TO (Arbitre)";
       await channel.send(`⚠️ **MATCH NUL** pour le Match #${match.match_number || '?'}.\nLe système ne peut pas déterminer de vainqueur pour l'auto-routing.\n${toPing} - Une intervention manuelle est requise via le panel web.`);
       return;
    }

    if (match.next_match_winner_id) {
       await this.assignTeamToNextMatch(match.next_match_winner_id, winnerId, channel);
    }
    if (match.next_match_loser_id) {
       await this.assignTeamToNextMatch(match.next_match_loser_id, loserId, channel);
    }
  }

  private static async assignTeamToNextMatch(targetMatchId: string, teamId: string, channel: TextChannel) {
     const { data: targetMatch } = await supabase.from("matches").select("*").eq("id", targetMatchId).single();
     if (!targetMatch) return;

     const updateData: any = {};
     if (!targetMatch.team1_id) {
       updateData.team1_id = teamId;
     } else if (!targetMatch.team2_id && targetMatch.team1_id !== teamId) {
       updateData.team2_id = teamId;
     } else {
       console.log("Match already assigned both A and B, or team already in match");
       return; // Match already full
     }

     await supabase.from("matches").update(updateData).eq("id", targetMatchId);

     // Check if the match is now FULL after the update and alert players
     const newTeamA = targetMatch.team1_id || updateData.team1_id;
     const newTeamB = targetMatch.team2_id || updateData.team2_id;

     if (newTeamA && newTeamB) {
        const [{ data: ta }, { data: tb }] = await Promise.all([
            supabase.from("teams").select("captain_discord_id, name").eq("id", newTeamA).single(),
            supabase.from("teams").select("captain_discord_id, name").eq("id", newTeamB).single()
        ]);

        if (ta && tb) {
             await channel.send(`⚔️ **NOUVEAU MATCH DE BRACKET** ⚔️\n👉 L'équipe **${ta.name}** (<@${ta.captain_discord_id}>) affronte l'équipe **${tb.name}** (<@${tb.captain_discord_id}>) !\nPréparez-vous.`);
        }
     }
  }
}
