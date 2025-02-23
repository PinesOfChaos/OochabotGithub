const { SlashCommandBuilder } = require('discord.js');
const { genmap_layout } = require("../func_level_gen.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!'),
    async execute(interaction) {
        genmap_layout(64, 64, 3, 4, 10, .5);
        interaction.reply(`**Check Console Log!!**`);
    },
};
