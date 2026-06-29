import { ButtonBuilder, ButtonStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MessageFlags, SectionBuilder, ThumbnailBuilder } from 'discord.js';
import { profile, item_data, maps, monster_data, player_positions } from './db.js';
import { sample } from 'lodash-es';
import { PlayerState, EventMode, Flags, UserType, Weather } from './types.js';
import { get_art_file, get_emote_string } from './func_other.js';
import { generate_battle_user, setup_battle } from './func_battle.js';
import wait from 'wait';
import { add_item, get_map_weather, setup_playspace_str } from './func_play.js';

// Using helper functions here because we have to essentially duplicate this across 2 different while loops,
// and one for right when we start the event and one for after dialogue options are picked. Helper functions
// make this easier to work with.
export async function dialogueEvent(user_id, thread, obj_content) {
    let imageFiles = [];
    let profile_data = profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;

    const pre = `event_${user_id}_`;

    let event_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}next`).setLabel(get_emote_string('arrow_R')).setStyle(ButtonStyle.Success),
        );

    if (obj_content.description.includes('{')) {
        let dialogue_var = obj_content.description.split('{').pop().split('}')[0];
        if (dialogue_var.includes('player')) {
            obj_content.description = obj_content.description.replace('{player}', thread.guild.members.cache.get(`${user_id}`).displayName);
        } else if (dialogue_var.includes('objective')) {
            let match = obj_content.description.match(/\{objective:([^}]+)\}/);
            obj_content.objective = match ? match[1] : null;
            profile.set(user_id, obj_content.objective, 'objective');

            // Remove the `{...}` part from the original string
            obj_content.description = obj_content.description.replace(/\{[^}]+\}/, '').trim();
        }
    }

    // Build dialogue text content
    let dialogueText = '';
    if (obj_content.title != '' && obj_content.title != undefined) {
        dialogueText += `## ${obj_content.title}\n`;
    }
    if (obj_content.description != '' && obj_content.description != undefined) {
        dialogueText += obj_content.description;
    }

    // Handle money and items
    let info_data = '';
    if (obj_content.money != 0 && obj_content.money != undefined) {
        info_data += `**${obj_content.money}** Oochabux\n`;
        profile.math(user_id, '+', obj_content.money, 'oochabux');
    }

    if (obj_content.items != false && obj_content.items != undefined) {
        if (obj_content.items.length != 0) {
            for (let item of obj_content.items) {
                let itemData = item_data.get(`${item.id}`);

                if (itemData) {
                    info_data += `${itemData.emote} **${itemData.name}** x${item.count}\n`;
                    add_item(user_id, item.id, item.count);
                }
            }
        }
    }

    if (obj_content.objective != false && obj_content.objective != undefined) {
        dialogueText += `\n\n**New Objective:** *${obj_content.objective}*`;
        profile.set(user_id, obj_content.objective, 'objective');
    }

    if (info_data.length != 0) {
        dialogueText += `\n\n**You Received:**\n${info_data}`;
    }

    // Ensure dialogueText is never empty (required for TextDisplayBuilder)
    if (dialogueText.trim() === '') {
        dialogueText = '\u200B'; // Zero-width space as fallback
    }

    // Build the event container
    let dialogueContainer = new ContainerBuilder();

    // Check if we have a portrait to show alongside text
    if (obj_content.dialogue_portrait != '' && obj_content.dialogue_portrait != undefined) {
        if (!obj_content.dialogue_portrait.includes('.png')) obj_content.dialogue_portrait += '.png';
        let portraitFileName;
        if (obj_content.dialogue_portrait.toLowerCase().includes('npc|')) {
            portraitFileName = obj_content.dialogue_portrait.split('|')[1];
            imageFiles.push(get_art_file(`./Art/ResizedArt/${portraitFileName}`));
        } else {
            portraitFileName = obj_content.dialogue_portrait;
            imageFiles.push(get_art_file(`./Art/Portraits/${portraitFileName}`));
        }

        // Use SectionBuilder to put portrait on the side of text
        let dialogueSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(dialogueText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${portraitFileName}`));

        dialogueContainer.addSectionComponents(dialogueSection);
    } else {
        // No portrait, just add text
        dialogueContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(dialogueText));
    }

    // Add main event image if exists
    if (obj_content.image) {
        if (!obj_content.image.includes('.png')) obj_content.image += '.png';
        imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
        let eventImageGallery = new MediaGalleryBuilder().addItems({ media: { url: `attachment://${obj_content.image}` } });
        dialogueContainer.addMediaGalleryComponents(eventImageGallery);
    }

    // Add separator and buttons
    dialogueContainer
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(event_buttons);

    // Get playspace to show map above the event
    let playspace_str = await setup_playspace_str(user_id);
    let mapDisplay = playspace_str.components[0]; // The TextDisplayBuilder with the map

    // Combine map display + separator + event container
    let combinedComponents = [
        mapDisplay,
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        dialogueContainer
    ];

    let msg = await thread.messages.fetch(msg_to_edit).catch(() => {});
    if (msg != undefined) {
        await msg.edit({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2, embeds: [] }).catch(() => {});
    } else {
        await thread.send({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
}

export async function battleEvent(user_id, thread, obj_content, battle_group_arr = []) {    
    let profile_data = await profile.get(`${user_id}`);
    let battleGroupBattleArr = [];

    obj_content.team_id = 1;
    if (battle_group_arr.length == 0) {
        let user_type = Object.prototype.hasOwnProperty.call(obj_content, "user_type") ? obj_content.user_type : UserType.NPCTrainer
        let trainerObj = await generate_battle_user(user_type, obj_content);
        battleGroupBattleArr = [trainerObj];
    }
    else if(Array.isArray(battle_group_arr)){
        battleGroupBattleArr = battle_group_arr;
    }

    let userObj = await generate_battle_user(UserType.Player, { user_id: user_id, team_id: 0, thread_id: thread.id, guild_id: thread.guild.id });
    let allyList = [];
    for (let ally of profile_data.allies_list) {
        ally.team_id = 0;
        let user_type = UserType.NPCTrainer;
        let trainerObj = await generate_battle_user(user_type, ally);
        trainerObj.hp_style = 'plr';
        allyList.push(trainerObj);
    }

    allyList.unshift(userObj);

    battleGroupBattleArr.unshift(allyList);
    battleGroupBattleArr = battleGroupBattleArr.flat(1);
    let map_data = maps.get(`${profile_data.location_data.area}`);
    let battle_bg = map_data.map_info.map_battleback;

    // Setup the battle for trainers
    await setup_battle(battleGroupBattleArr, get_map_weather(map_data.map_weather, profile_data.location_data), obj_content.coin, 0, true, true, false, false, false, battle_bg);

    // Increment by one so that after the battle we end up in the next part of the event.
    profile.set(user_id, profile_data.cur_event_pos + 1, 'cur_event_pos');
}

export async function battleGroupEvent(user_id, thread) {
    let event_array = profile.get(user_id, 'cur_event_array');
    let current_place = profile.get(user_id, 'cur_event_pos');
    current_place++;
    let battleGroupBattleArr = [];
    let event_mode = event_array[current_place][0];
    let obj_content  = event_array[current_place][1];
    while (event_mode != EventMode.BattleGroupEnd) {

        

        
        if (event_mode == EventMode.Battle) {

            //Set some default values
            obj_content.team_id = 1;
            for(let mon of obj_content.team){
                mon.variant = mon.variant ?? "";
            }

            console.log(obj_content.team);

            let user_type = Object.prototype.hasOwnProperty.call(obj_content, "user_type") ? obj_content.user_type : UserType.NPCTrainer
            let trainerObj = await generate_battle_user(user_type, obj_content);

            battleGroupBattleArr.push(trainerObj)

            console.log(trainerObj.party);
        }

        current_place++;
        event_mode = event_array[current_place][0];
        obj_content = event_array[current_place][1];
    }

    console.log(battleGroupBattleArr);
    profile.set(user_id, current_place, 'cur_event_pos');
    await battleEvent(user_id, thread, obj_content, battleGroupBattleArr)
}

export async function oochPickEvent(user_id, thread, obj_content) {
    let oochamonPicks = new ActionRowBuilder();
    let imageFiles = [];
    let profile_data = profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;
    const pre = `event_${user_id}_`;

    for (let ooch of obj_content.options) {
        let oochData = monster_data.get(`${ooch.id}`)
        ooch.moveset = ooch.moveset.filter(v => v != 9999);
        oochamonPicks.addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}ooch|${ooch.id}|${ooch.level}|${ooch.moveset.join(',')}|${ooch.nickname}|${ooch.ability}|${ooch.hp_iv}|${ooch.atk_iv}|${ooch.def_iv}|${ooch.spd_iv}`)
                .setLabel(`${oochData.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(`${oochData.emote}`),
        );
    }

    // Build text content
    let pickText = '';
    if (obj_content.title != '') pickText += `## ${obj_content.title}\n`;
    if (obj_content.description != '') pickText += obj_content.description;

    // Build the container
    let pickContainer = new ContainerBuilder();

    // Check if we have a portrait to show alongside text
    if (obj_content.dialogue_portrait != false && obj_content.dialogue_portrait != '') {
        if (!obj_content.dialogue_portrait.includes('.png')) obj_content.dialogue_portrait += '.png';
        let portraitFileName;
        if (obj_content.dialogue_portrait.toLowerCase().includes('npc|')) {
            portraitFileName = obj_content.dialogue_portrait.split('|')[1];
            imageFiles.push(get_art_file(`./Art/ResizedArt/${portraitFileName}`));
        } else {
            portraitFileName = obj_content.dialogue_portrait;
            imageFiles.push(get_art_file(`./Art/Portraits/${portraitFileName}`));
        }

        // Use SectionBuilder to put portrait on the side of text
        let pickSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(pickText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${portraitFileName}`));

        pickContainer.addSectionComponents(pickSection);
    } else {
        // No portrait, just add text
        pickContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(pickText));
    }

    // Add main event image if exists
    if (obj_content.image) {
        if (!obj_content.image.includes('.png')) obj_content.image += '.png';
        imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
        let eventImageGallery = new MediaGalleryBuilder().addItems({ media: { url: `attachment://${obj_content.image}` } });
        pickContainer.addMediaGalleryComponents(eventImageGallery);
    }

    // Add separator and buttons
    pickContainer
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(oochamonPicks);

    // Get playspace to show map above the event
    let playspace_str = await setup_playspace_str(user_id);
    let mapDisplay = playspace_str.components[0];

    // Combine map display + separator + event container
    let combinedComponents = [
        mapDisplay,
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        pickContainer
    ];

    let msg = await thread.messages.fetch(msg_to_edit).catch(() => {});
    if (msg != undefined) {
        await msg.edit({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2, embeds: [] }).catch(() => {});
    } else {
        await thread.send({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
}

export async function flagEvent(user_id, thread, obj_content) {
    let flags = profile.get(`${user_id}`, 'flags');
    if (!flags.includes(obj_content.text) || obj_content.text.includes('toggle')) {
        if (!obj_content.text.includes('toggle')) {
            profile.push(user_id, obj_content.text, 'flags');
        } else {
            let index = flags.indexOf(obj_content.text);
            
            if (index === -1) {
                profile.push(user_id, obj_content.text, 'flags');
            } else {
                flags.splice(index, 1);
                profile.set(user_id, flags, 'flags');
            }
        }

        //Trap the player in the Access Tunnel after Cade battle
        if(obj_content.text == 'cade_battle_tunnel'){
            profile.set(user_id, {area: 'access_tunnel', x : 23, y : 22}, 'checkpoint_data')
        }

        if (!obj_content.text.toLowerCase().includes('npc|')) {
            let msg_to_edit = profile.get(`${user_id}`, 'display_msg_id');
            let playspace_str = await setup_playspace_str(user_id);
            await thread.messages.fetch(msg_to_edit).then((msg) => {
                msg.edit({ components: playspace_str.components, flags: playspace_str.flags });
            }).catch(() => {});
        }
    }
}

export async function transitionEvent(user_id, thread, obj_content) {

    let profile_data = profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;

    //remove the player's info from the old biome and add it to the new one
    let ogBiome = profile.get(`${user_id}`, 'location_data.area');
    if (ogBiome == undefined) ogBiome = 'hub';
    if (obj_content.map_to == false) obj_content.map_to = ogBiome;
    let mapData = maps.get(`${obj_content.map_to}`);
    let map_default = mapData.map_savepoints.filter(v => v.is_default !== false);
    if (mapData.map_savepoints.filter(v => v.is_default !== false).length == 0) {
        map_default = [mapData.map_savepoints[0]];
    }

    profile.set(user_id, { area: obj_content.map_to, x: map_default[0].x, y: map_default[0].y }, 'checkpoint_data');
    profile.set(user_id, [], 'previous_positions')

    if (obj_content.default_tp === true) {
        obj_content.x_to = map_default[0].x;
        obj_content.y_to = map_default[0].y;
    }

    //player_positions.set(obj_content.map_to, { x: obj_content.x_to, y: obj_content.y_to }, user_id);
    //player_positions.delete(ogBiome, user_id);
    profile.set(user_id, { area: obj_content.map_to, x: obj_content.x_to, y: obj_content.y_to }, 'location_data')
    
    let playspace_str = await setup_playspace_str(user_id);
    await thread.messages.fetch(msg_to_edit).then((msg) => {
        msg.edit({ components: playspace_str.components, flags: playspace_str.flags });
    }).catch(() => {});
}

export function objectiveEvent(user_id, obj_content) {
    profile.set(user_id, obj_content.objective, 'objective');
}

export async function optionsEvent(user_id, thread, obj_content) {
    let optionsRow = new ActionRowBuilder();
    let imageFiles = [];
    let profile_data = profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;
    const pre = `event_${user_id}_`;

    for (let option of obj_content.options) {
        // Convert button style
        switch (option.style) {
            case 0: option.style = ButtonStyle.Primary; break;
            case 1: option.style = ButtonStyle.Secondary; break;
            case 2: option.style = ButtonStyle.Success; break;
            case 3: option.style = ButtonStyle.Danger; break;
        }

        if (profile_data.flags.includes(option.flag) || option.flag == false) {
            optionsRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}option|${option.event}|${option.price}`)
                    .setLabel(`${option.text}`)
                    .setStyle(option.style)
                    .setDisabled(option.price > profile_data.oochabux),
            );
        }
    }

    // Build text content
    let optionsText = '';
    if (obj_content.title != '') optionsText += `## ${obj_content.title}\n`;
    if (obj_content.description != '') optionsText += obj_content.description;

    // Build the container
    let optionsContainer = new ContainerBuilder();

    // Check if we have a portrait to show alongside text
    if (obj_content.dialogue_portrait != false && obj_content.dialogue_portrait != '') {
        if (!obj_content.dialogue_portrait.includes('.png')) obj_content.dialogue_portrait += '.png';
        let portraitFileName;
        if (obj_content.dialogue_portrait.toLowerCase().includes('npc|')) {
            portraitFileName = obj_content.dialogue_portrait.split('|')[1];
            imageFiles.push(get_art_file(`./Art/ResizedArt/${portraitFileName}`));
        } else {
            portraitFileName = obj_content.dialogue_portrait;
            imageFiles.push(get_art_file(`./Art/Portraits/${portraitFileName}`));
        }

        // Use SectionBuilder to put portrait on the side of text
        let optionsSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(optionsText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${portraitFileName}`));

        optionsContainer.addSectionComponents(optionsSection);
    } else {
        // No portrait, just add text
        optionsContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(optionsText));
    }

    // Add main event image if exists
    if (obj_content.image) {
        if (!obj_content.image.includes('.png')) obj_content.image += '.png';
        imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
        let eventImageGallery = new MediaGalleryBuilder().addItems({ media: { url: `attachment://${obj_content.image}` } });
        optionsContainer.addMediaGalleryComponents(eventImageGallery);
    }

    // Add separator and buttons
    optionsContainer
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(optionsRow);

    // Get playspace to show map above the event
    let playspace_str = await setup_playspace_str(user_id);
    let mapDisplay = playspace_str.components[0];

    // Combine map display + separator + event container
    let combinedComponents = [
        mapDisplay,
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        optionsContainer
    ];

    let msg = await thread.messages.fetch(msg_to_edit).catch(() => {});
    if (msg != undefined) {
        await msg.edit({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2, embeds: [] }).catch(() => {});
    } else {
        await thread.send({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
}

export async function waitEvent(obj_content) {
    await wait(obj_content.duration * 1000);
}

export function allyChangeEvent(user_id, obj_content, event) {
    if (event == EventMode.AddAlly) {
        obj_content.coin = 5;
        profile.push(user_id, obj_content, 'allies_list');
    }
    if (event == EventMode.RemoveAlly) profile.set(user_id, [], 'allies_list');
}

export async function setSkinEvent(user_id, thread, obj_content) {
    let skinPicks = new ActionRowBuilder();
    let imageFiles = [];
    let profile_data = profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;
    const pre = `event_${user_id}_`;

    for (let skin of obj_content.options) {
        let skinData = item_data.get(`${skin}`)
        skinPicks.addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}skin|${skin}`)
                .setLabel(`‎`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(`${skinData.emote}`),
        );
    }

    // Build text content
    let skinText = '';
    if (obj_content.title != '' && obj_content.title != undefined) skinText += `## ${obj_content.title}\n`;
    if (obj_content.description != '' && obj_content.description != undefined) skinText += obj_content.description;

    // Ensure skinText is never empty (required for TextDisplayBuilder)
    if (skinText.trim() === '') {
        skinText = '\u200B'; // Zero-width space as fallback
    }

    // Build the container
    let skinContainer = new ContainerBuilder();

    // Check if we have a portrait to show alongside text
    if (obj_content.dialogue_portrait != false && obj_content.dialogue_portrait != '') {
        if (!obj_content.dialogue_portrait.includes('.png')) obj_content.dialogue_portrait += '.png';
        let portraitFileName;
        if (obj_content.dialogue_portrait.toLowerCase().includes('npc|')) {
            portraitFileName = obj_content.dialogue_portrait.split('|')[1];
            imageFiles.push(get_art_file(`./Art/ResizedArt/${portraitFileName}`));
        } else {
            portraitFileName = obj_content.dialogue_portrait;
            imageFiles.push(get_art_file(`./Art/Portraits/${portraitFileName}`));
        }

        // Use SectionBuilder to put portrait on the side of text
        let skinSection = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(skinText))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${portraitFileName}`));

        skinContainer.addSectionComponents(skinSection);
    } else {
        // No portrait, just add text
        skinContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(skinText));
    }

    // Add main event image if exists
    if (obj_content.image) {
        if (!obj_content.image.includes('.png')) obj_content.image += '.png';
        imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
        let eventImageGallery = new MediaGalleryBuilder().addItems({ media: { url: `attachment://${obj_content.image}` } });
        skinContainer.addMediaGalleryComponents(eventImageGallery);
    }

    // Add separator and buttons
    skinContainer
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(skinPicks);

    // Get playspace to show map above the event
    let playspace_str = await setup_playspace_str(user_id);
    let mapDisplay = playspace_str.components[0];

    // Combine map display + separator + event container
    let combinedComponents = [
        mapDisplay,
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        skinContainer
    ];

    let msg = await thread.messages.fetch(msg_to_edit).catch(() => {});
    if (msg != undefined) {
        await msg.edit({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2, embeds: [] }).catch(() => {});
    } else {
        await thread.send({ components: combinedComponents, files: imageFiles, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
}

/**
 * Runs an event based on event array
 * @param {String} user_id The ID of the user who called the event.
 * @param {Object} thread The main thread that Oochamon is being played in.
 * @param {Array} event_array The event array.
 * @param {Number} start_pos The position to start in the event array (defaults to 0)
 * @param {String} event_name The name of the global event (defaults to false if not needed)
 */
export async function event_process(user_id, thread, event_array, start_pos = 0, event_name = false) {
    
    const { setup_playspace_str } = await import('./func_play.js');
    
    profile.set(user_id, event_name, 'cur_event_name');
    profile.set(user_id, event_array, 'cur_event_array');
    profile.set(user_id, start_pos, 'cur_event_pos');
    let current_place = start_pos;
    let event_mode = event_array[current_place][0];
    let obj_content = event_array[current_place][1];
    let quit_init_loop = false;

    // Switch state to dialogue if coming from the playspace
    if (profile.get(`${user_id}`, 'player_state') == PlayerState.Playspace) {
        profile.set(user_id, PlayerState.Dialogue, 'player_state');
    }

    let profile_data = profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;

    while (!quit_init_loop) {
        event_mode = event_array[current_place][0];
        obj_content = event_array[current_place][1];

        switch (event_mode) {
            //Basic Text Event
            case EventMode.Dialogue: 
                await dialogueEvent(user_id, thread, obj_content, true);
                quit_init_loop = true;
            break;

            case EventMode.Battle:
                await battleEvent(user_id, thread, obj_content, true);
            return;

            case EventMode.OochamonPick:
                await oochPickEvent(user_id, thread, obj_content, true);
                quit_init_loop = true;
            break;
            
            case EventMode.Flags: 
                await flagEvent(user_id, thread, obj_content);
            break;

            case EventMode.Transition:
                await transitionEvent(user_id, thread, obj_content);
            break;

            case EventMode.Objective:
                objectiveEvent(user_id, obj_content);
            break;

            case EventMode.Options:
                await optionsEvent(user_id, thread, obj_content, true);
                quit_init_loop = true;
            break;

            case EventMode.Wait:
                await waitEvent(obj_content);
            break;

            case EventMode.AddAlly:
            case EventMode.RemoveAlly:
                allyChangeEvent(user_id, obj_content, event_mode);
            break;

            case EventMode.BattleGroupStart:
                await battleGroupEvent(user_id, thread);
            break;

            case EventMode.SetSkin:
                await setSkinEvent(user_id, thread, obj_content);
                quit_init_loop = true;
            break;
        }

        // If we are at the end of the event_array, quit out entirely
        if ([EventMode.Transition, EventMode.Flags, EventMode.Objective].includes(event_mode)) {

            if (current_place + 1 == event_array.length) {
                profile.set(user_id, PlayerState.Playspace, 'player_state');
                profile.set(user_id, false, 'cur_event_name');
                profile.set(user_id, [], 'cur_event_array');
                profile.set(user_id, 0, 'cur_event_pos');
                let playspace_str = await setup_playspace_str(user_id);
                await thread.messages.fetch(msg_to_edit).then((msg) => {
                    msg.edit({ components: playspace_str.components, flags: playspace_str.flags, embeds: [], files: [] });
                }).catch(() => {});
                //await move(thread, user_id, '', 1);
                return;
            }
        }

        if (quit_init_loop == false) {
            current_place++;
            profile.set(user_id, current_place, 'cur_event_pos');
        }
    }
}

/**
 * Converts an NPC into an event array for use with event_process.
 * @param {Array} npc_obj the NPC object we want to create the event array for
 * @param {String} user_id The user id of the user interacting with the NPC
 */
export async function event_from_npc (npc_obj, user_id) {
    let npc_flag = `${Flags.NPC}${npc_obj.name}${npc_obj.npc_id}`; //Flag generated for this npc at this position
    let return_array = [];
    let user_flags = profile.get(`${user_id}`, 'flags');
    let battle_npc = npc_obj.team.length != 0;
    let flags_to_give = []

    //Set any post-default dialogue flags
    if (npc_obj.flag_given != false) {
        flags_to_give.push(npc_obj.flag_given)
    }

    //Set any post-combat_flags
    flags_to_give.push(npc_flag)

    let player_location = profile.get(`${user_id}`, 'location_data');
    let map_obj = maps.get(`${player_location.area.toLowerCase()}`);
    let map_weather = map_obj.map_weather;
    let weather_options = []
    let px = player_location.x;
    let py = player_location.y;
    for(let w of map_weather) {
        if(px >= w.x && py >= w.y &&
            px <= w.x + w.width && py <= w.y + w.height
        ){
            weather_options.push(w.weather_name);
        }
    }
    
    let battle_weather = weather_options.length > 0 ? sample(weather_options) : Weather.None
    npc_obj.battle_weather = battle_weather;

    // Set the dialogue to be properly formatted
    // Sign NPCs should display all their info at once
    npc_obj.pre_combat_dialogue = npc_obj.name == 'Sign' ? [npc_obj.pre_combat_dialogue] : npc_obj.pre_combat_dialogue.split('\n');
    npc_obj.post_combat_dialogue = npc_obj.name == 'Sign' ? [npc_obj.post_combat_dialogue] : npc_obj.post_combat_dialogue.split('\n');

    if (npc_obj.name == 'Sign') {
        npc_obj.post_combat_dialogue = npc_obj.pre_combat_dialogue;
    }
    
    // If we don't have the NPCs flag, it means they haven't been beaten yet.
    if (!user_flags.includes(npc_flag) && battle_npc == true) {
        //Pre-combat dialogue
        for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
            if (npc_obj.pre_combat_dialogue[i] == '') continue;
            return_array.push([EventMode.Dialogue, {
                title: npc_obj.name,
                description: npc_obj.pre_combat_dialogue[i],
                money: 0,
                image: false,
                items: false,
                flags: [],
                objective: false,
                dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`
            }])
        }

        //Setup a battle
        return_array.push([EventMode.Battle, npc_obj])

    } else if (battle_npc == false && !user_flags.includes(npc_flag)) {
        // If this NPC isn't a battle NPC and the user doesn't yet have their flag (meaning they haven't interacted with them yet)
        // we should throw their pre interaction dialogue into the event_array. Otherwise, we don't include it.
        // Also put their designated items and money at the end of their dialogue.
        for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
            if (npc_obj.pre_combat_dialogue[i] == '') continue;
            return_array.push([EventMode.Dialogue, {
                title: npc_obj.name,
                description: npc_obj.pre_combat_dialogue[i],
                money: (i+1 == npc_obj.pre_combat_dialogue.length) ? npc_obj.coin : 0,
                items: (i+1 == npc_obj.pre_combat_dialogue.length) ? (npc_obj.items.length > 0 ? npc_obj.items : false) : false,
                image: false,
                objective: false,
                dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                flags : flags_to_give
            }]);
        }
    }

    //Set any post-default dialogue flags
    if (npc_obj.flag_given != false) {
        return_array.push([EventMode.Flags, { text: npc_obj.flag_given }]);
    }

    //Set any post-combat_flags
    return_array.push([EventMode.Flags, { text: npc_flag }]);

    //Post-combat (or post interaction) text.
    // If we are not a battle NPC and the user DOES have this NPCs flag, we should include
    // the post interaction dialogue. Otherwise, don't include it.
    // If we are a battle NPC, include post combat dialogue as it is necessary for the flow.
    if ((battle_npc == true) || (battle_npc == false && user_flags.includes(npc_flag))) {
        for (let i = 0; i < npc_obj.post_combat_dialogue.length; i++) {
            // If we are on the last dialogue, and the user has not interacted with this NPC, and the NPC is a battle NPC,
            // put their designated items at the end of their dialogue.
            if (i+1 == npc_obj.post_combat_dialogue.length && !user_flags.includes(npc_flag) && battle_npc == true) {
                if (npc_obj.post_combat_dialogue[i] == '') continue;
                return_array.push([EventMode.Dialogue, {
                    title: npc_obj.name,
                    description: npc_obj.post_combat_dialogue[i],
                    money: 0,
                    items: (npc_obj.items.length > 0 ? npc_obj.items : false),
                    image: false,
                    objective: false,
                    dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                    flags : flags_to_give
                }])
            } else {
                if (npc_obj.post_combat_dialogue[i] == '') continue;
                return_array.push([EventMode.Dialogue, {
                    title: npc_obj.name,
                    description: npc_obj.post_combat_dialogue[i],
                    money: 0,
                    image: false,
                    items: false,
                    objective: false,
                    dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                    flags: []
                }])
            }
        }
    }

    return return_array;
}