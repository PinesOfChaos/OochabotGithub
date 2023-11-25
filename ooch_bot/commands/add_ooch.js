const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { get_stats } = require('../func_battle.js');
const _ = require('lodash');
const { create_ooch } = require('../func_play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_ooch')
        .setDescription('Add an oochamon to your party!')
        .addStringOption(option => 
            option.setName('oochamon')
                .setDescription('ID of ooch')
                .setAutocomplete(true)
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('lv')
                .setDescription('Level of ooch')
                .setRequired(false)),
    async execute(interaction) {

        if (interaction.user.id != 145342159724347393 && interaction.user.id != 122568101995872256) return interaction.reply({ content: 'You can\'t use this!', ephemeral: true });
        let ooch_id = interaction.options.getString('oochamon');
        if (isNaN(ooch_id)) return interaction.reply('You must input an oochamon ID here.');
        ooch_id = parseInt(ooch_id);
        let level = interaction.options.getInteger('lv');
        if (level == null) level = 5;

        let ooch = create_ooch(ooch_id, level);

        let dest;
        if (db.profile.get(interaction.user.id, 'ooch_party').length == 4) {
            dest = 'ooch_pc';
        } else {
            dest = 'ooch_party';
        }

        db.profile.push(interaction.user.id, ooch, dest)
        
        return interaction.reply(`Added **${ooch_id}**: ${db.monster_data.get(ooch_id, 'emote')} **${db.monster_data.get(ooch_id, 'name')}** (level ${level}) to ${dest == 'ooch_party' ? 'your party!' : 'the Oochabox!'}`)
    },
};

