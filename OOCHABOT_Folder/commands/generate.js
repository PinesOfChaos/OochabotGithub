const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const { create_monster } = require('../func');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generates the monsters data in the game'),
    async execute(interaction) {

        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
            return interaction.reply('This command isn\'t for you!')
        }

        // Sporbee
        create_monster('0', '<:sporbee:921141752029646938>', 'Sporbee',
        'A force of nature too powerful to control', 'fungal', 10, 10, 10, 10,
        [ [0, 'Bash'] ], [ 'Icky', 'Bad' ],  1, 16)

        // Roocky
        create_monster('3', '<:roocky:921156272512974868>', 'Roocky', 
        'A strategic master.', 'stone', 10, 10, 10, 10, 
        [ [0, 'Bash'] ], [ 'Sturdy' ], 4, 16)

        // Puppyre
        create_monster('6', '<:puppyre:921176686102454282>', 'Puppyre',
        'A good doggo', 'flame', 10, 10, 10, 10,
        [ [0, 'Bash'] ], [ 'Flame Body', 'Blaze' ], 7, 16)

        interaction.reply('Generated monster data.');
    },
};

