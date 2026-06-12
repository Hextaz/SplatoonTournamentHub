import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { supabase } from "../lib/supabase";

export const data = new SlashCommandBuilder()
  .setName("score")
  .setDescription("Signaler le score de votre match en cours");

export async function execute(interaction: ChatInputCommandInteraction) {
  const captainId = interaction.user.id;

  // 1. Trouver les équipes où l'utilisateur est capitaine
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("captain_discord_id", captainId);

  if (teamsError || !teams || teams.length === 0) {
    return interaction.reply({ content: "❌ Vous n'êtes le capitaine d'aucune équipe.", ephemeral: true });
  }

  const teamIds = teams.map((t: any) => t.id);

  // 2. Trouver les matchs PENDING ou IN_PROGRESS pour ces équipes (avec un adversaire défini, hors TBD)
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, round_number, match_number, team1_id, team2_id, phases(name), status")
    .in("status", ["PENDING", "IN_PROGRESS"])
    .not("team1_id", "is", null)
    .not("team2_id", "is", null)
    .order("round_number", { ascending: true });

  if (matchesError || !matches || matches.length === 0) {
    return interaction.reply({ content: "⏳ Vous n'avez aucun match en attente de score pour le moment.", ephemeral: true });
  }

  const captainMatches = matches.filter((m: any) => teamIds.includes(m.team1_id) || teamIds.includes(m.team2_id));

  if (captainMatches.length === 0) {
    return interaction.reply({ content: "⏳ Vous n'avez aucun match en attente de score pour le moment.", ephemeral: true });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select_match_to_score")
    .setPlaceholder("Sélectionnez le match à reporter");

  for (const match of captainMatches) {
    const isTeam1 = teamIds.includes(match.team1_id);
    const myTeamId = isTeam1 ? match.team1_id : match.team2_id;
    const oppTeamId = isTeam1 ? match.team2_id : match.team1_id;

    let oppName = "Inconnu";
    if (oppTeamId) {
      const { data: oppTeam } = await supabase.from("teams").select("name").eq("id", oppTeamId).single();
      oppName = oppTeam?.name || "Inconnu";
    }

    const phaseData: any = match.phases;
    const phaseName = phaseData?.name || "Phase Inconnue";
    const label = `${phaseName} - Round ${match.round_number || 1} vs ${oppName}`.substring(0, 100);
    const description = `Match #${match.match_number || '?'}`;
    const value = `${match.id}`; 

    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setDescription(description)
        .setValue(value)
    );
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    content: "Veuillez sélectionner le match pour lequel vous souhaitez déclarer un score :",
    components: [row],
    ephemeral: true
  });
}
