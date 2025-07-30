import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder, MessageFlags } from 'discord.js';
import { profile, move_data as _move_data, monster_data, item_data as _item_data, ability_data } from '../db.js';
import { capitalize, lowerCase, inRange, clamp } from 'lodash-es';
import wait from 'wait';
import { setup_playspace_str, create_ooch } from '../func_play.js';
import { PlayerState, TypeEmote } from '../types.js';
import { type_to_emote, item_use, get_stance_options } from '../func_battle.js';
import { ooch_info_embed, get_ooch_art, get_art_file } from '../func_other.js';
 
export const data = new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Pull up the menu.');
export async function execute(interaction) {
    await interaction.deferReply();
    let playerState = profile.get(`${interaction.user.id}`, 'player_state');

    if (playerState == PlayerState.NotPlaying) {
        return interaction.editReply({ content: 'You must be playing the game to pull up the menu.', flags: MessageFlags.Ephemeral });
    } else if (playerState != PlayerState.NotPlaying && interaction.channel.id != profile.get(`${interaction.user.id}`, 'play_thread_id')) {
        return interaction.editReply({ content: 'You can\'t pull up the menu here.', flags: MessageFlags.Ephemeral });
    } else if (playerState == PlayerState.Menu) {
        return interaction.editReply({ content: `The menu is already open, you cannot open it again! If you don't have the menu open, please restart the game by running \`/play\`.`, flags: MessageFlags.Ephemeral });
    } else if (playerState != PlayerState.Playspace) {
        return interaction.editReply({ content: 'You can\'t pull up the menu right now.', flags: MessageFlags.Ephemeral });
    }

    profile.set(interaction.user.id, PlayerState.Menu, 'player_state');
    // Delete the current playspace
    let playspace_msg = await interaction.channel.messages.fetch(profile.get(`${interaction.user.id}`, 'display_msg_id'));
    await playspace_msg.delete().catch(() => { });;

    //#region Setup action rows for the main menu and some submenus
    // Main Menu
    let settings_row_1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('party').setLabel('Oochamon').setStyle(ButtonStyle.Success).setEmoji('<:item_prism:1274937161262698536>')).addComponents(
                new ButtonBuilder().setCustomId('bag').setLabel('Oochabag').setStyle(ButtonStyle.Danger).setEmoji('🎒'));

    let settings_row_2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('map').setLabel('Oochamap').setStyle(ButtonStyle.Primary).setEmoji('<:item_map:1353128506535706754>'))
        .addComponents(
            new ButtonBuilder().setCustomId('oochadex').setLabel('Oochadex').setStyle(ButtonStyle.Secondary).setEmoji('📱'));

    let settings_row_3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('preferences').setLabel('Preferences').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')).addComponents(
                new ButtonBuilder().setCustomId('quit').setLabel('Return').setStyle(ButtonStyle.Danger).setEmoji('🔙'));

    // Back Buttons
    let back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back To Menu').setStyle(ButtonStyle.Danger)
        );

    let ooch_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back To Menu').setStyle(ButtonStyle.Danger)
        )
        .addComponents(
            new ButtonBuilder().setCustomId('quick_heal').setLabel('Quick Heal Party').setStyle(ButtonStyle.Success).setEmoji('❤️').setDisabled(true)
        );

    let sel_ooch_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back_to_ooch').setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    let party_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back_to_party').setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    let moves_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('moves').setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    let item_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back_to_item').setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    // Party Menu Extra Buttons
    let party_extra_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('primary').setLabel('Set As Primary').setStyle(ButtonStyle.Success).setEmoji('👑')).addComponents(
                new ButtonBuilder().setCustomId('party_heal').setLabel('Heal Oochamon').setStyle(ButtonStyle.Success).setEmoji('<:item_potion_magic:1274937146423115922>').setDisabled(true)).addComponents(
                    new ButtonBuilder().setCustomId('evolve').setLabel('Evolve').setStyle(ButtonStyle.Success).setDisabled(true).setEmoji('⬆️')
                );

    let party_extra_buttons_2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('nickname').setLabel('Edit Nickname').setStyle(ButtonStyle.Primary).setEmoji('📝')).addComponents(
                new ButtonBuilder().setCustomId('moves').setLabel('Edit Moves').setStyle(ButtonStyle.Primary).setDisabled(true).setEmoji('💢')).addComponents(
                    new ButtonBuilder().setCustomId('taming').setLabel('Taming Grounds').setStyle(ButtonStyle.Primary).setDisabled(true).setEmoji('❤️')
                );

    let party_extra_stance_sel = new ActionRowBuilder();

    let bag_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('heal_button').setStyle(ButtonStyle.Success).setEmoji('<:item_potion_magic:1274937146423115922>')).addComponents(
                new ButtonBuilder().setCustomId('prism_button').setStyle(ButtonStyle.Secondary).setEmoji('<:item_prism:1274937161262698536>')).addComponents(
                    new ButtonBuilder().setCustomId('key_button').setStyle(ButtonStyle.Secondary).setEmoji('🔑'));

    // Dex arrows
    let dex_arrows = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('dex_left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('dex_right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('back_to_menu').setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    // Preference Select Menu
    let pref_sel_menu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('pref')
                .setPlaceholder('Change a preference with this menu!')
                .addOptions(
                    {
                        label: 'Show Controls Msg',
                        description: 'Set whether you want to see the controls msg when starting up Oochamon.',
                        value: 'controls_msg',
                    },
                    {
                        label: 'Battle Text Cleanup',
                        description: 'Set whether battle text should be deleted after a battle or not.',
                        value: 'battle_cleanup',
                    },
                    {
                        label: 'Zoom Level',
                        description: 'Set the window size of the game. (5x5, 7x7, 7x9, 9x7)',
                        value: 'zoom_level',
                    },
                    {
                        label: 'Battle Speed',
                        description: 'Set the battle event speed.',
                        value: 'battle_speed',
                    },
                    {
                        label: 'Discord Move Buttons',
                        description: 'Add buttons you can click to move your character.',
                        value: 'discord_move_buttons',
                    },
                    {
                        label: 'Objective Indicator',
                        description: 'See a message displaying your current objective.',
                        value: 'objective',
                    }));

    //#endregion End of making action rows
    let user_profile = profile.get(`${interaction.user.id}`);
    let bag_select;

    let menuMsg;
    await interaction.editReply({ content: `## Menu${user_profile.settings.objective ? `\n**Current Objective:** ***${user_profile.objective}***` : ``}${user_profile.repel_steps > 0 ? `\n*Repulsor Steps: ${user_profile.repel_steps}*` : ``}`, components: [settings_row_1, settings_row_2, settings_row_3] });
    await interaction.fetchReply().then(msg => {
        menuMsg = msg;
    });

    let filter = i => i.user.id == interaction.user.id;
    const collector = await menuMsg.createMessageComponentCollector({ filter });

    // Builds the action rows for the move selector, since this also needs to be run multiple times
    function buildMoveData(selected_ooch) {
        //PINESNOTE let swappable = selected_ooch.*learnable_moves*.length - selected_ooch.moveset.length (if this is <= 0, don't allow move swapping)
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
                move_name = _move_data.get(`${move_id}`, 'name');
                move_type = _move_data.get(`${move_id}`, 'type');
            }

            move_buttons[move_idx].addComponents(
                new ButtonBuilder()
                    .setCustomId(`move_${i}`)
                    .setLabel(move_id != -1 ? `${move_name}` : `No Move`)
                    .setStyle(move_id != -1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setEmoji(move_id != -1 ? type_to_emote(move_type) : '❌')
            );
        }

        return move_buttons;
    }

    function buildPartyData(ooch_party, for_item = false, item = false) {
        let party = new ActionRowBuilder();
        let party_2 = new ActionRowBuilder();
        let pa_components = [party];
        for (let i = 0; i < ooch_party.length; i++) {
            let evoLvl = monster_data.get(`${ooch_party[i].id}`, 'evo_lvl');
            let canEvolve = false;
            let disableOochButton = false;

            if (ooch_party[i].level >= evoLvl && evoLvl != -1) {
                canEvolve = true;
            }

            // Special condition for Gnayme, must have a nickname to evolve
            if (ooch_party[i].id == 109 && ooch_party[i].name == ooch_party[i].nickname) {
                canEvolve = false;
            }

            // Special condition for form change evos
            if (monster_data.get(`${ooch_party[i].id}`, 'form_change_evo') == true) {
                canEvolve = false;
            }

            // If i is 0 or 1, add components to party
            // If i is 2 or 3, add components to party_2
            // This is to make a 2x2 table of buttons, lol
            if (for_item == false) {
                ((i <= 1) ? party : party_2).addComponents(
                    new ButtonBuilder()
                        .setCustomId(`par_ooch_id_${i}`)
                        .setLabel(`Lv. ${ooch_party[i].level} ${ooch_party[i].nickname} (HP: ${ooch_party[i].current_hp}/${ooch_party[i].stats.hp})${canEvolve == true ? ' ⏫' : ``}`)
                        .setStyle((ooch_party[i].alive) ? ((i == 0) ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Danger)
                        .setEmoji(monster_data.get(`${ooch_party[i].id}`, 'emote'))
                );
            } else {
                if (item.type == 'iv') {
                    if (ooch_party[i].stats[`${item.potency}_iv`] >= 1.5) disableOochButton = true;
                } else if (item.type == 'evolve') {
                    if (item.potency[0] != ooch_party[i].id) disableOochButton = true;
                } else if (item.type == 'move_unlock') {
                    if (monster_data.get(`${ooch_party[i].id}`, 'move_list').filter(mv => mv[0] == -1).length == 0 || ooch_party[i].unlocked_special_move == true) disableOochButton = true;
                } else if (item.type == 'ability_swap') {
                    if (monster_data.get(`${ooch_party[i].id}`, 'abilities').length == 1) disableOochButton = true;
                }

                ((i <= 1) ? party : party_2).addComponents(
                    new ButtonBuilder()
                        .setCustomId(`item_ooch_id_${i}_${item.id}`)
                        .setLabel(`${ooch_party[i].nickname}${item.type == 'iv' ? ` (Bonus: ${(Math.round((ooch_party[i].stats[`${item.potency}_iv`] - 1) * 20))})` : ``}`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(monster_data.get(`${ooch_party[i].id}`, 'emote'))
                        .setDisabled(disableOochButton)
                );
            }
        }

        if (ooch_party.length > 2) pa_components.push(party_2);

        // Disable the party healing button if all Oochamon are at full HP
        if (for_item == false) {
            let oochHpCheck = profile.get(`${interaction.user.id}`, 'ooch_party');
            oochHpCheck = oochHpCheck.filter(ooch => ooch.current_hp !== ooch.stats.hp);
            if (oochHpCheck.length === 0) ooch_back_button.components[1].setDisabled(true);

            pa_components.push(ooch_back_button);
        } else {
            pa_components.push(item_back_button);
        }
        return pa_components;
    }

    async function buildItemData() {
        let item_list_str = ``;
        for (const [item_id, quantity] of Object.entries(profile.get(`${interaction.user.id}`, 'other_inv'))) {
            let item_obj = await _item_data.get(`${item_id}`);
            item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`;
        }

        let other_inv_keys = Object.keys(profile.get(`${interaction.user.id}`, 'other_inv'));

        bag_select = new ActionRowBuilder();
        let other_select_options = [];
        for (let i = 0; i < other_inv_keys.length; i++) {
            let id = other_inv_keys[i];
            let amount = profile.get(`${interaction.user.id}`, `other_inv.${other_inv_keys[i]}`);

            if (amount != 0) {
                if (_item_data.get(`${id}`, 'type') != 'key' && _item_data.get(`${id}`, 'type') != 'map') {
                    other_select_options.push({
                        label: `${_item_data.get(`${id}`, 'name')} (${amount})`,
                        description: _item_data.get(`${id}`, 'description_short'),
                        value: `${id}`,
                        emoji: _item_data.get(`${id}`, 'emote'),
                    });
                }
            }
        }

        if (other_select_options.length == 0) {
            other_select_options.push({
                label: `No Usable Items.`,
                description: 'Can\'t use anything!',
                value: `n/a`
            });
        }

        bag_select.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('other_select')
                .setPlaceholder('Select an item to use in your inventory.')
                .addOptions(other_select_options));

        return [item_list_str, bag_select];
    }

    async function buildDexData(page, ooch_id) {
        let oochadex_data = profile.get(`${interaction.user.id}`, 'oochadex');
        let oochadex_sel_1 = new ActionRowBuilder();
        let oochadex_sel_options_1 = [];
        page = parseInt(page);
        let num_max = (25 * page);
        let ooch_data, oochadex_check;

        for (let i = 0 + (25 * (page - 1)); i < (25 * page); i++) {
            ooch_data = monster_data.get(`${i}`);
            oochadex_check = profile.get(`${interaction.user.id}`, `oochadex[${i}]`);
            if (oochadex_check == undefined) {
                num_max = i + 1;
                break;
            }
            oochadex_sel_options_1.push({
                label: oochadex_check.caught != 0 ? `#${i + 1}: ${ooch_data.name}` : `#${i + 1}: ???`,
                description: oochadex_check.caught != 0 ? `Caught: ${oochadex_check.caught}` : `???`,
                value: `dex_${i}`,
                emoji: oochadex_check.caught != 0 ? ooch_data.emote : undefined,
            });
        }

        oochadex_sel_1.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('oochadex_sel_1')
                .setPlaceholder(`Oochadex #${1 + (25 * (page - 1))}-#${num_max}`)
                .addOptions(oochadex_sel_options_1));


        ooch_data = monster_data.get(`${ooch_id}`);
        let ooch_img_file;
        let is_caught = false;
        if (ooch_data != undefined) {
            let ooch_abilities = ooch_data.abilities.map(v => v = ability_data.get(`${v}`, 'name'));
            ooch_img_file = get_ooch_art(ooch_data.name);
            dexEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(`${ooch_data.name} (Type: ${ooch_data.type.map(v => TypeEmote[capitalize(v)]).join('')})`)
                .setThumbnail(`attachment://${lowerCase(ooch_data.name)}.png`)
                .setDescription(`*${ooch_data.oochive_entry}*`)
                .addFields([{ name: 'Stats', value: `HP: **${ooch_data.hp}**\nATK: **${ooch_data.atk}**\nDEF: **${ooch_data.def}**\nSPD: **${ooch_data.spd}**` }])
                .addFields([{ name: 'Abilities', value: ooch_abilities.join(', ') }]);

            if (ooch_data.evo_id != -1 && ooch_data.evo_lvl != -1) {
                if (oochadex_data[ooch_data.evo_id].caught != 0) {
                    dexEmbed.setFooter({ text: `Evolves into ${monster_data.get(`${ooch_data.evo_id}`, 'name')} at level ${ooch_data.evo_lvl}`, iconURL: monster_data.get(`${ooch_data.evo_id}`, 'image') });
                } else {
                    dexEmbed.setFooter({ text: `Evolves into ??? at level ${ooch_data.evo_lvl} • Caught: ${oochadex_data[0].caught}` });
                }
            }
            is_caught = oochadex_data[ooch_data.id].caught > 0;
        }

        return { embed: dexEmbed, sel_row: oochadex_sel_1, img: ooch_img_file, is_caught: is_caught };
    }

    // Initialize all variables used across multiple sub menus here
    let selected, collectorId;
    let ooch_party, pa_components, party_idx, move_sel_idx, selected_ooch, move_list_select = new ActionRowBuilder(), move_list_select_options = [], dexEmbed, bagEmbed, heal_inv, prism_inv, key_inv, display_inv, dex_page_num, prefEmbed, pref_data, pref_desc;

    // Enable party healing button if we have healing items
    let healItems = Object.entries(user_profile.heal_inv);
    if (healItems.length != 0) {
        for (let item of healItems) {
            ooch_back_button.components[1].setDisabled(item[1] == 0);
        }
    }

    // Disable the party healing button if all Oochamon are at full HP
    let oochHpCheck = profile.get(`${interaction.user.id}`, 'ooch_party');
    //console.log(oochHpCheck)
    oochHpCheck = oochHpCheck.filter(ooch => ooch.current_hp !== ooch.stats.hp);
    if (oochHpCheck.length === 0) ooch_back_button.components[1].setDisabled(true);

    // Menu operation is handled in this collector
    await collector.on('collect', async (i) => {
        // Initialize used variables
        if (i.componentType == ComponentType.Button) {
            selected = i.customId;
            collectorId = i.customId;
        } else {
            collectorId = i.customId;
            selected = i.values[0];
        }

        //#region Back Buttons
        // Back to Main Menu
        if (selected == 'back_to_menu') {
            let user_profile = profile.get(`${interaction.user.id}`);
            await i.update({ content: `## Menu${user_profile.settings.objective ? `\n**Current Objective:** ***${user_profile.objective}***` : ``}${user_profile.repel_steps > 0 ? `\n*Repulsor Steps: ${user_profile.repel_steps}*` : ``}`, embeds: [], components: [settings_row_1, settings_row_2, settings_row_3], files: [] });
        }

        // Back to Party Select
        else if (selected == 'back_to_party') {
            ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
            pa_components = buildPartyData(ooch_party);
            i.update({ content: `**Oochamon Party:**`, components: pa_components, files: [], embeds: [] });
        }

        // Back to Oochamon View
        else if (selected == 'back_to_ooch') {
            let dexEmbed = await ooch_info_embed(selected_ooch, interaction.user.id);
            let dexPng = dexEmbed[1];
            dexEmbed = dexEmbed[0];
            let party_buttons = [party_extra_buttons, party_extra_buttons_2];

            if (inRange(selected_ooch.tame_value, 121, 200)) {
                party_buttons.push(party_extra_stance_sel);
            }

            party_buttons.push(party_back_button);

            await i.update({ content: null, embeds: [dexEmbed], files: [dexPng], components: party_buttons });
        }

        // Back to Item Select
        else if (selected == 'back_to_item') {
            let box_row = await buildItemData();
            bagEmbed.setDescription(box_row[0]);
            i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, box_row[1], back_button] });
        }

        //#endregion
        //#region Party / Party Submenu
        // Main Party Menu Button
        else if (selected == 'party') {
            ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
            pa_components = buildPartyData(ooch_party);
            i.update({ content: `**Oochamon Party:**`, components: pa_components });
        }

        // Quick Party Heal Oochamon
        else if (selected == 'quick_heal') {
            let healInv = profile.get(`${interaction.user.id}`, 'heal_inv');
            healInv = Object.entries(healInv);
            let healOptions = [];

            for (let item of healInv) {
                if (item[1] !== 0) {
                    let itemData = _item_data.get(`${item[0]}`);
                    if (itemData.type == 'potion') {
                        healOptions.push({ id: itemData.id, hp: itemData.potency, owned: item[1], used: 0, emote: itemData.emote, name: itemData.name });
                    }
                }
            }

            let oochParty = profile.get(`${interaction.user.id}`, 'ooch_party');
            for (let i = 0; i < oochParty.length; i++) {
                let hp_dif = oochParty[i].stats.hp - oochParty[i].current_hp;
                let hp_restored = 0;
                let tier_max = healOptions.length - 1;
                let tier_current = tier_max;
                let backwards = false;
                while (hp_dif - hp_restored > 0) {
                    if ((tier_current == -1) || (healOptions[tier_current].owned - healOptions[tier_current].used) == 0) {
                        tier_current += backwards ? 1 : -1;
                        if (tier_current > tier_max) { break; } //end while loop if we've run out of options
                        else if (tier_current <= 0) { backwards = true; } //start working backwards if we're out of the minimum potion
                    }
                    else if ((healOptions[tier_current].hp > hp_dif - hp_restored) && (!backwards)) {
                        if (tier_current == 0) {
                            healOptions[tier_current].used += 1;
                            hp_restored += healOptions[tier_current].hp;
                        }
                        else {
                            tier_current -= 1;
                            if (tier_current < 0) break;
                        }
                    }
                    else {
                        healOptions[tier_current].used += 1;
                        hp_restored += healOptions[tier_current].hp;
                    }
                }

                for (let i = tier_max; i >= 0; i--) {
                    while ((healOptions[i].hp <= hp_restored - hp_dif) && (healOptions[i].used > 0)) {
                        hp_restored -= healOptions[i].hp;
                        healOptions[i].used -= 1;
                    }
                }

                hp_restored = clamp(oochParty[i].current_hp + hp_restored, 0, oochParty[i].stats.hp);
                oochParty[i].current_hp = hp_restored;
                oochParty[i].alive = true;
            }

            profile.set(interaction.user.id, oochParty, 'ooch_party');
            let outputMsg = 'Potions used for quick heals:';
            healOptions.forEach(item => {
                if (item.used > 0) {
                    profile.math(interaction.user.id, '-', item.used, `heal_inv.${item.id}`);
                    outputMsg += `\n${item.emote} **${item.name}** (${item.used}x)`;
                }
            });
            pa_components = buildPartyData(oochParty);

            let followUpMsg = await interaction.followUp({ content: outputMsg });
            await i.update({ content: `**Oochamon Party:**`, components: pa_components });
            await wait(5000);
            await followUpMsg.delete().catch(() => { });
        }

        // Party Oochamon Details Menu Button
        else if (selected.includes('par_ooch_id_')) {
            selected = parseInt(selected.replace('par_ooch_id_', ''));
            party_idx = parseInt(selected);
            selected_ooch = ooch_party[party_idx];
            heal_inv = profile.get(`${interaction.user.id}`, 'heal_inv');

            // Reset the set to primary button pre-emptively so that it's ready to be used for this oochamon, unless it's already primary.
            // Also reset the heal button to be enabled or disabled based on current HP values
            party_extra_buttons.components[0].setDisabled(party_idx == 0 ? true : false);
            party_extra_buttons.components[1].setDisabled((selected_ooch.current_hp == selected_ooch.stats.hp || Object.keys(heal_inv).length == 0) ? true : false);

            // Check if we can enable the move switcher, if we have more options outside of the main 4 moves
            let available_moves = 0;
            for (let move of monster_data.get(`${selected_ooch.id}`, 'move_list')) {
                // move[0] is the level the move is learned
                if (move[0] <= selected_ooch.level && move[0] != -1) available_moves += 1;
            }
            party_extra_buttons_2.components[1].setDisabled(Boolean(available_moves < 5));

            // Check if we can evolve
            let evoLvl = monster_data.get(`${selected_ooch.id}`, 'evo_lvl');
            if (selected_ooch.level >= evoLvl && evoLvl != -1) {
                party_extra_buttons.components[2].setDisabled(false);
            } else {
                party_extra_buttons.components[2].setDisabled(true);
            }

            // Change evo button to form change if available
            if (monster_data.get(`${selected_ooch.id}`, 'form_change_evo') == true) {
                party_extra_buttons.components[2].setLabel('Change Form').setEmoji('🔁');
            } else {
                party_extra_buttons.components[2].setLabel('Evolve').setEmoji('⬆️');
            }

            // Special condition for Gnayme, must have a nickname to evolve
            if (selected_ooch.id == 109 && selected_ooch.name == selected_ooch.nickname) {
                party_extra_buttons.components[2].setDisabled(true);
            }

            dexEmbed = await ooch_info_embed(selected_ooch, interaction.user.id);
            let dexPng = dexEmbed[1];
            dexEmbed = dexEmbed[0];
            let party_buttons = [party_extra_buttons, party_extra_buttons_2];

            if (inRange(selected_ooch.tame_value, 121, 201)) {
                let available_stances = get_stance_options(selected_ooch, true);
                party_extra_stance_sel = new ActionRowBuilder();
                let stance_options = [];

                for (let stance of available_stances) {
                    stance_options.push({
                        label: `${stance.name}`,
                        description: stance.description_short.slice(0, 100),
                        value: `stance_sel_${stance.id}`
                    });
                }

                party_extra_stance_sel.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('stance_select')
                        .setPlaceholder('Select a stance to start in!')
                        .addOptions(stance_options));
                party_buttons.push(party_extra_stance_sel);
                console.log(party_buttons);
            }

            party_buttons.push(party_back_button);

            i.update({ content: null, embeds: [dexEmbed], files: [dexPng], components: party_buttons });
        }

        // Set to Primary Button
        else if (selected == 'primary') {
            ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
            // Swap the position of the selected ooch and the ooch in position 0.
            [ooch_party[0], ooch_party[party_idx]] = [ooch_party[party_idx], ooch_party[0]];
            profile.set(interaction.user.id, ooch_party, 'ooch_party');
            party_extra_buttons.components[0].setDisabled(true);
            i.update({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, party_extra_buttons_2, party_back_button] });
            let followUpMsg = await interaction.followUp({ content: 'This Oochamon is now the primary member of your party, meaning they will be sent out first in a battle.' });
            await wait(5000);
            await followUpMsg.delete().catch(() => { });
        }

        // Heal Oochamon button
        else if (selected == 'party_heal') {
            heal_inv = profile.get(`${interaction.user.id}`, 'heal_inv');
            let heal_inv_keys = Object.keys(heal_inv);

            bag_select = new ActionRowBuilder();
            let heal_select_options = [];
            for (let i = 0; i < heal_inv_keys.length; i++) {
                let id = heal_inv_keys[i];
                let amount = profile.get(`${interaction.user.id}`, `heal_inv.${heal_inv_keys[i]}`);

                if (amount != 0) {
                    if (_item_data.get(`${id}`, 'type') == 'potion') {
                        heal_select_options.push({
                            label: `${_item_data.get(`${id}`, 'name')} (${amount})`,
                            description: _item_data.get(`${id}`, 'description_short'),
                            value: `${id}`,
                            emoji: _item_data.get(`${id}`, 'emote'),
                        });
                    }
                }
            }

            bag_select.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('party_heal_select')
                    .setPlaceholder('Select an item in your inventory to heal with!')
                    .addOptions(heal_select_options));

            await i.update({ content: `**Select the healing item you'd like to use on this Oochamon!**`, components: [bag_select, back_button] });
        }

        // Oochamon Heal Select Menu
        else if (collectorId == 'party_heal_select') {
            let item_data = _item_data.get(`${selected}`);
            selected_ooch = item_use(interaction.user.id, selected_ooch, selected);
            profile.set(interaction.user.id, selected_ooch, `ooch_party[${party_idx}]`);
            let amountHealed = clamp(item_data.potency, 0, selected_ooch.stats.hp);
            await profile.math(interaction.user.id, '-', 1, `heal_inv.${selected}`);

            if (profile.get(`${interaction.user.id}`, `heal_inv.${selected}`) <= 0) {
                await profile.delete(interaction.user.id, `heal_inv.${selected}`);
            }

            // Disable the heal Oochamon button if its enabled, if we are out of healing items
            party_extra_buttons.components[1].setDisabled((Object.keys(profile.get(`${interaction.user.id}`, 'heal_inv')).length == 0) ? true : false);

            if (selected_ooch.current_hp == selected_ooch.stats.hp) party_extra_buttons.components[1].setDisabled(true);
            let dexEmbed = await ooch_info_embed(selected_ooch, interaction.user.id);
            let dexPng = dexEmbed[1];
            dexEmbed = dexEmbed[0];
            await i.update({ content: null, embeds: [dexEmbed], files: [dexPng], components: [party_extra_buttons, party_extra_buttons_2, party_back_button] });

            let followUpMsg = await interaction.followUp({ content: `Healed **${amountHealed} HP** on ${selected_ooch.emote} **${selected_ooch.nickname}** with ${item_data.emote} **${item_data.name}**` });
            await wait(2500);
            await followUpMsg.delete().catch(() => { });
        }

        // Evolve button
        else if (selected == 'evolve') {
            let oochData = monster_data.get(`${selected_ooch.id}`);
            // Nicknames by default are the oochamons name, so we use this to ensure we have the right nickname
            let nickname = selected_ooch.nickname == selected_ooch.name ? false : selected_ooch.nickname;

            let newEvoOoch = await create_ooch(oochData.evo_id, selected_ooch.level, selected_ooch.moveset, nickname, selected_ooch.current_exp, false,
                (selected_ooch.stats.hp_iv - 1) * 20,
                (selected_ooch.stats.atk_iv - 1) * 20,
                (selected_ooch.stats.def_iv - 1) * 20,
                (selected_ooch.stats.spd_iv - 1) * 20);
            let dexEmbed = await ooch_info_embed(newEvoOoch, interaction.user.id);
            let dexPng = dexEmbed[1];
            dexEmbed = dexEmbed[0];

            oochData = monster_data.get(`${newEvoOoch.id}`);

            if (oochData.evo_id == -1 || oochData.evo_lvl == -1 || newEvoOoch.level < oochData.evo_lvl) {
                party_extra_buttons.components[2].setDisabled(true);
            }

            i.update({ content: null, embeds: [dexEmbed], files: [dexPng], components: [party_extra_buttons, party_extra_buttons_2, party_back_button] });

            // Finalize putting the ooch into the database and in our menu
            profile.set(interaction.user.id, newEvoOoch, `ooch_party[${party_idx}]`);
            profile.math(interaction.user.id, '+', 1, `oochadex[${newEvoOoch.id}].caught`);

            let followUpMsg = await interaction.followUp({ content: `# You successfully evolved ${selected_ooch.emote} **${selected_ooch.name}** into ${newEvoOoch.emote} **${newEvoOoch.name}**! 🎉🎉` });
            selected_ooch = newEvoOoch;
            await wait(5000);
            await followUpMsg.delete().catch(() => { });
        }

        // Set a nickname button
        else if (selected == 'nickname') {
            let nick_filter = m => {
                if (m.author.id !== interaction.user.id) return false;

                // Check nickname length
                if (m.content.length > 16) {
                    i.followUp({ content: `Nicknames must be 16 characters or less.`, flags: MessageFlags.Ephemeral });
                    m.delete().catch(() => { });
                    return false;
                }

                // Check for Discord mentions
                if (/<@!?[0-9]+>/g.test(m.content)) {
                    i.followUp({ content: `Nicknames cannot contain Discord mentions.`, flags: MessageFlags.Ephemeral });
                    m.delete().catch(() => { });
                    return false;
                }

                // Check for line breaks
                if (/\n/.test(m.content)) {
                    i.followUp({ content: `Nicknames cannot contain line breaks.`, flags: MessageFlags.Ephemeral });
                    m.delete().catch(() => { });
                    return false;
                }

                // Check for Discord timestamps
                if (/<t:[0-9]+:[a-zA-Z]>/g.test(m.content)) {
                    i.followUp({ content: `Nicknames cannot contain Discord timestamps.`, flags: MessageFlags.Ephemeral });
                    m.delete().catch(() => { });
                    return false;
                }

                return true;
            };

            i.update({ content: `Enter a nickname for your ${selected_ooch.name}! (16 characters max, Type \`reset\` to remove the nickname.)\nCurrent Nickname is: **${selected_ooch.nickname}**`, components: [], embeds: [] });
            let nick_msg_collector = menuMsg.channel.createMessageCollector({ filter: nick_filter, max: 1 });
            nick_msg_collector.on('collect', async (msg) => {
                let new_nick = (msg.content.toLowerCase() != 'reset' ? msg.content : selected_ooch.name);
                selected_ooch.nickname = new_nick;

                // Generate a new ooch title to place into our embed
                let ooch_title = `${selected_ooch.nickname}`;
                selected_ooch.nickname != selected_ooch.name ? ooch_title += ` (${selected_ooch.name}) ${TypeEmote[capitalize(selected_ooch.type)]}` : ooch_title += ` ${TypeEmote[capitalize(selected_ooch.type)]}`;
                dexEmbed.setTitle(ooch_title);

                profile.set(interaction.user.id, new_nick, `ooch_party[${party_idx}].nickname`);
                menuMsg.edit({ content: null, embeds: [dexEmbed], components: [party_extra_buttons, party_extra_buttons_2, party_back_button] });
                await msg.delete().catch(() => { });;
            });
        }

        // Move switcher button
        else if (selected == 'moves') {
            let move_buttons = buildMoveData(selected_ooch);
            i.update({ content: `**Moves Switcher for ${selected_ooch.emote} ${selected_ooch.nickname}:**`, embeds: [], components: [move_buttons[0], move_buttons[1], sel_ooch_back_button], files: [] });
        }

        // Move switcher button/select menu handler
        else if (selected.includes('move_') && selected !== 'discord_move_buttons') {
            if (i.componentType == ComponentType.Button) { // if a move is selected
                move_list_select = new ActionRowBuilder();
                move_list_select_options = [];
                move_sel_idx = parseInt(selected.replace('move_', ''));
                let move_sel_id = selected_ooch.moveset[parseInt(selected.replace('move_', ''))];

                for (let move_data of monster_data.get(`${selected_ooch.id}`, 'move_list')) {
                    if (move_data[0] <= selected_ooch.level && !selected_ooch.moveset.includes(move_data[1])) {
                        if (move_data[0] == -1 && selected_ooch.unlocked_special_move == false) continue;
                        let db_move_data = _move_data.get(`${move_data[1]}`);
                        move_list_select_options.push(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(`${db_move_data.name} [${db_move_data.damage} Power, ${db_move_data.accuracy}% Accuracy]`)
                                .setValue(`move_sel_${db_move_data.id}`)
                                .setDescription(`${db_move_data.description.substring(0, 100)}`)
                                .setEmoji(`${type_to_emote(db_move_data.type)}`)
                        );
                    }
                }

                move_list_select.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('move_list')
                        .setPlaceholder('Select a new move here!')
                        .addOptions(move_list_select_options));

                let displayContent = `Select a move to use!`;
                let moveEmbed;
                if (move_sel_id) {
                    let move_data = _move_data.get(`${move_sel_id}`);
                    if (move_data.accuracy == -1) move_data.accuracy = 100;
                    let move_string = `
                        ${move_data.damage > 0 ? `**${move_data.damage} Power / ` : `**`}${move_data.accuracy}% Accuracy**
                            *${move_data.description}*
                        `;

                    moveEmbed = new EmbedBuilder()
                        .setTitle('Selected Move')
                        .addFields([{
                            name: `${type_to_emote([move_data.type])} ${move_data.name}`,
                            value: move_string,
                            inline: true
                        }]);

                    displayContent = ``;
                }

                i.update({ content: displayContent, embeds: [moveEmbed], components: [move_list_select, moves_back_button], files: [] });
            } else { // if a select menu move is selected
                selected = parseInt(selected.replace('move_sel_', ''));
                profile.set(interaction.user.id, selected, `ooch_party[${party_idx}].moveset[${move_sel_idx}]`);
                selected_ooch.moveset[move_sel_idx] = selected;

                // Update Dex Embed
                let moveset_str = ``;
                for (let move_id of selected_ooch.moveset) {
                    let move = _move_data.get(`${move_id}`);
                    moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${move.accuracy}%** chance to hit\n`;
                }
                dexEmbed.data.fields[0].value = moveset_str;

                let move_buttons = buildMoveData(selected_ooch);
                i.update({ content: '**Moves Switcher:**', embeds: [], components: [move_buttons[0], move_buttons[1], moves_back_button], files: [] });
            }
        }



        //#endregion
        //#region Bag / Bag Submenu
        else if (selected == 'bag') {
            heal_inv = profile.get(`${interaction.user.id}`, 'heal_inv');
            prism_inv = profile.get(`${interaction.user.id}`, 'prism_inv');
            key_inv = profile.get(`${interaction.user.id}`, 'other_inv');
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
                    bag_buttons.components[2].setStyle(ButtonStyle.Success);
                } else {
                    display_inv = prism_inv;
                    display_title = '<:item_prism:1274937161262698536> Prisms';
                    bag_buttons.components[1].setStyle(ButtonStyle.Success);
                }
                bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
            }

            if (Object.keys(heal_inv).length == 0 && Object.keys(prism_inv).length == 0 && Object.keys(key_inv).length == 0) {
                i.update({ content: `**You have no items in your bag.**`, embeds: [], components: [back_button] });
                return;
            }

            // Setup default item list for the default value, healing
            for (const [item_id, quantity] of Object.entries(display_inv)) {
                let item_obj = _item_data.get(`${item_id}`);
                item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`;
            }

            bagEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setFooter({ text: `Oochabux: $${user_profile.oochabux}` })
                .setTitle(display_title)
                .setDescription(item_list_str.length != 0 ? item_list_str : `You have no healing items in your bag.`);

            i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, back_button] });

        }

        // Heal Button
        else if (selected == 'heal_button') {
            bagEmbed.setTitle('❤️ Healing Items');
            bag_buttons.components[0].setStyle(ButtonStyle.Success);
            bag_buttons.components[1].setStyle(ButtonStyle.Secondary);
            bag_buttons.components[2].setStyle(ButtonStyle.Secondary);
            display_inv = heal_inv;
            let item_list_str = '';

            for (const [item_id, quantity] of Object.entries(display_inv)) {
                let item_obj = _item_data.get(`${item_id}`);
                item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`;
            }

            bagEmbed.setDescription(item_list_str);
            i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, back_button] });
        }

        // Prism Button
        else if (selected == 'prism_button') {
            bagEmbed.setTitle('<:item_prism:1274937161262698536> Prisms');
            bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
            bag_buttons.components[1].setStyle(ButtonStyle.Success);
            bag_buttons.components[2].setStyle(ButtonStyle.Secondary);
            display_inv = prism_inv;
            let item_list_str = '';

            for (const [item_id, quantity] of Object.entries(display_inv)) {
                let item_obj = _item_data.get(`${item_id}`);
                item_list_str += `${item_obj.emote} ${item_obj.name} | **${quantity}x**\n`;
            }

            bagEmbed.setDescription(item_list_str);
            i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, back_button] });
        }

        // Key Button
        else if (selected == 'key_button') {
            bagEmbed.setTitle('🔑 Misc Items');
            bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
            bag_buttons.components[1].setStyle(ButtonStyle.Secondary);
            bag_buttons.components[2].setStyle(ButtonStyle.Success);

            let keyData = await buildItemData();
            bagEmbed.setDescription(keyData[0]);
            await i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });
        }
        else if (collectorId == 'other_select') {
            if (selected == 'n/a') {
                let keyData = await buildItemData();
                bagEmbed.setDescription(keyData[0]);
                i.update({ content: `Can't use this item!`, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });
                return;
            }
            let item_data = _item_data.get(`${selected}`);

            if (item_data.type == 'teleport' && profile.get(`${interaction.user.id}`, 'allies_list').length != 0) {
                let keyData = await buildItemData();
                bagEmbed.setDescription(keyData[0]);
                i.update({ content: `Can't use a teleport right now!`, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });
                return;
            }

            let item_usage_text = '';
            switch (item_data.type) {
                case 'repel': item_usage_text = `Used a **${item_data.name}**, you will no longer have wild encounters for ${item_data.potency} more steps.`; break;
                case 'teleport': item_usage_text = `Used a **${item_data.name}**, and teleported back to the previously used teleporter while healing your Oochamon.`; break;
            }

            if (item_data.type == 'repel' || item_data.type == 'teleport') {
                let playspace_str;
                switch (item_data.type) {
                    case 'repel':
                        await item_use(interaction.user.id, selected_ooch, selected);
                        break;
                    case 'teleport':
                        await item_use(interaction.user.id, selected_ooch, selected);
                        playspace_str = await setup_playspace_str(interaction.user.id);
                        await interaction.channel.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                            profile.set(interaction.user.id, msg.id, 'display_msg_id');
                        });

                        await i.update({ content: 'Loading playspace' });
                        await i.deleteReply();
                        break;
                }

                await profile.math(interaction.user.id, '-', 1, `other_inv.${selected}`);
                if (profile.get(`${interaction.user.id}`, `other_inv.${selected}`) <= 0) {
                    await profile.delete(interaction.user.id, `other_inv.${selected}`);
                }

                if (item_data.type != 'teleport') {
                    let keyData = await buildItemData();
                    bagEmbed.setDescription(keyData[0]);
                    i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });
                }

                let followUpMsg = await interaction.followUp({ content: item_usage_text });
                await wait(5000);
                await followUpMsg.delete().catch(() => { });
            } else {
                let pa_components = buildPartyData(user_profile.ooch_party, true, item_data);
                i.update({ content: `Which Oochamon would you like to use the ${item_data.emote} **${item_data.name}** on?`, embeds: [], components: pa_components });
            }
        } else if (selected.includes('item_ooch_id_')) {
            let selData = selected.replace('item_ooch_id_', '');
            selData = selData.split('_');
            let selItem = _item_data.get(`${selData[1]}`);
            let item_usage_text = '';
            let oldOoch, nickname, newOoch, abilityList, currentAbility, newAbility, exp_given_ooch, level_ooch;

            switch (selItem.type) {
                case 'iv':
                    user_profile.ooch_party[selData[0]].stats[`${selItem.potency}_iv`] += 0.05;
                    item_usage_text = `Used a **${selItem.name}**, and raised the ${selItem.potency.toUpperCase()} Bonus for ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}** by 1.`;
                    break;
                case 'evolve':
                    oldOoch = user_profile.ooch_party[selData[0]];

                    // Nicknames by default are the oochamons name, so we use this to ensure we have the right nickname
                    nickname = oldOoch.nickname == oldOoch.name ? false : oldOoch.nickname;

                    newOoch = await create_ooch(selItem.potency[1], oldOoch.level, oldOoch.moveset, nickname, oldOoch.current_exp, false,
                        (oldOoch.stats.hp_iv - 1) * 20,
                        (oldOoch.stats.atk_iv - 1) * 20,
                        (oldOoch.stats.def_iv - 1) * 20,
                        (oldOoch.stats.spd_iv - 1) * 20);
                    user_profile.ooch_party[selData[0]] = newOoch;

                    profile.math(interaction.user.id, '+', 1, `oochadex[${newOoch.id}].caught`);

                    item_usage_text = `Used a **${selItem.name}**, and evolved ${oldOoch.emote} **${oldOoch.name}** into ${newOoch.emote} **${newOoch.name}**!`;
                    break;
                case 'move_unlock':
                    user_profile.ooch_party[selData[0]].unlocked_special_move = true;
                    item_usage_text = `Used the **${selItem.name}**, and unlocked the latent potential of ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}**. It can now learn special moves!`;
                    break;
                case 'ability_swap':
                    abilityList = monster_data.get(`${user_profile.ooch_party[selData[0]].id}`, 'abilities');
                    currentAbility = user_profile.ooch_party[selData[0]].ability;

                    newAbility = abilityList.find(ability => ability !== currentAbility);
                    user_profile.ooch_party[selData[0]].ability = newAbility;

                    item_usage_text = `Swapped ability from **${ability_data.get(`${currentAbility}`, 'name')}** to **${ability_data.get(`${newAbility}`, 'name')}** for ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}**.`;
                    break;
                case 'give_exp':
                    if (user_profile.ooch_party[selData[0]].level >= 50) {
                        let keyData = await buildItemData();
                        bagEmbed.setDescription(keyData[0]);
                        i.update({ content: `This Oochamon is level 50, and cannot level up any further.`, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });
                        return;
                    }

                    exp_given_ooch = item_use(interaction.user.id, user_profile.ooch_party[selData[0]], selItem.id);

                    user_profile.ooch_party[selData[0]] = exp_given_ooch[0];
                    item_usage_text = exp_given_ooch[1];
                    break;
                case 'level_up':
                    if (user_profile.ooch_party[selData[0]].level >= 50) {
                        let keyData = await buildItemData();
                        bagEmbed.setDescription(keyData[0]);
                        i.update({ content: `This Oochamon is level 50, and cannot level up any further.`, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });
                        return;
                    }

                    level_ooch = item_use(interaction.user.id, user_profile.ooch_party[selData[0]], selItem.id);

                    user_profile.ooch_party[selData[0]] = level_ooch[0];
                    item_usage_text = level_ooch[1];
                    break;
            }

            profile.set(interaction.user.id, user_profile.ooch_party, 'ooch_party');

            await profile.math(interaction.user.id, '-', 1, `other_inv.${selData[1]}`);
            if (profile.get(`${interaction.user.id}`, `other_inv.${selData[1]}`) <= 0) {
                await profile.delete(interaction.user.id, `other_inv.${selData[1]}`);
            }

            let keyData = await buildItemData();
            bagEmbed.setDescription(keyData[0]);
            i.update({ content: ``, embeds: [bagEmbed], components: [bag_buttons, keyData[1], back_button] });

            let followUpMsg = await interaction.followUp({ content: item_usage_text });
            await wait(5000);
            await followUpMsg.delete().catch(() => { });

        }




        //#endregion
        //#region Map Submenu
        // Map
        else if (selected == 'map') {
            let map_name = user_profile.location_data.area;
            if (map_name.includes('everchange')) return i.update({ content: `**Everchange Cave does not have a map!**` });
            let map_item = _item_data.find('potency', map_name);
            if (map_item == undefined) return i.update({ content: `**You don't have the map for this area yet...**` });

            if (Object.prototype.hasOwnProperty.call(user_profile.other_inv, `${map_item.id}`)) {
                let mapImage = get_art_file(`./Art/MapArt/map_${map_name}.png`);
                i.update({ content: `**Map**`, files: [mapImage], components: [back_button] });
            }
            else {
                i.update({ content: `**You don't have the map for this area yet...**`, components: [back_button] });
            }
        }




        //#endregion
        //#region Dex Menu
        // Oochadex Menu Button
        else if (selected == 'oochadex') {
            let dexData = await buildDexData(1, 0);
            dex_page_num = 1;

            if (dexData.is_caught) {
                i.update({
                    content: null,
                    embeds: [dexData.embed], components: [dexData.sel_row, dex_arrows], files: [dexData.img]
                });
            } else {
                i.update({
                    content: 'You have not caught this Oochamon yet! Go out there and catch it in the wild!',
                    embeds: [], components: [dexData.sel_row, dex_arrows], files: []
                });
            }
        }

        // Dex Select Menus
        else if (selected.includes('dex_left') || selected.includes('dex_right')) {
            selected == 'dex_left' ? dex_page_num -= 1 : dex_page_num += 1;
            if (dex_page_num > 5) {
                dex_page_num = 1;
            } else if (dex_page_num < 1) {
                dex_page_num = 5;
            }

            let dexData = await buildDexData(dex_page_num, dex_page_num * 25);

            if (dexData.is_caught) {
                i.update({
                    content: null,
                    embeds: [dexData.embed], components: [dexData.sel_row, dex_arrows], files: [dexData.img]
                });
            } else {
                i.update({
                    content: 'You have not caught this Oochamon yet! Go out there and catch it in the wild!',
                    embeds: [], components: [dexData.sel_row, dex_arrows], files: []
                });
            }
        } else if (selected.includes('dex_')) {
            let dexData = await buildDexData(dex_page_num, selected.replace('dex_', ''));

            if (dexData.is_caught) {
                i.update({
                    content: null,
                    embeds: [dexData.embed], components: [dexData.sel_row, dex_arrows], files: [dexData.img]
                });
            } else {
                i.update({
                    content: 'You have not caught this Oochamon yet! Go out there and catch it in the wild!',
                    embeds: [], components: [dexData.sel_row, dex_arrows], files: []
                });
            }
        }




        //#endregion
        //#region Preferences Menu
        // Preferences Button
        else if (selected == 'preferences') {
            user_profile = profile.get(`${interaction.user.id}`);
            pref_data = user_profile.settings;
            pref_desc = [`Show Controls Message: **${pref_data.controls_msg === true ? `✅` : `❌`}**`,
            `Battle Text Cleanup: **${pref_data.battle_cleanup === true ? `✅` : `❌`}**`,
            `Zoom Level: **\`${pref_data.zoom.split('_')[0]}x${pref_data.zoom.split('_')[1]}\`**`,
            `Battle Speed: **\`${pref_data.battle_speed === 1250 ? `Fast` : `Normal`}\`**`,
            `Discord Move Buttons: ${pref_data.discord_move_buttons === true ? `✅` : `❌`}`,
            `Objective Indicator: ${pref_data.objective === true ? `✅` : `❌`}`];

            prefEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('⚙️ Preferences ⚙️')
                .setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }

        // Graphics Switcher
        else if (selected == 'controls_msg') {
            await profile.set(interaction.user.id, !(user_profile.settings.controls_msg), 'settings.controls_msg');
            pref_desc[0] = `Show Controls Message: **${profile.get(`${interaction.user.id}`, 'settings.controls_msg') === true ? `✅` : `❌`}**`;
            user_profile = profile.get(`${interaction.user.id}`);
            await prefEmbed.setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }

        // Battle Cleanup Option
        else if (selected == 'battle_cleanup') {
            await profile.set(interaction.user.id, !(user_profile.settings.battle_cleanup), 'settings.battle_cleanup');
            pref_desc[1] = `Battle Text Cleanup: **${profile.get(`${interaction.user.id}`, 'settings.battle_cleanup') === true ? `✅` : `❌`}**`;
            user_profile = profile.get(`${interaction.user.id}`);
            await prefEmbed.setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }

        // Zoom Level Option
        else if (selected == 'zoom_level') {
            if (user_profile.settings.zoom == '5_5') {
                await profile.set(interaction.user.id, '7_7', 'settings.zoom');
            } else if (user_profile.settings.zoom == '7_7') {
                await profile.set(interaction.user.id, '9_7', 'settings.zoom');
            } else if (user_profile.settings.zoom == '9_7') {
                await profile.set(interaction.user.id, '7_9', 'settings.zoom');
            } else if (user_profile.settings.zoom == '7_9') {
                await profile.set(interaction.user.id, '5_5', 'settings.zoom');
            }

            user_profile = await profile.get(`${interaction.user.id}`);
            pref_desc[2] = `Zoom Level: **\`${user_profile.settings.zoom.split('_')[0]}x${user_profile.settings.zoom.split('_')[1]}\`**`;
            await prefEmbed.setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }

        // Battle Speed Option
        else if (selected == 'battle_speed') {
            if (user_profile.settings.battle_speed == 1250) {
                user_profile.settings.battle_speed = 2500;
            } else {
                user_profile.settings.battle_speed = 1250;
            }

            await profile.set(interaction.user.id, user_profile.settings.battle_speed, 'settings.battle_speed');
            pref_desc[3] = `Battle Speed: **\`${user_profile.settings.battle_speed == 1250 ? `Fast` : `Normal`}\`**`;
            user_profile = profile.get(`${interaction.user.id}`);
            await prefEmbed.setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }

        // Discord Movement Buttons Option
        else if (selected == 'discord_move_buttons') {
            await profile.set(interaction.user.id, !(user_profile.settings.discord_move_buttons), 'settings.discord_move_buttons');
            pref_desc[4] = `Discord Move Buttons: ${profile.get(`${interaction.user.id}`, 'settings.discord_move_buttons') === true ? `✅` : `❌`}`;
            user_profile = profile.get(`${interaction.user.id}`);
            await prefEmbed.setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }

        // Objective Indicator
        else if (selected == 'objective') {
            await profile.set(interaction.user.id, !(user_profile.settings.objective), 'settings.objective');
            pref_desc[5] = `Objective Indicator: ${profile.get(`${interaction.user.id}`, 'settings.objective') === true ? `✅` : `❌`}`;
            user_profile = profile.get(`${interaction.user.id}`);
            await prefEmbed.setDescription(pref_desc.join('\n'));
            await i.update({ content: '**Preferences:**', embeds: [prefEmbed], components: [pref_sel_menu, back_button] });
        }



        //#endregion
        //#region Quit Button (back to playspace)
        else if (selected == 'quit') {
            let playspace_str = await setup_playspace_str(interaction.user.id);
            collector.stop();

            await interaction.channel.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                profile.set(interaction.user.id, msg.id, 'display_msg_id');
            });

            await profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
            await i.update({ content: null });
            await i.deleteReply();
        }

        user_profile = profile.get(`${interaction.user.id}`);
    });
}