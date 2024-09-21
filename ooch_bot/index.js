// require the discord.js module
const fs = require('fs');
const { token, client_id, guild_ids } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes, InteractionType } = require('discord-api-types/v9');
const wait = require('wait');
const _ = require('lodash');

// create a new Discord client and give it some variables
const { Client, Partials, GatewayIntentBits, Collection } = require('discord.js');
const db = require('./db.js');
const { move, setup_playspace_str } = require('./func_play.js');
const { PlayerState } = require('./types.js');
const { prompt_battle_input } = require('./func_battle.js');

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
    let userIds = db.profile.keyArray();
    for (let user of userIds) {
        let user_profile = db.profile.get(user);
        if (user_profile.play_guild_id === undefined || user_profile.play_guild_id === false) continue;
        let userGuild = await client.guilds.fetch(user_profile.play_guild_id);
        let userThread = userGuild.channels.cache.get(user_profile.play_thread_id);

        if (user_profile.player_state === PlayerState.Combat) {
            // Delete turn messages
            let msgDeleteCount = db.profile.get(user, 'turn_msg_counter');
            if (msgDeleteCount <= 100 && msgDeleteCount !== 0 && msgDeleteCount !== undefined) {
                await userThread.bulkDelete(msgDeleteCount);
            }

            //let warningMsg = await userThread.send({ content: '## The bot has crashed, the current battle turn has been undone to avoid corruption.' });

            // Rollback profile to previous turn.
            if (user_profile.rollback_profile !== false && user_profile.rollback_profile !== undefined) {
                db.profile.set(user, JSON.parse(user_profile.rollback_profile));
                db.profile.set(user, false, 'rollback_profile');
            }

            await prompt_battle_input(userThread, user);
            // await wait(2000);
            // await warningMsg.delete();
        } else if (user_profile.player_state !== PlayerState.NotPlaying && user_profile.player_state !== PlayerState.Playspace) {

            await userThread.bulkDelete(100);
            db.profile.set(user, [], 'npc_event_data');
            db.profile.set(user, 0, 'npc_event_pos')

            // Setup playspace
            let playspace_str = await setup_playspace_str(user);
            await db.profile.set(user, PlayerState.Playspace, 'player_state');

            await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                db.profile.set(user, msg.id, 'display_msg_id');
            });

            // let warningMsg = await userThread.send({ content: '## The bot has crashed, and your game has soft rebooted to avoid corruption and button issues. No progress has been lost.' });

            // await wait(2000);
            // await warningMsg.delete();
        }
    }
    console.log('Bot Ready')
});

