import { Client, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Interaction, MathUtility } from 'discord.js';
import { supabase } from '../lib/supabase';

// Cache to store the initial roster modal submission
// Key: userId_tournamentId
const registrationCache = new Map<string, any>();

export class RegistrationService {

  // ÉTAPE 1: Envoyer le message d'inscription
  static async sendRegistrationEmbed(tournamentId: string, client: Client) {
    try {
      // 1. Get tournament details
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (error || !tournament) throw new Error("Tournament not found");

      if (!tournament.discord_registration_channel_id) {
        console.error(`No registration channel set for tournament ${tournamentId}`);
        return false;
      }

      // 2. Fetch the channel
      const channel = await client.channels.fetch(tournament.discord_registration_channel_id) as TextChannel;
      if (!channel) throw new Error("Channel not found");

      // 3. Build Embed & Button
      const embed = {
        title: `📝 Inscriptions: ${tournament.name}`,
        description: tournament.description || `Cliquez sur le bouton ci-dessous pour inscrire votre équipe. Le capitaine doit obligatoirement enregistrer le roster principal (4 joueurs minimum, dont lui-même) incluant les Codes Amis Valides.`,
        color: 0x5865F2,
        fields: [
          {
            name: "Règle Code Ami",
            value: "Le format `SW-XXXX-XXXX-XXXX` est **strictement requis**."
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

    } catch (e) {
      console.error("[RegistrationService] Error sending embed:", e);
      return false;
    }
  }

  // Dispatch interactions (Called from index.ts interactionCreate listener)
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

  // ÉTAPE 2: Le bouton ouvre la modale du roster principal
  private static async handleRegisterButton(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();

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

  // Regex de validation
  private static parsePlayerInput(input: string): { name: string, fc: string } | null {
    if (!input || input.trim() === '') return null;
    const regex = /(.*?)(SW-\d{4}-\d{4}-\d{4})/i;
    const match = input.match(regex);
    if (!match) return null;
    
    // Le nom est ce qui précède le FC (nettoyé)
    const name = match[1].replace(/[-:]/g, '').trim(); 
    return { name: name || 'Joueur', fc: match[2].toUpperCase() };
  }

  // ÉTAPE 3: Soumission du Modal Principal + Demande éphémère Remplaçants
  private static async handleMainModalSubmit(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();
    
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
            errors.push(`Joueur ${i+1} : Code ami Invalide (attendu: SW-XXXX-XXXX-XXXX)`);
        } else {
            parsedPlayers.push(p);
        }
    }

    if (errors.length > 0) {
        return interaction.reply({ content: `**Erreur Code Ami:**\n${errors.join('\n')}\n*Veuillez recommencer l'inscription en respectant le format.*`, ephemeral: true });
    }

    // Sauvegarder dans le cache
    const cacheKey = `${interaction.user.id}_${tournamentId}`;
    registrationCache.set(cacheKey, {
        teamName,
        players: parsedPlayers,
        captainDiscordId: interaction.user.id
    });

    // Demander s'il y a des remplaçants via message éphémère
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

  // Si click sur Ajouter Remplaçants -> Ouvre Modal 2
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

  // Si click sur Terminer -> Enregistrement Final (0 remplaçants)
  private static async handleSkipSubsButton(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();
    await this.finalizeRegistration(interaction, tournamentId, []);
  }

  // Soumission Modale Remplaçants
  private static async handleSubsModalSubmit(interaction: any) {
    const tournamentId = interaction.customId.split('_').pop();
    
    const sub1 = interaction.fields.getTextInputValue('sub1');
    const sub2 = interaction.fields.getTextInputValue('sub2');

    const parsedSubs = [];
    const errors = [];

    if (sub1 && sub1.trim() !== '') {
        const p = this.parsePlayerInput(sub1);
        if(!p) errors.push(`Remplaçant 1 invalide`);
        else parsedSubs.push(p);
    }

    if (sub2 && sub2.trim() !== '') {
        const p = this.parsePlayerInput(sub2);
        if(!p) errors.push(`Remplaçant 2 invalide`);
        else parsedSubs.push(p);
    }

    if (errors.length > 0) {
        return interaction.reply({ content: `**Erreur Code Ami Remplaçant:**\n${errors.join('\n')}`, ephemeral: true });
    }

    await this.finalizeRegistration(interaction, tournamentId, parsedSubs);
  }

  // Finalisation (Sauvegarde DB + Rôles + Annonce)
  private static async finalizeRegistration(interaction: any, tournamentId: string, subs: any[]) {
    await interaction.deferReply({ ephemeral: true });
    try {
        const cacheKey = `${interaction.user.id}_${tournamentId}`;
        const cachedData = registrationCache.get(cacheKey);

        if (!cachedData) {
            return interaction.editReply({ content: "⚠️ Session d'inscription introuvable ou expirée. Veuillez recommencer." });
        }

        // Fetch tournament settings (Captain role, announcement channel)
        const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();

        // 1. Sauvegarder l'équipe
        const { data: team, error: teamErr } = await supabase
            .from('teams')
            .insert({
                tournament_id: tournamentId,
                name: cachedData.teamName,
                captain_discord_id: interaction.user.id
            })
            .select()
            .single();

        if (teamErr || !team) throw teamErr;

        // 2. Sauvegarder les joueurs (Main + Subs)
        const allPlayers = [...cachedData.players, ...subs];
        
        for (let i=0; i<allPlayers.length; i++) {
           await supabase.from('team_members').insert({
               team_id: team.id,
               name: allPlayers[i].name,
               is_captain: i === 0 ? true : false,
               friend_code: allPlayers[i].fc
           });
        }

        // Nettoyage Cache
        registrationCache.delete(cacheKey);

        // 3. Actions Discord (Assigner le rôle Captain + Changer Pseudo)
        if (interaction.member && tournament) {
            try {
               const member = interaction.member;
               // Renommer
               const newNickname = `${cachedData.teamName} | ${member.user.username}`.substring(0, 32);
               await member.setNickname(newNickname).catch(() => {});
               
               // Rôle Capitaine
               if (tournament.discord_captain_role_id) {
                   await member.roles.add(tournament.discord_captain_role_id).catch(() => {});
               }
            } catch(e) {
                console.error("Non fatal discord error:", e);
            }
        }

        // 4. Message Public dans le salon d'annonce
        if (tournament && tournament.discord_announcement_channel_id) {
             const annChannel = await interaction.client.channels.fetch(tournament.discord_announcement_channel_id);
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

        await interaction.editReply({ content: `✅ **Félicitations !** Votre équipe **${cachedData.teamName}** a bien été inscrite.` });

    } catch (e: any) {
        console.error("Erreur lors de la finalisation", e);
        await interaction.editReply({ content: `❌ Une erreur est survenue: ${e.message}` });
    }
  }

}
