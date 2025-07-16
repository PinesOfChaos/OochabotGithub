const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()

    .setName('move_player')
    .setDescription('[DEV] Moves a user to a location.')
    .addUserOption(option => 
            option.setName('move_user')
                .setDescription('The user to move.')
                .setRequired(true))
    .addStringOption(option => 
            option.setName('move_map')
                .setDescription('Map to move to.')
                .setRequired(true))
    .addIntegerOption(option => 
            option.setName('move_x')
                .setDescription('X position to move to.')
                .setRequired(true))
    .addIntegerOption(option => 
            option.setName('move_y')
                .setDescription('Y position to move to.')
                .setRequired(true))
    .addIntegerOption(option => 
            option.setName('set_checkpoint')
                .setDescription('Make this the user\'s checkpoint?')
                .setRequired(true)),
    async execute(interaction) {
        if (interaction.user.id != "145342159724347393" && interaction.user.id != "122568101995872256") return interaction.reply({ content: 'You can\'t use this!', ephemeral: true });
        
        let move_user = interaction.options.getUser('move_user');
        let move_map = interaction.options.getString('move_map');
        let move_x = interaction.options.getNumber('move_x');
        let move_y = interaction.options.getNumber('move_y');
        let set_checkpoint = interaction.options.getNumber('set_checkpoint');

        db.profile.set(move_user, {area : move_map, x : move_x, y : move_y}, 'location_data')
        let string_to_send = `Moved user ${move_user} to ${move_map} [x : ${move_x}, y : ${move_y}].`;

        if(set_checkpoint > 0){
            db.profile.set(move_user, {area : move_map, x : move_x, y : move_y}, 'checkpoint_data')
            string_to_send += ` Also set their Checkpoint to this location.`
        }

        
        interaction.reply({ content: string_to_send, ephemeral: false });
    },
};