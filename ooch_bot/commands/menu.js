const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { map_emote_string, setup_playspace_str } = require('../func_play');
const { PlayerState, TypeEmote } = require('../types.js');
const { type_to_emote, type_to_string } = require('../func_battle.js');
 
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

        //#region Setup action rows for the main menu and some submenus
        // Main Menu
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
                new ButtonBuilder().setCustomId('oochabox').setLabel('Oochabox').setStyle(ButtonStyle.Secondary).setEmoji('📦'),
            );

        let settings_row_3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('preferences').setLabel('Preferences').setStyle(ButtonStyle.Secondary).setEmoji('⚙️'),
            ).addComponents(
                new ButtonBuilder().setCustomId('quit').setLabel('Return').setStyle(ButtonStyle.Danger).setEmoji('🔙'),
            );
        
        // Back Buttons
        let back_button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back To Menu').setStyle(ButtonStyle.Danger)
            );

        let party_back_button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_party').setLabel('Back').setStyle(ButtonStyle.Danger)
            );

        let moves_back_button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_ooch').setLabel('Back').setStyle(ButtonStyle.Danger)
            );

        // Extra buttons for box
        let box_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back').setStyle(ButtonStyle.Danger)
            ).addComponents(
                new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId('num_label').setLabel('1').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId('party_label').setLabel('Party').setStyle(ButtonStyle.Success)
            )

        let box_sel_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_box').setLabel('Back').setStyle(ButtonStyle.Danger)
            ).addComponents(
                new ButtonBuilder().setCustomId('add_ooch').setLabel('Add To Party').setStyle(ButtonStyle.Success)
            ).addComponents(
                new ButtonBuilder().setCustomId('release').setLabel('Release').setStyle(ButtonStyle.Danger)
            )

        let box_party_sel_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back_to_box').setLabel('Back').setStyle(ButtonStyle.Danger)
            ).addComponents(
                new ButtonBuilder().setCustomId('add_box').setLabel('Add To Box').setStyle(ButtonStyle.Secondary)
            )

            
        let confirm_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
        ).addComponents(
            new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
        );

        // Party Menu Extra Buttons
        let party_extra_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('primary').setLabel('Set To Primary').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('nickname').setLabel('Change Nickname').setStyle(ButtonStyle.Primary),
            ).addComponents(
                new ButtonBuilder().setCustomId('moves').setLabel('Change Moves').setStyle(ButtonStyle.Primary).setDisabled(true),
            );

        let bag_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('heal_button').setStyle(ButtonStyle.Success).setEmoji('<:item_potion_magic:1023031024726327426>'),
            ).addComponents(
                new ButtonBuilder().setCustomId('prism_button').setStyle(ButtonStyle.Secondary).setEmoji('<:item_prism:1023031025716179076>'),
            ).addComponents(
                new ButtonBuilder().setCustomId('key_button').setStyle(ButtonStyle.Secondary).setEmoji('🔑'),
            )


        // Preference Select Menu
        let pref_sel_menu = new ActionRowBuilder()
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

        //#endregion End of making action rows

        let menuMsg;
        await interaction.reply({ content: '**Menu:**', components: [settings_row_1, settings_row_2, settings_row_3] });
        await interaction.fetchReply().then(msg => {
            menuMsg = msg;
        });

        let filter = i => i.user.id == interaction.user.id;
        const collector = await menuMsg.createMessageComponentCollector({ filter });
        let user_profile = db.profile.get(interaction.user.id);

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

        function buildPartyData(ooch_party) {
            let party = new ActionRowBuilder();
            let party_2 = new ActionRowBuilder();
            let pa_components = [party];
            for (let i = 0; i < ooch_party.length; i++) {
                // If i is 0 or 1, add components to party`
                // If i is 2 or 3, add components to party_2
                // This is to make a 2x2 table of buttons, lol
                ((i <= 1) ? party : party_2).addComponents(
                    new ButtonBuilder()
                    .setCustomId(`par_ooch_id_${i}`)
                    .setLabel(`Lv. ${ooch_party[i].level} ${ooch_party[i].nickname} (HP: ${ooch_party[i].current_hp}/${ooch_party[i].stats.hp})`)
                    .setStyle((ooch_party[i].alive) ? ((i == 0) ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Danger)
                    .setEmoji(db.monster_data.get(ooch_party[i].id, 'emote'))
                )
            }

            if (ooch_party.length > 2) pa_components.push(party_2);
            pa_components.push(back_button);
            return pa_components;
        }

        // Initialize all variables used across multiple sub menus here
        let selected;
        let ooch_party, pa_components, party_idx, move_sel_idx, selected_ooch,
        move_list_select = new ActionRowBuilder(), move_list_select_options = [], dexEmbed, bagEmbed,
        heal_inv, prism_inv, key_inv, display_inv, oochadex_sel_1 = new ActionRowBuilder(), oochadex_sel_2 = new ActionRowBuilder(),
        oochadex_sel_3 = new ActionRowBuilder(), oochadex_data, page_num, pages, box_row, slot_num, ooch_user_data, prefEmbed,
        pref_data, pref_desc

        // Menu operation is handled in this collector
        await collector.on('collect', async i => {
            // Initialize used variables
            if (i.componentType == ComponentType.Button) {
                selected = i.customId;
            } else {
                selected = i.values[0];
            }

            //#region Back Buttons
            // Back to Main Menu
            if (selected == 'back_to_menu') {
                i.update({ content: '**Menu:**', embeds: [], components: [settings_row_1, settings_row_2, settings_row_3] });
            } 
            // Back to Party Select
            else if (selected == 'back_to_party') {
                ooch_party = db.profile.get(interaction.user.id, 'ooch_party');
                pa_components = buildPartyData(ooch_party);
                i.update({ content: `**Oochamon Party:**`, components: pa_components, embeds: [] });
            } 
            // Back to Oochamon View
            else if (selected == 'back_to_ooch') {
                i.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, party_back_button] });
            }
            // Back to Box Select
            else if (selected == 'back_to_box') {
                box_row = buildBoxData(page_num);
                i.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
            } 
            //#endregion

            //#region Party / Party Submenu
            // Main Party Menu Button
            else if (selected == 'party') {
                ooch_party = db.profile.get(interaction.user.id, 'ooch_party');
                pa_components = buildPartyData(ooch_party);
                i.update({ content: `**Oochamon Party:**`, components: pa_components })
            } 
            // Party Oochamon Details Menu Button
            else if (selected.includes('par_ooch_id_')) {
                selected = parseInt(selected.replace('par_ooch_id_', ''));
                party_idx = parseInt(selected);
                selected_ooch = ooch_party[party_idx]
                let oochadex_info = db.monster_data.get(selected_ooch.id);
                let moveset_str = '';
                let ooch_title = `${selected_ooch.nickname}`
                if (selected_ooch.nickname != selected_ooch.name) ooch_title += ` (${selected_ooch.name})`;
                ooch_title += ` [Lv. ${selected_ooch.level}] ${TypeEmote[_.capitalize(selected_ooch.type)]}`

                // Reset the set to primary button pre-emptively so that it's ready to be used for this oochamon, unless it's already primary.
                party_extra_buttons.components[0].setDisabled(party_idx == 0 ? true : false);

                dexEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(ooch_title)
                .setThumbnail(oochadex_info.image)
                .setDescription(`Ability: **${selected_ooch.ability}**\nType: **${_.capitalize(selected_ooch.type)}**`);
                for (let move_id of selected_ooch.moveset) {
                    let move = db.move_data.get(move_id)
                    moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
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

                i.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, party_back_button] });
            }
            // Set to Primary Button
            else if (selected == 'primary') {
                // Swap the position of the selected ooch and the ooch in position 0.
                [ooch_party[0], ooch_party[party_idx]] = [ooch_party[party_idx], ooch_party[0]];
                db.profile.set(interaction.user.id, ooch_party, 'ooch_party');
                party_extra_buttons.components[0].setDisabled(true);
                i.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, party_back_button] });
                interaction.followUp({ content: 'This Oochamon is now the primary member of your party, meaning they will be sent out first in a battle.', ephemeral: true })
            }
            // Set a nickname button
            else if (selected == 'nickname') {
                i.update({ content: `Enter a nickname for your ${selected_ooch.name}! (Type reset to remove the nickname.)\nCurrent Nickname is: **${selected_ooch.nickname}**`, components: [], embeds: [] });
                nick_msg_collector = menuMsg.channel.createMessageCollector({ max: 1 });
                nick_msg_collector.on('collect', async msg => {
                    let new_nick = (msg.content.toLowerCase() != 'reset' ? msg.content : selected_ooch.name);
                    selected_ooch.nickname = new_nick;

                    // Generate a new ooch title to place into our embed
                    ooch_title = `${selected_ooch.nickname}`
                    selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${TypeEmote[_.capitalize(selected_ooch.type)]}` : ooch_title += ` ${TypeEmote[_.capitalize(selected_ooch.type)]}`;
                    dexEmbed.setTitle(ooch_title);

                    db.profile.set(interaction.user.id, new_nick, `ooch_party[${party_idx}].nickname`);
                    menuMsg.edit({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, party_back_button] });
                    msg.delete();
                });
            }
            // Move switcher button
            else if (selected == 'moves') {
                let move_buttons = buildMoveData(selected_ooch);
                i.update({ content: '**Moves Switcher:**', embeds: [], components: [move_buttons[0], move_buttons[1], moves_back_button]});
            } 
            // Move switcher button/select menu handler
            else if (selected.includes('move_')) {
                if (i.componentType == ComponentType.Button) { // if a move is selected
                    move_list_select = new ActionRowBuilder()
                    move_list_select_options = [];
                    move_sel_idx = parseInt(selected.replace('move_', ''));
                    let move_sel_id = selected_ooch.moveset[parseInt(selected.replace('move_', ''))];

                    for (let move_data of db.monster_data.get(selected_ooch.id, 'move_list')) {
                        if (move_data[0] <= selected_ooch.level && move_data[0] != -1 && !selected_ooch.moveset.includes(move_data[1])) {
                            let db_move_data = db.move_data.get(move_data[1]);
                            move_list_select_options.push(
                                new StringSelectMenuOptionBuilder()
                                    .setLabel(`${db_move_data.name} [${db_move_data.damage} dmg, ${db_move_data.accuracy}% hit chance]`)
                                    .setValue(`move_sel_${db_move_data.id}`)
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

                    i.update({ content: `**${type_to_emote(db.move_data.get(move_sel_id, 'type'))} ${db.move_data.get(move_sel_id, 'name')}**`, components: [move_list_select] });
                } else { // if a select menu move is selected
                    selected = parseInt(selected.replace('move_sel_', ''));
                    db.profile.set(interaction.user.id, selected, `ooch_party[${party_idx}].moveset[${move_sel_idx}]`);
                    selected_ooch.moveset[move_sel_idx] = selected;
                    
                    // Update Dex Embed
                    let moveset_str = ``;
                    for (let move_id of selected_ooch.moveset) {
                        let move = db.move_data.get(move_id)
                        moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
                    }
                    dexEmbed.data.fields[0].value = moveset_str;

                    let move_buttons = buildMoveData(selected_ooch);
                    i.update({ content: '**Moves Switcher:**', embeds: [], components: [move_buttons[0], move_buttons[1], moves_back_button]});
                }
            } 
            //#endregion

            //#region Bag / Bag Submenu
            else if (selected == 'bag') {
                heal_inv = db.profile.get(interaction.user.id, 'heal_inv')
                prism_inv = db.profile.get(interaction.user.id, 'prism_inv')
                key_inv = db.profile.get(interaction.user.id, 'other_inv')
                display_inv = heal_inv;
                let display_title = 'Healing Items ❤️';
                let item_list_str = '';
                
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
                    i.update({ content: `**You have no items in your bag.**`, embeds: [], components: [back_button] })
                    return;
                }

                // Setup default item list for the default value, healing
                for (const [item_id, quantity] of Object.entries(display_inv)) {
                    let item_obj = db.item_data.get(item_id);
                    item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                }

                bagEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(display_title)
                    .setDescription(item_list_str.length != 0 ? item_list_str : `You have no healing items in your bag.`);

                i.update({ content: `**Oochabag:**`, embeds: [bagEmbed], components: [bag_buttons, back_button] });

            } 
            // Heal Button
            else if (selected == 'heal_button') {
                bagEmbed.setTitle('❤️ Healing Items');
                bag_buttons.components[0].setStyle(ButtonStyle.Success)
                bag_buttons.components[1].setStyle(ButtonStyle.Secondary)
                bag_buttons.components[2].setStyle(ButtonStyle.Secondary)
                display_inv = heal_inv;

                for (const [item_id, quantity] of Object.entries(display_inv)) {
                    let item_obj = db.item_data.get(item_id);
                    item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                }

                bagEmbed.setDescription(item_list_str);
                i_sel.update({ content: `__**Item Bag**__`, embeds: [bagEmbed], components: [bag_buttons, back_button] });
            } 
            // Prism Button
            else if (selected == 'prism_button') {
                bagEmbed.setTitle('<:item_prism:1023031025716179076> Prisms')
                bag_buttons.components[0].setStyle(ButtonStyle.Secondary)
                bag_buttons.components[1].setStyle(ButtonStyle.Success)
                bag_buttons.components[2].setStyle(ButtonStyle.Secondary)
                display_inv = prism_inv;

                for (const [item_id, quantity] of Object.entries(display_inv)) {
                    let item_obj = db.item_data.get(item_id);
                    item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                }

                bagEmbed.setDescription(item_list_str);
                i_sel.update({ content: `__**Item Bag**__`, embeds: [bagEmbed], components: [bag_buttons, back_button] });
            }
            // Key Button
            else if (selected == 'key_button') {
                bagEmbed.setTitle('🔑 Key Items')
                bag_buttons.components[0].setStyle(ButtonStyle.Secondary)
                bag_buttons.components[1].setStyle(ButtonStyle.Secondary)
                bag_buttons.components[2].setStyle(ButtonStyle.Success)
                display_inv = key_inv;

                for (const [item_id, quantity] of Object.entries(display_inv)) {
                    let item_obj = db.item_data.get(item_id);
                    item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`
                }

                bagEmbed.setDescription(item_list_str);
                i_sel.update({ content: `__**Item Bag**__`, embeds: [bagEmbed], components: [bag_buttons, back_button] });
            }
            //#endregion
        
            //#region Oochadex / Oochadex Submenu
            // Oochadex Menu Button
            else if (selected == 'oochadex') {
                oochadex_sel_options_1 = [];
                oochadex_sel_options_2 = [];
                oochadex_sel_options_3 = [];
                ooch_data = db.monster_data.get(0);
                oochadex_data = db.profile.get(interaction.user.id, 'oochadex');

                for (let i = 0; i < db.monster_data.keyArray().length; i++) {
                    ooch_data = db.monster_data.get(i);
                    oochadex_check = db.profile.get(interaction.user.id, `oochadex[${i}]`);
                    if (i < 25) {
                        oochadex_sel_options_1.push({
                            label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                            description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
                            value: `dex_${i}`,
                            emoji: oochadex_check.seen != 0 ? ooch_data.emote : undefined,
                        })
                    } else if (i >= 25 && i < 50) {
                        oochadex_sel_options_2.push({
                            label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                            description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
                            value: `dex_${i}`,
                            emoji: oochadex_check.seen != 0 ? ooch_data.emote : undefined,
                        })
                    } else {
                        oochadex_sel_options_3.push({
                            label: oochadex_check.seen != 0 ? `#${i+1}: ${ooch_data.name}` : `#${i+1}: ???`,
                            description: oochadex_check.seen != 0 ? `Seen: ${oochadex_check.seen} | Caught: ${oochadex_check.caught}` : `???`,
                            value: `dex_${i}`,
                            emoji: oochadex_check.seen != 0 ? ooch_data.emote : undefined,
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
                dexEmbed = new EmbedBuilder()
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
                    embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_button] });
                } else {
                    i.update({ content: `**You have not ${oochadex_data[0].seen != 0 ? `caught ${ooch_data.name}` : `encountered this Oochamon`} yet... Go out into the wild and find it!**`,
                    embeds: [], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_button] });
                }
            }
            // Oochadex Select Menus
            else if (selected.includes('dex_')) {
                selected = parseInt(selected.replace('dex_', ''));
                ooch_data = db.monster_data.get(selected);
                dexEmbed = new EmbedBuilder()
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

                if (oochadex_data[selected].caught != 0) {
                    i.update({ content: `**Seen:** ${oochadex_data[selected].seen} | **Caught:** ${oochadex_data[selected].caught}`,
                    embeds: [dexEmbed], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_button] });
                } else {
                    i.update({ content: `**You have not encountered ${oochadex_data[selected].seen != 0 ? `a ${ooch_data.name}` : `this Oochamon`} yet... Go out into the wild and find it!**`,
                    embeds: [], components: [oochadex_sel_1, oochadex_sel_2, oochadex_sel_3, back_button] });
                }
            }
            //#endregion
            
            //#region Oochabox / Oochabox Menu
            // Oochabox Button
            else if (selected == 'oochabox') {  
                user_profile = db.profile.get(interaction.user.id);
                pages = 9; // Number of pages, starts at 0
                page_num = 0;
                box_row = buildBoxData(page_num);
                i.update({ content: `**Oochabox:**`,  components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
            }
            // Label buttons
            else if (selected.includes('emp') || selected.includes('label')) {
                i.update({ content: `**Oochabox**` });
            }
            // Page buttons
            else if (selected == 'left' || selected == 'right') {
                selected == 'left' ? page_num -= 1 : page_num += 1;
                page_num = (page_num + pages) % pages; // Handle max page overflow
                
                box_row = buildBoxData(page_num);
                box_buttons.components[3].setLabel(`${page_num + 1}`);
                i.update({ content: `**Oochabox**`, components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
            } 
            // Oochamon in Box View
            else if (selected.includes('box_ooch')) {
                user_profile = db.profile.get(interaction.user.id);
                let slot_data = selected.split('_');
                let ooch_id = slot_data[2];
                slot_num = slot_data[3];
                let party_slot = false;
                if (selected.includes('_party')) party_slot = true;
                let ooch_gen_data = db.monster_data.get(ooch_id); // General Oochamon Data

                if (party_slot == false) {
                    ooch_user_data = user_profile.ooch_pc[slot_num]; // Personal Oochamon Data in Oochabox
                } else {
                    ooch_user_data = user_profile.ooch_party[slot_num]; // Personal Oochamon Data in Party
                }

                let ooch_title = `${ooch_user_data.nickname}`
                ooch_user_data.nickname != ooch_user_data.name ? ooch_title += ` (${ooch_user_data.name}) ${TypeEmote[_.capitalize(ooch_user_data.type)]}` 
                : ooch_title += ` ${TypeEmote[_.capitalize(ooch_user_data.type)]}`;
                let moveset_str = ``;
                // Disable the "add to box" button if we only have one party member.
                box_party_sel_buttons.components[1].setDisabled((user_profile.ooch_party.length == 1))
                // Disable the "add to party" button if we have 4 party members.
                box_sel_buttons.components[1].setDisabled((user_profile.ooch_party.length == 4))

                dexEmbed = new EmbedBuilder()
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
                
                i.update({ content: null, embeds: [dexEmbed], components: [party_slot == false ? box_sel_buttons : box_party_sel_buttons] });
            }
            // Add Oochamon to Box
            else if (selected == 'add_box') {
                user_profile = db.profile.get(interaction.user.id);
                // Put the specified oochamon into the box.
                db.profile.push(interaction.user.id, ooch_user_data, `ooch_pc`);
                user_profile.ooch_party.splice(slot_num, 1)
                db.profile.set(interaction.user.id, user_profile.ooch_party, 'ooch_party');
                // Build new PC button rows
                box_row = buildBoxData(page_num);
                // Kick back to PC screen
                i.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
            } 
            // Add Oochamon to team
            else if (selected == 'add_ooch') {
                user_profile = db.profile.get(interaction.user.id);
                // Put the specified oochamon into our team
                db.profile.push(interaction.user.id, ooch_user_data, `ooch_party`);
                // Take oochamon out of PC
                user_profile.ooch_pc.splice(slot_num, 1);
                db.profile.set(interaction.user.id, user_profile.ooch_pc, 'ooch_pc');
                // Build new PC button rows
                box_row = buildBoxData(page_num);
                // Kick back to PC screen
                i.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
                //i.followUp({ content: `The Oochamon **${ooch_user_data.nickname}** has been added to your party.`, ephemeral: true });
            
            }
            // Release an Oochamon
            else if (selected == 'release') {
                user_profile = db.profile.get(interaction.user.id);
                await i.update({ content: `**Are you sure you want to release this Oochamon?**`, embeds: [],  components: [confirm_buttons] });
            }
            // Confirm to release an Oochamon
            else if (selected == 'yes') {
                user_profile = db.profile.get(interaction.user.id);
                user_profile.ooch_pc.splice(slot_num, 1);
                db.profile.set(interaction.user.id, user_profile.ooch_pc, 'ooch_pc');
                // Build new PC button rows
                box_row = buildBoxData(page_num);
                // Kick back to PC screen
                i.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
            }
            // Confirm to not release an Oochamon
            else if (selected == 'no') {
                user_profile = db.profile.get(interaction.user.id);
                i.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons] });
            }
            //#endregion

            //#region Preferences Menu
            // Preferences Button
            else if (selected == 'preferences') {
                user_profile = db.profile.get(interaction.user.id);
                pref_data = user_profile.settings;
                pref_desc = [`Graphics Mode: **\`${pref_data.graphics == 0 ? 'Quality' : 'Performance' }\`**`,
                `Battle Text Cleanup: **\`${pref_data.battle_cleanup}\`**`];

                prefEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('⚙️ Preferences ⚙️')
                .setDescription(pref_desc.join('\n'))
                await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
            }
            // Graphics Switcher
            else if (selected == 'graphics') {
                await db.profile.set(interaction.user.id, user_profile.settings.graphics == 1 ? 0 : 1, 'settings.graphics');
                pref_desc[0] = await `Graphics Mode: **\`${db.profile.get(interaction.user.id, 'settings.graphics') == 0 ? 'Quality' : 'Performance' }\`**`;
                user_profile = db.profile.get(interaction.user.id);
                await prefEmbed.setDescription(pref_desc.join('\n'));
                await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
            }
            // Battle Cleanup Option
            else if (selected == 'battle_cleanup') {
                await db.profile.set(interaction.user.id, !(user_profile.settings.battle_cleanup), 'settings.battle_cleanup');
                pref_desc[1] = await `Battle Text Cleanup: **\`${db.profile.get(interaction.user.id, 'settings.battle_cleanup')}\`**`;
                user_profile = db.profile.get(interaction.user.id);
                await prefEmbed.setDescription(pref_desc.join('\n'));
                await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
            }
            //#endregion

            //#region Quit Button (back to playspace)
            // Quit Button
            else if (selected == 'quit') {
                let playspace_str = setup_playspace_str(interaction.user.id);
                collector.stop();

                await interaction.channel.send({ content: playspace_str }).then(msg => {
                    db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
                });

                await db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
                await i.update({ content: null });
                await i.deleteReply();
            }
            //#endregion
        });
    },
};