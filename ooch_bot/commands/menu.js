const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { type_emotes } = require('../func_battle.js');
 
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
            // .addComponents(
            //     new Discord.MessageButton().setCustomId('back').setLabel('⬅️').setStyle('DANGER')
            // )
            .addComponents(
                new Discord.MessageButton().setCustomId('back_to_menu').setLabel('Back To Menu').setStyle('DANGER')
            );

        // Setup buttons for party menu so I only have to make it once
        let party_extra_buttons = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton().setCustomId('primary').setLabel('Set To Primary').setStyle('SUCCESS'),
            ).addComponents(
                new Discord.MessageButton().setCustomId('nickname').setLabel('Change Nickname').setStyle('PRIMARY'),
            ).addComponents(
                new Discord.MessageButton().setCustomId('moves').setLabel('Change Moves').setStyle('PRIMARY'),
            );

        let dmMsg;
        await interaction.reply({ content: 'Sent you a DM, go there to use the menu!', ephemeral: true });
        await interaction.user.send({ content: '**Menu:**', components: [settings_row_1, settings_row_2] }).then(msg => {
            dmMsg = msg;
        });

        let filter = i => i.user.id == interaction.user.id;
        const collector = await dmMsg.createMessageComponentCollector({ filter });
        let pa_collector, btn_collector, dex_collector; // Collectors for each sub menu's buttons
        let pa_extra_filter = (i => { return (i.user.id == interaction.user.id && ['primary', 'nickname', 'moves'].includes(i.customId)) })
        let pa_extra_collector, nick_msg_collector, moves_collector; // Extra sub menu collectors

        await collector.on('collect', async i => {
            let selected = i.customId;
            
            switch (selected) {
                case 'back':
                    i.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2] });
                    if (pa_collector != undefined) pa_collector.stop();
                    if (btn_collector != undefined) btn_collector.stop();
                    if (dex_collector != undefined) dex_collector.stop();
                    if (pa_extra_collector != undefined) pa_extra_collector.stop();
                break;
                case 'back_to_menu':
                    i.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2] });
                    if (pa_collector != undefined) pa_collector.stop();
                    if (btn_collector != undefined) btn_collector.stop();
                    if (dex_collector != undefined) dex_collector.stop();
                    if (pa_extra_collector != undefined) pa_extra_collector.stop();
                break;
                case 'party': 
                    let party = new Discord.MessageActionRow();
                    let party_2 = new Discord.MessageActionRow();
                    let party_3 = new Discord.MessageActionRow();
                    let ooch_party = db.profile.get(interaction.user.id, 'ooch_party');
                    let pa_components = [party];
                    for (let i = 0; i < ooch_party.length; i++) {
                        // If i is 0 or 1, add components to party`
                        // If i is 2 or 3, add components to party_2
                        // If i is 4 or 5, add components to party_3
                        // This is to make a 2x3 table of buttons, lol
                        ((i <= 1) ? party : ((i >= 4) ? party_3 : party_2)).addComponents(
                            new Discord.MessageButton()
                            .setCustomId(i.toString())
                            .setLabel(`Lv. ${ooch_party[i].level} ${ooch_party[i].nickname} (HP: ${ooch_party[i].current_hp}/${ooch_party[i].stats.hp})`)
                            .setStyle((ooch_party[i].alive) ? ((i == 0) ? 'SUCCESS' : 'SECONDARY') : 'DANGER')
                            .setEmoji(db.monster_data.get(ooch_party[i].id, 'emote'))
                        )
                    }

                    if (ooch_party.length > 2) pa_components.push(party_2);
                    if (ooch_party.length >= 5) pa_components.push(party_3);
                    pa_components.push(back_buttons);
                    
                    i.update({ content: `**Current Oochamon Party**`, components: pa_components })
                    pa_collector = await dmMsg.createMessageComponentCollector({ filter });

                    await pa_collector.on('collect', async j => {
                        if (isNaN(parseInt(j.customId))) return;
                        j.customId = parseInt(j.customId);
                        let selected_ooch = ooch_party[j.customId]
                        let oochadex_info = db.monster_data.get(selected_ooch.id);
                        let moveset_str = '';
                        let ooch_title = `${selected_ooch.nickname}`
                        selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${type_emotes[selected_ooch.type.toUpperCase()]}` : ooch_title += ` ${type_emotes[selected_ooch.type.toUpperCase()]}`;

                        // Reset the set to primary button pre-emptively so that it's ready to be used for this oochamon, unless it's already primary.
                        party_extra_buttons.components[0].setDisabled(j.customId == 0 ? true : false);

                        let dexEmbed = new Discord.MessageEmbed()
                        .setColor('#808080')
                        .setTitle(ooch_title)
                        .setThumbnail(oochadex_info.image)
                        .setDescription(`Ability: **${selected_ooch.ability}**\nType: ${_.capitalize(selected_ooch.type)}`);
                        for (let move_id of selected_ooch.moveset) {
                            let move = db.move_data.get(move_id)
                            moveset_str += `**${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
                        }
                        dexEmbed.addField('Moveset', moveset_str, true)
                        dexEmbed.addField('Stats', `HP: **${selected_ooch.stats.hp}**\nATK: **${selected_ooch.stats.atk}**\nDEF: **${selected_ooch.stats.def}**\nSPD: **${selected_ooch.stats.spd}**`, true)
                        
                        j.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                        pa_extra_collector = await dmMsg.createMessageComponentCollector({ pa_extra_filter });

                        pa_extra_collector.on('collect', async k => {
                            let sel = k.customId;
                            switch (sel) {
                                case 'primary':
                                    // j.customId is the oochamon's current position in the party
                                    // Swap the position of the selected ooch and the ooch in position 0.
                                    [ooch_party[0], ooch_party[j.customId]] = [ooch_party[j.customId], ooch_party[0]];
                                    db.profile.set(interaction.user.id, ooch_party, 'ooch_party');
                                    party_extra_buttons.components[0].setDisabled(true);
                                    k.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                                    i.followUp({ content: 'This Oochamon is now the primary member of your party, meaning they will be sent out first in a battle.', ephemeral: true })
                                break;
                                case 'nickname':
                                    k.update({ content: `Enter a nickname for your ${selected_ooch.name}! (Type reset to remove the nickname.)\nCurrent Nickname is: **${selected_ooch.nickname}**`, components: [], embeds: [] });
                                    nick_msg_collector = dmMsg.channel.createMessageCollector({ max: 1 });
                                    nick_msg_collector.on('collect', async msg => {
                                        let new_nick = (msg.content.toLowerCase() != 'reset' ? msg.content : selected_ooch.name);
                                        selected_ooch.nickname = new_nick;

                                        // Generate a new ooch title to place into our embed
                                        ooch_title = `${selected_ooch.nickname}`
                                        selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${type_emotes[selected_ooch.type.toUpperCase()]}` : ooch_title += ` ${type_emotes[selected_ooch.type.toUpperCase()]}`;
                                        dexEmbed.setTitle(ooch_title);

                                        db.profile.set(interaction.user.id, new_nick, `ooch_party[${j.customId}].nickname`);
                                        dmMsg.edit({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                                    });
                                break;
                                case 'moves':
                                break;
                            }
                        })

                    });
                break;
                case 'bag':
                    let heal_inv = db.profile.get(interaction.user.id, 'heal_inv')
                    let prism_inv = db.profile.get(interaction.user.id, 'prism_inv')
                    let key_inv = db.profile.get(interaction.user.id, 'other_inv')
                    let display_inv = heal_inv;
                    let item_list_str = '';
                    const bag_buttons = new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton()
                            .setCustomId('heal_button')
                            .setStyle('SUCCESS')
                            .setEmoji('<:item_potion_magic:1023031024726327426>'),
                    ).addComponents(
                        new Discord.MessageButton()
                            .setCustomId('prism_button')
                            .setStyle('SECONDARY')
                            .setEmoji('<:item_prism:1023031025716179076>'),
                    ).addComponents(
                        new Discord.MessageButton()
                            .setCustomId('key_button')
                            .setStyle('SECONDARY')
                            .setEmoji('🔑'),
                    )

                    // Setup default item list for the default value, healing
                    for (const [item_id, quantity] of Object.entries(display_inv)) {
                        let item_obj = db.item_data.get(item_id);
                        item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                    }

                    const bagEmbed = new Discord.MessageEmbed()
                        .setColor('#808080')
                        .setTitle('❤️ Healing Items')
                        .setDescription(item_list_str)
                    
                    if (Object.keys(heal_inv).length == 0) bag_buttons.components[0].disabled = true;
                    if (Object.keys(prism_inv).length == 0) bag_buttons.components[1].disabled = true;
                    if (Object.keys(key_inv).length == 0) bag_buttons.components[2].disabled = true;
                    if (Object.keys(heal_inv).length == 0 && Object.keys(prism_inv).length == 0 && Object.keys(key_inv).length == 0) {
                        i.update({ content: `**You have no items in your bag.**`, embeds: [], components: [back_buttons] })
                        return;
                    }

                    i.update({ content: `__**Item Bag**__`, embeds: [bagEmbed], components: [bag_buttons, back_buttons] });
                    let bag_filter = (i => { return (i.user.id == interaction.user.id && ['heal_button', 'prism_button', 'key_button'].includes(i.customId)) })

                    btn_collector = dmMsg.createMessageComponentCollector({ componentType: 'BUTTON', filter: bag_filter });

                    await btn_collector.on('collect', async i_sel => {
                        item_list_str = '';
                        switch (i_sel.customId) {
                            case 'heal_button':
                                bagEmbed.setTitle('❤️ Healing Items');
                                bag_buttons.components[0].setStyle('SUCCESS')
                                bag_buttons.components[1].setStyle('SECONDARY')
                                bag_buttons.components[2].setStyle('SECONDARY')
                                display_inv = heal_inv;
                            break;
                            case 'prism_button':
                                bagEmbed.setTitle('<:item_prism:1023031025716179076> Prisms')
                                bag_buttons.components[0].setStyle('SECONDARY')
                                bag_buttons.components[1].setStyle('SUCCESS')
                                bag_buttons.components[2].setStyle('SECONDARY')
                                display_inv = prism_inv;
                            break;
                            case 'key_button':
                                bagEmbed.setTitle('🔑 Key Items')
                                bag_buttons.components[0].setStyle('SECONDARY')
                                bag_buttons.components[1].setStyle('SECONDARY')
                                bag_buttons.components[2].setStyle('SUCCESS')
                                display_inv = key_inv;
                            break;
                        }

                        for (const [item_id, quantity] of Object.entries(display_inv)) {
                            let item_obj = db.item_data.get(item_id);
                            item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                        }

                        bagEmbed.setDescription(item_list_str);
                        i_sel.update({ content: `__**Item Bag**__`, embeds: [bagEmbed], components: [bag_buttons, back_buttons] });
                    });

                break;
                case 'oochadex':
                    let oochadex_sel_1 = new Discord.MessageActionRow();
                    let oochadex_sel_2 = new Discord.MessageActionRow();
                    let oochadex_sel_options_1 = [];
                    let oochadex_sel_options_2 = [];
                    let ooch_data = db.monster_data.get(0);
                    let oochadex_data = db.profile.get(interaction.user.id, 'oochadex');

                    for (let i = 0; i < db.monster_data.keyArray().length; i++) {
                        ooch_data = db.monster_data.get(i);
                        oochadex_check = db.profile.get(interaction.user.id, `oochadex[${i}]`);
                        if (i < 25) {
                            oochadex_sel_options_1.push({
                                label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                                description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
                                value: `${i}`,
                            })
                        } else {
                            oochadex_sel_options_2.push({
                                label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                                description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
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
                            .setPlaceholder(`Oochadex #26-#${db.monster_data.keyArray().length}`)
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
                        if (ooch_data.evo_id != -1 && oochadex_data[ooch_data.evo_id].seen != 0) {
                            dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_data.evo_id, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });
                        } else {
                            dexEmbed.setFooter({ text: `Evolves into ??? at level ${ooch_data.evo_lvl}` });
                        }

                    if (oochadex_data[0].caught != 0) {
                        i.update({ content: `**Seen:** ${oochadex_data[0].seen} | **Caught:** ${oochadex_data[0].caught}`,
                        embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2, back_buttons] });
                    } else {
                        i.update({ content: `**You have not encountered ${oochadex_data[0].seen != 0 ? `a ${ooch_data.name}` : `this Oochamon`} yet... Go out into the wild and find it!**`,
                        embeds: [], components: [oochadex_sel_1, oochadex_sel_2, back_buttons] });
                    }

                    filter = i => i.user.id == interaction.user.id;
                    dex_collector = await dmMsg.createMessageComponentCollector({  filter, componentType: 'SELECT_MENU' });

                    await dex_collector.on('collect', async sel => {
                        ooch_data = db.monster_data.get(parseInt(sel.values[0]));
                        const dexEmbed = new Discord.MessageEmbed()
                            .setColor('#808080')
                            .setTitle(`${ooch_data.name} (Type: ${_.capitalize(ooch_data.type)})`)
                            .setThumbnail(ooch_data.image)
                            .setDescription(`*${ooch_data.oochive_entry}*`)
                            .addField('Stats', `HP: **${ooch_data.hp}**\nATK: **${ooch_data.atk}**\nDEF: **${ooch_data.def}**\nSPD: **${ooch_data.spd}**`)
                            .addField('Abilities', ooch_data.abilities.join(', '))
                            if (ooch_data.evo_id != -1 && oochadex_data[ooch_data.evo_id].seen != 0) {
                                dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_data.evo_id, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });
                            } else {
                                dexEmbed.setFooter({ text: `Evolves into ??? at level ${ooch_data.evo_lvl}` });
                            }

                        if (oochadex_data[sel.values[0]].caught != 0) {
                            sel.update({ content: `**Seen:** ${oochadex_data[sel.values[0]].seen} | **Caught:** ${oochadex_data[sel.values[0]].caught}`,
                            embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2, back_buttons] });
                        } else {
                            sel.update({ content: `**You have not encountered ${oochadex_data[sel.values[0]].seen != 0 ? `a ${ooch_data.name}` : `this Oochamon`} yet... Go out into the wild and find it!**`,
                            embeds: [], components: [oochadex_sel_1, oochadex_sel_2, back_buttons] });
                        }
                    });

                break;
                case 'settings':
                break;
            }
        });
    },
};