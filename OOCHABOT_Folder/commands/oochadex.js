const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const path = require('path')
const db = require('../db.js')
const { capitalize } = require('../func.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oochadex')
        .setDescription('See Oochadex information about an ooch')
        .addStringOption(option => 
            option.setName('oochamon')
                .setDescription('Name of the oochamon you want to see a dex entry for.')
                .setRequired(true)),
    async execute(interaction) {
        let ooch = interaction.options.getString('oochamon').toLowerCase();
        let ooch_data = db.monster_data.keyArray();

        for (let i = 0; i < ooch_data.length; i++) {
            if (db.monster_data.get(ooch_data[i]).name.toLowerCase() == ooch) {
                ooch = i; break;
            }
        }
        
        if (!Number.isInteger(ooch)) return interaction.reply(`${ooch} is not a valid Oochamon!`)

        let ooch_obj = db.monster_data.get(ooch);
        let ooch_evo_id = ooch_obj.evo_id
        let ooch_evo_lvl = ooch_obj.evo_lvl

        const dexEmbed = new Discord.MessageEmbed()
            .setColor('#808080')
            .setTitle(`${ooch_obj.name} (Type: ${capitalize(ooch_obj.type)})`)
            .setThumbnail(ooch_obj.image)
            .setDescription(`*${ooch_obj.oochive_entry}*`)
            .addField('Stats', `HP: **${ooch_obj.hp}**\nATK: **${ooch_obj.atk}**\nDEF: **${ooch_obj.def}**\nSPD: **${ooch_obj.spd}**`)
            .addField('Abilities', ooch_obj.abilities.join(', '))
            if (ooch_evo_id != -1) dexEmbed.setFooter(`Evolves into ${db.monster_data.get(ooch_evo_id, 'name')} at level ${ooch_evo_lvl}`, db.monster_data.get(ooch_evo_id, 'image'));
        interaction.reply({ embeds: [dexEmbed] });
    },
};