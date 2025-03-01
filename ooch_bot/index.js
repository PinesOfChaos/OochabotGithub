require('dotenv').config();
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes, InteractionType } = require('discord-api-types/v9');
const wait = require('wait');
const _ = require('lodash');
const cron = require('node-cron');

// create a new Discord client and give it some variables
const { Client, Partials, GatewayIntentBits, Collection } = require('discord.js');
const db = require('./db.js');
const { move, setup_playspace_str } = require('./func_play.js');
const { PlayerState } = require('./types.js');
const { prompt_battle_actions } = require('./func_battle.js');
const { event_process } = require('./func_event.js');
const { reset_oochamon, quit_oochamon } = require('./func_other.js');
const { genmap_allmaps } = require('./func_level_gen.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages], 
    partials: [Partials.Channel, Partials.Message, Partials.Reaction] });
client.commands = new Collection();
const registerCommands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const inactivityTrackers = {};

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

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.BOT_CLIENT_ID),
            { body: registerCommands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
//#endregion

// Runs at 9:00am (MST) every day
cron.schedule('00 16 * * *', async () => { 
    genmap_allmaps(client);
}, {
    scheduled: true,
});

client.on('ready', async () => {

    let userIds = db.profile.keyArray();
    for (let user of userIds) {

        // UNCOMMENT THIS IF DOING DEV STUFF!!
        if (user != '122568101995872256' && user != '145342159724347393' && user != '156859982778859520') continue;

        let user_profile = db.profile.get(user);
        if (user_profile.play_guild_id === undefined || user_profile.play_guild_id === false) continue;
        let userGuild = await client.guilds.fetch(user_profile.play_guild_id);
        let userThread = userGuild.channels.cache.get(user_profile.play_thread_id);
        if (userThread == undefined) continue;
        
        // Set inactivity timer
        const inactivityTimer = setTimeout(async () => {
            await quit_oochamon(userThread, user);
        }, 30 * 60 * 1000);

        inactivityTrackers[user] = inactivityTimer;

        if (user_profile.player_state == PlayerState.Combat) continue;

        if (user_profile.player_state == PlayerState.Intro) {
            await userThread.bulkDelete(100).catch(() => {});
            await reset_oochamon(user);
            await db.profile.set(user, userThread.id, 'play_thread_id');
            await db.profile.set(user, userGuild.id, 'play_guild_id');
            await event_process(user, userThread, db.events_data.get('ev_intro'), 0, 'ev_intro');

        } else if (user_profile.player_state == PlayerState.Dialogue && user_profile.cur_event_name !== false) {
            await userThread.bulkDelete(100).catch(() => {});

            // Setup playspace
            let playspace_str = await setup_playspace_str(user);
            await db.profile.set(user, PlayerState.Playspace, 'player_state');

            await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                db.profile.set(user, msg.id, 'display_msg_id');
            });

            await event_process(user, userThread, db.events_data.get(user_profile.cur_event_name), 0, user_profile.cur_event_name);
        } else if (user_profile.player_state == PlayerState.Dialogue) {
            await userThread.bulkDelete(100).catch(() => {});

            // Setup playspace
            let playspace_str = await setup_playspace_str(user);
            await db.profile.set(user, PlayerState.Playspace, 'player_state');

            await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                db.profile.set(user, msg.id, 'display_msg_id');
            });

            if (user_profile.cur_event_array.length != 0) {
                await event_process(user, userThread, user_profile.cur_event_array, user_profile.cur_event_pos);
            }

        } else if ((user_profile.player_state !== PlayerState.NotPlaying && user_profile.player_state !== PlayerState.Playspace)) {
            if (userThread !== undefined) {
                await userThread.bulkDelete(100).catch(() => {});
                // Setup playspace
                let playspace_str = await setup_playspace_str(user);
                await db.profile.set(user, PlayerState.Playspace, 'player_state');

                await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                    db.profile.set(user, msg.id, 'display_msg_id');
                });

                await move(userThread, user, '', 1);
            }
        }
    }

    let battleIds = db.battle_data.keyArray();
    for (let battle of battleIds) {
        let battle_data = db.battle_data.get(battle);

        for (let user of battle_data.users) {
            if (user.is_player) {
                let user_profile = db.profile.get(user.user_id);
                let userGuild = await client.guilds.fetch(user_profile.play_guild_id);
                let userThread = userGuild.channels.cache.get(user_profile.play_thread_id);

                // Delete turn messages
                let msgDeleteCount = db.battle_data.get(battle, 'turn_msg_counter');
                if (msgDeleteCount <= 100 && msgDeleteCount !== 0 && msgDeleteCount !== undefined) {
                    await userThread.bulkDelete(msgDeleteCount).catch(() => {});
                }  
                
                user.action_selected = false;
            }
        }

        battle_data.battle_action_queue = [];
        db.battle_data.set(battle, battle_data);

        await prompt_battle_actions(battle);
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
        let status_ids = db.status_data.array();
        let ooch_names;

        function filter(v, arg) {
            let msg = interaction.options.getString(arg).toLowerCase();
            let search_segment = v.split(' ')[1].slice(0, msg.length).toLowerCase();
            return msg == search_segment;
        }

        function id_filter(id, arg) {
            let msg_id = interaction.options.getString(arg);
            let search_segment = id.split(':')[0];
            return search_segment == msg_id;
        }

        let commandName = interaction.commandName;

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
                ooch_names = ooch_names.filter(v => filter(v, 'oochamon'));
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
                        ooch_names = ooch_names.filter(v => id_filter(v, 'oochamon'));
                    } else {
                        ooch_names = ooch_names.filter(v => filter(v, 'oochamon'));
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
                        item_names = item_names.filter(v => id_filter(v, 'item'));
                    } else {
                        item_names = item_names.filter(v => filter(v, 'item'));
                    }
                } 
                item_names = item_names.slice(0, 25);
                item_names = item_names.map(v => v = { name: v, value: v.split(':')[0] });
                interaction.respond(item_names);
            break;
            case 'lookup':
                if (interaction.options.getSubcommand() == 'move') {
                    move_names = move_ids.map(v => {
                        return `${v.id}: ${_.startCase(v.name)}`
                    })
    
                    if (interaction.options.getString('move') != '') {
                        if (!isNaN(interaction.options.getString('move'))) {
                            move_names = move_names.filter(v => id_filter(v, 'move'));
                        } else {
                            move_names = move_names.filter(v => filter(v, 'move'));
                        }
                    } 
                    move_names = move_names.slice(0, 25);
                    move_names = move_names.map(v => v = { name: v, value: v.split(':')[0] });
                    interaction.respond(move_names);
                } else if (interaction.options.getSubcommand() == 'ability') {
                    ability_names = ability_ids.map(v => {
                        return `${v.id}: ${_.startCase(v.name)}`
                    })
    
                    if (interaction.options.getString('ability') != '') {
                        if (!isNaN(interaction.options.getString('ability'))) {
                            ability_names = ability_names.filter(v => id_filter(v, 'ability'));
                        } else {
                            ability_names = ability_names.filter(v => filter(v, 'ability'));
                        }
                    } 
                    ability_names = ability_names.slice(0, 25);
                    ability_names = ability_names.map(v => v = { name: v, value: v.split(':')[0] });
                    interaction.respond(ability_names);
                } else if (interaction.options.getSubcommand() == 'status') {
                    status_names = status_ids.map(v => {
                        return `${v.id}: ${_.startCase(v.name)}`
                    })
    
                    if (interaction.options.getString('status') != '') {
                        if (!isNaN(interaction.options.getString('status'))) {
                            status_names = status_names.filter(v => id_filter(v, 'status'));
                        } else {
                            status_names = status_names.filter(v => filter(v, 'status'));
                        }
                    } 
                    status_names = status_names.slice(0, 25);
                    status_names = status_names.map(v => v = { name: v, value: v.split(':')[0] });
                    interaction.respond(status_names);
                } else {
                    item_names = item_ids.map(v => {
                        return `${v.id}: ${_.startCase(v.name)}`
                    })
    
                    if (interaction.options.getString('item') != '') {
                        if (!isNaN(interaction.options.getString('item'))) {
                            item_names = item_names.filter(v => id_filter(v, 'item'));
                        } else {
                            item_names = item_names.filter(v => filter(v, 'item'));
                        }
                    } 
                    item_names = item_names.slice(0, 25);
                    item_names = item_names.map(v => v = { name: v, value: v.split(':')[0] });
                    interaction.respond(item_names);
                }
            break;
        }
    }

    // Handle move buttons
    if (db.profile.has(interaction.user.id)) {
        let curSpeed = db.profile.get(interaction.user.id, 'move_speed');
        if (db.profile.get(interaction.user.id, 'settings.discord_move_buttons') === true && interaction.isButton()) {
            if (['w', 'a', 's', 'd'].includes(interaction.customId)) {
                await interaction.update({ embeds: [] });
                await move(interaction.channel, interaction.user.id, interaction.customId, curSpeed);
            } else if (interaction.customId === 'play_dist') {
                db.profile.set(interaction.user.id, (curSpeed % 4) + 1, 'move_speed');
                let playspace_str = setup_playspace_str(interaction.user.id);
                await interaction.update({ components: playspace_str[1] });
            } else if (interaction.customId === 'play_menu') {
                let command = client.commands.get('menu');
                command.execute(interaction, client);
            }
        }
    }

    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'close_prompt':
                await interaction.message.delete();
            break;
        }
    }

    // Reset inactivity timer
    if (db.profile.has(interaction.user.id)) {
        if (db.profile.get(interaction.user.id, 'player_state') != PlayerState.NotPlaying) {
            if (interaction.channel.id == db.profile.get(interaction.user.id, 'play_thread_id')) {

                if (inactivityTrackers[interaction.user.id]) {
                    clearTimeout(inactivityTrackers[interaction.user.id]);
                }

                const inactivityTimer = setTimeout(async () => {
                    await quit_oochamon(interaction.channel, interaction.user.id)
                }, 30 * 60 * 1000);

                inactivityTrackers[interaction.user.id] = inactivityTimer;
            }
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
        
        // Reset inactivity timer
        if (player_state != PlayerState.NotPlaying) {
            if (message.channel.id == db.profile.get(message.author.id, 'play_thread_id')) {

                if (inactivityTrackers[message.author.id]) {
                    clearTimeout(inactivityTrackers[message.author.id]);
                }

                const inactivityTimer = setTimeout(async () => {
                    await quit_oochamon(message.channel, message.author.id)
                }, 30 * 60 * 1000);

                inactivityTrackers[message.author.id] = inactivityTimer;
            }
        }

        switch (player_state) {
            case PlayerState.Playspace: 
                let speedMatch = message.content.toLowerCase().match(/^([1-4])$/);

                if (message.channel.id == db.profile.get(message.author.id, 'play_thread_id')) {
                    if (message.content == 'b') {
                        await move(message.channel, message.author.id, '', 1, 1);
                        await message.delete().catch(() => {});
                    } else if (speedMatch && db.profile.get(message.author.id, 'settings.discord_move_buttons') === true) {
                        const speedMultiplier = parseInt(speedMatch[1]) - 1;
                        db.profile.set(message.author.id, (speedMultiplier % 4) + 1, 'move_speed');
                        let playspace_str = setup_playspace_str(message.author.id);

                        let playspace_msg = await message.channel.messages.fetch(db.profile.get(message.author.id, 'display_msg_id')).catch(() => {});
                        await playspace_msg.edit({ components: playspace_str[1] }).catch(() => {});
                        
                        await message.delete().catch(() => {});
                    } else {
                        // Do movement stuff
                        let moveMsg = message.content.toLowerCase().replace(/\s+/g, ''); // Remove spaces
                        let splitMoves = moveMsg.split(','); // Split by comma first
                        let moveCount = 0;
                    
                        let currentDirection = null;
                        let totalDistance = 0;
                    
                        for (let msg of splitMoves) {
                            if (moveCount >= 3) break; // Stop processing after 3 moves
                            let moveSequence = msg.match(/([wasd])(\d{1,2})?/g); // Match 'w', 'a', 's', 'd' followed optionally by a number
                    
                            if (!moveSequence) continue; // Skip invalid input
                    
                            for (let moveSeq of moveSequence) {
                                if (moveCount >= 3) break; // Stop further moves if limit reached
                                let direction = moveSeq[0]; // First character (direction)
                                let dist = moveSeq.length > 1 ? parseInt(moveSeq.slice(1)) : 1; // Get distance if provided, otherwise default to 1
                    
                                if (isNaN(dist)) dist = 1; // Safety check for NaN values
                                if (dist > 4) dist = 4;
                    
                                if (currentDirection === null) {
                                    currentDirection = direction;
                                    totalDistance = dist;
                                } else if (currentDirection === direction) {
                                    totalDistance += dist; // Aggregate distance if the direction is the same
                                } else {
                                    // Move in the previous direction with the total distance
                                    await move(message.channel, message.author.id, currentDirection, totalDistance);
                                    moveCount++;

                                    if (moveCount >= 3) break; // Stop further moves if limit reached                    
                    
                                    // Start a new aggregation for the current direction
                                    currentDirection = direction;
                                    totalDistance = dist;
                                }
                            }
                        }
                
                        // Call move for the last accumulated direction
                        if (currentDirection !== null && moveCount < 3) {
                            await move(message.channel, message.author.id, currentDirection, totalDistance);
                        }
                    
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
client.login(process.env.BOT_TOKEN);

module.exports = { botClient: client } 