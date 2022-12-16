const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const db = require('../db.js')
const _ = require('lodash');
const { type_emotes } = require('../func_battle.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oochadex')
        .setDescription('See Oochadex information about an ooch')
        .addStringOption(option => 
            option.setName('oochamon')
                .setDescription('Name of the oochamon you want to see a dex entry for.')
                .setAutocomplete(true)
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
        let oochadex_data = db.profile.get(interaction.user.id, `oochadex`)

        const dexEmbed = new Discord.MessageEmbed()
            .setColor('#808080')
            .setTitle(`${ooch_obj.name} ${type_emotes[ooch_obj.type.toUpperCase()]}`)
            .setThumbnail(ooch_obj.image)
            .setDescription(`*${ooch_obj.oochive_entry}*`)
            .addField('Stats', `HP: **${ooch_obj.hp}**\nATK: **${ooch_obj.atk}**\nDEF: **${ooch_obj.def}**\nSPD: **${ooch_obj.spd}**`)
            .addField('Abilities', ooch_obj.abilities.join(', '))
            if (ooch_obj.evo_id != -1 && oochadex_data[ooch_obj.evo_id].seen != 0) {
                dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_obj.evo_id, 'name')} at level ${ooch_obj.evo_lvl}`, iconURL: db.monster_data.get(ooch_obj.evo_id, 'image') });
            } else {
                dexEmbed.setFooter({ text: `Evolves into ??? at level ${ooch_obj.evo_lvl}`});
            }

            if (oochadex_data[ooch].caught != 0) {
                interaction.reply({ content: `**Seen:** ${oochadex_data[ooch].seen} | **Caught:** ${oochadex_data[ooch].caught}`,
                embeds: [dexEmbed] });
            } else {
                interaction.reply({ content: `**You have not caught ${oochadex_data[ooch].seen != 0 ? `a ${ooch_obj.name}` : `this Oochamon`} yet... Go out into the wild and find it!**`,
                embeds: [] });
            }
    },
};