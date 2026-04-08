import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { supabase } from "../lib/supabase";

export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Inscrit ton équipe au tournoi")
  .addStringOption((opt) =>
    opt
      .setName("nom_equipe")
      .setDescription("Nom de l'équipe (Max 32 caractères)")
      .setRequired(true)
      .setMaxLength(32),
  )
  .addStringOption((opt) =>
    opt
      .setName("code_ami_capitaine")
      .setDescription("Code ami du capitaine (SW-...)")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("nom_joueur_2")
      .setDescription("Nom (In-game) Joueur 2")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("code_ami_2")
      .setDescription("Code ami Joueur 2")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("nom_joueur_3")
      .setDescription("Nom (In-game) Joueur 3")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("code_ami_3")
      .setDescription("Code ami Joueur 3")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("nom_joueur_4")
      .setDescription("Nom (In-game) Joueur 4")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("code_ami_4")
      .setDescription("Code ami Joueur 4")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("nom_joueur_5")
      .setDescription("Nom (In-game) Remplaçant 1")
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("code_ami_5")
      .setDescription("Code Remplaçant 1")
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("nom_joueur_6")
      .setDescription("Nom (In-game) Remplaçant 2")
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("code_ami_6")
      .setDescription("Code Remplaçant 2")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.isChatInputCommand()) return;

  const teamName = interaction.options.getString("nom_equipe", true);
  const captainFC = interaction.options.getString("code_ami_capitaine", true);
  const captainId = interaction.user.id;
  const captainName = interaction.user.username;

  // 1. Validation stricte des remplaçants (5 et 6) obligatoires par paire
  for (let i = 5; i <= 6; i++) {
    const nameOpt = interaction.options.getString(`nom_joueur_${i}`);
    const fcOpt = interaction.options.getString(`code_ami_${i}`);

    if (nameOpt && !fcOpt) {
      return interaction.reply({
        content: `❌ **Erreur** : Vous avez renseigné le remplaçant (Joueur ${i}), mais vous n'avez pas fourni son code ami.`,
        ephemeral: true,
      });
    }
    if (!nameOpt && fcOpt) {
      return interaction.reply({
        content: `❌ **Erreur** : Vous avez fourni un code ami pour le remplaçant (Joueur ${i}), mais vous ne l'avez pas nommé.`,
        ephemeral: true,
      });
    }
  }

  // Collecting members
  const membersData: Array<{
    userId: string | null;
    ingameName: string;
    fc: string;
    isCaptain: boolean;
  }> = [
    {
      userId: captainId,
      ingameName: captainName,
      fc: captainFC,
      isCaptain: true,
    },
  ];

  for (let i = 2; i <= 6; i++) {
    const nameOpt = interaction.options.getString(`nom_joueur_${i}`);
    const fcOpt = interaction.options.getString(`code_ami_${i}`);
    if (nameOpt && fcOpt) {
      membersData.push({
        userId: null,
        ingameName: nameOpt,
        fc: fcOpt,
        isCaptain: false,
      });
    }
  }

  // Validation Anti-Doublon des noms in-game
  const ingameNames = membersData.map((m) => m.ingameName.toLowerCase());
  const uniqueNames = new Set(ingameNames);

  if (uniqueNames.size !== ingameNames.length) {
    return interaction.reply({
      content:
        "❌ **Erreur** : Vous avez entré plusieurs fois le même pseudo pour différents joueurs.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: false });

  // 2. Trouver le Tournoi en cours pour le Serveur (Guilde)
  const guildId = interaction.guildId;
  const { data: currentTournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!currentTournament) {
    return interaction.editReply(
      "❌ **Erreur** : Aucun tournoi n'est configuré pour ce serveur.",
    );
  }

  // 3. Transaction Base de données : Création Team -> Membres
  try {
    const { data: teamRes, error: teamErr } = await supabase
      .from("teams")
      .insert({
        tournament_id: currentTournament.id,
        name: teamName,
        captain_discord_id: captainId,
      })
      .select("id")
      .single();

    if (teamErr || !teamRes) {
      throw new Error(
        teamErr?.message || "Erreur création équipe (Nom déjà pris ?)",
      );
    }

    const teamId = teamRes.id;
    const membersToInsert = membersData.map((m) => ({
      team_id: teamId,
      user_id: m.userId,
      ingame_name: m.ingameName,
      friend_code: m.fc,
      is_captain: m.isCaptain,
    }));

    const { error: memberErr } = await supabase
      .from("team_members")
      .insert(membersToInsert);
    if (memberErr) {
      // Nettoyage en cas d'erreur
      await supabase.from("teams").delete().eq("id", teamId);
      throw new Error(memberErr.message);
    }
  } catch (error: any) {
    console.error("DB Error:", error);
    return interaction.editReply(
      `❌ **Erreur lors de l'inscription** : ${error.message}`,
    );
  }

  // 4. Action Discord : Renommage du Capitaine et Role
  let renameFailed = false;
  let roleFailed = false;
  if (interaction.guild && interaction.member) {
    try {
      const member = interaction.member as GuildMember;

      try {
        await member.setNickname(teamName);
      } catch (err: any) {
        renameFailed = true;
      }

      const { data } = await supabase
        .from("server_settings")
        .select("captain_role_id")
        .eq("guild_id", interaction.guild.id)
        .single();
      if (data?.captain_role_id) {
        const role = interaction.guild.roles.cache.get(data.captain_role_id);
        if (role) {
          try {
            await member.roles.add(role);
          } catch (rErr: any) {
            roleFailed = true;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Register] Failed discord main ${err.message}`);
    }
  }

  // 5. Feedback : Embed
  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(`✅ Inscription Validée : ${teamName}`)
    .setDescription(
      "Votre équipe a été enregistrée avec succès dans la base de données !",
    );

  membersData.forEach((m, idx) => {
    embed.addFields({
      name: `${m.isCaptain ? "👑 Capitaine" : `Joueur ${idx + 1}`}`,
      value: `${m.ingameName} - \`${m.fc}\``,
      inline: true,
    });
  });

  let footerStr = "";
  if (renameFailed) {
    footerStr += "⚠️ Note : Je n'ai pas pu vous renommer (permissions). ";
  }
  if (roleFailed) {
    footerStr += "⚠️ Note : Je n'ai pas pu vous assigner le rôle Capitaine.";
  }
  if (footerStr !== "") {
    embed.setFooter({ text: footerStr.trim() });
  }

  await interaction.editReply({ embeds: [embed] });
}
