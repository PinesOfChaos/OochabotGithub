const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { map_emote_string, setup_playspace_str } = require('../func_play');
const { PlayerState, TypeEmote } = require('../types.js');
const { type_to_emote } = require('../func_battle.js');
 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Pull up the menu.'),
    async execute(interaction) {

        // if (db.profile.get(interaction.user.id, 'player_state') == PlayerState.Playspace 
        // && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
        //     return interaction.reply({ content: 'You can\'t pull up the menu here.', ephemeral: true });
        // }

        // // Delete the current playspace
        // let playspace_msg = await interaction.channel.messages.fetch(db.profile.get(interaction.user.id, 'display_msg_id'));
        // await playspace_msg.delete();

        // Setup action rows for the main menu and some submenus
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
                new ButtonBuilder().setCustomId('box').setLabel('Oochabox').setStyle(ButtonStyle.Secondary).setEmoji('📦'),
            );

        let settings_row_3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('preferences').setLabel('Preferences').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
            ).addComponents(
                new ButtonBuilder().setCustomId('quit').setLabel('Return').setStyle(ButtonStyle.Danger).setEmoji('🔙'),
            );
        
        let back_buttons = new ActionRowBuilder()
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

        let confirm_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );

        let menuMsg;
        await interaction.reply({ content: '**Menu:**', components: [settings_row_1, settings_row_2, settings_row_3] });
        await interaction.fetchReply().then(msg => {
            menuMsg = msg;
        });

        let filter = i => i.user.id == interaction.user.id;
        const collector = await menuMsg.createMessageComponentCollector({ filter });
        let pa_collector, btn_collector, dex_collector, box_collector, pref_collector; // Collectors for each sub menu's buttons
        let pa_extra_filter = (i => { return (i.user.id == interaction.user.id && ['primary', 'nickname', 'moves'].includes(i.customId)) })
        let pa_extra_collector, nick_msg_collector, moves_collector, box_sel_collector, box_confirm_collector; // Extra sub menu collectors
        let userProfile = db.profile.get(interaction.user.id);

        // Builds the action rows and places emotes in for the Oochabox, based on the database.
        // Updates with new database info every time the function is run
        // Needs to be updated in a lot of cases, so easier to put it in a function!
        function buildBoxData(page_num) {
            box_row = [];
            box_row[0] = new ActionRowBuilder();
            box_row[1] = new ActionRowBuilder();
            box_row[2] = new ActionRowBuilder();
            box_row[3] = new ActionRowBuilder();
            let box_idx = 0;
            let party_slot = false;
            let oochabox_data = db.profile.get(interaction.user.id, 'ooch_pc');
            let party_data = db.profile.get(interaction.user.id, 'ooch_party');
            let offset = (16 * page_num)

            for (let i = (0 + offset); i < (16 + offset); i++) {
                if (_.inRange(i, 0+offset, 3+offset)) box_idx = 0; 
                if (_.inRange(i, 4+offset, 7+offset)) box_idx = 1; 
                if (_.inRange(i, 8+offset, 11+offset)) box_idx = 2; 
                if (_.inRange(i, 12+offset, 15+offset)) box_idx = 3; 

                if (oochabox_data[i] == undefined) {
                    box_row[box_idx].addComponents(
                        new ButtonBuilder()
                            .setCustomId(`box_emp_${i}`)
                            .setLabel(' ')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                        )              
                } else {
                    let ooch_data = db.monster_data.get(oochabox_data[i].id);
                    box_row[box_idx].addComponents(
                        new ButtonBuilder()
                            .setCustomId(`box_ooch_${oochabox_data[i].id}_${i}`)
                            .setEmoji(ooch_data.emote)
                            .setStyle(ButtonStyle.Secondary)
                    )
                }          
            }
            
            for (let i = 0; i < 4; i++) {
                if (party_data[i] == undefined) {
                    box_row[i].addComponents(
                        new ButtonBuilder()
                            .setCustomId(`box_emp_${i}_party`)
                            .setLabel(' ')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true)
                        )              
                } else {
                    let ooch_data = db.monster_data.get(party_data[i].id);
                    box_row[i].addComponents(
                        new ButtonBuilder()
                            .setCustomId(`box_ooch_${party_data[i].id}_${i}_party`)
                            .setEmoji(ooch_data.emote)
                            .setStyle(ButtonStyle.Success)
                    )
                }
            }
            return box_row;
        }

        // Builds the action rows for the move selector, since this also needs to be run multiple times
        function buildMoveData(selected_ooch) {
            let move_buttons = [new ActionRowBuilder(), new ActionRowBuilder()];
            let move_idx = 0;
            for (let i = 0; i < 4; i++) {
                if (i == 0 || i == 1) move_idx = 0;
                if (i == 2 || i == 3) move_idx = 1;
                let move_id;
                let move_name;
                let move_type;

                if (selected_ooch.moveset.length > i) {
                    move_id = selected_ooch.moveset[i];
                } else {
                    move_id = -1;
                }
                
                if (move_id != -1) {
                    move_name = db.move_data.get(`${move_id}`, 'name');
                    move_type = db.move_data.get(`${move_id}`, 'type');
                    //let move_damage = db.move_data.get(`${move_id}`, 'damage')
                    //let move_accuracy = db.move_data.get(`${move_id}`, 'accuracy')
                }

                move_buttons[move_idx].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`move_${i}`)
                        .setLabel(move_id != -1 ? `${move_name}` : `No Move`)
                        .setStyle(move_id != -1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(Boolean(move_id == -1))
                        .setEmoji(move_id != -1 ? type_to_emote(move_type) : '❌')
                )
            }

            return move_buttons;
        }

        // Menu operation is handled in this collector
        await collector.on('collect', async i => {
            let selected = i.customId;
            
            switch (selected) {
                case 'back_to_menu':
                    i.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2, settings_row_3] });
                    if (pa_collector != undefined) pa_collector.stop();
                    if (btn_collector != undefined) btn_collector.stop();
                    if (dex_collector != undefined) dex_collector.stop();
                    if (box_collector != undefined) box_collector.stop();
                    if (box_sel_collector != undefined) box_sel_collector.stop();
                    if (box_confirm_collector != undefined) box_confirm_collector.stop();
                    if (pref_collector != undefined) pref_collector.stop();
                    if (pa_extra_collector != undefined) pa_extra_collector.stop();
                    if (moves_collector != undefined) moves_collector.stop();
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
                    
                    i.update({ content: `**Oochamon Party:**`, components: pa_components })
                    pa_collector = await menuMsg.createMessageComponentCollector({ filter });

                    await pa_collector.on('collect', async j => {
                        if (isNaN(parseInt(j.customId))) return;
                        let party_idx = parseInt(j.customId);
                        let selected_ooch = ooch_party[party_idx]
                        let oochadex_info = db.monster_data.get(selected_ooch.id);
                        let moveset_str = '';
                        let ooch_title = `${selected_ooch.nickname}`
                        selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${TypeEmote[_.capitalize(selected_ooch.type)]}` : ooch_title += ` ${TypeEmote[_.capitalize(selected_ooch.type)]}`;

                        // Reset the set to primary button pre-emptively so that it's ready to be used for this oochamon, unless it's already primary.
                        party_extra_buttons.components[0].setDisabled(party_idx == 0 ? true : false);

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
                        
                        // Check if we can enable the move switcher, if we have more options outside of the main 4 moves
                        let available_moves = 0;
                        for (let move of db.monster_data.get(selected_ooch.id, 'move_list')) {
                            // move[0] is the level the move is learned
                            if (move[0] <= selected_ooch.level && move[0] != -1) available_moves += 1;
                        }
                        if (available_moves >= 5) party_extra_buttons.components[2].setDisabled(false);

                        j.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                        pa_extra_collector = await menuMsg.createMessageComponentCollector({ pa_extra_filter });

                        pa_extra_collector.on('collect', async k => {
                            let sel = k.customId;
                            switch (sel) {
                                case 'primary':
                                    // Swap the position of the selected ooch and the ooch in position 0.
                                    [ooch_party[0], ooch_party[party_idx]] = [ooch_party[party_idx], ooch_party[0]];
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

                                        db.profile.set(interaction.user.id, new_nick, `ooch_party[${party_idx}].nickname`);
                                        menuMsg.edit({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, back_buttons] });
                                        msg.delete();
                                    });
                                break;
                                case 'moves':
                                    let move_buttons = buildMoveData(selected_ooch);
                                    k.update({ content: '**Moves Switcher:**', embeds: [], components: [move_buttons[0], move_buttons[1], back_buttons]});
                                    let moves_filter = move_input => {
                                        if (move_input.componentType == ComponentType.Button) return move_input.customId.includes('move_');
                                        if (move_input.componentType == ComponentType.StringSelect) return move_input.values[0].includes('move_');
                                    };

                                    let moves_collector = await menuMsg.createMessageComponentCollector({ filter: moves_filter });
                                    let move_list_select_options = []
                                    let move_sel_idx;
                                    moves_collector.on('collect', l => {
                                        let move_list_select = new ActionRowBuilder()
                                        move_list_select_options = []
                                        if (l.componentType == ComponentType.Button) { // if a move is selected
                                            move_sel_idx = parseInt(l.customId.replace('move_', ''));
                                            let move_sel_id = selected_ooch.moveset[parseInt(l.customId.replace('move_', ''))];

                                            for (let move_data of db.monster_data.get(selected_ooch.id, 'move_list')) {
                                                if (move_data[0] <= selected_ooch.level && move_data[0] != -1 && !selected_ooch.moveset.includes(move_data[1])) {
                                                    let db_move_data = db.move_data.get(move_data[1]);
                                                    move_list_select_options.push(
                                                        new StringSelectMenuOptionBuilder()
                                                            .setLabel(`${db_move_data.name} [${db_move_data.damage} dmg, ${db_move_data.accuracy}% hit chance]`)
                                                            .setValue(`move_${db_move_data.id}`)
                                                            .setDescription(`${db_move_data.description}`)
                                                            .setEmoji(`${type_to_emote(db_move_data.type)}`)
                                                    );
                                                }
                                            }
                                            
                                            move_list_select.addComponents(
                                                new StringSelectMenuBuilder()
                                                    .setCustomId('move_list')
                                                    .setPlaceholder('Select a new move here!')
                                                    .addOptions(move_list_select_options),
                                            );

                                            l.update({ content: `**${type_to_emote(db.move_data.get(move_sel_id, 'type'))} ${db.move_data.get(move_sel_id, 'name')}**`, components: [move_list_select] });
                                        } else { // if a select menu move is selected
                                            l.values[0] = parseInt(l.values[0].replace('move_', ''));
                                            db.profile.set(interaction.user.id, l.values[0], `ooch_party[${party_idx}].moveset[${move_sel_idx}]`);
                                            selected_ooch.moveset[move_sel_idx] = l.values[0];
                                            let move_buttons = buildMoveData(selected_ooch);
                                            l.update({ content: '**Moves Switcher:**', embeds: [], components: [move_buttons[0], move_buttons[1], back_buttons]});
                                        }
                                    });
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
                    let display_title = 'Healing Items ❤️';
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
                    
                    if (Object.keys(heal_inv).length == 0) bag_buttons.components[0].setDisabled(true);
                    if (Object.keys(prism_inv).length == 0) bag_buttons.components[1].setDisabled(true);
                    if (Object.keys(key_inv).length == 0) bag_buttons.components[2].setDisabled(true);

                    if (bag_buttons.components[0].data.disabled == true) {
                        if (bag_buttons.components[1].data.disabled == true) {
                            display_inv = key_inv;
                            display_title = '🔑 Key Items';
                            bag_buttons.components[2].setStyle(ButtonStyle.Success)
                        } else {
                            display_inv = prism_inv;
                            display_title = '<:item_prism:1023031025716179076> Prisms';
                            bag_buttons.components[1].setStyle(ButtonStyle.Success)
                        }
                        bag_buttons.components[0].setStyle(ButtonStyle.Secondary)
                    }

                    if (Object.keys(heal_inv).length == 0 && Object.keys(prism_inv).length == 0 && Object.keys(key_inv).length == 0) {
                        i.update({ content: `**You have no items in your bag.**`, embeds: [], components: [back_buttons] })
                        return;
                    }

                    // Setup default item list for the default value, healing
                    for (const [item_id, quantity] of Object.entries(display_inv)) {
                        let item_obj = db.item_data.get(item_id);
                        item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                    }

                    const bagEmbed = new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle(display_title)
                        .setDescription(item_list_str.length != 0 ? item_list_str : `You have no healing items in your bag.`);

                    i.update({ content: `**Oochabag:**`, embeds: [bagEmbed], components: [bag_buttons, back_buttons] });
                    let bag_filter = (i => { return (i.user.id == interaction.user.id && ['heal_button', 'prism_button', 'key_button'].includes(i.customId)) })

                    btn_collector = menuMsg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: bag_filter });

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
                        i.update({ content: `**You have not ${oochadex_data[0].seen != 0 ? `caught ${ooch_data.name}` : `encountered this Oochamon`} yet... Go out into the wild and find it!**`,
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
                    userProfile = db.profile.get(interaction.user.id);
                    let page_row = new ActionRowBuilder();

                    page_row.addComponents(
                        new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back').setStyle(ButtonStyle.Danger)
                    ).addComponents(
                        new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(true)
                    ).addComponents(
                        new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
                    ).addComponents(
                        new ButtonBuilder().setCustomId('num_label').setLabel('1').setStyle(ButtonStyle.Primary)
                    ).addComponents(
                        new ButtonBuilder().setCustomId('party_label').setLabel('Party').setStyle(ButtonStyle.Success)
                    )

                    let box_sel_row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_box')
                            .setLabel('Back')
                            .setStyle(ButtonStyle.Danger)
                    ).addComponents(
                        new ButtonBuilder()
                            .setCustomId('add_party')
                            .setLabel('Add To Party')
                            .setStyle(ButtonStyle.Success)
                    ).addComponents(
                        new ButtonBuilder()
                            .setCustomId('release')
                            .setLabel('Release')
                            .setStyle(ButtonStyle.Danger)
                    )

                    let box_party_row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('back_to_box')
                            .setLabel('Back')
                            .setStyle(ButtonStyle.Danger)
                    ).addComponents(
                        new ButtonBuilder()
                            .setCustomId('add_box')
                            .setLabel('Add To Box')
                            .setStyle(ButtonStyle.Secondary)
                    )

                    let pages = Math.floor(db.profile.get(interaction.user.id, 'ooch_pc').length / 16);
                    if (pages != 0) page_row.components[2].setDisabled(false);
                    let page_num = 0;
                    let box_row = buildBoxData(page_num);
                    i.update({ content: `**Oochabox:**`,  components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                    box_collector = menuMsg.createMessageComponentCollector({ componentType: ComponentType.Button });

                    await box_collector.on('collect', async j => { 
                        userProfile = db.profile.get(interaction.user.id);
                        let sel = j.customId;
                        if (sel.includes('emp') || sel.includes('label')) j.update({ content: `**Oochabox**` });
                        if (sel == 'left' || sel == 'right') {
                            if (page_num != 0) page_row.components[1].setDisabled(false);
                            if (page_num != pages) page_row.components[2].setDisabled(false); 
                            if (sel == 'left') {
                                page_num -= 1;
                                page_num = _.clamp(page_num, 0, 9);
                                if (page_num == 0) page_row.components[1].setDisabled(true);
                            } else {
                                page_num += 1;
                                page_num = _.clamp(page_num, 0, 9);
                                if (page_num == pages) page_row.components[2].setDisabled(true);
                            }
                            
                            box_row = buildBoxData(page_num);
                            page_row.components[3].setLabel(`${page_num + 1}`);
                            j.update({ content: `**Oochabox**`, components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                        } else if (sel.includes('ooch')) {
                            let slot_data = sel.split('_');
                            let ooch_id = slot_data[2];
                            let slot_num = slot_data[3];
                            let party_slot = false;
                            if (sel.includes('_party')) party_slot = true;
                            let ooch_gen_data = db.monster_data.get(ooch_id); // General Oochamon Data
                            let ooch_user_data;

                            if (party_slot == false) {
                                ooch_user_data = userProfile.ooch_pc[slot_num]; // Personal Oochamon Data in Oochabox
                            } else {
                                ooch_user_data = userProfile.ooch_party[slot_num]; // Personal Oochamon Data in Party
                            }

                            let ooch_title = `${ooch_user_data.nickname}`
                            ooch_user_data.nickname != ooch_user_data.name ? ooch_title += ` (${ooch_user_data.name}) ${TypeEmote[_.capitalize(ooch_user_data.type)]}` 
                            : ooch_title += ` ${TypeEmote[_.capitalize(ooch_user_data.type)]}`;
                            let moveset_str = ``;
                            // Disable the "add to box" button if we only have one party member.
                            box_party_row.components[1].setDisabled((userProfile.ooch_party.length == 1))
                            // Disable the "add to party" button if we have 4 party members.
                            box_sel_row.components[1].setDisabled((userProfile.ooch_party.length == 4))

                            let dexEmbed = new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle(ooch_title)
                            .setThumbnail(ooch_gen_data.image)
                            .setDescription(`Ability: **${ooch_user_data.ability}**\nType: **${_.capitalize(ooch_user_data.type)}**`);
                            for (let move_id of ooch_user_data.moveset) {
                                let move = db.move_data.get(move_id)
                                moveset_str += `**${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
                            }
                            dexEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
                            dexEmbed.addFields([{ name: 'Stats', value: `HP: **${ooch_user_data.stats.hp}**\nATK: **${ooch_user_data.stats.atk}**\nDEF: **${ooch_user_data.stats.def}**\nSPD: **${ooch_user_data.stats.spd}**`, inline: true }]);
                            
                            j.update({ content: null, embeds: [dexEmbed], components: [party_slot == false ? box_sel_row : box_party_row] });

                            let box_sel_collector = menuMsg.createMessageComponentCollector();
                            
                            box_sel_collector.on('collect', async k => {
                                userProfile = db.profile.get(interaction.user.id);
                                let box_sel = k.customId;
                                switch (box_sel) {
                                    case 'back_to_box':
                                        box_row = buildBoxData(page_num);
                                        k.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                                        box_sel_collector.stop();
                                    break;
                                    case 'add_box':
                                        // Put the specified oochamon into the box.
                                        db.profile.push(interaction.user.id, ooch_user_data, `ooch_pc`);
                                        userProfile.ooch_party.splice(slot_num, 1)
                                        db.profile.set(interaction.user.id, userProfile.ooch_party, 'ooch_party');
                                        // Build new PC button rows
                                        box_row = buildBoxData(page_num);
                                        // Kick back to PC screen
                                        k.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                                        // j.followUp({ content: `The Oochamon **${ooch_user_data.nickname}** has been added to your box and removed from your party.`, ephemeral: true });
                                        box_sel_collector.stop();
                                    break;
                                    case 'add_party':
                                        // Put the specified oochamon into our team
                                        db.profile.push(interaction.user.id, ooch_user_data, `ooch_party`);
                                        // Take oochamon out of PC
                                        userProfile.ooch_pc.splice(slot_num, 1);
                                        db.profile.set(interaction.user.id, userProfile.ooch_pc, 'ooch_pc');
                                        // Build new PC button rows
                                        box_row = buildBoxData(page_num);
                                        // Kick back to PC screen
                                        k.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                                        //j.followUp({ content: `The Oochamon **${ooch_user_data.nickname}** has been added to your party.`, ephemeral: true });
                                        box_sel_collector.stop();
                                    break;
                                    case 'release':
                                        // Take oochamon out of PC
                                        await k.update({ content: `**Are you sure you want to release this Oochamon?**`, embeds: [],  components: [confirm_buttons] });
                                        box_confirm_collector = menuMsg.createMessageComponentCollector({ max: 1 });

                                        box_confirm_collector.on('collect', async l => {
                                            if (l.customId == 'yes') {
                                                userProfile.ooch_pc.splice(slot_num, 1);
                                                db.profile.set(interaction.user.id, userProfile.ooch_pc, 'ooch_pc');
                                                // Build new PC button rows
                                                box_row = buildBoxData(page_num);
                                                // Kick back to PC screen
                                                l.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                                                box_sel_collector.stop();
                                            } else {
                                                l.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], page_row] });
                                                box_sel_collector.stop();
                                            }
                                        })
                                        
                                    break;
                                }
                            });
                        }

                    });
                break;
                case 'preferences':
                    userProfile = db.profile.get(interaction.user.id);
                    let prefData = userProfile.settings;
                    let prefDesc = [`Graphics Mode: **\`${prefData.graphics == 0 ? 'Quality' : 'Performance' }\`**`,
                    `Battle Text Cleanup: **\`${prefData.battle_cleanup}\`**`];

                    let prefSelMenu = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('pref')
                                .setPlaceholder('Change a preference with this menu!')
                                .addOptions(
                                    {
                                        label: 'Graphics Mode',
                                        description: 'Change the graphics mode of the game.',
                                        value: 'graphics',
                                    },
                                    {
                                        label: 'Battle Text Cleanup',
                                        description: 'Set whether text should be cleaned up after a battle or not.',
                                        value: 'battle_cleanup',
                                    },
                                ),
                        );

                    let prefEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('⚙️ Preferences ⚙️')
                    .setDescription(prefDesc.join('\n'))
                    await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [prefSelMenu, back_buttons] });

                    pref_collector = menuMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect }) 
                    pref_collector.on('collect', async j => {
                        let sel = j.values[0];
                        switch (sel) {
                            case 'graphics':
                                await db.profile.set(interaction.user.id, userProfile.settings.graphics == 1 ? 0 : 1, 'settings.graphics');
                                prefDesc[0] = await `Graphics Mode: **\`${db.profile.get(interaction.user.id, 'settings.graphics') == 0 ? 'Quality' : 'Performance' }\`**`;
                            break;
                            case 'battle_cleanup':
                                await db.profile.set(interaction.user.id, !(userProfile.settings.battle_cleanup), 'settings.battle_cleanup');
                                prefDesc[1] = await `Battle Text Cleanup: **\`${db.profile.get(interaction.user.id, 'settings.battle_cleanup')}\`**`
                            break;
                        }
                        userProfile = db.profile.get(interaction.user.id);
                        await prefEmbed.setDescription(prefDesc.join('\n'));
                        await j.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [prefSelMenu, back_buttons] });
                    })
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