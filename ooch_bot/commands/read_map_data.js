const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('read_map_data')
        .setDescription('Read and format map data'),
    async execute(interaction) {
        await interaction.deferReply();

        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') return interaction.reply('This command is not for you.')
        interaction.editReply('Please post the .txt file from the Oochamon Map Editor:tm:')

        file_collector = interaction.channel.createMessageCollector({ max: 1, time: 120000 });
        file_collector.on('collect', async msg => {
            const file = msg.attachments.first()?.url;
            if (!file) return console.log('No attached file found');
    
            try {
                let map_name = file.split('/');
                map_name = map_name[map_name.length-1].replace('.txt', '');
                // fetch the file from the external URL
                const response = await fetch(file);
    
                // if there was an error send a message with the status
                if (!response.ok)
                return interaction.editReply(
                    'There was an error with fetching the file:',
                    response.statusText,
                );
    
                // take the response stream and read it to completion
                let text = await response.text();
    
                if (text) {
                    let map_data = text.split('\n');
                    let data_header = 'err';
                    let tile_data = [];
                    let npc_data = [];
                    let npc_team_data, ooch_data, moveset, spawn_ooch_data;
                    let spawn_data = [];
                    let savepoint_data = [];
                    let transition_data = [];
                    let event_data = [];
                    let shop_data = [];
                    for (let line of map_data) {
                        line = line.replace(/\r\n/g, '').replace(/[\r\n]/g, '');
                        if (line[0] == '#') {
                            data_header = `${line.replace('#', '')}`;
                        } else {
                            let line_data = line.split('|');
                            let output;
                            switch (data_header) {
                                case 'tiles':
                                    line_data.pop();
                                    line_data = line_data.map(v => parseInt(v));
                                    tile_data.push(line_data);
                                break;
                                case 'npcs':
                                    output = {
                                        name: line_data[0],
                                        x: parseInt(line_data[1]),
                                        y: parseInt(line_data[2]),
                                        beaten: Boolean(parseInt(line_data[3])),
                                        sprite_id: parseInt(line_data[4]),
                                        coin: parseInt(line_data[5]),
                                        item_id: parseInt(line_data[6]),
                                        item_count: parseInt(line_data[7]),
                                        flag_required: (line_data[8] == '' ? false : line_data[8]),
                                        flag_given: (line_data[9] == '' ? false : line_data[9]),
                                        remove_on_finish: Boolean(parseInt(line_data[10])),
                                        pre_combat_dialogue: line_data[11].split('`').filter(v => v != ''),
                                        post_combat_dialogue: line_data[12].split('`').filter(v => v != ''),
                                        team: [],
                                    };

                                    for (let i = 13; i < line_data.length; i++) {
                                        if (line_data[i] == '') continue;
                                        npc_team_data = line_data[i].split('`');
                                        ooch_data = db.monster_data.get(parseInt(npc_team_data[0]));
                                        moveset = [
                                            parseInt(npc_team_data[4]),
                                            parseInt(npc_team_data[5]),
                                            parseInt(npc_team_data[6]),
                                            parseInt(npc_team_data[7]),
                                        ];
                                        moveset = moveset.filter(id => id != -1);

                                        output.team.push({
                                            id: parseInt(npc_team_data[0]),
                                            name: ooch_data.name,
                                            nickname: npc_team_data[1],
                                            current_hp: ooch_data.hp,
                                            type: ooch_data.type,
                                            item: -1,
                                            alive: true,
                                            ability: parseInt(npc_team_data[2]),
                                            level: parseInt(npc_team_data[3]),
                                            moveset: moveset,
                                            status_effects: [],
                                            stats: {
                                                acc_mul: 1,
                                                eva_mul: 1,
                                                hp: ooch_data.hp,
                                                hp_iv: parseInt(npc_team_data[8]),
                                                atk: ooch_data.atk,
                                                atk_iv: parseInt(npc_team_data[9]),
                                                atk_mul: 1,
                                                def: ooch_data.def,
                                                def_iv: parseInt(npc_team_data[10]),
                                                def_mul: 1,
                                                spd: ooch_data.spd,
                                                spd_iv: parseInt(npc_team_data[11]),
                                                spd_mul: 1,
                                            }
                                        });
                                    }
                                    npc_data.push(output);
                                break;
                                case 'spawns':
                                    output = {
                                        x: parseInt(line_data[0]),
                                        y: parseInt(line_data[1]),
                                        width: parseInt(line_data[2]),
                                        height: parseInt(line_data[3]),
                                        spawn_slots: [],
                                    }

                                    for (let i = 4; i < line_data.length; i++) {
                                        if (line_data[i] == '') continue;
                                        spawn_ooch_data = line_data[i].split('`')
                                        output.spawn_slots.push({
                                            ooch_id: parseInt(spawn_ooch_data[0]),
                                            min_level: parseInt(spawn_ooch_data[1]),
                                            max_level: parseInt(spawn_ooch_data[2])
                                        })
                                    }
                                    spawn_data.push(output);
                                break;
                                case 'savepoints':
                                    output = {
                                        x: parseInt(line_data[0]),
                                        y: parseInt(line_data[1]),
                                        is_default: Boolean(parseInt(line_data[2]))
                                    }
                                    savepoint_data.push(output);
                                break;
                                case 'shops':
                                    output = {
                                        x: parseInt(line_data[0]),
                                        y: parseInt(line_data[1]),
                                        type: parseInt(line_data[2])
                                    }
                                    shop_data.push(output);
                                break;
                                case 'transitions':
                                    output = {
                                        x: parseInt(line_data[0]),
                                        y: parseInt(line_data[1]),
                                        connect_map: parseInt(line_data[2]),
                                        connect_x: parseInt(line_data[3]),
                                        connect_y: parseInt(line_data[4]),
                                    }
                                    transition_data.push(output);
                                break;
                                case 'events':
                                    output = {
                                        x: parseInt(line_data[0]),
                                        y: parseInt(line_data[1]),
                                        width:  parseInt(line_data[2]),
                                        height: parseInt(line_data[3]),
                                        event_name: line_data[4],
                                        flag_required: (line_data[5] == '' ? false : line_data[5]),
                                        flag_given: (line_data[6] == '' ? false : line_data[6]),
                                    }
                                    event_data.push(output);
                                break;
                            }
                        }
                    }

                    //Set the map's data
                    db.maps.set(map_name, {
                        tiles: tile_data,
                        npcs: npc_data,
                        spawns: spawn_data,
                        savepoints: savepoint_data,
                        transitions: transition_data,
                        events: event_data,
                        shops: shop_data
                    });
                    interaction.editReply(`File has been read and data has been parsed. The map has been created.`);
                    msg.delete();
                } else {
                    interaction.editReply(`You didn't enter a file, please enter a file!`);
                    msg.delete();
                }
            } catch (error) {
                console.log(error);
            }
        });
    },
};

