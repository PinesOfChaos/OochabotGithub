const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('read_map_data')
        .setDescription('Read and format map data'),
    async execute(interaction) {
        await interaction.deferReply();
        interaction.editReply('Please post the .txt file from the Oochamon Map Editor:tm:')

        file_collector = interaction.channel.createMessageCollector({ max: 1, time: 120000 });
        file_collector.on('collect', async msg => {
            const file = msg.attachments.first()?.url;
            if (!file) return console.log('No attached file found');
    
            try {
                // fetch the file from the external URL
                const response = await fetch(file);
    
                // if there was an error send a message with the status
                if (!response.ok)
                return interaction.editReply(
                    'There was an error with fetching the file:',
                    response.statusText,
                );
    
                // take the response stream and read it to completion
                const text = await response.text();
    
                if (text) {
                    let map_obj, map_name, map_spawn_list, map_trainer_data, map_trainer_loc_list, map_chest_data, map_chest_loc_list, map_data;
                    
                    map_obj = text.split('|');
                    map_name = map_obj[0];
                    map_spawn_list = map_obj[1].split(',');
                    map_trainer_data = map_obj[2].split('#');
                    map_trainer_loc_list = map_obj[3].split(' ');
                    map_chest_data = map_obj[4].split('#');
                    map_chest_loc_list = map_obj[5].split(' ');
                    map_data = map_obj[6].split(' ');

                    map_spawn_list = map_spawn_list.map(v => v = parseInt(v));

                    map_trainer_data = map_trainer_data.map(v => v.split(','));
                    for (let v of map_trainer_data) {
                        v[0] = parseInt(v[0]);
                        v[4] = v[4].split(';');
                        v[4] = v[4].map(val => val = parseInt(val));
                        v[5] = parseInt(v[5]);
                    };

                    map_trainer_loc_list = map_trainer_loc_list.map(v => v.split(','));
                    for (let i = 0; i < map_trainer_loc_list.length; i++) {
                        map_trainer_loc_list[i] = map_trainer_loc_list[i].map(val => val = parseInt(val));
                    };

                    map_chest_data = map_chest_data.map(v => v.split(','));
                    for (let v of map_chest_data) {
                        v[0] = parseInt(v[0]);
                        v[2] = v[2].split(';');
                        v[2] = v[2].map(val => val = parseInt(val));
                    };

                    map_chest_loc_list = map_chest_loc_list.map(v => v.split(','));
                    for (let i = 0; i < map_chest_loc_list.length; i++) {
                        map_chest_loc_list[i] = map_chest_loc_list[i].map(val => val = parseInt(val));
                    };

                    map_data = map_data.map(v => v = v.split(','));

                    map_obj = {
                        name: map_name,
                        spawn_list: map_spawn_list,
                        trainer_list: map_trainer_data,
                        trainer_loc_list: map_trainer_loc_list,
                        chest_list: map_chest_data,
                        chest_loc_list: map_chest_loc_list,
                        map: map_data
                    }

                    console.log(map_obj);
                    db.maps.set(map_name, map_obj);

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

