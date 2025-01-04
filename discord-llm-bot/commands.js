import 'dotenv/config';
import { InstallGlobalCommands, InstallGuildCommands } from './utils.js';

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Simple test command
const LLM_COMMAND = {
  name: 'llm',
  description: 'Basic llm command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};


const ALL_COMMANDS = [TEST_COMMAND];
const ALL_GUILD_COMMANDS = [LLM_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
InstallGuildCommands(process.env.APP_ID, process.env.GUILD_ID, ALL_GUILD_COMMANDS);
