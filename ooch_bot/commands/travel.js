const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { map_emote_string } = require('../func_play.js');

module.exports = {
    data: new SlashCommandBuilder()

    .setName('travel')
    .setDescription('Travel between biomes.')
    .addStringOption(option => 
            option.setName('biome')
                .setDescription('Where will we be going today?')
                .setRequired(true)
                .addChoices(
                    { name: 'Testmap 1', value: 'testmap' },
                    { name: 'Testmap 2', value: 'testmap2' },
                )),
    async execute(interaction) {
        let biome_to = interaction.options.getString('biome');
        let target = interaction.user.id;

        let map_obj = db.maps.get(biome_to);
        let map_arr = map_obj.tiles;
        let center = Math.floor((map_arr.length)/2);
        let player_location = db.profile.get(target, 'location_data');
        let biome_from =  player_location.area;

        //remove the player's info from the old biome and add it to the new one
        db.player_positions.set(biome_to, { x: center, y: center }, target);
        db.player_positions.delete(biome_from, target);
        db.profile.set(target, { area: biome_to, x: center, y: center }, 'location_data')

        let msg_to_edit = db.profile.get(target, 'display_msg_id');
        (interaction.channel.messages.fetch(msg_to_edit)).then((msg) => {
            msg.edit({ content: map_emote_string(biome_to, map_arr, center, center, target) });
        });

        interaction.reply({ content: `Successfully traveled to ${biome_to}!`, ephemeral: true });
    },
};