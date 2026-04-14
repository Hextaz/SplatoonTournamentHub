import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';
import * as registerCommand from "../src/commands/register";
import * as adminTransferCommand from "../src/commands/admin-transfer";
import * as adminSetupCheckinCommand from "../src/commands/admin-setup-checkin";
import * as scoreCommand from "../src/commands/score";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID. Cannot deploy commands.");
  process.exit(1);
}

const commands = [
  registerCommand.data.toJSON(),
  adminTransferCommand.data.toJSON(),
  adminSetupCheckinCommand.data.toJSON(),
  scoreCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands in ${NODE_ENV} mode.`);

    // If development and we have a specific bot guild, deploy to the guild to update instantly
    if (NODE_ENV !== 'production' && GUILD_ID) {
      logger.info(`Deploying commands TO GUILD: ${GUILD_ID}`);
      const data: any = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands },
      );
      logger.info(`Successfully reloaded ${data.length} guild application (/) commands.`);
    } 
    // Usually in production, we deploy globally
    else {
      logger.info(`Deploying commands GLOBALLY.`);
      const data: any = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands },
      );
      logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
    }
  } catch (error) {
    logger.error(error);
  }
})();
