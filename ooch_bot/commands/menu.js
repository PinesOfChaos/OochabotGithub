const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Pull up the menu.'),
    async execute(interaction) {
        let settings_row_1 = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton().setCustomId('party').setLabel('Oochamon').setStyle('SUCCESS'),
            ) .addComponents(
                new Discord.MessageButton().setCustomId('bag').setLabel('Bag').setStyle('DANGER').setEmoji('🎒'),
            );

        let settings_row_2 = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton().setCustomId('oochadex').setLabel('Oochadex').setStyle('PRIMARY'),
            ) .addComponents(
                new Discord.MessageButton().setCustomId('settings').setLabel('Settings').setStyle('SECONDARY').setEmoji('⚙️'),
            );
        
        let back_button = new Discord.MessageActionRow().addComponents(new Discord.MessageButton().setCustomId('back').setLabel('Back').setStyle('DANGER'));
        await interaction.reply({ content: '**Menu:**', components: [settings_row_1, settings_row_2], ephemeral: true });

        const filter = i => i.user.id == interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter });

        await collector.on('collect', async i => {
            let selected = i.customId;
            
            switch (selected) {
                case 'party': 
                    let party = new Discord.MessageActionRow();
                    let party_2 = new Discord.MessageActionRow();
                    let party_3 = new Discord.MessageActionRow();
                    let ooch_party = db.profile.get(interaction.user.id, 'ooch_party');
                    let pa_components = [party];
                    for (let i = 0; i < ooch_party.length; i++) {
                        ((i <= 1) ? party : ((i >= 4) ? party_3 : party_2)).addComponents(
                            new Discord.MessageButton()
                            .setCustomId(i.toString())
                            .setLabel(`Lv. ${ooch_party[i].level} ${ooch_party[i].name} (HP: ${ooch_party[i].current_hp}/${ooch_party[i].stats.hp})`)
                            .setStyle((ooch_party[i].alive) ? ((i == 0) ? 'SUCCESS' : 'SECONDARY') : 'DANGER')
                            .setEmoji(db.monster_data.get(ooch_party[i].id, 'emote'))
                        )
                    }
                    if (ooch_party.length > 2) pa_components.push(party_2);
                    if (ooch_party.length >= 5) pa_components.push(party_3);
                    pa_components.push(back_button);
                    
                    i.update({ content: `**Current Oochamon Party**`, components: pa_components })

                    const pa_collector = interaction.channel.createMessageComponentCollector({ filter, max: 1 });

                    await pa_collector.on('collect', async j => {
                        if (j.customId == 'back') {
                            pa_collector.stop();
                            j.update({ content: '**Menu:**', components: [settings_row_1, settings_row_2] })
                            return;
                        } 
                        let selected_ooch = ooch_party[parseInt(j.customId)]
                        let oochadex_info = db.monster_data.get(selected_ooch.id);
                        let moveset_str = '';

                        let dexEmbed = new Discord.MessageEmbed()
                        .setColor('#808080')
                        .setTitle(`${selected_ooch.name} (Type: ${_.capitalize(oochadex_info.type)})`)
                        .setThumbnail(oochadex_info.image)
                        .setDescription(`Ability: **${selected_ooch.ability}**`);
                        for (let move_id of selected_ooch.moveset) {
                            let move = db.move_data.get(move_id)
                            moveset_str += `**${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
                        }
                        dexEmbed.addField('Moveset', moveset_str, true)
                        dexEmbed.addField('Stats', `HP: **${selected_ooch.stats.hp}**\nATK: **${selected_ooch.stats.atk}**\nDEF: **${selected_ooch.stats.def}**\nSPD: **${selected_ooch.stats.spd}**`, true)
                        
                        j.update({ content: ' ', embeds: [dexEmbed], components: [back_button] });
                    });
                break;
            }
        });
    },
};