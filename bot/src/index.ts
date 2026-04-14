import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
} from "discord.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { logger } from "./utils/logger";

// Importer les commandes locales
import * as registerCommand from "./commands/register";
import * as adminTransferCommand from "./commands/admin-transfer";
import * as adminSetupCheckinCommand from "./commands/admin-setup-checkin";
import * as scoreCommand from "./commands/score";
import { SchedulerService } from "./services/SchedulerService";
import { ScoreService } from "./services/ScoreService";
import { ArchiveService } from "./services/ArchiveService";

dotenv.config();

const PORT = process.env.PORT || 8080;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID || "";

// Collections pour stocker nos commandes
const commands = new Collection<string, any>();
commands.set(registerCommand.data.name, registerCommand);
commands.set(adminTransferCommand.data.name, adminTransferCommand);
commands.set(adminSetupCheckinCommand.data.name, adminSetupCheckinCommand);
commands.set(scoreCommand.data.name, scoreCommand);

// 1. Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// 2. Initialize Express Server
const app = express();
app.use(express.json());
app.use(cors()); // Allow Next.js frontend to call the API

// Inject client globally
app.locals.discordClient = client;

// Test route to ensure API connectivity
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", botConnected: !!client.user });
});

// Endpoint: Fetch Roles for the connected Discord Guild
app.get("/api/discord/roles", async (req, res) => {
  const guildId = (req.query.guildId || req.body?.guildId) as string;
  if (!guildId) {
    return res.status(400).json({ error: "Missing guildId parameter." });
  }

  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      return res
        .status(404)
        .json({ error: "Guild not found. Ensure bot is in the server." });
    }

    const rolesInfo = guild.roles.cache
      .filter((role) => role.name !== "@everyone") // Filter out the default everyone role
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json(rolesInfo);
  } catch (error) {
    logger.error("Error fetching roles:", error);
    return res.status(500).json({ error: "Failed to fetch roles." });
  }
});

// Endpoint: Ordonne au client Discord de créer/supprimer des salons/rôles!
// Triggered by "Publier Phase" from the Next.js Back-office.
app.post("/api/discord/publish-phase", async (req, res) => {
  try {
    const payload = req.body;
    // Logique Fly.io => Discord (gestion asynchrone des rate limits etc.)
    // const discord = req.app.locals.discordClient;

    res.status(202).json({ message: "Phase publish triggered." });
  } catch (error) {
    res.status(500).json({ error: "Failed to publish phase on Discord." });
  }
});
const getGuild = async (res: any, guildId: string) => {
  if (!guildId) {
    res
      .status(400)
      .json({ error: "Missing guildId parameter" });
    return null;
  }
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res
      .status(404)
      .json({ error: "Guild not found. Ensure bot is in the server." });
    return null;
  }
  return guild;
};

// Endpoint: Fetch Channels for Check-in configurations
app.get("/api/discord/channels", async (req, res) => {
  try {
    const guildId = (req.query.guildId || req.body?.guildId) as string;
    const guild = await getGuild(res, guildId);
    if (!guild) return;

    const channelsInfo = guild.channels.cache
      .filter((channel: any) => channel.isTextBased())
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json(channelsInfo);
  } catch (error) {
    logger.error("Error fetching channels:", error);
    return res.status(500).json({ error: "Failed to fetch channels." });
  }
});

