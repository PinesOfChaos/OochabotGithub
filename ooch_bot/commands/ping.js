const { SlashCommandBuilder } = require('discord.js');
const { setup_battle, generate_battle_user } = require("../func_battle_new");
const { PlayerState, TrainerType, Stats, Ability, OochType, TypeEmote, MoveTag, MoveTarget, BattleState, Weather } = require("../types");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!'),
    async execute(interaction) {
        let user1 = generate_battle_user( interaction.guild, interaction.channel, TrainerType.User, {user_id : '122568101995872256'})
        let user2 = generate_battle_user( interaction.guild, interaction.channel, TrainerType.User, {user_id : '145342159724347393'})
        setup_battle([
            [user1],
            [user2]
        ],
        Weather.Clear, 0, 0, false, false, false
        )

        interaction.reply('Testing Battle Teams!');
    },
};