// Listen for interactions (INTERACTION COMMAND HANDLER)
client.on('interactionCreate', async interaction => {
    
    if (interaction.isAutocomplete()) {
        let ooch_ids = db.monster_data.array();
        let item_ids = db.item_data.array();
        let ability_ids = db.ability_data.array();
        let move_ids = db.move_data.array();
        let ooch_names;

        function ooch_filter(v) {
            let msg = interaction.options.getString('oochamon').toLowerCase();
            let search_segment = v.split(' ')[1].slice(0, msg.length).toLowerCase();
            return msg == search_segment;
        }

        function item_filter(v) {
            let msg = interaction.options.getString('item').toLowerCase();
            let search_segment = v.split(' ')[1].slice(0, msg.length).toLowerCase();
            return msg == search_segment;
        }

        function ability_filter(v) {
            let msg = interaction.options.getString('ability').toLowerCase();
            let search_segment = v.split(' ')[1].slice(0, msg.length).toLowerCase();
            return msg == search_segment;
        }

        function move_filter(v) {
            let msg = interaction.options.getString('move').toLowerCase();
            let search_segment = v.split(' ')[1].slice(0, msg.length).toLowerCase();
            return msg == search_segment;
        }

        function id_filter(id) {
            let msg_id = interaction.options.getString('oochamon');
            if (msg_id == null || msg_id == undefined) {
                msg_id = interaction.options.getString('item');
                if (msg_id == null || msg_id == undefined) {
                    msg_id = interaction.options.getString('ability');
                    if (msg_id == null || msg_id == undefined) {
                        msg_id = interaction.options.getString('move');
                    }
                }
            }
            let search_segment = id.split(':')[0];
            return search_segment == msg_id;
        }

        let commandName = interaction.commandName;
        if (commandName == 'lookup') commandName = 'change_ability';

        switch (commandName) {
            case 'oochadex':
                ooch_names = ooch_ids.map(v => {
                    if (db.profile.get(interaction.user.id, `oochadex`)[v.id].seen != 0) {
                        return `#${v.id + 1}: ${_.startCase(v.name)}`
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
                    return `${v.id}: ${_.startCase(v.name)}`
                })

                if (interaction.options.getString('oochamon') != '') {
                    if (!isNaN(interaction.options.getString('oochamon'))) {
                        ooch_names = ooch_names.filter(id_filter);
                    } else {
                        ooch_names = ooch_names.filter(ooch_filter);
                    }
                } 
                ooch_names = ooch_names.slice(0, 25);
                ooch_names = ooch_names.map(v => v = { name: v, value: v.split(':')[0] });
                interaction.respond(ooch_names);
            break;
            case 'add_item':
                item_names = item_ids.map(v => {
                    return `${v.id}: ${_.startCase(v.name)}`
                })

                if (interaction.options.getString('item') != '') {
                    if (!isNaN(interaction.options.getString('item'))) {
                        item_names = item_names.filter(id_filter);
                    } else {
                        item_names = item_names.filter(item_filter);
                    }
                } 
                item_names = item_names.slice(0, 25);
                item_names = item_names.map(v => v = { name: v, value: v.split(':')[0] });
                interaction.respond(item_names);
            break;
            case 'change_ability':
                if (interaction.options.getSubcommand() == 'move') {
                    move_names = move_ids.map(v => {
                        return `${v.id}: ${_.startCase(v.name)}`
                    })
    
                    if (interaction.options.getString('move') != '') {
                        if (!isNaN(interaction.options.getString('move'))) {
                            move_names = move_names.filter(id_filter);
                        } else {
                            move_names = move_names.filter(move_filter);
                        }
                    } 
                    move_names = move_names.slice(0, 25);
                    move_names = move_names.map(v => v = { name: v, value: v.split(':')[0] });
                    interaction.respond(move_names);
                } else {
                    ability_names = ability_ids.map(v => {
                        return `${v.id}: ${_.startCase(v.name)}`
                    })
    
                    if (interaction.options.getString('ability') != '') {
                        if (!isNaN(interaction.options.getString('ability'))) {
                            ability_names = ability_names.filter(id_filter);
                        } else {
                            ability_names = ability_names.filter(ability_filter);
                        }
                    } 
                    ability_names = ability_names.slice(0, 25);
                    ability_names = ability_names.map(v => v = { name: v, value: v.split(':')[0] });
                    interaction.respond(ability_names);
                }
            break;
        }
    }

    // Handle move buttons
    if (db.profile.get(interaction.user.id, 'settings.discord_move_buttons') === true && interaction.isButton()) {
        if (['w', 'a', 's', 'd'].includes(interaction.customId)) {
            await move(interaction.channel, interaction.user.id, interaction.customId, 1);
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
                    // Do movement stuff

                    let moveMsg = message.content.toLowerCase();
                    moveMsg = moveMsg.replace(' ', '');
                    for (let msg of moveMsg.split(',')) {
                        // Check for wwwwww or aaaaaa or ssssss or dddddd
                        let matches = msg.match(/^([wasd])\1{1,5}$/);
                        let matchLength = matches ? matches[0].length : null;

                        let args, dist;
                        if (matchLength === null) { 
                            args = msg.split(' ');
                            if (args.length == 1) args = args[0].split('');
                            dist = (args.length == 2) ? parseInt(args[1]) : 1;
                            args[0] = args[0].toLowerCase();
                            if (isNaN(dist)) dist = 1; // Ensure our input is always either some number or 1
                        } else {
                            args = [msg[0]];
                            dist = matchLength;
                        }

                        await move(message.channel, message.author.id, args[0], dist);
                        await message.delete().catch(() => {});
                    }
                }
            break;
            default: 
                if (message.channel.id == db.profile.get(message.author.id, 'play_thread_id')) {
                    await message.delete().catch(() => {});
                }
            break;
        }
    }
});

//Log Bot in to the Discord
client.login(token);

