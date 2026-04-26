import {
  Client,
  GatewayIntentBits,
  Collection,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { logger } from "./utils/logger";
import { authMiddleware } from "./middleware/auth";
import { supabase } from "./lib/supabase";
import { SchedulerService } from "./services/SchedulerService";
import { ScoreService } from "./services/ScoreService";
import { ArchiveService } from "./services/ArchiveService";
import { RegistrationService } from "./services/RegistrationService";
import { PresenceRolesService } from "./services/PresenceRolesService";
import { phaseRouter } from "./routes/PhaseRouter";
import { matchRouter } from "./routes/MatchRouter";
import { tournamentRouter } from "./routes/TournamentRouter";

// Importer les commandes locales
import * as adminTransferCommand from "./commands/admin-transfer";
import * as adminSetupCheckinCommand from "./commands/admin-setup-checkin";
import * as scoreCommand from "./commands/score";

dotenv.config();

const PORT = process.env.PORT || 8080;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";

// Collections pour stocker nos commandes
const commands = new Collection<string, any>();
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

// Discord client error handlers
client.on("error", (err) => logger.error("[Discord] Client error:", err));
client.on("warn", (info) => logger.warn("[Discord] Client warning:", info));

// 2. Initialize Express Server
const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || false }));

// Apply authentication middleware to all API routes
app.use("/api", authMiddleware);

// Inject client globally
app.locals.discordClient = client;

// Health check (no auth required — skipped in middleware)
app.get("/health", (_req, res) => {
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
      .filter((role) => role.name !== "@everyone")
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return res.status(200).json(rolesInfo);
  } catch (error) {
    logger.error("Error fetching roles:", error);
    return res.status(500).json({ error: "Failed to fetch roles." });
  }
});

// Endpoint: Ordonne au client Discord de créer/supprimer des salons/rôles!
app.post("/api/discord/publish-phase", async (_req, res) => {
  try {
    res.status(202).json({ message: "Phase publish triggered." });
  } catch (error) {
    res.status(500).json({ error: "Failed to publish phase on Discord." });
  }
});

const getGuild = async (res: any, guildId: string): Promise<any> => {
  if (!guildId) {
    res.status(400).json({ error: "Missing guildId parameter" });
    return null;
  }
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) {
    res.status(404).json({ error: "Guild not found. Ensure bot is in the server." });
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
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

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

    const members = await guild.members.fetch({ limit: 1000 });

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

    const captainRole = await guild.roles.create({
      name: "Capitaine de Tournoi",
      color: 0xffa500,
      reason: "Bouton d'auto setup du back-office",
    });

    const checkinChannel = await guild.channels.create({
      name: "check-in-tournoi",
      type: ChannelType.GuildText,
      reason: "Bouton d'auto setup du back-office",
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: captainRole.id,
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

// Endpoint: Mettre à jour le planning du bot après création d'un tournoi
app.post("/api/discord/sync-schedule", async (req, res) => {
  try {
    const { tournament_id } = req.body;
    if (!tournament_id) {
      return res.status(400).json({ error: "tournament_id manquant" });
    }

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
    logger.error("Err in /api/discord/sync-schedule:", err);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// Endpoint: Archivage
app.post('/api/tournaments/archive-and-init', async (req, res) => {
  const { name, start_at, checkin_start_at, checkin_end_at } = req.body;
  const guildId = (req.query.guildId || req.body?.guildId) as string;

  if (!guildId) return res.status(400).json({ error: 'Missing guildId parameter' });

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

app.use('/api/phases', phaseRouter);
app.use('/api/matches', matchRouter);
app.use('/api/tournaments', tournamentRouter);

// 3. Connect DB and Start Systems
let server: http.Server;

const bootstrap = async () => {
  // Global error handlers
  process.on("unhandledRejection", (reason) => {
    logger.error("[Process] Unhandled Rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    logger.error("[Process] Uncaught Exception:", err);
    process.exit(1);
  });

  try {
    // Connect Discord Bot
    await client.login(DISCORD_TOKEN);
    logger.info(`[Bot] Logged in as ${client.user?.tag}`);

    // Sync connected guilds into Supabase
    try {
      const guildsInCache = Array.from(client.guilds.cache.keys());
      if (guildsInCache.length > 0) {
        const { data: existingSettings } = await supabase
          .from("server_settings")
          .select("guild_id");

        const existingIds = new Set(existingSettings?.map((s: any) => s.guild_id) || []);
        const missingGuilds = guildsInCache.filter((id) => !existingIds.has(id));

        if (missingGuilds.length > 0) {
          const inserts = missingGuilds.map((id) => ({ guild_id: id }));
          await supabase.from("server_settings").insert(inserts);
          logger.info(`[Sync] Inserted ${missingGuilds.length} missing guilds to DB.`);
        }
      }
    } catch (err) {
      logger.error("Failed to sync connected guilds:", err);
    }

    // Register new guilds when bot joins a server
    client.on("guildCreate", async (guild) => {
      try {
        const { error } = await supabase.from("server_settings").insert({ guild_id: guild.id });
        if (!error) {
          logger.info(`[Sync] Registered new server: ${guild.name} (${guild.id})`);
        }
      } catch (e) {
        logger.error(`Failed to register server ${guild.id}:`, e);
      }
    });

    // Start Tournament Scheduler
    await SchedulerService.init(client);

    // Initialize Real-time Presence Roles
    const presenceRolesService = new PresenceRolesService(client);
    presenceRolesService.init();

    // Handle Discord interactions
    client.on("interactionCreate", async (interaction) => {
      try { await RegistrationService.handleInteraction(interaction); } catch(e) { logger.error('Registration Error', e); }

      // -- STRING SELECT MENUS --
      if (interaction.isStringSelectMenu() && interaction.customId === 'select_match_to_score') {
        try {
          await ScoreService.handleSelectMenu(interaction);
        } catch (e: any) {
          logger.error("SelectMenu Error", e);
        }
        return;
      }

      // -- MODALS --
      if (interaction.isModalSubmit()) {
        try {
          await ScoreService.handleModalSubmit(interaction);
        } catch (e: any) {
          logger.error("Modal Error", e);
        }
        return;
      }

      // -- BUTTONS --
      if (interaction.isButton()) {
        if (interaction.customId.startsWith("btn_score_")) {
          try {
            await ScoreService.handleButton(interaction);
          } catch (e) {
            logger.error("Button Score Error", e);
          }
          return;
        }

        if (interaction.customId === "btn_checkin") {
          try {
            const guildId = interaction.guildId;
            const captainId = interaction.user.id;

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

            if (team.is_checked_in) {
              return interaction.reply({
                content: `Tu es déjà validé ! (Équipe **${team.name}**)`,
                ephemeral: true,
              });
            }

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
          content: "Il y a eu une erreur lors de l'exécution de cette commande !",
          ephemeral: true,
        });
      }
    });

    // Start Express Web API
    server = app.listen(PORT, () => {
      logger.info(`[API] Express listening on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`[Process] Received ${signal}, shutting down gracefully...`);
      SchedulerService.cancelAllJobs();

      if (server) {
        server.close(() => {
          logger.info("[API] HTTP server closed");
        });
      }

      client.destroy();
      logger.info("[Discord] Client destroyed");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

bootstrap();
