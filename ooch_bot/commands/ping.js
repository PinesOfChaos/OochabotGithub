const { SlashCommandBuilder } = require('discord.js');
const { setup_battle, generate_battle_user } = require("../func_battle");
const { PlayerState, TrainerType, Stats, Ability, OochType, TypeEmote, MoveTag, MoveTarget, BattleState, Weather } = require("../types");
const { genmap_layout } = require("../func_level_gen.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!'),
    async execute(interaction) {
        genmap_layout(48, 48, 3, 4, 10, .5);
        interaction.reply(`**Check Console Log!!**`);
    },
};
