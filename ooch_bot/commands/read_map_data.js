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
                let map_name = file.split('/').slice(-1).replace('.txt', '');
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
                    let npc_team_data, ooch_data;
                    let spawn_data = [];
                    let savepoint_data = [];
                    let line_data;
                    for (let line in map_data) {
                        if (line[0] == '#') {
                            data_header = line;
                        } else {
                            switch (data_header) {
                                case 'tiles':
                                    tile_data.push(line.split('|'));
                                break;
                                case 'npcs':
                                    line_data = line.split('|')
                                    let output = {
                                        name: line_data[0],
                                        x: line_data[1],
                                        y: line_data[2],
                                        beaten: line_data[3],
                                        sprite_id: line_data[4],
                                        coin: line_data[5],
                                        item_id: line_data[6],
                                        item_count: line_data[7],
                                        flag_required: line_data[8],
                                        flag_given: line_data[9],
                                        remove_on_finish: line_data[10],
                                        pre_combat_dialogue: line_data[11],
                                        player_lost_dialogue: line_data[12],
                                        player_won_dialogue: line_data[13],
                                        team: [],
                                    };

                                    for (let i = 14; i < line_data.length; i++) {
                                        npc_team_data = line_data[i].split('`');
                                        ooch_data = db.monster_data.get(parseInt(npc_team_data[0]));
                                        output.team.push({
                                            id: parseInt(npc_team_data[0]),
                                            name: ooch_data.name,
                                            nickname: npc_team_data[1],
                                        });
                                    }

                                    npc_data.push(output);
                                break;
                                case 'spawns':
                                break;
                                case 'savepoints':
                                break;
                            }
                        }
                    }

                    interaction.editReply(`File has been read and data has been parsed. The map has been created.`);
                    msg.delete();
                } else {
                    msg.delete();
                }
            } catch (error) {
                console.log(error);
            }
        });
    },
};

