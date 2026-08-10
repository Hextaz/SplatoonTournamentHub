"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../src/utils/logger");
const registerCommand = __importStar(require("../src/commands/register"));
const adminTransferCommand = __importStar(require("../src/commands/admin-transfer"));
const adminSetupCheckinCommand = __importStar(require("../src/commands/admin-setup-checkin"));
const scoreCommand = __importStar(require("../src/commands/score"));
dotenv_1.default.config();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const NODE_ENV = process.env.NODE_ENV || 'development';
if (!DISCORD_TOKEN || !CLIENT_ID) {
    logger_1.logger.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID. Cannot deploy commands.");
    process.exit(1);
}
const commands = [
    registerCommand.data.toJSON(),
    adminTransferCommand.data.toJSON(),
    adminSetupCheckinCommand.data.toJSON(),
    scoreCommand.data.toJSON(),
];
const rest = new discord_js_1.REST({ version: '10' }).setToken(DISCORD_TOKEN);
(async () => {
    try {
        logger_1.logger.info(`Started refreshing ${commands.length} application (/) commands in ${NODE_ENV} mode.`);
        // If development and we have a specific bot guild, deploy to the guild to update instantly
        if (NODE_ENV !== 'production' && GUILD_ID) {
            logger_1.logger.info(`Deploying commands TO GUILD: ${GUILD_ID}`);
            const data = await rest.put(discord_js_1.Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            logger_1.logger.info(`Successfully reloaded ${data.length} guild application (/) commands.`);
        }
        // Usually in production, we deploy globally
        else {
            logger_1.logger.info(`Deploying commands GLOBALLY.`);
            const data = await rest.put(discord_js_1.Routes.applicationCommands(CLIENT_ID), { body: commands });
            logger_1.logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
        }
    }
    catch (error) {
        logger_1.logger.error(error);
    }
})();
//# sourceMappingURL=deploy-commands.js.map