// Endpoint: Fetch Guild Members for Manual Input Combobox
app.get("/api/discord/members", async (req, res) => {
  try {
    const guildId = (req.query.guildId || req.body?.guildId) as string;
    const guild = await getGuild(res, guildId);
    if (!guild) return;

    // Fetch members (limited to 1000 for safety, could be adjusted)
    const members = await guild.members.fetch({ limit: 1000 });
    
    // Convert Map to array, filter out bots, map simple objects
    const membersInfo = Array.from(members.values())
      .filter((member: any) => !member.user.bot)
      .map((member: any) => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return res.status(200).json(membersInfo);
  } catch (error) {
    logger.error("Error fetching members:", error);
    return res.status(500).json({ error: "Failed to fetch members." });
  }
});

// Endpoint: Auto-setup for Checkin requirements
app.post("/api/discord/auto-setup", async (req, res) => {
  try {
    const guildId = (req.query.guildId || req.body?.guildId) as string;
    const guild = await getGuild(res, guildId);
    if (!guild) return;

    // 1. Création du rôle "Capitaine de Tournoi"
    const captainRole = await guild.roles.create({
      name: "Capitaine de Tournoi",
      color: 0xffa500, // Code couleur type #FFA500
      reason: "Bouton d'auto setup du back-office",
    });

    const { ChannelType, PermissionFlagsBits } = require("discord.js");

    // 2. Creation du salon check-in textuel
    const checkinChannel = await guild.channels.create({
      name: "check-in-tournoi",
      type: ChannelType.GuildText,
      reason: "Bouton d'auto setup du back-office",
      permissionOverwrites: [
        {
          id: guild.id, // @everyone : ne peut pas voir le salon
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: captainRole.id, // Les Capitaines : peuvent voir et ecrire
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    });

    return res.status(200).json({
      message: "Setup généré avec succès !",
      captain_role_id: captainRole.id,
      checkin_channel_id: checkinChannel.id,
    });
  } catch (error) {
    logger.error("Erreur durant l'auto-setup Discord:", error);
    return res
      .status(500)
      .json({ error: "Échec de l'auto-setup sur Discord." });
  }
});

// Endpoint: Mettre à jour le planning du bot après création d'un tournoi (ou update horaires).
app.post("/api/discord/sync-schedule", async (req, res) => {
  try {
    const { tournament_id } = req.body;
    if (!tournament_id) {
      return res.status(400).json({ error: "tournament_id manquant" });
    }

    const { supabase } = require("./lib/supabase");
    const { data: tournament, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournament_id)
      .single();

    if (error || !tournament) {
      return res.status(404).json({ error: "Tournoi inconnu en DB" });
    }

    SchedulerService.scheduleTournament(tournament);

    return res
      .status(200)
      .json({ message: "Schedule synchronisé avec succès." });
  } catch (err) {
    console.error("Err in /api/discord/sync-schedule:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

  // NOUVEAU ENDPOINT: Archivage
  app.post('/api/tournaments/archive-and-init', async (req, res) => {
    const { name, start_at, checkin_start_at, checkin_end_at } = req.body;
    const guildId = (req.query.guildId || req.body?.guildId) as string;
    
    if (!guildId) return res.status(400).json({ error: 'Missing guildId parameter' });

    const { supabase } = require('./lib/supabase');
    const { ArchiveService } = require('./services/ArchiveService');

    try {
      await supabase.from('tournaments')
        .update({ status: 'ARCHIVED' })
        .eq('guild_id', guildId)
        .neq('status', 'ARCHIVED');
        
      const { data: newTourney, error: insertErr } = await supabase.from('tournaments')
        .insert({ 
          guild_id: guildId, 
          name: name || 'Nouveau Tournoi', 
          start_at: start_at || null, 
          checkin_start_at: checkin_start_at || null, 
          checkin_end_at: checkin_end_at || null, 
          status: 'DRAFT' 
        })
        .select().single();
        
      if (insertErr) throw insertErr;
      
      const { data: settings } = await supabase.from('server_settings')
        .select('captain_role_id')
        .eq('guild_id', guildId)
        .single();
        
      ArchiveService.backgroundDiscordCleanup(client, guildId, settings?.captain_role_id).catch((e: any) => logger.error(e));
      
      if (newTourney) SchedulerService.scheduleTournament(newTourney);
      return res.status(202).json({ message: 'OK', tournament: newTourney });
    } catch (err: any) { 
      logger.error('Error during archive-and-init:', err);
      return res.status(500).json({ error: err.message }); 
    }
  });

  const { phaseRouter } = require('./routes/PhaseRouter');
  app.use('/api/phases', phaseRouter);
  const { matchRouter } = require('./routes/MatchRouter');
  app.use('/api/matches', matchRouter);
  const { tournamentRouter } = require('./routes/TournamentRouter');
  app.use('/api/tournaments', tournamentRouter);

// 3. Connect DB and Start Systems
const bootstrap = async () => {
  try {
    // Connect Discord Bot
    await client.login(DISCORD_TOKEN);
    logger.info(`[Bot] Logged in as ${client.user?.tag}`);

    // Démarrer le Scheduler de Tournoi
    await SchedulerService.init(client);

    // MIGRATION SPRINT 11 : Le registre de commandes slash a été déporté dans bot/scripts/deploy-commands.ts
    // pour éviter des conflits et du lag inutile au démarrage sur plusieurs serveurs.
    
    // Gérer les interactions des Commandes Slash
    client.on("interactionCreate", async (interaction) => {
      const { RegistrationService } = require('./services/RegistrationService');
      try { await RegistrationService.handleInteraction(interaction); } catch(e) { logger.error('Registration Error', e); }
      // -- GESTION DES MENUS DEROULANTS --
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_match_to_score') {
        try {
          await ScoreService.handleSelectMenu(interaction);
        } catch (e: any) {
          console.error("SelectMenu Error", e);
        }
        return;
      }

      // -- GESTION DES MODALES --
      if (interaction.isModalSubmit()) {
        try {
          await ScoreService.handleModalSubmit(interaction);
        } catch (e: any) {
          console.error("Modal Error", e);
        }
        return;
      }

      // -- GESTION DES BOUTONS --
      if (interaction.isButton()) {
        if (interaction.customId.startsWith("btn_score_")) {
          try {
            await ScoreService.handleButton(interaction);
          } catch (e) {
            console.error("Button Score Error", e);
          }
          return;
        }

        if (interaction.customId === "btn_checkin") {
          try {
            const guildId = interaction.guildId;
            const captainId = interaction.user.id;

            // 1. Trouver le tournoi actif pour la guild
            const { supabase } = require("./lib/supabase");
            const { data: currentTournament } = await supabase
              .from("tournaments")
              .select("id")
              .eq("guild_id", guildId)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (!currentTournament) {
              return interaction.reply({
                content: "❌ Aucun tournoi n'est configuré pour ce serveur.",
                ephemeral: true,
              });
            }

            // 2. Trouver l'équipe dont le joueur est capitaine pour CE tournoi
            const { data: team } = await supabase
              .from("teams")
              .select("id, name, is_checked_in")
              .eq("tournament_id", currentTournament.id)
              .eq("captain_discord_id", captainId)
              .single();

            if (!team) {
              return interaction.reply({
                content:
                  "❌ Vous n'êtes le capitaine d'aucune équipe inscrite, ou le tournoi n'est pas actif.",
                ephemeral: true,
              });
            }

            // 3. Vérifier si l'équipe est déjà checked-in
            if (team.is_checked_in) {
              return interaction.reply({
                content: `Tu es déjà validé ! (Équipe **${team.name}**)`,
                ephemeral: true,
              });
            }

            // 4. Mettre à jour is_checked_in = true pour cette équipe
            const { error: updateError } = await supabase
              .from("teams")
              .update({ is_checked_in: true })
              .eq("id", team.id);

            if (updateError) {
              logger.error("Failed to check in team:", updateError);
              return interaction.reply({
                content:
                  "❌ Une erreur base de données est survenue lors de votre Check-in. Veuillez contacter un TO.",
                ephemeral: true,
              });
            }

            return interaction.reply({
              content: `✅ Check-in validé pour l'équipe **${team.name}** ! Bonne chance.`,
              ephemeral: true,
            });
          } catch (err: any) {
            logger.error("Check-in interaction error", err);
          }
        }
        return;
      }
      if (!interaction.isChatInputCommand() && !interaction.isAutocomplete())
        return;

      const command = commands.get(interaction.commandName);

      if (!command) return;

      if (interaction.isAutocomplete()) {
        try {
          if (typeof command.autocomplete === "function") {
            await command.autocomplete(interaction);
          }
        } catch (error) {
          logger.error(error);
        }
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(error);
        await interaction.reply({
          content:
            "Il y a eu une erreur lors de l'exécution de cette commande !",
          ephemeral: true,
        });
      }
    });

    // Start Express Web API
    app.listen(PORT, () => {
      logger.info(`[API] Express listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

bootstrap();


