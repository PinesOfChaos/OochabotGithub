const { SlashCommandBuilder } = require('discord.js');
const { setup_battle, generate_battle_user } = require("../func_battle");
const { PlayerState, TrainerType, Stats, Ability, OochType, TypeEmote, MoveTag, MoveTarget, BattleState, Weather } = require("../types");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!'),
    async execute(interaction) {
        let test = {
            funny : 1
        }
        test_increment(test);
        interaction.reply(`Funny equals **${test.funny}**`);
    },
};

function test_increment(struct){
    struct.funny += 1;
}