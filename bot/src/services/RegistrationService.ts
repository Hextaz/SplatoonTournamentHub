import { Client, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Interaction } from 'discord.js';
import { supabase } from '../lib/supabase';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedRegistration {
  teamName: string;
  players: { name: string; fc: string }[];
  captainDiscordId: string;
  timer: NodeJS.Timeout;
}

const registrationCache = new Map<string, CachedRegistration>();

function setCacheWithTTL(key: string, data: Omit<CachedRegistration, 'timer'>) {
  // Clear existing timer if overwriting
  const existing = registrationCache.get(key);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    registrationCache.delete(key);
  }, CACHE_TTL_MS);

  registrationCache.set(key, { ...data, timer });
}

export class RegistrationService {

  static async sendRegistrationEmbed(tournamentId: string, client: Client) {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error || !tournament) throw new Error("Tournoi introuvable dans la base de données.");

      if (!tournament.discord_registration_channel_id) {
        throw new Error("Aucun salon d'inscription n'a été défini pour ce tournoi dans ses paramètres. Impossible d'envoyer l'annonce.");
      }

      const channel = await client.channels.fetch(tournament.discord_registration_channel_id).catch(() => null) as TextChannel | null;
      if (!channel) throw new Error(`Impossible de trouver le salon Discord avec l'ID ${tournament.discord_registration_channel_id}. Vérifiez que le bot y a accès.`);

