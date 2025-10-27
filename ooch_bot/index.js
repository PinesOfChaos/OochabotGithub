import dotenv from 'dotenv';
import process from 'process';
dotenv.config();

import { schedule } from 'node-cron';

// create a new Discord client and give it some variables
import {Client, Partials, GatewayIntentBits, Routes, Collection, REST} from 'discord.js';
import { genmap_allmaps } from './func_level_gen.js';
import branchName from 'current-git-branch';
let branch = branchName();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], 
    partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
client.commands = new Collection();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { profile } from './db.js';

export const inactivityTrackers = {};
export const clientEmojis = new Collection();
export function setClientEmojis(emojis) {
    clientEmojis.clear();
    emojis.forEach((emoji, key) => {
        clientEmojis.set(key, emoji);
    });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandDir = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandDir).filter(f => f.endsWith('.js'));

async function loadCommands() {
  const registerCommands = [];

  for (const file of commandFiles) {
    const mod = await import(new URL(`./commands/${file}`, import.meta.url));
    const command = mod.default ?? mod; 

    if (!command || !command.data) {
      console.warn(`Skipping ${file} - no 'data' export found.`);
      continue;
    }

    client.commands.set(command.data.name, command);
    registerCommands.push(typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data);
  }

  return registerCommands;
}

async function loadEvents() {
    const eventsPath = path.join(__dirname, 'events')
    const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))

    for (const file of eventFiles) {
        const filePath = new URL(`./events/${file}`, import.meta.url);
        const mod = await import(filePath.href);
        const event = mod.default ?? mod;     
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args))
        } else {
            client.on(event.name, (...args) => event.execute(...args))
        }
    }
}

loadEvents()
console.log('Events loaded')
loadCommands()
  .then(async (registerCommands) => {
     const rest = new REST().setToken(branch != 'dev' ? process.env.BOT_TOKEN : process.env.DEV_TOKEN);

        try {
            await rest.put(
                Routes.applicationCommands(branch != 'dev' ? process.env.BOT_CLIENT_ID : process.env.DEV_CLIENT_ID),
                { body: registerCommands }
            );
            console.log('Slash commands registered successfully.');

        } catch (error) {
            console.error('Failed to register commands:', error);
        }
    })
    .catch((err) => {
        console.error('Command loader failed:', err);
        process.exit(1);
    })
  .catch(err => {
    console.error('Command loader failed:', err);
    process.exit(1);
  });

// Runs at 9:00am (MST) every day
schedule('00 16 * * *', async () => { 
    genmap_allmaps(client);
    
    // Reset walks
    const allUsers = profile.keys();
    for (let user of allUsers) {
        profile.set(user, false, 'walk_taken');
    }
    
}, {
    scheduled: true,
});

//Log Bot in to the Discord
client.login(branch != 'dev' ? process.env.BOT_TOKEN : process.env.DEV_TOKEN);

export const botClient = client; 
