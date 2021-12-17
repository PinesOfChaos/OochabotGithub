
const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Choose your starter')
        .addStringOption(option => 
            option.setName('creature')
                .setDescription('<:ifrmgkng:898658599574859816> <:moeyai:878650131757555732> <:happysun:910744988407713802>')
                .setRequired(true)
                .addChoices([['Sporbee','sporbee'],['Roock','roock'],['Puppyre','puppyre']])),
    async execute(interaction) {
        
        const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('sporbee')
                    .setLabel('Sporbee')
                    .setStyle('SPORBEE')
                    .setEmoji('<:ifrmgkng:898658599574859816>'),
            );

        await interaction.reply({content: 'Sporbee!', components: [row] });
        
        
    }
 }