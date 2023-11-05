const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()

    .setName('change_ability')
    .setDescription('Ability tester.')
    .addStringOption(option => 
            option.setName('ability')
                .setDescription('Ability to change to')
                .setAutocomplete(true)
                .setRequired(true)),
    async execute(interaction) {
        
        let ability = interaction.options.getString('ability');
        ability = parseInt(ability);
        let party = db.profile.get(interaction.user.id, 'ooch_party');
        let active_slot = parseInt(db.profile.get(interaction.user.id, 'ooch_active_slot'));
        party[active_slot].ability = ability;
        party[active_slot].og_ability = ability;
        db.profile.set(interaction.user.id, party, 'ooch_party');

        interaction.reply({ content: `Changed ability to ${db.ability_data.get(ability, 'name')}!`, ephemeral: false });
    },
};