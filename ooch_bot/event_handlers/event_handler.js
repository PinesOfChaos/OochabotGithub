import { ComponentType } from "discord.js";
import { events_data, item_data, profile } from "../db.js";
import { create_ooch, move, setup_playspace_str } from "../func_play.js";
import { allyChangeEvent, battleEvent, battleGroupEvent, dialogueEvent, event_process, flagEvent, objectiveEvent, oochPickEvent, optionsEvent, setSkinEvent, transitionEvent, waitEvent } from "../func_event.js";
import { EventMode, ItemCategory, OochID, PlayerState } from "../types.js";

export async function event_handler(interaction) {

    let customId;

    // Initialize used variables
    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
    } else {
        customId = interaction.customId;
    }

    const pre = `event_${interaction.user.id}_`;
    let action = customId.replace(pre, '');

    let quit = false;
    let user_profile = profile.get(`${interaction.user.id}`);

    // Only allow event buttons to be used in the player's active play thread.
    if (user_profile.play_thread_id != interaction.channel.id) {
        return interaction.user.send('Stop trying to use other peoples buttons! They are not for you!').catch(() => {});
    }

    let event_name = profile.get(interaction.user.id, 'cur_event_name');
    let event_array = profile.get(interaction.user.id, 'cur_event_array');
    let current_place = profile.get(interaction.user.id, 'cur_event_pos');
    if (!event_array || event_array[current_place] == undefined) return;
    let event_mode = event_array[current_place][0];
    let obj_content = event_array[current_place][1];
    let msg_to_edit = user_profile.display_msg_id;

    // If we collect an Oochamon data type, handle that first then move on
    if (action.includes('ooch')) {
        let oochChoices = event_array[current_place][1].options.map(v => v = v.id);
        let oochButtonData = action.split('|');

        // Oochadex update
        for (let ooch_id of oochChoices) {
            if (ooch_id == parseInt(oochButtonData[1])) {
                profile.math(interaction.user.id, '+', 1, `oochadex[${ooch_id}].caught`);
            }
        }

        let ooch = await create_ooch(oochButtonData[1],{
            level: oochButtonData[2], 
            move_list: oochButtonData[3].split(','), 
            nickname: oochButtonData[4], 
            ability: oochButtonData[5],
            hp_iv: oochButtonData[6], 
            atk_iv: oochButtonData[7], 
            def_iv: oochButtonData[8], 
            spd_iv: oochButtonData[9]
        });
        // Have it check here if you want to send the Oochamon to your party or not
        if (user_profile.ooch_party.length < 4) {
            profile.push(interaction.user.id, ooch, `ooch_party`);
        } else {
            profile.push(interaction.user.id, ooch, `ooch_pc`)
        }
    } else if (action.includes('option')) {
        let optionButtonData = action.split('|');
        
        let eventName = optionButtonData[1];
        let buttonPrice = optionButtonData[2];

        // Remove price
        profile.math(interaction.user.id, '-', buttonPrice, 'oochabux');
        user_profile.oochabux -= buttonPrice;

        if (eventName != false) {
            current_place = event_array.length;
            await event_process(interaction.user.id, interaction.channel, events_data.get(`${eventName}`), 0, eventName);
        }
    } else if (action.includes('skin')) {
        let skinButtonData = action.split('|');
        
        let skinId = skinButtonData[1];
        let skinData = item_data.get(`${skinId}`);

        profile.set(interaction.user.id, skinData.potency, 'player_sprite');
    }

    current_place++;
    profile.set(interaction.user.id, current_place, 'cur_event_pos');

    // Check if we are at the end of the event array, and if we are, cut back to the normal player state.
    if (current_place >= event_array.length) {
        if (interaction.message.id !== msg_to_edit) await interaction.message.delete();
        profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
        profile.set(interaction.user.id, false, 'cur_event_name');
        profile.set(interaction.user.id, [], 'cur_event_array');
        profile.set(interaction.user.id, 0, 'cur_event_pos');
        let playspace_str = await setup_playspace_str(interaction.user.id);
        await interaction.update({ components: playspace_str.components, flags: playspace_str.flags, embeds: [], files: [] });
        return;
    }

    while (!quit) {
        event_mode = event_array[current_place][0];
        obj_content = event_array[current_place][1];

        //Customize Embed
        switch (event_mode) {
            //Basic Text Event
            case EventMode.Dialogue:
                quit = true;
                await dialogueEvent(interaction.user.id, interaction.channel, obj_content);
                await interaction.deferUpdate().catch(() => {});
            break;

            case EventMode.Battle:
                quit = true;
                await battleEvent(interaction.user.id, interaction.channel, obj_content);
                await interaction.deferUpdate().catch(() => {});
            break;

            case EventMode.OochamonPick:
                quit = true;
                await oochPickEvent(interaction.user.id, interaction.channel, obj_content);
                await interaction.deferUpdate().catch(() => {});
            break;

            //No Visual representation, just sets appropriate flags in the player
            case EventMode.Flags:
                await flagEvent(interaction.user.id, interaction.channel, obj_content);
            break;

            case EventMode.Transition:
                await transitionEvent(interaction.user.id, interaction.channel, obj_content);
            break;

            case EventMode.Objective:
                objectiveEvent(interaction.user.id, obj_content);
            break;

            case EventMode.Options:
                quit = true;
                await optionsEvent(interaction.user.id, interaction.channel, obj_content);
                await interaction.deferUpdate().catch(() => {});
            break;

            case EventMode.Wait:
                await waitEvent(obj_content);
            break;

            case EventMode.AddAlly:
            case EventMode.RemoveAlly:
                allyChangeEvent(interaction.user.id, obj_content, event_mode);
            break;

            case EventMode.BattleGroupStart:
                quit = true;
                await battleGroupEvent(interaction.user.id, interaction.channel);
                await interaction.deferUpdate().catch(() => {});
            break;

            case EventMode.SetSkin:
                quit = true;
                await setSkinEvent(interaction.user.id, interaction.channel, obj_content);
                await interaction.deferUpdate().catch(() => {});
            break;
        }

        if ([EventMode.Transition, EventMode.Flags, EventMode.Objective, EventMode.AddAlly, EventMode.RemoveAlly].includes(event_mode)) {
            // If we are at the end of the event_array, quit out entirely
            if (current_place + 1 == event_array.length) {
                // Manual event check just to help reset us back for the tutorial
                if (event_name == 'ev_tutorial_8') {
                    let ooch_party = profile.get(`${interaction.user.id}`, 'ooch_party');
                    // Remove Vrumbox
                    ooch_party = ooch_party.filter(v => v.id !== OochID.Vrumbox);
                    let mainOoch = ooch_party[0];
                    let mainOochFixed = await create_ooch(mainOoch.id, 
                        {
                            level: 5,
                            move_list : [],
                            nickname: mainOoch.nickname,
                            ability: mainOoch.ability,
                            hp_iv: 5,
                            atk_iv: 5,
                            def_iv: 5,
                            spd_iv: 5
                        });
                    ooch_party[0] = mainOochFixed;
                    profile.set(interaction.user.id, ooch_party, 'ooch_party')

                    // Reset other values upon tutorial completion
                    profile.set(interaction.user.id, 0, 'oochabux');
                    profile.set(interaction.user.id, {
                        [ItemCategory.Consumable]: [],
                        [ItemCategory.Prism]: [],
                        [ItemCategory.Map]: [],
                        [ItemCategory.Key]: [],
                        [ItemCategory.Skin]: [],
                        [ItemCategory.Treat]: [],
                    }, 'inventory');
                    profile.set(interaction.user.id, 0, `oochadex[52].caught`);
                }

                if (interaction.message.id != msg_to_edit) await interaction.message.delete();
                profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
                profile.set(interaction.user.id, false, 'cur_event_name');
                profile.set(interaction.user.id, [], 'cur_event_array');
                profile.set(interaction.user.id, 0, 'cur_event_pos');
                quit = true;
                let playspace_str = await setup_playspace_str(interaction.user.id);
                await interaction.update({ components: playspace_str.components, flags: playspace_str.flags, embeds: [], files: [] }).then(async () => {
                    await move(interaction.channel, interaction.user.id, '', 2);
                }).catch((err) => { console.log(err) });
                current_place++;
                return;
            } else {
                current_place++;
                profile.set(interaction.user.id, current_place, 'cur_event_pos');
            }
        }
    
    }
}