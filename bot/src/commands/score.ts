import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { supabase } from "../lib/supabase";

export const data = new SlashCommandBuilder()
  .setName("score")
  .setDescription("Signaler le score de votre match en cours");

export async function execute(interaction: ChatInputCommandInteraction) {
  const captainId = interaction.user.id;

  // 1. Trouver l'équipe où l'utilisateur est capitaine
  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("captain_discord_id", captainId)
    .single();

  if (!team) {
    return interaction.reply({ content: "❌ Vous n'êtes capitaine d'aucune équipe.", ephemeral: true });
  }

  // 2. Trouver un match non terminé "pending" ou "contested" pour cette équipe
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .in("status", ["pending", "contested"])
    .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`);

  if (error || !matches || matches.length === 0) {
    return interaction.reply({ content: "ℹ️ Vous n'avez aucun match en cours à signaler.", ephemeral: true });
  }

  if (matches.length > 1) {
    return interaction.reply({ content: "⚠️ Vous avez plusieurs matchs en phase de poules en cours, merci de contacter un TO.", ephemeral: true });
  }

  const match = matches[0];
  const isTeamA = match.team1_id === team.id;
  const opponentTeamId = isTeamA ? match.team2_id : match.team1_id;

  if (!opponentTeamId) {
    return interaction.reply({ content: "⌛ Attendez que l'équipe adverse soit assignée (TBD) avant de déclarer un score.", ephemeral: true });
  }

  const { data: oppTeam } = await supabase.from("teams").select("name").eq("id", opponentTeamId).single();
  const opponentName = oppTeam?.name || "Adversaire Inconnu";
  const myName = team.name;

  // 3. Ouvrir la Modale pour déclarer le score
  const modal = new ModalBuilder()
    .setCustomId(`modal_score_${match.id}_${team.id}`)
    .setTitle("Signaler le score");

  const myScoreInput = new TextInputBuilder()
    .setCustomId("my_score")
    .setLabel(`Score de votre équipe (${myName})`)
    .setPlaceholder("Exemple : 2")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setRequired(true);

  const oppScoreInput = new TextInputBuilder()
    .setCustomId("opponent_score")
    .setLabel(`Score adverse (${opponentName})`)
    .setPlaceholder("Exemple : 0")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(2)
    .setRequired(true);

  const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(myScoreInput);
  const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(oppScoreInput);

  modal.addComponents(row1, row2);
  await interaction.showModal(modal);
}
