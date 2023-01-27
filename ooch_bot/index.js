// require the discord.js module
const fs = require('fs');
const { token, client_id, guild_ids } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes, InteractionType } = require('discord-api-types/v9');
const wait = require('wait');
const _ = require('lodash');

// create a new Discord client and give it some variables
const { Client, Partials, GatewayIntentBits, Collection, ThreadAutoArchiveDuration } = require('discord.js');
const db = require('./db.js');
const { prompt_battle_input, generate_battle } = require('./func_battle.js');
const { move } = require('./func_play.js');
const { PlayerState } = require('./types.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], 
    partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
client.commands = new Collection();
const registerCommands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

//#region 
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.type === undefined) {
        // Slash Commands
        client.commands.set(command.data.name, command);
        registerCommands.push(command.data.toJSON());
    } else {
        // Context Menu Commands (these have a different structure)
        client.commands.set(command.name, command);
        registerCommands.push(command);
    }
}

const rest = new REST({ version: '9' }).setToken(token);

for(let i = 0; i < guild_ids.length; i++){
    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationGuildCommands(client_id, guild_ids[i]),
                { body: registerCommands },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}
//#endregion

client.on('ready', async () => {
    console.log('Bot Ready')
})

// Listen for interactions (INTERACTION COMMAND HANDLER)
client.on('interactionCreate', async interaction => {

    if (interaction.isAutocomplete()) {
        let ooch_ids = db.monster_data.array();
        let item_ids = db.item_data.array();
        let ooch_names;

        function ooch_filter(v) {
            let msg = interaction.options.getString('oochamon').toLowerCase();
            let search_segment = v.split(' ')[1].slice(0, msg.length).toLowerCase();
            return msg == search_segment;
        }

        function id_filter(id) {
            let msg_id = interaction.options.getString('id');
            let search_segment = id.split(':')[0];
            return search_segment == msg_id;
        }

        switch (interaction.commandName) {
            case 'oochadex':
                ooch_names = ooch_ids.map(v => {
                    if (db.profile.get(interaction.user.id, `oochadex`)[v.id].seen != 0) {
                        return `#${v.id + 1}: ${_.capitalize(v.name)}`
                    } else return `???`
                });
                
                // Search filters
                ooch_names = ooch_names.filter(v => !v.includes('I'));
                ooch_names = ooch_names.filter(v => !v.includes('???'));
                ooch_names = ooch_names.filter(ooch_filter);
                ooch_names = ooch_names.slice(0, 25);
                ooch_names = ooch_names.map(v => v = { name: v, value: v.split(' ')[1].toLowerCase() });
                interaction.respond(ooch_names);
            break;
            case 'add_ooch':
                ooch_names = ooch_ids.map(v => {
                    return `${v.id}: ${_.capitalize(v.name)}`
                })

                if (interaction.options.getString('id') != '') ooch_names = ooch_names.filter(id_filter);
                ooch_names = ooch_names.slice(0, 25);
                ooch_names = ooch_names.map(v => v = { name: v, value: v.split(':')[0] });
                interaction.respond(ooch_names);
            break;
            case 'add_item':
                item_names = item_ids.map(v => {
                    return `${v.id}: ${_.capitalize(v.name)}`
                })

                if (interaction.options.getString('id') != '') item_names = item_names.filter(id_filter);
                item_names = item_names.slice(0, 25);
                item_names = item_names.map(v => v = { name: v, value: v.split(':')[0] });
                interaction.respond(item_names);
            break;
        }
    }

    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        await console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
    
});

//
client.on('messageCreate', async message => {

    if (message.author.id == '397879158962782219') {
        if (message.type == 'THREAD_CREATED') {
            console.log('type')
            await wait(10000)
            return message.delete();
        } else {
            return;
        }
    }    

    // Funi game logic for controlling the game
    if (db.profile.has(message.author.id)) {
        player_state = db.profile.get(message.author.id, 'player_state');
        switch (player_state) {
            case PlayerState.Playspace: 
                if (message.channel.id == db.profile.get(message.author.id, 'play_thread_id')) {
                    if (message.content == 'start battle') {
                        // Do battle stuff
                        await generate_battle(message.channel, message.author.id, db.profile.get(message.author.id, 'ooch_party'), [0, 3, 6]) // Sporbee, Roocky, Puppyre
                        message.delete();
                    } else {
                        // Do movement stuff
                        let args = message.content.split(' ');
                        let dist = (args.length == 2) ? parseInt(args[1]) : 1;
                        if (isNaN(dist)) dist = 1; // Ensure our input is always either some number or 1
                        switch (args[0]) {
                            case 'd': move(message, 'd', dist); break;
                            case 's': move(message, 's', dist); break;
                            case 'a': move(message, 'a', dist); break; 
                            case 'w': move(message, 'w', dist); break;
                        }
                        if (args[0] == 'w' || args[0] == 'a' || args[0] == 's' || args[0] == 'd') message.delete();
                    }
                }
            break;
            default: 
                if (message.channel.id == db.profile.get(message.author.id, 'play_thread_id')) {
                    let args = message.content.split(' ');
                    if (args[0] == 'w' || args[0] == 'a' || args[0] == 's' || args[0] == 'd') message.delete();
                }
            break;
        }
    }
});

//Log Bot in to the Discord
client.login(token);