      const embed = {
        title: `📝 Inscriptions: ${tournament.name}`,
        description: tournament.description || `Cliquez sur le bouton ci-dessous pour inscrire votre équipe. Le capitaine doit obligatoirement enregistrer le roster principal (4 joueurs minimum, dont lui-même) incluant les Codes Amis Valides.`,
        color: 0x5865F2,
        fields: [
          {
            name: "Règle Code Ami",
            value: "Format attendu: **`SW-XXXX-XXXX-XXXX`**. (ex: `Pseudo SW-1234-5678-9012`). \n*Note: le séparateur entre le pseudo et le code ami n'est pas obligatoire.*"
          }
        ],
        footer: {
          text: `Tournoi ID: ${tournament.id}`
        }
      };

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_register_${tournament.id}`)
            .setLabel("S'inscrire (Main Roster)")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📝")
        );

      await channel.send({ embeds: [embed], components: [row] });
      return true;

    } catch (e: any) {
      console.error("[RegistrationService] Error sending embed:", e);
      throw new Error(e.message);
    }
  }

  static async handleInteraction(interaction: Interaction) {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('btn_register_')) {
        await this.handleRegisterButton(interaction);
      } else if (interaction.customId.startsWith('btn_add_subs_')) {
        await this.handleSubsButton(interaction);
      } else if (interaction.customId.startsWith('btn_skip_subs_')) {
        await this.handleSkipSubsButton(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_register_main_')) {
        await this.handleMainModalSubmit(interaction);
      } else if (interaction.customId.startsWith('modal_register_subs_')) {
        await this.handleSubsModalSubmit(interaction);
      }
    }
  }

  private static async handleRegisterButton(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('status, start_at, start_date, checkin_start_at')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      return interaction.reply({ content: "❌ Impossible de trouver ce tournoi.", ephemeral: true });
    }

    const now = new Date();
    const startDate = tournament.start_at ? new Date(tournament.start_at) : (tournament.start_date ? new Date(tournament.start_date) : null);
    const checkinStart = tournament.checkin_start_at ? new Date(tournament.checkin_start_at) : null;

    if ((checkinStart && now >= checkinStart) || (startDate && now >= startDate) || tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
      return interaction.reply({ content: "❌ Les inscriptions sont terminées pour ce tournoi.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`modal_register_main_${tournamentId}`)
      .setTitle('Inscription - Roster Principal');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('team_name').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('player1').setLabel('Capitaine (Toi) [Pseudo + CA]').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo - SW-XXXX-XXXX-XXXX').setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('player2').setLabel('Joueur 2 [Pseudo + CA]').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo - SW-XXXX-XXXX-XXXX').setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('player3').setLabel('Joueur 3 [Pseudo + CA]').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo - SW-XXXX-XXXX-XXXX').setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('player4').setLabel('Joueur 4 [Pseudo + CA]').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo - SW-XXXX-XXXX-XXXX').setRequired(true)
      )
    );

    await interaction.showModal(modal);
  }

  private static parsePlayerInput(input: string): { name: string, fc: string } | null {
    if (!input || input.trim() === '') return null;
    // Strict format: SW-XXXX-XXXX-XXXX (with dashes, 4 digits each)
    const regex = /(.+?)\s*(SW-\d{4}-\d{4}-\d{4})\s*$/i;
    const match = input.match(regex);
    if (!match || !match[1] || !match[2]) return null;

    const name = match[1].replace(/[-:]/g, '').trim();
    if (!name || name.length === 0) return null; // Name is required

    const fc = match[2].toUpperCase();
    return { name, fc };
  }

  private static async handleMainModalSubmit(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('status, start_at, start_date, checkin_start_at')
      .eq('id', tournamentId)
      .single();

    if (error || !tournament) {
      return interaction.reply({ content: "❌ Impossible de trouver ce tournoi.", ephemeral: true });
    }

    const now = new Date();
    const startDate = tournament.start_at ? new Date(tournament.start_at) : (tournament.start_date ? new Date(tournament.start_date) : null);
    const checkinStart = tournament.checkin_start_at ? new Date(tournament.checkin_start_at) : null;

    if ((checkinStart && now >= checkinStart) || (startDate && now >= startDate) || tournament.status === 'ACTIVE' || tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
      return interaction.reply({ content: "❌ Les inscriptions sont terminées pour ce tournoi.", ephemeral: true });
    }

    const teamName = interaction.fields.getTextInputValue('team_name');
    const p1 = interaction.fields.getTextInputValue('player1');
    const p2 = interaction.fields.getTextInputValue('player2');
    const p3 = interaction.fields.getTextInputValue('player3');
    const p4 = interaction.fields.getTextInputValue('player4');

    const rawPlayers = [p1, p2, p3, p4];
    const parsedPlayers = [];
    const errors = [];

    for (let i = 0; i < rawPlayers.length; i++) {
      const p = this.parsePlayerInput(rawPlayers[i]);
      if (!p) {
        errors.push(`Joueur ${i + 1} : Code ami Invalide (attendu: Pseudo SW-XXXX-XXXX-XXXX)`);
      } else {
        parsedPlayers.push(p);
      }
    }

    if (errors.length > 0) {
      return interaction.reply({ content: `**Erreur Code Ami:**\n${errors.join('\n')}\n*Veuillez recommencer l'inscription en respectant le format.*`, ephemeral: true });
    }

    // Check duplicate captain
    const { count } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('captain_discord_id', interaction.user.id);

    if (count && count > 0) {
      return interaction.reply({ content: "❌ Vous êtes déjà capitaine d'une équipe inscrite à ce tournoi. Un capitaine ne peut avoir qu'une seule équipe.", ephemeral: true });
    }

    const cacheKey = `${interaction.user.id}_${tournamentId}`;

    setCacheWithTTL(cacheKey, {
      teamName,
      players: parsedPlayers,
      captainDiscordId: interaction.user.id
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_add_subs_${tournamentId}`)
        .setLabel("Ajouter des Remplaçants")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("➕"),
      new ButtonBuilder()
        .setCustomId(`btn_skip_subs_${tournamentId}`)
        .setLabel("Terminer l'inscription")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅")
    );

    await interaction.reply({
      content: `**Roster Principal Validé !**\nAvez-vous des remplaçants (Max 2) à inscrire pour l'équipe **${teamName}** ?`,
      components: [row],
      ephemeral: true
    });
  }

  private static async handleSubsButton(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();

    const modal = new ModalBuilder()
      .setCustomId(`modal_register_subs_${tournamentId}`)
      .setTitle('Inscription - Remplaçants');

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('sub1').setLabel('Remplaçant 1 [Pseudo + CA]').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo - SW-XXXX-XXXX-XXXX').setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('sub2').setLabel('Remplaçant 2 [Pseudo + CA]').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Pseudo - SW-XXXX-XXXX-XXXX').setRequired(false)
      )
    );

    await interaction.showModal(modal);
  }

  private static async handleSkipSubsButton(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();
    await this.finalizeRegistration(interaction, tournamentId, []);
  }

  private static async handleSubsModalSubmit(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();

    const sub1 = interaction.fields.getTextInputValue('sub1');
    const sub2 = interaction.fields.getTextInputValue('sub2');

    const parsedSubs = [];
    const errors = [];

    if (sub1 && sub1.trim() !== '') {
      const p = this.parsePlayerInput(sub1);
      if (!p) errors.push(`Remplaçant 1 invalide (format: Pseudo SW-XXXX-XXXX-XXXX)`);
      else parsedSubs.push(p);
    }

    if (sub2 && sub2.trim() !== '') {
      const p = this.parsePlayerInput(sub2);
      if (!p) errors.push(`Remplaçant 2 invalide (format: Pseudo SW-XXXX-XXXX-XXXX)`);
      else parsedSubs.push(p);
    }

    if (errors.length > 0) {
      return interaction.reply({ content: `**Erreur Code Ami Remplaçant:**\n${errors.join('\n')}`, ephemeral: true });
    }

    await this.finalizeRegistration(interaction, tournamentId, parsedSubs);
  }

  private static async finalizeRegistration(interaction: any, tournamentId: string, subs: any[]) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const cacheKey = `${interaction.user.id}_${tournamentId}`;
      const cachedData = registrationCache.get(cacheKey);

      if (!cachedData) {
        return interaction.editReply({ content: "⚠️ Session d'inscription introuvable ou expirée. Veuillez recommencer." });
      }

      // Clear cache immediately to prevent double-registration
      clearTimeout(cachedData.timer);
      registrationCache.delete(cacheKey);

      const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({
          tournament_id: tournamentId,
          name: cachedData.teamName,
          captain_discord_id: interaction.user.id
        })
        .select()
        .single();

      if (teamErr) {
        if (teamErr.message?.includes('unique_captain_per_tournament') || teamErr.code === '23505') {
          return interaction.editReply({ content: "❌ **Impossible de s'inscrire** : Tu es déjà associé en tant que capitaine à une autre équipe pour ce tournoi !" });
        }
        throw teamErr;
      }
      if (!team) throw new Error("Équipe non créée");

      // Insert team members — collect errors and report
      const allPlayers = [...cachedData.players, ...subs];
      const insertErrors: string[] = [];

      for (let i = 0; i < allPlayers.length; i++) {
        const { error: memberErr } = await supabase.from('team_members').insert({
          team_id: team.id,
          user_id: i === 0 ? interaction.user.id : null,
          ingame_name: allPlayers[i].name,
          is_captain: i === 0 ? true : false,
          friend_code: allPlayers[i].fc
        });
        if (memberErr) {
          insertErrors.push(`${allPlayers[i].name}: ${memberErr.message}`);
          console.error("Erreur lors de l'insertion d'un joueur:", memberErr);
        }
      }

      // Announce in registration channel
      if (tournament && tournament.discord_registration_channel_id) {
        const annChannel = await interaction.client.channels.fetch(tournament.discord_registration_channel_id);
        if (annChannel && annChannel.isTextBased()) {
          const rosterStr = cachedData.players.map((p: any) => `• ${p.name}`).join('\n');
          const subsStr = subs.length > 0 ? `\n\n**Remplaçants:**\n` + subs.map((s: any) => `• ${s.name}`).join('\n') : '';

          const embed = {
            title: `🎊 Nouvelle Inscription: ${cachedData.teamName}`,
            description: `L'équipe **${cachedData.teamName}** vient de s'inscrire !\n\n**Roster Principal:**\n${rosterStr}${subsStr}`,
            color: 0x57F287,
            timestamp: new Date().toISOString()
          };
          await annChannel.send({ embeds: [embed] });
        }
      }

      const warningStr = insertErrors.length > 0
        ? `\n\n⚠️ **Avertissement:** ${insertErrors.length} joueur(s) n'ont pas pu être enregistrés suite à une erreur technique. Contactez un TO.`
        : '';

      const replyEmbed = {
        title: `✅ Inscription Validée !`,
        description: `Votre équipe **${cachedData.teamName}** a bien été inscrite au tournoi.${warningStr}`,
        fields: [
          { name: "Changement de Pseudo", value: "En attente du checkin", inline: true },
          { name: "Rôle Capitaine", value: "En attente du checkin", inline: true }
        ],
        color: 0x57F287
      };

      await interaction.editReply({ content: '', embeds: [replyEmbed] });

    } catch (e: any) {
      console.error("Erreur lors de la finalisation", e);
      await interaction.editReply({ content: `❌ Une erreur est survenue: ${e.message}` });
    }
  }
}
