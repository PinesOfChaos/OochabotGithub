import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags, SectionBuilder, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, TextDisplayBuilder, ThumbnailBuilder } from "discord.js";
import { maps, other_menu_data, player_positions, profile } from "../db.js";
import { PlayerState } from "../types.js";
import { buildBoxData, ooch_info_container } from "../func_other.js";
import { setup_playspace_str } from "../func_play.js";
import wait from 'wait';

export async function other_handler(interaction) {

    let customId, selected;
    let end = false;

    // Initialize used variables
     if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
        selected = interaction.customId;
    } else {
        customId = interaction.customId;
        selected = interaction.values[0];
    }

    const pre = `other_${interaction.user.id}_`;
    let action = customId.replace(pre, '');

    profile.set(interaction.user.id, PlayerState.Encounter, 'player_state');

    let profile_data = profile.get(`${interaction.user.id}`);
    let menu_id = interaction.user.id;
    let pages = 9;

    // Create box action rows
    let box_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_back_to_save`).setLabel('Back').setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_num_label`).setLabel('1').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
        )

    // Create box action rows
    let box_battle_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_finalize_team`).setLabel('Ready').setStyle(ButtonStyle.Success)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_right`).setEmoji(`➡️`).setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_num_label`).setLabel(`1`).setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_party_label`).setLabel(`Party`).setStyle(ButtonStyle.Success)
        )

    let box_sel_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}back_to_box`).setLabel(`Back`).setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_add_ooch`).setLabel(`Add To Party`).setStyle(ButtonStyle.Success)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_release`).setLabel(`Release`).setStyle(ButtonStyle.Danger)
        )

    let box_party_sel_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}back_to_box`).setLabel(`Back`).setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_add_to_box`).setLabel(`Add To Box`).setStyle(ButtonStyle.Secondary)
        )

    let box_confirm_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_yes`).setLabel(`Yes`).setStyle(ButtonStyle.Success),
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}box_no`).setLabel(`No`).setStyle(ButtonStyle.Danger),
        );
    
    // If init, create a new menu session
    if (!other_menu_data.has(menu_id)) {
        other_menu_data.set(menu_id, {
            user_id: interaction.user.id,
            box_page_num: 0,
            ooch_user_data: null,
            slot_num: 0,
        });
    }

    // Get persistent data from other_menu_data
    let other_menu_state = other_menu_data.get(menu_id);
    let box_row;

    // Page buttons
    if (action == 'box_left' || action == 'box_right') {
        action == 'box_left' ? other_menu_state.box_page_num -= 1 : other_menu_state.box_page_num += 1;
        other_menu_state.box_page_num = (other_menu_state.box_page_num + pages) % pages; // Handle max page overflow
        
        box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);
        box_buttons.components[3].setLabel(`${other_menu_state.box_page_num + 1}`);
        interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], box_buttons], flags: MessageFlags.IsComponentsV2, files: [] });
    }

    else if (action.includes('box')) {
        let battle_box = action.includes('battle_box');
        let bottom_buttons = battle_box ? box_battle_buttons : box_buttons;

        if (action == 'box_oochabox') {
            box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);
            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], flags: MessageFlags.IsComponentsV2, files: [] });
        } else if (action == 'back_to_box') {
            box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);
            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });
        } 
        
        // Back to save (exit)
        else if (action == 'box_back_to_save') {
            profile.set(interaction.user.id, profile_data);
            other_menu_data.delete(menu_id);

            let playspace_str = await setup_playspace_str(interaction.user.id);

            let confirm_buttons_tp = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`${pre}set_checkpoint`).setLabel(`Save`).setEmoji(`🏳️`).setStyle(ButtonStyle.Success),
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${pre}box_oochabox`).setLabel(`Oochabox`).setEmoji(`🎒`).setStyle(ButtonStyle.Primary),
                )

            let confirm_buttons_tp_exit = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`${pre}exit`).setLabel(`Exit`).setStyle(ButtonStyle.Danger)
                )

            let savepoint_components = [...playspace_str.components, confirm_buttons_tp, confirm_buttons_tp_exit];

            if (profile_data.areas_visited.length > 0 && profile_data.flags.includes('teleport_enable')) {
                let teleport_select_options = profile_data.areas_visited.map(name =>
                    {
                        let map_data = maps.get(`${name}`);
                        return {
                            label: `${map_data.map_info.map_name}`,
                            value: `${name}`
                        }
                    });

                let teleport_menu = new ActionRowBuilder();
                teleport_menu.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`${pre}teleport_menu`)
                        .setPlaceholder(`Teleport To Visited Area`)
                        .addOptions(teleport_select_options),
                );

                savepoint_components.push(teleport_menu);
            }

            interaction.update({ components: savepoint_components, flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });
        } 

        // Finalize team for box in pvp
        else if (action == 'box_finalize_team') {
            return true;
        } 

        // Label buttons
        else if (action.includes('box_emp') || action.includes('box_label')) {
            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**')], flags: MessageFlags.IsComponentsV2, files: [] });
        }

        // Oochamon in Box View
        else if (action.includes('box_ooch')) {
            let slot_data = action.split('_');
            other_menu_state.slot_num = slot_data[3];
            let party_slot = false;
            if (action.includes('_party')) party_slot = true;

            if (party_slot == false) {
                other_menu_state.ooch_user_data = profile_data.ooch_pc[other_menu_state.slot_num]; // Personal Oochamon Data in Oochabox
            } else {
                other_menu_state.ooch_user_data = profile_data.ooch_party[other_menu_state.slot_num]; // Personal Oochamon Data in Party
            }

            // Disable the "add to box" button if we only have one party member.
            box_party_sel_buttons.components[1].setDisabled((profile_data.ooch_party.length == 1))
            // Disable the "add to party" button if we have 4 party members.
            box_sel_buttons.components[1].setDisabled((profile_data.ooch_party.length == 4))

            let oochInfo = await ooch_info_container(other_menu_state.ooch_user_data, interaction.user.id);
            let section = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(oochInfo.infoText))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${oochInfo.fileName}`));

            let oochComponents = [section];
            if (oochInfo.footerText) {
                oochComponents.push(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
                oochComponents.push(new TextDisplayBuilder().setContent(`*${oochInfo.footerText}*`));
            }
            oochComponents.push(party_slot == false ? box_sel_buttons : box_party_sel_buttons);

            interaction.update({ components: oochComponents, files: [oochInfo.file], flags: MessageFlags.IsComponentsV2, embeds: [] });
        }
        // Add Oochamon to Box
        else if (action == 'box_add_to_box') {
            bottom_buttons.components[3].setLabel(`${other_menu_state.box_page_num+1}`);

            // Put the specified oochamon into the box.
            profile_data.ooch_pc.push(other_menu_state.ooch_user_data);
            profile_data.ooch_party.splice(other_menu_state.slot_num, 1);
            // Build new PC button rows
            box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);
            // Kick back to PC screen
            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });
        }
        // Add Oochamon to team
        else if (action == 'box_add_ooch') {
            bottom_buttons.components[3].setLabel(`${other_menu_state.box_page_num+1}`);

            // Put the specified oochamon into our team
            profile_data.ooch_party.push(other_menu_state.ooch_user_data);
            profile_data.ooch_pc.splice(other_menu_state.slot_num, 1);
            // Build new PC button rows
            box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);
            // Kick back to PC screen
            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });

        }
        // Release an Oochamon
        else if (action == 'box_release') {
            await interaction.update({ components: [new TextDisplayBuilder().setContent('**Are you sure you want to release this Oochamon?**'), box_confirm_buttons], flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });
        }
        // Confirm to release an Oochamon
        else if (action == 'box_yes') {
            bottom_buttons.components[3].setLabel(`${other_menu_state.box_page_num+1}`);

            profile_data.ooch_pc.splice(other_menu_state.slot_num, 1);
            // Build new PC button rows
            box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);
            // Kick back to PC screen
            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });
        }
        // Confirm to not release an Oochamon
        else if (action == 'box_no') {
            bottom_buttons.components[3].setLabel(`${other_menu_state.box_page_num+1}`);

            // Build new PC button rows
            box_row = buildBoxData(interaction.user.id, profile_data, other_menu_state.box_page_num);

            interaction.update({ components: [new TextDisplayBuilder().setContent('**Oochabox**'), box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], flags: MessageFlags.IsComponentsV2, embeds: [], files: [] });
        }
    } 

    else if (action.includes('teleport_menu')) {
        let biome_from = profile.get(`${interaction.user.id}`, 'location_data.area');
        let biome_to = selected;
        let biome_to_data = maps.get(`${biome_to}`);
        let map_default = biome_to_data.map_savepoints.filter(v => v.is_default !== false);
        if (biome_to_data.map_savepoints.filter(v => v.is_default !== false).length == 0) {
            map_default = [biome_to_data.map_savepoints[0]];
        }

        //remove the player's info from the old biome and add it to the new one
        player_positions.set(biome_to, { x: map_default[0].x, y: map_default[0].y }, interaction.user.id);
        player_positions.delete(biome_from, interaction.user.id);
        profile.set(interaction.user.id, { area: biome_to, x: map_default[0].x, y: map_default[0].y }, 'location_data')

        for (let i = 0; i < profile.get(`${interaction.user.id}`, 'ooch_party').length; i++) {
            profile.set(interaction.user.id, profile.get(`${interaction.user.id}`, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
            profile.set(interaction.user.id, true, `ooch_party[${i}].alive`);
        }

        profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
        let playspace_str = await setup_playspace_str(interaction.user.id);

        profile_data = profile.get(`${interaction.user.id}`);
        await interaction.update({ components: playspace_str.components, flags: playspace_str.flags }).catch(() => {});
        end = true;
    }

    else if (action == 'set_checkpoint') {
        let location_data = profile.get(`${interaction.user.id}`, 'location_data');
        profile.set(interaction.user.id, { area: location_data.area, x: location_data.x, y: location_data.y }, 'checkpoint_data');
        if (!profile.get(`${interaction.user.id}`, 'areas_visited').includes(location_data.area)) {
            profile.push(interaction.user.id, location_data.area, 'areas_visited');
        }

        for (let i = 0; i < profile.get(`${interaction.user.id}`, 'ooch_party').length; i++) {
            profile.set(interaction.user.id, profile.get(`${interaction.user.id}`, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
            profile.set(interaction.user.id, true, `ooch_party[${i}].alive`);
        }

        profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
        let playspace_str = await setup_playspace_str(interaction.user.id);
        interaction.update({ components: playspace_str.components, flags: playspace_str.flags }).catch(() => {});
        let quickMsg = await interaction.channel.send({ content: `Set a checkpoint and healed all of your Oochamon.` });
        end = true;
        await wait(5000);
        await quickMsg.delete().catch(() => {});
    } else {
        profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
        let playspace_str = await setup_playspace_str(interaction.user.id);
        interaction.update({ components: playspace_str.components, flags: playspace_str.flags }).catch(() => {});
        return;
    }

    if (!end) {
        other_menu_data.set(menu_id, { ...other_menu_state });
        profile.set(interaction.user.id, profile_data);
    }
}