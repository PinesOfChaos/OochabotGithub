const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { map_emote_string, setup_playspace_str } = require('../func_play');
const { PlayerState, TypeEmote } = require('../types.js');
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Pull up the menu.'),
    async execute(interaction) {

        if (db.profile.get(interaction.user.id, 'player_state') == PlayerState.Playspace 
        && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
            return interaction.reply({ content: 'You can\'t pull up the menu here.', ephemeral: true });
        } 

        // Delete the current playspace
        let playspace_msg = await interaction.channel.messages.fetch(db.profile.get(interaction.user.id, 'display_msg_id'));
        await playspace_msg.delete();

        let settings_row_1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('party').setLabel('Oochamon').setStyle(ButtonStyle.Success).setEmoji('<:item_prism:1023031025716179076>'),
            ).addComponents(
                new ButtonBuilder().setCustomId('bag').setLabel('Oochabag').setStyle(ButtonStyle.Danger).setEmoji('🎒'),
            )

        let settings_row_2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('oochadex').setLabel('Oochadex').setStyle(ButtonStyle.Primary).setEmoji('📱'),
            ).addComponents(
                new ButtonBuilder().setCustomId('box').setLabel('Oochabox').setStyle(ButtonStyle.Secondary).setEmoji('📦').setDisabled(true),
            );

        let settings_row_3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('settings').setLabel('Preferences').setStyle(ButtonStyle.Secondary).setEmoji('⚙️').setDisabled(true),
            ).addComponents(
                new ButtonBuilder().setCustomId('quit').setLabel('Return').setStyle(ButtonStyle.Danger).setEmoji('🔙'),
            );
        
        let back_buttons = new ActionRowBuilder()
            // .addComponents(
            //     new ButtonBuilder().setCustomId('back').setLabel('⬅️').setStyle(ButtonStyle.Danger)
            // )
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back To Menu').setStyle(ButtonStyle.Danger)
            );

        // Setup buttons for party menu so I only have to make it once
        let party_extra_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('primary').setLabel('Set To Primary').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('nickname').setLabel('Change Nickname').setStyle(ButtonStyle.Primary),
            ).addComponents(
                new ButtonBuilder().setCustomId('moves').setLabel('Change Moves').setStyle(ButtonStyle.Primary).setDisabled(true),
            );

        let menuMsg;
        await interaction.reply({ content: '**Menu:**', components: [settings_row_1, settings_row_2, settings_row_3] });
        await interaction.fetchReply().then(msg => {
            menuMsg = msg;
        });

        let filter = i => i.user.id == interaction.user.id;
        const collector = await menuMsg.createMessageComponentCollector({ filter });
        let pa_collector, btn_collector, dex_collector; // Collectors for each sub menu's buttons
        let pa_extra_filter = (i => { return (i.user.id == interaction.user.id && [ButtonStyle.Primary, 'nickname', 'moves'].includes(i.customId)) })
        let pa_extra_collector, nick_msg_collector, moves_collector; // Extra sub menu collectors

        await collector.on('collect', async i => {
            let selected = i.customId;
            
            switch (selected) {
                case 'back':
                    i.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2, settings_row_3] });
                    if (pa_collector != undefined) pa_collector.stop();
                    if (btn_collector != undefined) btn_collector.stop();
                    if (dex_collector != undefined) dex_collector.stop();
                    if (pa_extra_collector != undefined) pa_extra_collector.stop();
                break;
                case 'back_to_menu':
                    i.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2, settings_row_3] });
                    if (pa_collector != undefined) pa_collector.stop();
                    if (btn_collector != undefined) btn_collector.stop();
                    if (dex_collector != undefined) dex_collector.stop();
                    if (pa_extra_collector != undefined) pa_extra_collector.stop();
                break;
                case 'party': 
                    let party = new ActionRowBuilder();
                    let party_2 = new ActionRowBuilder();
                    let party_3 = new ActionRowBuilder();
                    let ooch_party = db.profile.get(interaction.user.id, 'ooch_party');
                    let pa_components = [party];
                    for (let i = 0; i < ooch_party.length; i++) {
                        // If i is 0 or 1, add components to party`
                        // If i is 2 or 3, add components to party_2
                        // If i is 4 or 5, add components to party_3
                        // This is to make a 2x3 table of buttons, lol
                        ((i <= 1) ? party : ((i >= 4) ? party_3 : party_2)).addComponents(
                            new ButtonBuilder()
                            .setCustomId(i.toString())
                            .setLabel(`Lv. ${ooch_party[i].level} ${ooch_party[i].nickname} (HP: ${ooch_party[i].current_hp}/${ooch_party[i].stats.hp})`)
                            .setStyle((ooch_party[i].alive) ? ((i == 0) ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Danger)
                            .setEmoji(db.monster_data.get(ooch_party[i].id, 'emote'))
                        )
                    }

                    if (ooch_party.length > 2) pa_components.push(party_2);
                    if (ooch_party.length >= 5) pa_components.push(party_3);
                    pa_components.push(back_buttons);
                    
                    i.update({ content: `**Current Oochamon Party**`, components: pa_components })
                    pa_collector = await menuMsg.createMessageComponentCollector({ filter });

                    await pa_collector.on('collect', async j => {
                        if (isNaN(parseInt(j.customId))) return;
                        j.customId = parseInt(j.customId);
                        let selected_ooch = ooch_party[j.customId]
                        let oochadex_info = db.monster_data.get(selected_ooch.id);
                        let moveset_str = '';
                        let ooch_title = `${selected_ooch.nickname}`
                        selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${TypeEmote[_.capitalize(selected_ooch.type)]}` : ooch_title += ` ${TypeEmote[_.capitalize(selected_ooch.type)]}`;

                        // Reset the set to primary button pre-emptively so that it's ready to be used for this oochamon, unless it's already primary.
                        party_extra_buttons.components[0].setDisabled(j.customId == 0 ? true : false);

                        let dexEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle(ooch_title)
                        .setThumbnail(oochadex_info.image)
                        .setDescription(`Ability: **${selected_ooch.ability}**\nType: ${_.capitalize(selected_ooch.type)}`);
                        for (let move_id of selected_ooch.moveset) {
                            let move = db.move_data.get(move_id)
                            moveset_str += `**${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
                        }
                        dexEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
                        dexEmbed.addFields([{ name: 'Stats', value: `HP: **${selected_ooch.stats.hp}**\nATK: **${selected_ooch.stats.atk}**\nDEF: **${selected_ooch.stats.def}**\nSPD: **${selected_ooch.stats.spd}**`, inline: true }]);
                        
                        j.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                        pa_extra_collector = await menuMsg.createMessageComponentCollector({ pa_extra_filter });

                        pa_extra_collector.on('collect', async k => {
                            let sel = k.customId;
                            switch (sel) {
                                case ButtonStyle.Primary:
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
                                    nick_msg_collector = menuMsg.channel.createMessageCollector({ max: 1 });
                                    nick_msg_collector.on('collect', async msg => {
                                        let new_nick = (msg.content.toLowerCase() != 'reset' ? msg.content : selected_ooch.name);
                                        selected_ooch.nickname = new_nick;

                                        // Generate a new ooch title to place into our embed
                                        ooch_title = `${selected_ooch.nickname}`
                                        selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${TypeEmote[_.capitalize(selected_ooch.type)]}` : ooch_title += ` ${TypeEmote[_.capitalize(selected_ooch.type)]}`;
                                        dexEmbed.setTitle(ooch_title);

                                        db.profile.set(interaction.user.id, new_nick, `ooch_party[${j.customId}].nickname`);
                                        menuMsg.edit({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                                        msg.delete();
                                    });
                                break;
                                case 'moves':
                                    k.update({ content: null })
                                    j.followUp({ content: `The move switching menu has not been setup yet.`, ephemeral: true });
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
                    const bag_buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('heal_button')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('<:item_potion_magic:1023031024726327426>'),
                    ).addComponents(
                        new ButtonBuilder()
                            .setCustomId('prism_button')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('<:item_prism:1023031025716179076>'),
                    ).addComponents(
                        new ButtonBuilder()
                            .setCustomId('key_button')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔑'),
                    )

                    // Setup default item list for the default value, healing
                    for (const [item_id, quantity] of Object.entries(display_inv)) {
                        let item_obj = db.item_data.get(item_id);
                        item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                    }
                    
                    if (Object.keys(heal_inv).length == 0) bag_buttons.components[0].disabled = true;
                    if (Object.keys(prism_inv).length == 0) bag_buttons.components[1].disabled = true;
                    if (Object.keys(key_inv).length == 0) bag_buttons.components[2].disabled = true;
                    if (Object.keys(heal_inv).length == 0 && Object.keys(prism_inv).length == 0 && Object.keys(key_inv).length == 0) {
                        i.update({ content: `**You have no items in your bag.**`, embeds: [], components: [back_buttons] })
                        return;
                    }

                    const bagEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('❤️ Healing Items')
                        .setDescription(item_list_str)

                    i.update({ content: `__**Item Bag**__`, embeds: [bagEmbed], components: [bag_buttons, back_buttons] });
                    let bag_filter = (i => { return (i.user.id == interaction.user.id && ['heal_button', 'prism_button', 'key_button'].includes(i.customId)) })

                    btn_collector = menuMsg.createMessageComponentCollector({ componentType: 'BUTTON', filter: bag_filter });

                    await btn_collector.on('collect', async i_sel => {
                        item_list_str = '';
                        switch (i_sel.customId) {
                            case 'heal_button':
                                bagEmbed.setTitle('❤️ Healing Items');
                                bag_buttons.components[0].setStyle(ButtonStyle.Success)
                                bag_buttons.components[1].setStyle(ButtonStyle.Secondary)
                                bag_buttons.components[2].setStyle(ButtonStyle.Secondary)
                                display_inv = heal_inv;
                            break;
                            case 'prism_button':
                                bagEmbed.setTitle('<:item_prism:1023031025716179076> Prisms')
                                bag_buttons.components[0].setStyle(ButtonStyle.Secondary)
                                bag_buttons.components[1].setStyle(ButtonStyle.Success)
                                bag_buttons.components[2].setStyle(ButtonStyle.Secondary)
                                display_inv = prism_inv;
                            break;
                            case 'key_button':
                                bagEmbed.setTitle('🔑 Key Items')
                                bag_buttons.components[0].setStyle(ButtonStyle.Secondary)
                                bag_buttons.components[1].setStyle(ButtonStyle.Secondary)
                                bag_buttons.components[2].setStyle(ButtonStyle.Success)
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
                    let oochadex_sel_1 = new ActionRowBuilder();
                    let oochadex_sel_2 = new ActionRowBuilder();
                    let oochadex_sel_3 = new ActionRowBuilder();
                    let oochadex_sel_options_1 = [];
                    let oochadex_sel_options_2 = [];
                    let oochadex_sel_options_3 = [];
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
                        } else if (i >= 25 && i < 50) {
                            oochadex_sel_options_2.push({
                                label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                                description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
                                value: `${i}`,
                            })
                        } else {
                            oochadex_sel_options_3.push({
                                label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                                description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
                                value: `${i}`,
                            })
                        }
                    }

                    oochadex_sel_1.addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('oochadex_sel_1')
                            .setPlaceholder('Oochadex #1-#25')
                            .addOptions(oochadex_sel_options_1),
                    );

                    oochadex_sel_2.addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('oochadex_sel_2')
                            .setPlaceholder(`Oochadex #26-#50`)
                            .addOptions(oochadex_sel_options_2),
                    );

                    oochadex_sel_3.addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('oochadex_sel_3')
                            .setPlaceholder(`Oochadex #51-#${db.monster_data.keyArray().length}`)
                            .addOptions(oochadex_sel_options_3),
                    );

                    ooch_data = db.monster_data.get(0);
                    const dexEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle(`${ooch_data.name} (Type: ${_.capitalize(ooch_data.type)})`)
                        .setThumbnail(ooch_data.image)
                        .setDescription(`*${ooch_data.oochive_entry}*`)
                        .addFields([{ name: 'Stats', value: `HP: **${ooch_data.hp}**\nATK: **${ooch_data.atk}**\nDEF: **${ooch_data.def}**\nSPD: **${ooch_data.spd}**` }])
                        .addFields([{ name: 'Abilities', value: ooch_data.abilities.join(', ') }]);
                        if (ooch_data.evo_id != -1 && oochadex_data[ooch_data.evo_id].seen != 0) {
                            dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_data.evo_id, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });
                        } else {
                            dexEmbed.setFooter({ text: `Evolves into ??? at level ${ooch_data.evo_lvl}` });
                        }

                    if (oochadex_data[0].caught != 0) {
                        i.update({ content: `**Seen:** ${oochadex_data[0].seen} | **Caught:** ${oochadex_data[0].caught}`,
                        embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_buttons] });
                    } else {
                        i.update({ content: `**You have not encountered ${oochadex_data[0].seen != 0 ? `a ${ooch_data.name}` : `this Oochamon`} yet... Go out into the wild and find it!**`,
                        embeds: [], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_buttons] });
                    }

                    filter = i => i.user.id == interaction.user.id;
                    dex_collector = await menuMsg.createMessageComponentCollector({  filter, componentType: ComponentType.StringSelect });

                    await dex_collector.on('collect', async sel => { 
                        ooch_data = db.monster_data.get(parseInt(sel.values[0]));
                        const dexEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle(`${ooch_data.name} (Type: ${_.capitalize(ooch_data.type)})`)
                            .setThumbnail(ooch_data.image)
                            .setDescription(`*${ooch_data.oochive_entry}*`)
                            .addFields([{ name: 'Stats', value: `HP: **${ooch_data.hp}**\nATK: **${ooch_data.atk}**\nDEF: **${ooch_data.def}**\nSPD: **${ooch_data.spd}**` }])
                            .addFields([{ name: 'Abilities', value: ooch_data.abilities.join(', ') }]);
                            if (ooch_data.evo_id != -1 && oochadex_data[ooch_data.evo_id].seen != 0) {
                                dexEmbed.setFooter({ text: `Evolves into ${db.monster_data.get(ooch_data.evo_id, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });
                            } else {
                                dexEmbed.setFooter({ text: `Evolves into ??? at level ${ooch_data.evo_lvl}` });
                            }

                        if (oochadex_data[sel.values[0]].caught != 0) {
                            sel.update({ content: `**Seen:** ${oochadex_data[sel.values[0]].seen} | **Caught:** ${oochadex_data[sel.values[0]].caught}`,
                            embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_buttons] });
                        } else {
                            sel.update({ content: `**You have not encountered ${oochadex_data[sel.values[0]].seen != 0 ? `a ${ooch_data.name}` : `this Oochamon`} yet... Go out into the wild and find it!**`,
                            embeds: [], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_buttons] });
                        }
                    });

                break;
                case 'box':
                    await i.update({ content: '**Menu:**', components: [settings_row_1, settings_row_2, settings_row_3] });
                    await i.followUp({ content: 'The box menu is not yet implemented.', ephemeral: true });
                break;
                case 'settings':
                    await i.update({ content: '**Menu:**', components: [settings_row_1, settings_row_2, settings_row_3] });
                    await i.followUp({ content: 'The settings menu is not yet implemented.', ephemeral: true });
                break;
                case 'quit':
                    let playspace_str = setup_playspace_str(interaction.user.id);

                    if (pa_collector != undefined) pa_collector.stop();
                    if (btn_collector != undefined) btn_collector.stop();
                    if (dex_collector != undefined) dex_collector.stop();
                    if (pa_extra_collector != undefined) pa_extra_collector.stop();
                    collector.stop();

                    await interaction.channel.send({ content: playspace_str }).then(msg => {
                        db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
                    });

                    await db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
                    await i.update({ content: null });
                    await i.deleteReply();
                break;
            }
        });
    },
};