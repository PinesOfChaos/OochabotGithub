const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { map_emote_string } = require('../func.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Begin playing Oochamon!'),
    async execute(interaction) {

        let target = interaction.user.id;
        
        //Get the player's location
        let player_location = db.profile.get(target, 'location_data');
        let biome = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;

        //Get the map array based on the player's current biome
        let map_obj = db.maps.get(biome.toLowerCase());
        let map_arr = map_obj[1]; //this should be the actual map array

        // Set player position data into the global multiplayer player position db
        db.player_positions.set(biome, { x: playerx, y: playery }, target);

        //Send reply displaying the player's location on the map
        interaction.reply({ content: `Made your playspace! Play with \`wasd\` to move around the world!`, ephemeral: true })
        interaction.channel.send(`${interaction.member.displayName}'s Playspace`)
        interaction.channel.send({ content: `${map_emote_string(biome.toLowerCase(), map_arr, playerx, playery)}` }).then(msg => {
            db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
        });
    },
};