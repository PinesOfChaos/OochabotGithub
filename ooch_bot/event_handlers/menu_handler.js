import { ActionRowBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder, MessageFlags, ButtonBuilder, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, SectionBuilder, SeparatorBuilder, ThumbnailBuilder, SeparatorSpacingSize } from 'discord.js';
import { profile, move_data, monster_data, item_data, ability_data, menu_data } from '../db.js';
import { inRange, clamp } from 'lodash-es';
import wait from 'wait';
import { setup_playspace_str, create_ooch, remove_item, get_all_item_type, get_inv_item, add_item } from '../func_play.js';
import { ItemCategory, ItemType, PlayerState, TamingAction } from '../types.js';
import { type_to_emote, item_use, get_stance_options } from '../func_battle.js';
import { get_art_file, get_emote_string, setup_taming_picture, get_tame_string, pet_text, feed_text, update_tame_value, walk_get_rewards, get_ooch_art, ooch_info_container } from '../func_other.js';

// Menu operation is handled in this
export async function menu_handler(interaction, init=false) {
    let menu_id = interaction.user.id

    // If init, create a new menu session
    if (!menu_data.has(menu_id)) {
        menu_data.set(menu_id, {
            user_id: interaction.user.id,
            party_idx: 0,
            move_sel_idx: 0,
            dex_page_num: 1,
            selected_ooch: null
        });
    }

    const pre = `menu_${menu_id}_`;

    let settings_row_1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}party`).setLabel('Oochamon').setStyle(ButtonStyle.Success).setEmoji(get_emote_string('item_prism'))).addComponents(
                new ButtonBuilder().setCustomId(`${pre}bag`).setLabel('Oochabag').setStyle(ButtonStyle.Danger).setEmoji('🎒'));

    let settings_row_2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}map`).setLabel('Oochamap').setStyle(ButtonStyle.Primary).setEmoji(get_emote_string('item_map')))
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}oochadex`).setLabel('Oochadex').setStyle(ButtonStyle.Secondary).setEmoji('📱'));

    let settings_row_3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}preferences`).setLabel('Preferences').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')).addComponents(
                new ButtonBuilder().setCustomId(`${pre}quit`).setLabel('Return').setStyle(ButtonStyle.Danger).setEmoji('🔙'));

    // Back Buttons
    let back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}main_back`).setLabel('Back To Menu').setStyle(ButtonStyle.Danger)
        );

    let ooch_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}main_back`).setLabel('Back To Menu').setStyle(ButtonStyle.Danger)
        )
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}quick_heal`).setLabel('Quick Heal Party').setStyle(ButtonStyle.Success).setEmoji('❤️')
        );

    let sel_ooch_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}oochamon_back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    let party_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}party_back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    let item_back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}main_back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    // Party Menu Extra Buttons
    let party_extra_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}party_primary`).setLabel('Set As Primary').setStyle(ButtonStyle.Success).setEmoji('👑')).addComponents(
                new ButtonBuilder().setCustomId(`${pre}party_heal`).setLabel('Heal Oochamon').setStyle(ButtonStyle.Success).setEmoji(get_emote_string('item_potion_magic')).setDisabled(true)).addComponents(
                    new ButtonBuilder().setCustomId(`${pre}party_evolve`).setLabel('Evolve').setStyle(ButtonStyle.Success).setDisabled(true).setEmoji('⬆️')
                );

    let party_extra_buttons_2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}nickname`).setLabel('Edit Nickname').setStyle(ButtonStyle.Primary).setEmoji('📝')).addComponents(
                new ButtonBuilder().setCustomId(`${pre}moves`).setLabel('Edit Moves').setStyle(ButtonStyle.Primary).setDisabled(true).setEmoji('💢')).addComponents(
                    new ButtonBuilder().setCustomId(`${pre}taming`).setLabel('Taming Grounds').setStyle(ButtonStyle.Primary).setDisabled(true).setEmoji('❤️')
                );

    let party_extra_stance_sel = new ActionRowBuilder();

    function buildStanceSel(ooch) {
        const opts = get_stance_options(ooch, true).map(s => ({
            label: s.name,
            description: s.description_short.slice(0, 100),
            value: `stance_sel_${s.id}`
        }));
        return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('stance_select')
                .setPlaceholder('Select a stance to start in!')
                .addOptions(opts)
        );
    }

    let bag_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}consumable_button`).setStyle(ButtonStyle.Success).setEmoji('🎒')).addComponents(
            new ButtonBuilder().setCustomId(`${pre}prism_button`).setStyle(ButtonStyle.Secondary).setEmoji(get_emote_string('item_prism'))).addComponents(
            new ButtonBuilder().setCustomId(`${pre}map_button`).setStyle(ButtonStyle.Secondary).setEmoji(get_emote_string('item_map'))).addComponents(
            new ButtonBuilder().setCustomId(`${pre}key_button`).setStyle(ButtonStyle.Secondary).setEmoji('🔑')).addComponents(
            new ButtonBuilder().setCustomId(`${pre}skin_button`).setStyle(ButtonStyle.Secondary).setEmoji(get_emote_string('c_000')));

    // Dex arrows
    let dex_arrows = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}dex_left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}dex_right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}main_back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    // Taming Buttons
    let taming_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}taming_feed`).setLabel('Feed').setEmoji('🍪').setStyle(ButtonStyle.Success).setDisabled(false)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}taming_pet`).setLabel('Pet').setEmoji('🫳').setStyle(ButtonStyle.Success).setDisabled(false)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}taming_walk`).setLabel('Walk').setEmoji('🚶').setStyle(ButtonStyle.Success).setDisabled(false)
        );

    // Preference Select Menu
    let pref_sel_menu = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}pref`)
                .setPlaceholder('Change a preference with this menu!')
                .addOptions(
                    {
                        label: 'Show Controls Msg',
                        description: 'Set whether you want to see the controls msg when starting up Oochamon.',
                        value: `${pre}controls_msg`,
                    },
                    {
                        label: 'Battle Text Cleanup',
                        description: 'Set whether battle text should be deleted after a battle or not.',
                        value: `${pre}battle_cleanup`,
                    },
                    {
                        label: 'Zoom Level',
                        description: 'Set the window size of the game. (5x5 to 11x11)',
                        value: `${pre}zoom_level`,
                    },
                    {
                        label: 'Battle Speed',
                        description: 'Set the battle event speed.',
                        value: `${pre}battle_speed`,
                    },
                    {
                        label: 'Discord Move Buttons',
                        description: 'Add buttons you can click to move your character.',
                        value: `${pre}discord_move_buttons`,
                    },
                    {
                        label: 'Objective Indicator',
                        description: 'See a message displaying your current objective.',
                        value: `${pre}objective`,
                    }));

    /**
     * Builds a standard menu container with header text and action rows
     * @param {string} headerText - The header/content text for the menu
     * @param {Array} actionRows - Array of ActionRowBuilder objects
     * @param {Object} options - Optional settings like footerText, imageUrl
     * @returns {ContainerBuilder}
     */
    function buildMenuContainer(headerText, actionRows, options = {}) {
        const container = new ContainerBuilder();

        if (headerText) {
            const header = new TextDisplayBuilder().setContent(headerText);
            container.addTextDisplayComponents(header);
        }

        if (options.imageUrl) {
            const gallery = new MediaGalleryBuilder().addItems({ media: { url: options.imageUrl } });
            container.addMediaGalleryComponents(gallery);
        }

        if (options.addSeparator) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        }

        for (let row of actionRows) {
            container.addActionRowComponents(row);
        }

        if (options.footerText) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            const footer = new TextDisplayBuilder().setContent(`*${options.footerText}*`);
            container.addTextDisplayComponents(footer);
        }

        return container;
    }

    /**
     * Builds an Oochamon info container using SectionBuilder with thumbnail
     * @param {Object} oochInfo - Result from ooch_info_container()
     * @param {Array} actionRows - Array of ActionRowBuilder objects
     * @returns {ContainerBuilder}
     */
    function buildOochInfoContainer(oochInfo, actionRows) {
        const container = new ContainerBuilder();

        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(oochInfo.infoText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${oochInfo.fileName}`));

        container.addSectionComponents(section);

        if (oochInfo.footerText) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*${oochInfo.footerText}*`));
        }

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        for (let row of actionRows) {
            container.addActionRowComponents(row);
        }

        return container;
    }

    /**
     * Builds a bag/inventory container
     * @param {string} title - The bag category title
     * @param {string} itemList - The formatted item list string
     * @param {Array} actionRows - Array of ActionRowBuilder objects
     * @param {number} oochabux - The user's oochabux amount
     * @returns {ContainerBuilder}
     */
    function buildBagContainer(title, itemList, actionRows, oochabux) {
        const container = new ContainerBuilder();

        const header = new TextDisplayBuilder().setContent(`## ${title}`);
        container.addTextDisplayComponents(header);

        if (itemList) {
            const content = new TextDisplayBuilder().setContent(itemList);
            container.addTextDisplayComponents(content);
        }

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        for (let row of actionRows) {
            container.addActionRowComponents(row);
        }

        const footer = new TextDisplayBuilder().setContent(`*Oochabux: $${oochabux}*`);
        container.addTextDisplayComponents(footer);

        return container;
    }

    /**
     * Builds an Oochadex entry container
     * @param {Object} dexData - Data from buildDexData
     * @param {Array} actionRows - Array of ActionRowBuilder objects
     * @returns {ContainerBuilder}
     */
    function buildDexContainer(dexData, actionRows) {
        const container = new ContainerBuilder();

        if (dexData.is_caught && dexData.oochData) {
            const ooch = dexData.oochData;
            let headerText = `# ${ooch.name} ${type_to_emote(ooch.type)}`;
            const header = new TextDisplayBuilder().setContent(headerText);
            container.addTextDisplayComponents(header);

            let statsText = `*${ooch.oochive_entry}*\n`;
            statsText += `### Stats:\nHP: **${ooch.hp}** | ATK: **${ooch.atk}** | DEF: **${ooch.def}** | SPD: **${ooch.spd}**\n`;
            statsText += `### Abilities:\n${dexData.abilities.join(', ')}`;

            const section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(statsText))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${ooch.name.toLowerCase().replace("'", "")}.png`));

            container.addSectionComponents(section);

            if (dexData.evoText) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*${dexData.evoText}*`));
            }
        } else {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent('You have not caught this Oochamon yet! Go out there and catch it in the wild!'));
        }

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        for (let row of actionRows) {
            container.addActionRowComponents(row);
        }

        return container;
    }

    /**
     * Builds a taming UI container with image
     * @param {Object} ooch - The oochamon being tamed
     * @param {string} tamingStatus - The current taming status string
     * @param {string} description - Optional description text
     * @param {Array} actionRows - Array of ActionRowBuilder objects
     * @param {Object} options - Additional options like fieldsText
     * @returns {ContainerBuilder}
     */
    function buildTamingContainer(ooch, tamingStatus, description, actionRows, options = {}) {
        const container = new ContainerBuilder();

        const header = new TextDisplayBuilder().setContent(`## Oochamon Taming for ${ooch.nickname}`);
        container.addTextDisplayComponents(header);

        const gallery = new MediaGalleryBuilder().addItems({ media: { url: 'attachment://file.jpg' } });
        container.addMediaGalleryComponents(gallery);

        if (description) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*${description}*`));
        }

        if (options.fieldsText) {
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options.fieldsText));
        }

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        for (let row of actionRows) {
            container.addActionRowComponents(row);
        }

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Taming Status: ${tamingStatus}*`));

        return container;
    }

    /**
     * Builds a preferences container
     * @param {Array} prefDescriptions - Array of preference description strings
     * @param {Array} actionRows - Array of ActionRowBuilder objects
     * @returns {ContainerBuilder}
     */
    function buildPreferencesContainer(prefDescriptions, actionRows) {
        const container = new ContainerBuilder();

        const header = new TextDisplayBuilder().setContent(`## ⚙️ Preferences ⚙️`);
        container.addTextDisplayComponents(header);

        const content = new TextDisplayBuilder().setContent(prefDescriptions.join('\n'));
        container.addTextDisplayComponents(content);

        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        for (let row of actionRows) {
            container.addActionRowComponents(row);
        }

        return container;
    }

    // Initialize all variables used across multiple sub menus here
    let customId, selected, bag_select;
    let ooch_party, pa_components, move_list_select = new ActionRowBuilder(), move_list_select_options = [],
    heal_inv, consumable_inv, prism_inv, key_inv, map_inv, skin_inv, display_inv;
    let user_profile = profile.get(`${interaction.user.id}`);
    let menuMsg = interaction.message;

    if (user_profile.play_thread_id != interaction.channel.id) {
        return interaction.user.send('Stop trying to use other peoples buttons! They are not for you!')
    }

    consumable_inv = user_profile.inventory[ItemCategory.Consumable];
    prism_inv = user_profile.inventory[ItemCategory.Prism];
    key_inv = user_profile.inventory[ItemCategory.Key];
    skin_inv = user_profile.inventory[ItemCategory.Skin];
    map_inv = user_profile.inventory[ItemCategory.Map];

    // Get persistent data from menu_data
    let menu_state = menu_data.get(menu_id);
    let party_idx = menu_state.party_idx;
    let move_sel_idx = menu_state.move_sel_idx;
    let selected_ooch = menu_state.selected_ooch;
    let dex_page_num = menu_state.dex_page_num;

    let pref_data = user_profile.settings;
    let pref_desc = [`Show Controls Message: **${pref_data.controls_msg === true ? `✅` : `❌`}**`,
        `Battle Text Cleanup: **${pref_data.battle_cleanup === true ? `✅` : `❌`}**`,
        `Zoom Level: **\`${pref_data.zoom.split('_')[0]}x${pref_data.zoom.split('_')[1]}\`**`,
        `Battle Speed: **\`${pref_data.battle_speed === 1250 ? `Fast` : `Normal`}\`**`,
        `Discord Move Buttons: ${pref_data.discord_move_buttons === true ? `✅` : `❌`}`,
        `Objective Indicator: ${pref_data.objective === true ? `✅` : `❌`}`];

    ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');

    if (init) {
        let menuHeaderText = `# Menu`;
        if (user_profile.settings.objective) menuHeaderText += `\n**Current Objective:** ***${user_profile.objective}***`;
        if (user_profile.repel_steps > 0) menuHeaderText += `\n*Repulsor Steps: ${user_profile.repel_steps}*`;

        const initContainer = buildMenuContainer(menuHeaderText, [settings_row_1, settings_row_2, settings_row_3]);
        await interaction.editReply({ components: [initContainer], flags: MessageFlags.IsComponentsV2 });
        return;
    }

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
                move_name = move_data.get(`${move_id}`, 'name');
                move_type = move_data.get(`${move_id}`, 'type');
            }

            if (!move_name) continue;

            move_buttons[move_idx].addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}move_${i}`)
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
                        .setCustomId(`${pre}par_ooch_id_${i}`)
                        .setLabel(`Lv. ${ooch_party[i].level} ${ooch_party[i].nickname} (HP: ${ooch_party[i].current_hp}/${ooch_party[i].stats.hp})${canEvolve == true ? ' ⏫' : ``}`)
                        .setStyle((ooch_party[i].alive) ? ((i == 0) ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Danger)
                        .setEmoji(monster_data.get(`${ooch_party[i].id}`, 'emote'))
                );
            } else {
                if (item.type == ItemType.IV) {
                    if (ooch_party[i].stats[`${item.potency}_iv`] >= 1.5) disableOochButton = true;
                } else if (item.type == ItemType.Evolve) {
                    if (item.potency[0] != ooch_party[i].id) disableOochButton = true;
                } else if (item.type == ItemType.MoveUnlock) {
                    if (monster_data.get(`${ooch_party[i].id}`, 'move_list').filter(mv => mv[0] == -1).length == 0 || ooch_party[i].unlocked_special_move == true) disableOochButton = true;
                } else if (item.type == ItemType.AbilitySwap) {
                    if (monster_data.get(`${ooch_party[i].id}`, 'abilities').length == 1) disableOochButton = true;
                }

                ((i <= 1) ? party : party_2).addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${pre}item_ooch_id_${i}_${item.id}`)
                        .setLabel(`${ooch_party[i].nickname}${item.type == ItemType.IV ? ` (Bonus: ${(Math.round((ooch_party[i].stats[`${item.potency}_iv`] - 1) * 20))})` : ``}`)
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

    async function buildItemData(inv) {
        let item_list_str = ``;
        let item_inv = profile.get(`${interaction.user.id}`, `inventory.${inv}`);
        bag_select = new ActionRowBuilder();
        let select_options = [];

        for (const item of item_inv) {
            let item_obj = item_data.get(`${item.id}`);
            item_list_str += `${item_obj.emote} ${item_obj.name} | **${item.quantity}x**\n`;

            if (item.quantity != 0) {
                if (item_obj.type != ItemType.Status && item_obj.type != ItemType.Treat) {
                    select_options.push({
                        label: `${item_obj.name}${item.quantity > 1 ? ` (${item.quantity})` : ``}`,
                        description: item_obj.description_short,
                        value: `${item.id}`,
                        emoji: item_obj.emote,
                    });
                }
            }
        }

        if (select_options.length == 0) {
            select_options.push({
                label: `No Usable Items.`,
                description: 'Can\'t use anything!',
                value: `n/a`
            });
        }

        bag_select.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}${inv}_select`)
                .setPlaceholder('Select an item to use in your inventory.')
                .addOptions(select_options));

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
                .setCustomId(`${pre}oochadex_sel_1`)
                .setPlaceholder(`Oochadex #${1 + (25 * (page - 1))}-#${num_max}`)
                .addOptions(oochadex_sel_options_1));


        ooch_data = monster_data.get(`${ooch_id}`);
        let ooch_img_file;
        let is_caught = false;
        let ooch_abilities = [];
        let evoText = '';

        if (ooch_data != undefined) {
            ooch_abilities = ooch_data.abilities.map(v => ability_data.get(`${v}`, 'name'));
            ooch_img_file = get_ooch_art(ooch_data.name);

            if (ooch_data.evo_id != -1 && ooch_data.evo_lvl != -1) {
                if (oochadex_data[ooch_data.evo_id] && oochadex_data[ooch_data.evo_id].caught != 0) {
                    evoText = `Evolves into ${monster_data.get(`${ooch_data.evo_id}`, 'name')} at level ${ooch_data.evo_lvl}${ooch_data.special_evo ? ' after a special condition is fulfilled' : ''}`;
                } else {
                    evoText = `Evolves into ??? at level ${ooch_data.evo_lvl}${ooch_data.special_evo ? ' after a special condition is fulfilled' : ''}`;
                }
            }
            is_caught = oochadex_data[ooch_data.id] && oochadex_data[ooch_data.id].caught > 0;
        }

        return {
            sel_row: oochadex_sel_1,
            img: ooch_img_file,
            is_caught: is_caught,
            oochData: ooch_data,
            abilities: ooch_abilities,
            evoText: evoText
        };
    }


    // Initialize used variables
    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
        selected = interaction.customId;
    } else {
        customId = interaction.customId;
        selected = interaction.values[0];
    }

    // Remove the prefix to get the action part
    let action = customId.replace(pre, '');

    let dex_components = [party_extra_buttons, party_extra_buttons_2]

    if (selected_ooch) {
        if (inRange(selected_ooch.tame_value, 121, 201)) {
            party_extra_stance_sel = buildStanceSel(selected_ooch);
            dex_components.push(party_extra_stance_sel);
        }
    }

    dex_components.push(party_back_button);

    //#region Back Buttons
    // Back to Main Menu
    if (action == 'main_back') {
        let user_profile = profile.get(`${interaction.user.id}`);
        let menuHeaderText = `# Menu`;
        if (user_profile.settings.objective) menuHeaderText += `\n**Current Objective:** ***${user_profile.objective}***`;
        if (user_profile.repel_steps > 0) menuHeaderText += `\n*Repulsor Steps: ${user_profile.repel_steps}*`;

        const mainMenuContainer = buildMenuContainer(menuHeaderText, [settings_row_1, settings_row_2, settings_row_3]);
        await interaction.update({ components: [mainMenuContainer], files: [], flags: MessageFlags.IsComponentsV2 });
    }

    // Back to Party Select
    if (action == 'party_back') {
        ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
        pa_components = buildPartyData(ooch_party);
        const partyContainer = buildMenuContainer(`## Oochamon Party:`, pa_components);
        interaction.update({ components: [partyContainer], files: [], flags: MessageFlags.IsComponentsV2 });
    }

    // Back to Oochamon View
    if (action == 'oochamon_back') {
        selected_ooch = profile.get(interaction.user.id, `ooch_party[${party_idx}]`);
        heal_inv = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);

        party_extra_buttons.components[0].setDisabled(party_idx == 0 ? true : false);
        party_extra_buttons.components[1].setDisabled((selected_ooch.current_hp == selected_ooch.stats.hp || heal_inv.length == 0) ? true : false);

        let available_moves = 0;
        for (let move of monster_data.get(`${selected_ooch.id}`, 'move_list')) {
            if (move[0] <= selected_ooch.level && move[0] != -1) available_moves += 1;
        }
        party_extra_buttons_2.components[1].setDisabled(Boolean(available_moves < 5));

        let evoLvl = monster_data.get(`${selected_ooch.id}`, 'evo_lvl');
        if (selected_ooch.level >= evoLvl && evoLvl != -1) {
            party_extra_buttons.components[2].setDisabled(false);
        } else {
            party_extra_buttons.components[2].setDisabled(true);
        }

        if (monster_data.get(`${selected_ooch.id}`, 'form_change_evo') == true) {
            party_extra_buttons.components[2].setLabel('Change Form').setEmoji('🔁');
        } else {
            party_extra_buttons.components[2].setLabel('Evolve').setEmoji('⬆️');
        }

        if (selected_ooch.id == 109 && selected_ooch.name == selected_ooch.nickname) {
            party_extra_buttons.components[2].setDisabled(true);
        }

        /*if (user_profile.flags.includes('ev_tamagoochi'))*/ party_extra_buttons_2.components[2].setDisabled(false);

        let oochInfo = await ooch_info_container(selected_ooch, interaction.user.id);
        let party_buttons = [party_extra_buttons, party_extra_buttons_2];

        if (inRange(selected_ooch.tame_value, 121, 201)) {
            party_extra_stance_sel = buildStanceSel(selected_ooch);
            party_buttons.push(party_extra_stance_sel);
        }

        party_buttons.push(party_back_button);

        const oochBackContainer = buildOochInfoContainer(oochInfo, party_buttons);
        await interaction.update({ components: [oochBackContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });
    }

    // Back to Item Select
    if (action == 'item_back') {
        let box_row = await buildItemData(ItemCategory.Consumable);
        user_profile = profile.get(`${interaction.user.id}`);
        const bagContainer = buildBagContainer('🎒 Consumable Items', box_row[0], [bag_buttons, box_row[1], back_button], user_profile.oochabux);
        interaction.update({ components: [bagContainer], flags: MessageFlags.IsComponentsV2 });
    }

    //#endregion
    //#region Party / Party Submenu
    // Main Party Menu Button
    if (action == 'party') {
        ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
        pa_components = buildPartyData(ooch_party);
        const partyContainer = buildMenuContainer(`## Oochamon Party:`, pa_components);
        interaction.update({ components: [partyContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Quick Party Heal Oochamon
    if (action == 'quick_heal') {

        // Stop the if all Oochamon are at full HP
        let oochHpCheck = profile.get(`${interaction.user.id}`, 'ooch_party');
        oochHpCheck = oochHpCheck.filter(ooch => ooch.current_hp !== ooch.stats.hp);
        if (oochHpCheck.length === 0) {
            return await interaction.followUp({ content: 'You already have full healed Oochamon!' })
        }


        let healInv = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);
        let healOptions = [];

        if (healInv.length == 0) {
            return await interaction.followUp({ content: 'You have no potions to use!' })
        }

        for (let item of healInv) {
            if (item.quantity !== 0) {
                let itemData = item_data.get(`${item.id}`);
                if (itemData.type == ItemType.Potion) {
                    healOptions.push({ id: itemData.id, hp: itemData.potency, owned: item.quantity, used: 0, emote: itemData.emote, name: itemData.name });
                }
            }
        }

        let oochParty = profile.get(`${interaction.user.id}`, 'ooch_party');
        for (let interaction = 0; interaction < oochParty.length; interaction++) {
            let hp_dif = oochParty[interaction].stats.hp - oochParty[interaction].current_hp;
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

            for (let interaction = tier_max; interaction >= 0; interaction--) {
                while ((healOptions[interaction].hp <= hp_restored - hp_dif) && (healOptions[interaction].used > 0)) {
                    hp_restored -= healOptions[interaction].hp;
                    healOptions[interaction].used -= 1;
                }
            }

            hp_restored = clamp(oochParty[interaction].current_hp + hp_restored, 0, oochParty[interaction].stats.hp);
            oochParty[interaction].current_hp = hp_restored;
            oochParty[interaction].alive = true;
        }

        profile.set(interaction.user.id, oochParty, 'ooch_party');
        let outputMsg = 'Potions used for quick heals:';
        healOptions.forEach(item => {
            if (item.used > 0) {
                remove_item(interaction.user.id, item.id, item.used);
                outputMsg += `\n${item.emote} **${item.name}** (${item.used}x)`;
            }
        });
        pa_components = buildPartyData(oochParty);

        const quickHealContainer = buildMenuContainer(`## Oochamon Party:`, pa_components);
        await interaction.update({ components: [quickHealContainer], flags: MessageFlags.IsComponentsV2 });
        let followUpMsg = await interaction.followUp({ content: outputMsg });
        await wait(5000);
        await followUpMsg.delete().catch(() => { });
    }

    // Party Oochamon Details Menu Button
    if (action.includes('par_ooch_id_')) {
        selected = parseInt(action.replace('par_ooch_id_', ''));
        party_idx = parseInt(selected);
        selected_ooch = ooch_party[party_idx];

        // Update menu state
        menu_data.set(menu_id, { ...menu_state, party_idx, selected_ooch });
        heal_inv = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);

        // Reset the set to primary button pre-emptively so that it's ready to be used for this oochamon, unless it's already primary.
        // Also reset the heal button to be enabled or disabled based on current HP values
        party_extra_buttons.components[0].setDisabled(party_idx == 0 ? true : false);
        party_extra_buttons.components[1].setDisabled((selected_ooch.current_hp == selected_ooch.stats.hp || heal_inv.length == 0) ? true : false);

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

        // If we have the tamagoochi flag, then enable oochamon taming.
        /*if (user_profile.flags.includes('ev_tamagoochi'))*/ party_extra_buttons_2.components[2].setDisabled(false);

        let oochInfo = await ooch_info_container(selected_ooch, interaction.user.id);
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
        }

        party_buttons.push(party_back_button);

        const partyOochContainer = buildOochInfoContainer(oochInfo, party_buttons);
        interaction.update({ components: [partyOochContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });
    }

    // Set to Primary Button
    if (action == 'party_primary') {
        ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
        // Swap the position of the selected ooch and the ooch in position 0.
        [ooch_party[0], ooch_party[party_idx]] = [ooch_party[party_idx], ooch_party[0]];
        party_idx = 0;
        profile.set(interaction.user.id, ooch_party, 'ooch_party');
        menu_data.set(menu_id, { ...menu_state, party_idx, selected_ooch });
        party_extra_buttons.components[0].setDisabled(true);

        let oochInfo = await ooch_info_container(selected_ooch, interaction.user.id);
        const primaryContainer = buildOochInfoContainer(oochInfo, dex_components);
        await interaction.update({ components: [primaryContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });
        let followUpMsg = await interaction.followUp({ content: 'This Oochamon is now the primary member of your party, meaning they will be sent out first in a battle.' });
        await wait(5000);
        await followUpMsg.delete().catch(() => { });
    }

    // Heal Oochamon button
    if (action == 'party_heal') {
        heal_inv = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);

        bag_select = new ActionRowBuilder();
        let heal_select_options = [];
        for (let item of heal_inv) {
            let db_item_data = item_data.get(`${item.id}`);

            if (item.quantity != 0) {
                if (db_item_data.type == ItemType.Potion) {
                    heal_select_options.push({
                        label: `${db_item_data.name} (${item.quantity})`,
                        description: db_item_data.description_short,
                        value: `${item.id}`,
                        emoji: db_item_data.emote,
                    });
                }
            }
        }

        bag_select.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}party_heal_select`)
                .setPlaceholder('Select an item in your inventory to heal with!')
                .addOptions(heal_select_options));

        const healSelectContainer = buildMenuContainer(`**Select the healing item you'd like to use on this Oochamon!**`, [bag_select, back_button]);
        await interaction.update({ components: [healSelectContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Oochamon Heal Select Menu
    if (action == 'party_heal_select') {
        let db_item_data = item_data.get(`${selected}`);
        selected_ooch = await item_use(interaction.user.id, selected_ooch, selected, false, true);
        profile.set(interaction.user.id, selected_ooch, `ooch_party[${party_idx}]`);
        let amountHealed = clamp(db_item_data.potency, 0, selected_ooch.stats.hp);
        let heal_inv = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);

        // Disable the heal Oochamon button if its enabled, if we are out of healing items
        party_extra_buttons.components[1].setDisabled(heal_inv.length == 0 ? true : false);

        if (selected_ooch.current_hp == selected_ooch.stats.hp) party_extra_buttons.components[1].setDisabled(true);
        let oochInfo = await ooch_info_container(selected_ooch, interaction.user.id);
        const healedContainer = buildOochInfoContainer(oochInfo, dex_components);
        await interaction.update({ components: [healedContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });

        let followUpMsg = await interaction.followUp({ content: `Healed **${amountHealed} HP** on ${selected_ooch.emote} **${selected_ooch.nickname}** with ${db_item_data.emote} **${db_item_data.name}**` });
        await wait(2500);
        await followUpMsg.delete().catch(() => { });
    }

    // Evolve button
    if (action == 'party_evolve') {
        let oochData = monster_data.get(`${selected_ooch.id}`);
        // Nicknames by default are the oochamons name, so we use this to ensure we have the right nickname
        let nickname = selected_ooch.nickname == selected_ooch.name ? false : selected_ooch.nickname;

        let newEvoOoch = await create_ooch(oochData.evo_id, {
            level: selected_ooch.level,
            move_list: selected_ooch.moveset,
            nickname: nickname,
            cur_exp: selected_ooch.current_exp,
            hp_iv : (selected_ooch.stats.hp_iv - 1) * 20,
            atk_iv: (selected_ooch.stats.atk_iv - 1) * 20,
            def_iv: (selected_ooch.stats.def_iv - 1) * 20,
            spd_iv: (selected_ooch.stats.spd_iv - 1) * 20,
            variant: selected_ooch.variant

        });
        let oochInfo = await ooch_info_container(newEvoOoch, interaction.user.id);

        oochData = monster_data.get(`${newEvoOoch.id}`);

        if (oochData.evo_id == -1 || oochData.evo_lvl == -1 || newEvoOoch.level < oochData.evo_lvl) {
            party_extra_buttons.components[2].setDisabled(true);
        }

        const evolveContainer = buildOochInfoContainer(oochInfo, dex_components);
        await interaction.update({ components: [evolveContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });

        // Finalize putting the ooch into the database and in our menu
        profile.set(interaction.user.id, newEvoOoch, `ooch_party[${party_idx}]`);
        profile.math(interaction.user.id, '+', 1, `oochadex[${newEvoOoch.id}].caught`);

        let followUpMsg = await interaction.followUp({ content: `# You successfully evolved ${selected_ooch.emote} **${selected_ooch.name}** into ${newEvoOoch.emote} **${newEvoOoch.name}**!` });
        selected_ooch = newEvoOoch;
        await wait(5000);
        await followUpMsg.delete().catch(() => { });
    }

    // Set a nickname button
    if (action == 'nickname') {
        let nick_filter = m => {
            if (m.author.id !== interaction.user.id) return false;

            // Check nickname length
            if (m.content.length > 16) {
                interaction.followUp({ content: `Nicknames must be 16 characters or less.`, flags: MessageFlags.Ephemeral });
                m.delete().catch(() => { });
                return false;
            }

            // Check for Discord mentions
            if (/<@!?[0-9]+>/g.test(m.content)) {
                interaction.followUp({ content: `Nicknames cannot contain Discord mentions.`, flags: MessageFlags.Ephemeral });
                m.delete().catch(() => { });
                return false;
            }

            // Check for line breaks
            if (/\n/.test(m.content)) {
                interaction.followUp({ content: `Nicknames cannot contain line breaks.`, flags: MessageFlags.Ephemeral });
                m.delete().catch(() => { });
                return false;
            }

            // Check for Discord timestamps
            if (/<t:[0-9]+:[a-zA-Z]>/g.test(m.content)) {
                interaction.followUp({ content: `Nicknames cannot contain Discord timestamps.`, flags: MessageFlags.Ephemeral });
                m.delete().catch(() => { });
                return false;
            }

            return true;
        };

        const nicknameContainer = buildMenuContainer(`Enter a nickname for your ${selected_ooch.name}! (16 characters max, Type \`reset\` to remove the nickname.)\nCurrent Nickname is: **${selected_ooch.nickname}**`, []);
        interaction.update({ components: [nicknameContainer], flags: MessageFlags.IsComponentsV2 });
        let nick_msg_collector = menuMsg.channel.createMessageCollector({ filter: nick_filter, max: 1 });
        nick_msg_collector.on('collect', async (msg) => {
            let new_nick = (msg.content.toLowerCase() != 'reset' ? msg.content : selected_ooch.name);
            selected_ooch.nickname = new_nick;

            profile.set(interaction.user.id, new_nick, `ooch_party[${party_idx}].nickname`);

            let oochInfo = await ooch_info_container(selected_ooch, interaction.user.id);
            const nicknameResultContainer = buildOochInfoContainer(oochInfo, dex_components);

            menuMsg.edit({ components: [nicknameResultContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });
            await msg.delete().catch(() => { });
        });
    }

    if (customId == `${pre}stance_select`) {
        selected = parseInt(selected.replace('stance_sel_', ''));
        profile.set(interaction.user.id, selected, `ooch_party[${party_idx}].starting_stance`);

        let oochInfo = await ooch_info_container(selected_ooch, interaction.user.id);
        const stanceContainer = buildOochInfoContainer(oochInfo, dex_components);
        interaction.update({ components: [stanceContainer], files: [oochInfo.file], flags: MessageFlags.IsComponentsV2 });
        let followUpMsg = await interaction.followUp({ content: 'You\'ve changed your starting stance!' });
        await wait(5000);
        await followUpMsg.delete().catch(() => { });
    }

    // Move switcher button
    if (action == 'moves') {
        let move_buttons = buildMoveData(selected_ooch);
        const moveSwitcherContainer = buildMenuContainer(`**Moves Switcher for ${selected_ooch.emote} ${selected_ooch.nickname}:**`, [move_buttons[0], move_buttons[1], sel_ooch_back_button]);
        interaction.update({ components: [moveSwitcherContainer], files: [], flags: MessageFlags.IsComponentsV2 });
    }

    // Move switcher button/select menu handler
    if (action.includes('move_') && !action.includes('discord_move_buttons')) {
        if (interaction.componentType == ComponentType.Button) { // if a move is selected
            move_list_select = new ActionRowBuilder();
            move_list_select_options = [];
            move_sel_idx = parseInt(action.replace('move_', ''));
            let move_sel_id = selected_ooch.moveset[parseInt(action.replace('move_', ''))];

            for (let db_move_at_lv of monster_data.get(`${selected_ooch.id}`, 'move_list')) {
                if (db_move_at_lv[0] <= selected_ooch.level && !selected_ooch.moveset.includes(db_move_at_lv[1])) {
                    if (db_move_at_lv[0] == -1 && selected_ooch.unlocked_special_move == false) continue;

                    let db_move_data = move_data.get(`${db_move_at_lv[1]}`);
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
                    .setCustomId(`${pre}move_list`)
                    .setPlaceholder('Select a new move here!')
                    .addOptions(move_list_select_options));

            // Update menu state with move selection index
            menu_data.set(menu_id, { ...menu_state, move_sel_idx });

            let displayContent = `**Selected Move:**\n`;
            if (move_sel_id) {
                let db_move_data = move_data.get(`${move_sel_id}`);
                if (db_move_data.accuracy == -1) db_move_data.accuracy = 100;
                displayContent += `${type_to_emote([db_move_data.type])} **${db_move_data.name}**\n`;
                displayContent += `${db_move_data.damage > 0 ? `**${db_move_data.damage} Power / ` : `**`}${db_move_data.accuracy}% Accuracy**\n`;
                displayContent += `*${db_move_data.description}*`;
            } else {
                displayContent = `Select a move to use!`;
            }

            const moveSelectContainer = buildMenuContainer(displayContent, [move_list_select, sel_ooch_back_button]);
            interaction.update({ components: [moveSelectContainer], files: [], flags: MessageFlags.IsComponentsV2 });
        } else if (selected.includes('move_sel_')) { // if a select menu move is selected
            selected = parseInt(selected.replace(`move_sel_`, ''));
            profile.set(interaction.user.id, selected, `ooch_party[${party_idx}].moveset[${move_sel_idx}]`);
            selected_ooch.moveset[move_sel_idx] = selected;

            let move_buttons = buildMoveData(selected_ooch);
            const moveSwitcherConfirmContainer = buildMenuContainer(`**Moves Switcher:**`, [move_buttons[0], move_buttons[1], sel_ooch_back_button]);
            interaction.update({ components: [moveSwitcherConfirmContainer], files: [], flags: MessageFlags.IsComponentsV2 });
        }
    }



    //#endregion
    //#region Taming Menu

    if (action == 'taming') {
        const taming_image = await setup_taming_picture(selected_ooch);
        const taming_status = await get_tame_string(selected_ooch.tame_value);

        if (user_profile.walk_taken) taming_buttons.components[2].setDisabled(true);

        const tamingContainer = buildTamingContainer(selected_ooch, taming_status, null, [taming_buttons, sel_ooch_back_button]);
        interaction.update({ components: [tamingContainer], files: [taming_image], flags: MessageFlags.IsComponentsV2 });
    }

    if (action == 'taming_feed') {

        let treat_inv = get_all_item_type(interaction.user.id, ItemCategory.Treat, ItemType.Treat);

        if (treat_inv.length == 0) {
            return interaction.update({ content: null });
        }

        let treat_select = new ActionRowBuilder();
        let treat_select_options = [];
        for (let item of treat_inv) {
            let db_item_data = item_data.get(`${item.id}`);

            if (item.quantity != 0) {
                treat_select_options.push({
                    label: `${db_item_data.name} (${item.quantity})`,
                    description: db_item_data.description_short,
                    value: `taming_feed_id_${item.id}`,
                    emoji: db_item_data.emote,
                });
            }
        }

        treat_select.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}taming_feed_item_select`)
                .setPlaceholder(`Select a treat for ${selected_ooch.nickname}!`)
                .addOptions(treat_select_options));

        const feedSelectContainer = buildMenuContainer(`**Select a treat for ${selected_ooch.nickname}:**`, [treat_select, sel_ooch_back_button]);
        interaction.update({ components: [feedSelectContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (action.includes('taming_feed_id_') || customId.includes('taming_feed_item_select')) {
        const feed_item_id = selected.split('_')[3];
        const food_data = item_data.get(feed_item_id);
        const taming_image = await setup_taming_picture(selected_ooch, TamingAction.Feed);

        let feed_result = selected_ooch.type.includes(food_data.potency) || food_data.potency == -1;
        if (feed_result) {
            selected_ooch = update_tame_value(selected_ooch, selected_ooch.tame_value + (food_data.potency == -1 ? 5 : 10));
        } else {
            selected_ooch = update_tame_value(selected_ooch, selected_ooch.tame_value - 10);
        }
        remove_item(interaction.user.id, feed_item_id, 1);

        user_profile.ooch_party[party_idx] = selected_ooch;

        const taming_feed_text = feed_text(selected_ooch.nickname, feed_result);
        const taming_status = get_tame_string(selected_ooch.tame_value);

        if (user_profile.walk_taken) taming_buttons.components[2].setDisabled(true);

        const feedResultContainer = buildTamingContainer(selected_ooch, taming_status, taming_feed_text, [taming_buttons, sel_ooch_back_button]);
        interaction.update({ components: [feedResultContainer], files: [taming_image], flags: MessageFlags.IsComponentsV2 });
    }

    if (action == 'taming_pet') {
        const taming_image = await setup_taming_picture(selected_ooch, TamingAction.Pet);
        const taming_status = get_tame_string(selected_ooch.tame_value);
        const taming_pet_text = pet_text(selected_ooch.nickname, selected_ooch.tame_value);

        if (user_profile.walk_taken) taming_buttons.components[2].setDisabled(true);

        const petContainer = buildTamingContainer(selected_ooch, taming_status, taming_pet_text, [taming_buttons, sel_ooch_back_button]);
        interaction.update({ components: [petContainer], files: [taming_image], flags: MessageFlags.IsComponentsV2 });
    }

    if (action == 'taming_walk') {
        const taming_image = await setup_taming_picture(selected_ooch, TamingAction.Walk);
        const taming_status = get_tame_string(selected_ooch.tame_value);
        const taming_walk_data = walk_get_rewards(selected_ooch.nickname, selected_ooch.tame_value, selected_ooch.level);

        for (let loot of taming_walk_data.loot) {
            add_item(interaction.user.id, loot.id, loot.count);
        }

        let loot_field_str = taming_walk_data.loot.map(item => {
            let db_item_data = item_data.get(`${item.id}`);
            return `- ${db_item_data.emote} ${db_item_data.name} (${item.count}x)`;
        }).join('\n');

        profile.set(interaction.user.id, true, 'walk_taken');
        user_profile.walk_taken = true;
        taming_buttons.components[2].setDisabled(true);

        const walkContainer = buildTamingContainer(selected_ooch, taming_status, taming_walk_data.walk_text, [taming_buttons, sel_ooch_back_button], { fieldsText: `**Items Received From Walking:**\n${loot_field_str}` });
        interaction.update({ components: [walkContainer], files: [taming_image], flags: MessageFlags.IsComponentsV2 });
    }



    //#endregion
    //#region Bag / Bag Submenu
    if (action == 'bag') {
        consumable_inv = user_profile.inventory[ItemCategory.Consumable];
        prism_inv = user_profile.inventory[ItemCategory.Prism];
        key_inv = user_profile.inventory[ItemCategory.Key];
        skin_inv = user_profile.inventory[ItemCategory.Skin];
        map_inv = user_profile.inventory[ItemCategory.Map];
        display_inv = consumable_inv;
        let display_title = '🎒 Consumable Items';
        let item_list_str = '';

        if (consumable_inv.length == 0) bag_buttons.components[0].setDisabled(true);
        if (prism_inv.length == 0) bag_buttons.components[1].setDisabled(true);
        if (map_inv.length == 0) bag_buttons.components[2].setDisabled(true);
        if (key_inv.length == 0) bag_buttons.components[3].setDisabled(true);
        if (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror')) bag_buttons.components[4].setDisabled(true);

        if (bag_buttons.components[0].data.disabled == true) {
            if (bag_buttons.components[1].data.disabled == true) {
                display_inv = skin_inv;
                display_title = `${get_emote_string('c_000')} Skins`;
                bag_buttons.components[4].setStyle(ButtonStyle.Success);
            } else if (bag_buttons.components[2].data.disabled == true) {
                display_inv = key_inv;
                display_title = '🔑 Key Items';
                bag_buttons.components[3].setStyle(ButtonStyle.Success);
            } else if (bag_buttons.components[3].data.disabled == true) {
                display_inv = map_inv;
                display_title = `${get_emote_string('item_map')} Maps`;
                bag_buttons.components[2].setStyle(ButtonStyle.Success);
            } else if (bag_buttons.components[4].data.disabled == true) {
                display_inv = prism_inv;
                display_title = `${get_emote_string('item_prism')} Prisms`;
                bag_buttons.components[1].setStyle(ButtonStyle.Success);
            }

            bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
        }

        if (consumable_inv.length == 0 && prism_inv.length == 0 && key_inv.length == 0 && map_inv.length == 0 && (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror'))) {
            const emptyBagContainer = buildMenuContainer(`**You have no items in your bag.**`, [back_button]);
            interaction.update({ components: [emptyBagContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        // Setup default item list for the default value, healing
        let consumableData = await buildItemData(ItemCategory.Consumable);
        item_list_str = consumableData[0];

        if (item_list_str.length != 0) {
            const bagContainer = buildBagContainer(display_title, item_list_str, [bag_buttons, consumableData[1], back_button], user_profile.oochabux);
            interaction.update({ components: [bagContainer], flags: MessageFlags.IsComponentsV2 });
        } else {
            const bagContainer = buildBagContainer(display_title, 'You have no items in your bag.', [bag_buttons, back_button], user_profile.oochabux);
            interaction.update({ components: [bagContainer], flags: MessageFlags.IsComponentsV2 });
        }

    }

    // Consumable Button
    if (action == 'consumable_button') {
        if (consumable_inv.length == 0) bag_buttons.components[0].setDisabled(true);
        if (prism_inv.length == 0) bag_buttons.components[1].setDisabled(true);
        if (map_inv.length == 0) bag_buttons.components[2].setDisabled(true);
        if (key_inv.length == 0) bag_buttons.components[3].setDisabled(true);
        if (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror')) bag_buttons.components[4].setDisabled(true);

        bag_buttons.components[0].setStyle(ButtonStyle.Success);
        bag_buttons.components[1].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[2].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[3].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[4].setStyle(ButtonStyle.Secondary);

        let consumableData = await buildItemData(ItemCategory.Consumable);
        const consumableContainer = buildBagContainer('🎒 Consumable Items', consumableData[0], [bag_buttons, consumableData[1], back_button], user_profile.oochabux);
        interaction.update({ components: [consumableContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Prism Button
    if (action == 'prism_button') {
        prism_inv = user_profile.inventory[ItemCategory.Prism];

        if (consumable_inv.length == 0) bag_buttons.components[0].setDisabled(true);
        if (prism_inv.length == 0) bag_buttons.components[1].setDisabled(true);
        if (map_inv.length == 0) bag_buttons.components[2].setDisabled(true);
        if (key_inv.length == 0) bag_buttons.components[3].setDisabled(true);
        if (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror')) bag_buttons.components[4].setDisabled(true);

        bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[1].setStyle(ButtonStyle.Success);
        bag_buttons.components[2].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[3].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[4].setStyle(ButtonStyle.Secondary);
        display_inv = prism_inv;
        let item_list_str = '';

        for (const item of display_inv) {
            let item_obj = item_data.get(`${item.id}`);
            item_list_str += `${item_obj.emote} ${item_obj.name}${item.quantity > 1 ? ` | **${item.quantity}x**\n` : `\n`}`;
        }

        const prismContainer = buildBagContainer(`${get_emote_string('item_prism')} Prisms`, item_list_str, [bag_buttons, back_button], user_profile.oochabux);
        interaction.update({ components: [prismContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Map Button
    if (action == 'map_button') {
        map_inv = user_profile.inventory[ItemCategory.Map];

        if (consumable_inv.length == 0) bag_buttons.components[0].setDisabled(true);
        if (prism_inv.length == 0) bag_buttons.components[1].setDisabled(true);
        if (map_inv.length == 0) bag_buttons.components[2].setDisabled(true);
        if (key_inv.length == 0) bag_buttons.components[3].setDisabled(true);
        if (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror')) bag_buttons.components[4].setDisabled(true);

        bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[1].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[2].setStyle(ButtonStyle.Success);
        bag_buttons.components[3].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[4].setStyle(ButtonStyle.Secondary);
        display_inv = map_inv;
        let item_list_str = '';

        for (const item of display_inv) {
            let item_obj = item_data.get(`${item.id}`);
            item_list_str += `${item_obj.emote} ${item_obj.name}${item.quantity > 1 ? ` | **${item.quantity}x**\n` : `\n`}`;
        }

        const mapBagContainer = buildBagContainer(`${get_emote_string('item_map')} Maps`, item_list_str, [bag_buttons, back_button], user_profile.oochabux);
        interaction.update({ components: [mapBagContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Key Button
    if (action == 'key_button') {
        key_inv = user_profile.inventory[ItemCategory.Key];

        if (consumable_inv.length == 0) bag_buttons.components[0].setDisabled(true);
        if (prism_inv.length == 0) bag_buttons.components[1].setDisabled(true);
        if (map_inv.length == 0) bag_buttons.components[2].setDisabled(true);
        if (key_inv.length == 0) bag_buttons.components[3].setDisabled(true);
        if (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror')) bag_buttons.components[4].setDisabled(true);

        bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[1].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[2].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[3].setStyle(ButtonStyle.Success);
        bag_buttons.components[4].setStyle(ButtonStyle.Secondary);
        display_inv = key_inv;
        let item_list_str = '';

        for (const item of display_inv) {
            let item_obj = item_data.get(`${item.id}`);
            item_list_str += `${item_obj.emote} ${item_obj.name}${item.quantity > 1 ? ` | **${item.quantity}x**\n` : `\n`}`;
        }

        const keyContainer = buildBagContainer('🔑 Misc Items', item_list_str, [bag_buttons, back_button], user_profile.oochabux);
        await interaction.update({ components: [keyContainer], flags: MessageFlags.IsComponentsV2 });
    }
    if (customId == `${pre}${ItemCategory.Consumable}_select`) {
        if (selected == 'n/a') {
            let keyData = await buildItemData(ItemCategory.Consumable);
            const cantUseContainer = buildBagContainer('🎒 Consumable Items', keyData[0], [bag_buttons, keyData[1], back_button], user_profile.oochabux);
            await interaction.update({ components: [cantUseContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }
        let db_item_data = item_data.get(`${selected}`);

        if (db_item_data.type == ItemType.Teleport && profile.get(`${interaction.user.id}`, 'allies_list').length != 0) {
            let keyData = await buildItemData(ItemCategory.Consumable);
            const cantTeleportContainer = buildBagContainer('🎒 Consumable Items', keyData[0], [bag_buttons, keyData[1], back_button], user_profile.oochabux);
            await interaction.update({ components: [cantTeleportContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        let item_usage_text = '';
        switch (db_item_data.type) {
            case ItemType.Repel: item_usage_text = `Used a **${db_item_data.name}**, you will no longer have wild encounters for ${db_item_data.potency} more steps.`; break;
            case ItemType.Teleport: item_usage_text = `Used a **${db_item_data.name}**, and teleported back to the previously used teleporter while healing your Oochamon.`; break;
        }

        if (db_item_data.type == ItemType.Repel || db_item_data.type == ItemType.Teleport) {
            let playspace_str;
            switch (db_item_data.type) {
                case ItemType.Repel:
                    await item_use(interaction.user.id, selected_ooch, selected, false, true);
                    break;
                case ItemType.Teleport:
                    await item_use(interaction.user.id, selected_ooch, selected, false, true);
                    playspace_str = await setup_playspace_str(interaction.user.id);
                    await interaction.channel.send({ components: playspace_str.components, flags: playspace_str.flags }).then(msg => {
                        profile.set(interaction.user.id, msg.id, 'display_msg_id');
                    });

                    await interaction.update({ content: "Deleting message...", components: [] });
                    await interaction.deleteReply();
                    break;
            }

            if (db_item_data.type != ItemType.Teleport) {
                let consumableData = await buildItemData(ItemCategory.Consumable);
                const repelContainer = buildBagContainer('🎒 Consumable Items', consumableData[0], [bag_buttons, consumableData[1], back_button], user_profile.oochabux);
                await interaction.update({ components: [repelContainer], flags: MessageFlags.IsComponentsV2 });
            }

            let followUpMsg = await interaction.followUp({ content: item_usage_text });
            await wait(5000);
            await followUpMsg.delete().catch(() => { });
        } else {
            let pa_components = buildPartyData(user_profile.ooch_party, true, db_item_data);
            const itemOochSelectContainer = buildMenuContainer(`Which Oochamon would you like to use the ${db_item_data.emote} **${db_item_data.name}** on?`, pa_components);
            await interaction.update({ components: [itemOochSelectContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }
    if (action == 'skin_button') {
        if (consumable_inv.length == 0) bag_buttons.components[0].setDisabled(true);
        if (prism_inv.length == 0) bag_buttons.components[1].setDisabled(true);
        if (map_inv.length == 0) bag_buttons.components[2].setDisabled(true);
        if (key_inv.length == 0) bag_buttons.components[3].setDisabled(true);
        if (skin_inv.length == 0 || !profile.get(`${interaction.user.id}`, 'flags').includes('ev_magic_mirror')) bag_buttons.components[4].setDisabled(true);

        bag_buttons.components[0].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[1].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[2].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[3].setStyle(ButtonStyle.Secondary);
        bag_buttons.components[4].setStyle(ButtonStyle.Success);

        let skinData = await buildItemData(ItemCategory.Skin);
        const skinContainer = buildBagContainer(`${get_emote_string('c_000')} Skin Items`, skinData[0] == '' ? 'None' : skinData[0], [bag_buttons, skinData[1], back_button], user_profile.oochabux);
        await interaction.update({ components: [skinContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (customId == `${pre}${ItemCategory.Skin}_select`) {
        if (selected == 'n/a') {
            let keyData = await buildItemData(ItemCategory.Skin);
            const cantUseSkinContainer = buildBagContainer(`${get_emote_string('c_000')} Skin Items`, keyData[0], [bag_buttons, keyData[1], back_button], user_profile.oochabux);
            interaction.update({ components: [cantUseSkinContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        let db_item_data = item_data.get(`${selected}`);
        let item_usage_text = `Changed your skin to ${get_emote_string(db_item_data.potency)}!`;
        profile.set(interaction.user.id, db_item_data.potency, 'player_sprite');

        let skinData = await buildItemData(ItemCategory.Skin);
        const skinChangedContainer = buildBagContainer(`${get_emote_string('c_000')} Skin Items`, skinData[0], [bag_buttons, skinData[1], back_button], user_profile.oochabux);
        await interaction.update({ components: [skinChangedContainer], flags: MessageFlags.IsComponentsV2 });

        let followUpMsg = await interaction.followUp({ content: item_usage_text });
        await wait(5000);
        await followUpMsg.delete().catch(() => { });
    }

    if (customId.includes(`${pre}item_ooch_id_`)) {
        let selData = selected.replace(pre, '').replace('item_ooch_id_', '');
        selData = selData.split('_');
        let selItem = item_data.get(`${selData[1]}`);
        let item_usage_text = '';
        let oldOoch, nickname, newOoch, abilityList, currentAbility, newAbility, exp_given_ooch, level_ooch;

        switch (selItem.type) {
            case ItemType.Potion:
                user_profile.ooch_party[selData[0]].current_hp += selItem.potency
                user_profile.ooch_party[selData[0]].current_hp = clamp(user_profile.ooch_party[selData[0]].current_hp, 0, user_profile.ooch_party[selData[0]].stats.hp);
                item_usage_text = `Used a **${selItem.name}**, and healed ${selItem.potency} HP for ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}**.`;
                remove_item(interaction.user.id, selItem.id, 1)
            break;
            case ItemType.IV:
                user_profile.ooch_party[selData[0]].stats[`${selItem.potency}_iv`] += 0.05;
                item_usage_text = `Used a **${selItem.name}**, and raised the ${selItem.potency.toUpperCase()} Bonus for ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}** by 1.`;
                remove_item(interaction.user.id, selItem.id, 1)
                break;
            case ItemType.Evolve:
                oldOoch = user_profile.ooch_party[selData[0]];

                // Nicknames by default are the oochamons name, so we use this to ensure we have the right nickname
                nickname = oldOoch.nickname == oldOoch.name ? false : oldOoch.nickname;

                newOoch = await create_ooch(selItem.potency[1], {
                    level: oldOoch.level, 
                    move_list: oldOoch.moveset, 
                    nickname: nickname, 
                    current_exp: oldOoch.current_exp,
                    hp_iv: (oldOoch.stats.hp_iv - 1) * 20,
                    atk_iv: (oldOoch.stats.atk_iv - 1) * 20,
                    def_iv: (oldOoch.stats.def_iv - 1) * 20,
                    spd_iv: (oldOoch.stats.spd_iv - 1) * 20,
                    variant: oldOoch.variant
                });
                user_profile.ooch_party[selData[0]] = newOoch;

                profile.math(interaction.user.id, '+', 1, `oochadex[${newOoch.id}].caught`);

                item_usage_text = `Used a **${selItem.name}**, and evolved ${oldOoch.emote} **${oldOoch.name}** into ${newOoch.emote} **${newOoch.name}**!`;
                remove_item(interaction.user.id, selItem.id, 1)
                break;
            case ItemType.MoveUnlock:
                user_profile.ooch_party[selData[0]].unlocked_special_move = true;
                item_usage_text = `Used the **${selItem.name}**, and unlocked the latent potential of ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}**. It can now learn special moves!`;
                remove_item(interaction.user.id, selItem.id, 1)
                break;
            case ItemType.AbilitySwap:
                abilityList = monster_data.get(`${user_profile.ooch_party[selData[0]].id}`, 'abilities');
                currentAbility = user_profile.ooch_party[selData[0]].ability;

                newAbility = abilityList.find(ability => ability !== currentAbility);
                user_profile.ooch_party[selData[0]].ability = newAbility;
                user_profile.ooch_party[selData[0]].og_ability = newAbility;

                item_usage_text = `Swapped ability from **${ability_data.get(`${currentAbility}`, 'name')}** to **${ability_data.get(`${newAbility}`, 'name')}** for ${user_profile.ooch_party[selData[0]].emote} **${user_profile.ooch_party[selData[0]].name}**.`;
                
                remove_item(interaction.user.id, selItem.id, 1)
                
                break;
            case ItemType.GiveExp:
                if (user_profile.ooch_party[selData[0]].level >= 50) {
                    let keyData = await buildItemData(ItemCategory.Consumable);
                    const maxLevelExpContainer = buildBagContainer('🎒 Consumable Items', keyData[0], [bag_buttons, keyData[1], back_button], user_profile.oochabux);
                    interaction.update({ components: [maxLevelExpContainer], flags: MessageFlags.IsComponentsV2 });
                    let maxLvlMsg = await interaction.followUp({ content: `This Oochamon is level 50, and cannot level up any further.` });
                    await wait(3000);
                    await maxLvlMsg.delete().catch(() => { });
                    return;
                }

                exp_given_ooch = await item_use(interaction.user.id, user_profile.ooch_party[selData[0]], selItem.id, false, true);

                user_profile.ooch_party[selData[0]] = exp_given_ooch[0];
                item_usage_text = exp_given_ooch[1];
                break;
            case ItemType.LevelUp:
                if (user_profile.ooch_party[selData[0]].level >= 50) {
                    let keyData = await buildItemData(ItemCategory.Consumable);
                    const maxLevelContainer = buildBagContainer('🎒 Consumable Items', keyData[0], [bag_buttons, keyData[1], back_button], user_profile.oochabux);
                    interaction.update({ components: [maxLevelContainer], flags: MessageFlags.IsComponentsV2 });
                    let maxLvlMsg = await interaction.followUp({ content: `This Oochamon is level 50, and cannot level up any further.` });
                    await wait(3000);
                    await maxLvlMsg.delete().catch(() => { });
                    return;
                }

                level_ooch = await item_use(interaction.user.id, user_profile.ooch_party[selData[0]], selItem.id, false, true);

                user_profile.ooch_party[selData[0]] = level_ooch[0];
                item_usage_text = level_ooch[1];
                break;
        }

        profile.set(interaction.user.id, user_profile.ooch_party, 'ooch_party');

        let consumableData = await buildItemData(ItemCategory.Consumable);
        const itemUsedContainer = buildBagContainer('🎒 Consumable Items', consumableData[0], [bag_buttons, consumableData[1], back_button], user_profile.oochabux);
        interaction.update({ components: [itemUsedContainer], flags: MessageFlags.IsComponentsV2 });

        let followUpMsg = await interaction.channel.send({ content: item_usage_text });
        await wait(5000);
        await followUpMsg.delete().catch(() => { });

    }




    //#endregion
    //#region Map Submenu
    // Map
    if (action == 'map') {
        let map_name = user_profile.location_data.area;
        if (map_name.includes('everchange')) {
            const noMapContainer = buildMenuContainer(`**Everchange Cave does not have a map!**`, [back_button]);
            return interaction.update({ components: [noMapContainer], flags: MessageFlags.IsComponentsV2 });
        }
        let map_item = item_data.find('potency', map_name);
        if (map_item == undefined) {
            const noMapYetContainer = buildMenuContainer(`**You don't have the map for this area yet...**`, [back_button]);
            return interaction.update({ components: [noMapYetContainer], flags: MessageFlags.IsComponentsV2 });
        }

        if (get_inv_item(interaction.user.id, ItemCategory.Map, map_item.id)) {
            let mapImage = get_art_file(`./Art/MapArt/map_${map_name}.png`);
            const mapDisplayContainer = buildMenuContainer(`## Map`, [back_button], { imageUrl: `attachment://map_${map_name}.png` });
            interaction.update({ components: [mapDisplayContainer], files: [mapImage], flags: MessageFlags.IsComponentsV2 });
        } else {
            const noMapFoundContainer = buildMenuContainer(`**You don't have the map for this area yet...**`, [back_button]);
            interaction.update({ components: [noMapFoundContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }




    //#endregion
    //#region Dex Menu
    // Oochadex Menu Button
    if (action == 'oochadex') {
        let dexData = await buildDexData(1, 0);
        dex_page_num = 1;

        // Update menu state
        menu_data.set(menu_id, { ...menu_state, dex_page_num });

        const dexContainer = buildDexContainer(dexData, [dexData.sel_row, dex_arrows]);
        if (dexData.is_caught) {
            interaction.update({ components: [dexContainer], files: [dexData.img], flags: MessageFlags.IsComponentsV2 });
        } else {
            interaction.update({ components: [dexContainer], files: [], flags: MessageFlags.IsComponentsV2 });
        }
    }

    // Dex Select Menus
    if (action.includes('dex_left') || action.includes('dex_right')) {
        action == 'dex_left' ? dex_page_num -= 1 : dex_page_num += 1;
        if (dex_page_num > 5) {
            dex_page_num = 1;
        } else if (dex_page_num < 1) {
            dex_page_num = 5;
        }

        // Update menu state
        menu_data.set(menu_id, { ...menu_state, dex_page_num });

        let dexData = await buildDexData(dex_page_num, dex_page_num * 25);

        const dexNavContainer = buildDexContainer(dexData, [dexData.sel_row, dex_arrows]);
        if (dexData.is_caught) {
            interaction.update({ components: [dexNavContainer], files: [dexData.img], flags: MessageFlags.IsComponentsV2 });
        } else {
            interaction.update({ components: [dexNavContainer], files: [], flags: MessageFlags.IsComponentsV2 });
        }
    }

    if (customId.includes('oochadex_sel_1')) {
        let dexData = await buildDexData(dex_page_num, selected.replace('dex_', ''));

        const dexSelContainer = buildDexContainer(dexData, [dexData.sel_row, dex_arrows]);
        if (dexData.is_caught) {
            interaction.update({ components: [dexSelContainer], files: [dexData.img], flags: MessageFlags.IsComponentsV2 });
        } else {
            interaction.update({ components: [dexSelContainer], files: [], flags: MessageFlags.IsComponentsV2 });
        }
    }




    //#endregion
    //#region Preferences Menu
    // Preferences Button
    if (action == 'preferences') {
        user_profile = profile.get(`${interaction.user.id}`);
        const prefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [prefContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Graphics Switcher
    if (selected == `${pre}controls_msg`) {
        await profile.set(interaction.user.id, !(user_profile.settings.controls_msg), 'settings.controls_msg');
        pref_desc[0] = `Show Controls Message: **${profile.get(`${interaction.user.id}`, 'settings.controls_msg') === true ? `✅` : `❌`}**`;
        user_profile = profile.get(`${interaction.user.id}`);
        const controlsPrefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [controlsPrefContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Battle Cleanup Option
    if (selected == `${pre}battle_cleanup`) {
        await profile.set(interaction.user.id, !(user_profile.settings.battle_cleanup), 'settings.battle_cleanup');
        pref_desc[1] = `Battle Text Cleanup: **${profile.get(`${interaction.user.id}`, 'settings.battle_cleanup') === true ? `✅` : `❌`}**`;
        user_profile = profile.get(`${interaction.user.id}`);
        const cleanupPrefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [cleanupPrefContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Zoom Level Option
    if (selected == `${pre}zoom_level`) {
        if (user_profile.settings.zoom == '5_5') {
            await profile.set(interaction.user.id, '7_7', 'settings.zoom');
        } else if (user_profile.settings.zoom == '7_7') {
            await profile.set(interaction.user.id, '9_7', 'settings.zoom');
        } else if (user_profile.settings.zoom == '9_7') {
            await profile.set(interaction.user.id, '7_9', 'settings.zoom');
        } else if (user_profile.settings.zoom == '7_9') {
            await profile.set(interaction.user.id, '9_9', 'settings.zoom');
        } else if (user_profile.settings.zoom == '9_9') {
            await profile.set(interaction.user.id, '9_11', 'settings.zoom');
        } else if (user_profile.settings.zoom == '9_11') {
            await profile.set(interaction.user.id, '11_9', 'settings.zoom');
        } else if (user_profile.settings.zoom == '11_9') {
            await profile.set(interaction.user.id, '11_11', 'settings.zoom');
        } else if (user_profile.settings.zoom == '11_11') {
            await profile.set(interaction.user.id, '5_5', 'settings.zoom');
        }

        user_profile = await profile.get(`${interaction.user.id}`);
        pref_desc[2] = `Zoom Level: **\`${user_profile.settings.zoom.split('_')[0]}x${user_profile.settings.zoom.split('_')[1]}\`**`;
        const zoomPrefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [zoomPrefContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Battle Speed Option
    if (selected == `${pre}battle_speed`) {
        if (user_profile.settings.battle_speed == 1250) {
            user_profile.settings.battle_speed = 2500;
        } else {
            user_profile.settings.battle_speed = 1250;
        }

        await profile.set(interaction.user.id, user_profile.settings.battle_speed, 'settings.battle_speed');
        pref_desc[3] = `Battle Speed: **\`${user_profile.settings.battle_speed == 1250 ? `Fast` : `Normal`}\`**`;
        user_profile = profile.get(`${interaction.user.id}`);
        const speedPrefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [speedPrefContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Discord Movement Buttons Option
    if (selected == `${pre}discord_move_buttons`) {
        await profile.set(interaction.user.id, !(user_profile.settings.discord_move_buttons), 'settings.discord_move_buttons');
        pref_desc[4] = `Discord Move Buttons: ${profile.get(`${interaction.user.id}`, 'settings.discord_move_buttons') === true ? `✅` : `❌`}`;
        user_profile = profile.get(`${interaction.user.id}`);
        const moveBtnPrefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [moveBtnPrefContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // Objective Indicator
    if (selected == `${pre}objective`) {
        await profile.set(interaction.user.id, !(user_profile.settings.objective), 'settings.objective');
        pref_desc[5] = `Objective Indicator: ${profile.get(`${interaction.user.id}`, 'settings.objective') === true ? `✅` : `❌`}`;
        user_profile = profile.get(`${interaction.user.id}`);
        const objectivePrefContainer = buildPreferencesContainer(pref_desc, [pref_sel_menu, back_button]);
        await interaction.update({ components: [objectivePrefContainer], flags: MessageFlags.IsComponentsV2 });
    }



    //#endregion
    //#region Quit Button (back to playspace)
    if (action == `quit`) {
        // Clean up menu data when quitting
        menu_data.delete(menu_id);
        let playspace_str = await setup_playspace_str(interaction.user.id);

        await interaction.channel.send({ components: playspace_str.components, flags: playspace_str.flags }).then(msg => {
            profile.set(interaction.user.id, msg.id, 'display_msg_id');
        });

        await profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
        await interaction.update({ content: null });
        await interaction.deleteReply();
    }

    user_profile = profile.get(`${interaction.user.id}`);
}