import dotenv from 'dotenv';
dotenv.config();

import { startCase } from 'lodash-es';

import { MessageFlags, Events, InteractionType } from 'discord.js';
import { profile, monster_data, item_data, ability_data, move_data, status_data } from '../db.js';
import { move, setup_playspace_str } from '../func_play.js';
import { PlayerState } from '../types.js';
import { quit_oochamon } from '../func_other.js';
import { botClient, inactivityTrackers } from '../index.js';

// Listen for interactions (INTERACTION COMMAND HANDLER)
export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isModalSubmit()) {
        const { handleModal } = await import('./commands/report_bug.js');
        await handleModal(interaction, botClient);
    }

    if (interaction.isAutocomplete()) {
        let ooch_ids = monster_data.values();
        let item_ids = item_data.values();
        let ability_ids = ability_data.values();
        let move_ids = move_data.values();
        let status_ids = status_data.values();
        let ooch_names, item_names, move_names, ability_names, status_names;

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
                    if (profile.get(`${interaction.user.id}`, `oochadex`)[v.id].caught != 0) {
                        return `#${v.id + 1}: ${startCase(v.name)}`
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
                    return `${v.id}: ${startCase(v.name)}`
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
                    return `${v.id}: ${startCase(v.name)}`
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
                        return `${v.id}: ${startCase(v.name)}`
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
                        return `${v.id}: ${startCase(v.name)}`
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
                        return `${v.id}: ${startCase(v.name)}`
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
                        return `${v.id}: ${startCase(v.name)}`
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
            case 'quick_use':
                if (profile.has(interaction.user.id)) {
                    let item_ids = Object.entries(profile.get(`${interaction.user.id}`, 'other_inv'));
                    item_ids = item_ids.filter(v => v[0] == 22 || v[0] == 23)
                    item_names = item_ids.map(v => {
                        let db_item_data = item_data.get(`${v[0]}`);
                        return `${v[0]}:${startCase(db_item_data.name)} (${v[1]}/50 Held)`;
                    })

                    item_names = item_names.slice(0, 25);
                    item_names = item_names.map(v => v = { name: v.split(':')[1], value: v.split(':')[0] });
                    interaction.respond(item_names);
                }
            break;
        }
    }

    // SELECT MENU COLLECTORS
    if (interaction.isStringSelectMenu()) {
        
    }

    // BUTTON COLLECTOR
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('menu_')) {
            await menuHandler()
        }
        if (interaction.customId.startsWith('battle_')) {
            await battleHandler()
        }
    }

    // Handle move buttons
    if (profile.has(interaction.user.id)) {
        let curSpeed = profile.get(`${interaction.user.id}`, 'move_speed');
        if (profile.get(`${interaction.user.id}`, 'settings.discord_move_buttons') === true && interaction.isButton()) {
            if (['w', 'a', 's', 'd'].includes(interaction.customId)) {
                await interaction.update({ embeds: [] });
                await move(interaction.channel, interaction.user.id, interaction.customId, curSpeed);
            }
        }
    }

    if (interaction.isButton()) {
        let command, playspace_str;
        let curSpeed = profile.get(`${interaction.user.id}`, 'move_speed');
        let playThreadId = profile.get(`${interaction.user.id}`, 'play_thread_id');

        if (interaction.channel.id == playThreadId) {
            switch (interaction.customId) {
                case 'close_prompt':
                    await interaction.message.delete().catch(() => {});
                break;
                case 'play_menu_btn':
                    command = botClient.commands.get('menu');
                    command.execute(interaction, botClient);
                break;
                case 'play_dist':
                    profile.set(interaction.user.id, (curSpeed % 4) + 1, 'move_speed');
                    playspace_str = await setup_playspace_str(interaction.user.id);
                    await interaction.update({ components: playspace_str[1] });
                break;
            }
        }
    }

    // Reset inactivity timer
    if (profile.has(interaction.user.id)) {
        if (profile.get(`${interaction.user.id}`, 'player_state') != PlayerState.NotPlaying) {
            if (interaction.channel.id == profile.get(`${interaction.user.id}`, 'play_thread_id')) {

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

    const command = botClient.commands.get(`${interaction.commandName}`);

    if (!command) return;

    try {
        await command.execute(interaction, botClient);
    } catch (error) {
        await console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  },
}