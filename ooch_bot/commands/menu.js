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
        
        let back_buttons = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton().setCustomId('back').setLabel('⬅️').setStyle('DANGER')
            )
            .addComponents(
                new Discord.MessageButton().setCustomId('back_to_menu').setLabel('Back To Menu').setStyle('DANGER')
            );

        let dmMsg;
        await interaction.reply({ content: 'Sent you a DM, go there to use the menu!', ephemeral: true });
        await interaction.user.send({ content: '**Menu:**', components: [settings_row_1, settings_row_2] }).then(msg => {
            dmMsg = msg;
        });

        let filter = i => i.user.id == interaction.user.id;
        const collector = await dmMsg.createMessageComponentCollector({ filter });

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
                    pa_components.push(back_buttons);
                    
                    i.update({ content: `**Current Oochamon Party**`, components: pa_components })
                    filter = i => i.user.id == interaction.user.id;
                    const pa_collector = await dmMsg.createMessageComponentCollector({ filter });

                    await pa_collector.on('collect', async j => {
                        if (j.customId.includes('back')) {
                            if (j.customId == 'back_to_menu') {
                                j.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2] });
                                pa_collector.stop();
                                return;
                            } else {
                                j.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2] });
                                pa_collector.stop();
                                return;
                            }
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
                        
                        j.update({ content: ' ', embeds: [dexEmbed], components: [back_buttons] });
                    });
                break;
                case 'bag':
                    // Pass
                break;
                case 'oochadex':
                    let oochadex_sel_1 = new Discord.MessageActionRow();
                    let oochadex_sel_2 = new Discord.MessageActionRow();
                    let oochadex_sel_options_1 = [];
                    let oochadex_sel_options_2 = [];
                    let ooch_data = db.monster_data.get(0);

                    for (let i = 0; i < db.monster_data.keyArray().length; i++) {
                        ooch_data = db.monster_data.get(i);
                        if (i < 25) {
                            oochadex_sel_options_1.push({
                                label: `#${i + 1}: ${ooch_data.name}`,
                                description: `Seen: 0 | Caught: 0`,
                                value: `${i}`,
                            })
                        } else {
                            oochadex_sel_options_2.push({
                                label: `#${i + 1}: ${ooch_data.name}`,
                                description: `Seen: 0 | Caught: 0`,
                                value: `${i}`,
                            })
                        }
                    }

                    oochadex_sel_1.addComponents(
                        new Discord.MessageSelectMenu()
                            .setCustomId('oochadex_sel_1')
                            .setPlaceholder('Oochadex #1-#25')
                            .addOptions(oochadex_sel_options_1),
                    );

                    oochadex_sel_2.addComponents(
                        new Discord.MessageSelectMenu()
                            .setCustomId('oochadex_sel_2')
                            .setPlaceholder(`Oochadex #25-#${db.monster_data.keyArray().length}`)
                            .addOptions(oochadex_sel_options_2),
                    );

                    ooch_data = db.monster_data.get(0);
                    const dexEmbed = new Discord.MessageEmbed()
                        .setColor('#808080')
                        .setTitle(`${ooch_data.name} (Type: ${_.capitalize(ooch_data.type)})`)
                        .setThumbnail(ooch_data.image)
                        .setDescription(`*${ooch_data.oochive_entry}*`)
                        .addField('Stats', `HP: **${ooch_data.hp}**\nATK: **${ooch_data.atk}**\nDEF: **${ooch_data.def}**\nSPD: **${ooch_data.spd}**`)
                        .addField('Abilities', ooch_data.abilities.join(', '))
                        if (ooch_data.evo_id != -1) dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_data.evo_id, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });

                    i.update({ content: null, embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2] });
                    filter = i => i.user.id == interaction.user.id;
                    let dex_collector = await dmMsg.createMessageComponentCollector({ filter });

                    await dex_collector.on('collect', async sel => {
                        ooch_data = db.monster_data.get(parseInt(sel.values[0]));
                        const dexEmbed = new Discord.MessageEmbed()
                            .setColor('#808080')
                            .setTitle(`${ooch_data.name} (Type: ${_.capitalize(ooch_data.type)})`)
                            .setThumbnail(ooch_data.image)
                            .setDescription(`*${ooch_data.oochive_entry}*`)
                            .addField('Stats', `HP: **${ooch_data.hp}**\nATK: **${ooch_data.atk}**\nDEF: **${ooch_data.def}**\nSPD: **${ooch_data.spd}**`)
                            .addField('Abilities', ooch_data.abilities.join(', '))
                            if (ooch_data.evo_id != -1) dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_data.evo_id, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });

                        sel.update({ content: null, embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2] });
                    });

                break;
                case 'settings':

                break;
            }
        });
    },
};