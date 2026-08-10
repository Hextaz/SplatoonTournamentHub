import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { supabase } from "../lib/supabase";

export const data = new SlashCommandBuilder()
  .setName("admin-setup-checkin")
  .setDescription(
    "Déploie le panel de Check-in dans le salon actuel (réservé aux TOs).",
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.isChatInputCommand()) return;

  // 1. Fetch current server settings to verify TO rights
  const { data: settings } = await supabase
    .from("server_settings")
    .select("to_role_id")
    .eq("guild_id", interaction.guildId)
    .single();

  const toRoleId = settings?.to_role_id;

  // 2. Control permissions (Admins or TOs only)
  const isSetupAdmin = interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator,
  );

  // To verify if they have the TO role we must fetch the member from the guild
  let hasToRole = false;
  if (toRoleId && interaction.member && "roles" in interaction.member) {
    // interaction.member is GuildMember API
    hasToRole = (interaction.member as any).roles.cache.has(toRoleId);
  }

  if (!isSetupAdmin && !hasToRole) {
    return interaction.reply({
      content:
        "❌ Vous n'avez pas la permission d'utiliser cette commande. Vous devez être Administrateur ou avoir le rôle TO configuré dans le back-office.",
      ephemeral: true,
    });
  }

  // 3. Build UI
  const checkinEmbed = new EmbedBuilder()
    .setColor("#2ECC71")
    .setTitle("📣 Check-in Ouvert !")
    .setDescription(
      "Capitaines ! Cliquez sur le bouton ci-dessous pour confirmer la présence de votre équipe pour le tournoi du jour.\n\n⚠️ *Le Check-in est obligatoire pour générer les brackets.*",
    );

  const checkinButton = new ButtonBuilder()
    .setCustomId("btn_checkin")
    .setLabel("Confirmer ma présence")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✅");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    checkinButton,
  );

  // 4. Send Message to the Channel
  if (interaction.channel && "send" in interaction.channel) {
    const msg = await interaction.channel.send({
      embeds: [checkinEmbed],
      components: [row],
    });

    // 4.5 Mettre à jour la base de données avec le message_id
    const { data: latestTournament } = await supabase
      .from("tournaments")
      .select("id")
      .eq("guild_id", interaction.guildId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestTournament) {
      await supabase
        .from("tournaments")
        .update({ checkin_message_id: msg.id })
        .eq("id", latestTournament.id);
    }

    // 5. Reply to the TO
    await interaction.reply({
      content: "✅ Le panel de Check-in a bien été déployé dans ce salon.",
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: "❌ Impossible de déployer le panel ici.",
      ephemeral: true,
    });
  }
}
