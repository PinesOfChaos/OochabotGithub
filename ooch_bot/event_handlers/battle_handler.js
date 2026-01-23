/*

Battle Menu
    var battle_str = `battle_${battle_id}`

    `${battle_str}_fight_${StanceForms.NoChange}` //Use StanceForms.NoChange when going into fight from the main battle menu
        
        `${battle_str}_fight_move1_${stance}` + move selected
        `${battle_str}_fight_move2_${stance}` + move selected
        `${battle_str}_fight_move3_${stance}` + move selected
        `${battle_str}_fight_move4_${stance}` + move selected
        `${battle_str}_fight_back`
        `${battle_str}_fight_stance` //Selecting a stance here goes back to the previous menu level, but replaces StanceForms.NoChange 


    `${battle_str}_switch`
        `${battle_str}_switch_1`
        `${battle_str}_switch_2`
        `${battle_str}_switch_3`
        `${battle_str}_switch_4`
        `${battle_str}_switch_back`

    `${battle_str}_bag`
        `${battle_str}_bag_heal`
        `${battle_str}_bag_prism`
        `${battle_str}_bag_back`
    
        
    `${battle_str}_battle_end`

    battle_{battle_id}_{userid}_run


*/

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ContainerBuilder, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, TextDisplayBuilder } from "discord.js";
import { ability_data, battle_data, item_data, monster_data, move_data, profile, stance_data, status_data } from "../db.js";
import { finish_battle, get_stance_options, new_battle_action_attack, new_battle_action_heal, new_battle_action_prism, new_battle_action_run, new_battle_action_stance_change, new_battle_action_switch, process_battle_actions, type_effectiveness, type_to_emote } from "../func_battle.js";
import { formatStatBar, get_emote_string } from "../func_other.js";
import { ItemCategory, ItemType } from "../types.js";
import { botClient } from "../index.js";
import { capitalize } from "lodash-es";

export async function battle_input_create(battle_id, user_index) {

    const pre = `battle_${battle_id}_${user_index}_`;
    let db_battle_data = battle_data.get(`${battle_id}`);

    let inputRow = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId(`${pre}fight`)
            .setLabel('Fight')
            .setEmoji('⚔️')
            .setStyle(ButtonStyle.Primary),
    ) .addComponents(
        new ButtonBuilder()
            .setCustomId(`${pre}switch`)
            .setLabel('Switch')
            .setEmoji(get_emote_string('item_prism'))
            .setStyle(ButtonStyle.Success),
    );

    let inputRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}bag`)
                .setLabel('Item')
                .setEmoji('🎒')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!db_battle_data.allow_items),
        ) .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}run`)
                .setLabel('Run')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏃‍♂️')
                .setDisabled(!db_battle_data.allow_run),
        );

    let inputRow3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}info`)
                .setLabel('Info')
                .setEmoji('📒')
                .setStyle(ButtonStyle.Secondary),
        ) .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}shift_stance`)
                .setLabel('Stance')
                .setEmoji('🤺')
                .setStyle(ButtonStyle.Secondary)
        )

        // if (!(profile.get(`${user.user_id}`, 'flags').includes('stances_enable'))) {   
        //     inputRow3 = new ActionRowBuilder()
        //     .addComponents(
        //         new ButtonBuilder()
        //             .setCustomId(`${pre}view_battle_info`)
        //             .setLabel('View Battle Info')
        //             .setEmoji('📒')
        //             .setStyle(ButtonStyle.Secondary),
        //     )
        // }

    return [inputRow, inputRow2, inputRow3]
}

/**
 * Handles battle buttons based on an interaction
 * @param {Any} interaction the interaction to do things with
 */
export async function battle_handler(interaction) {
    let selected, customId;

    // Initialize used variables
    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
    } else {
        customId = interaction.customId;
        selected = interaction.values[0];
    }

    let customId_data = customId.split('_')
    let battle_id = customId_data[1];
    let user_index = parseInt(customId_data[2]);
    let db_battle_data = battle_data.get(`${battle_id}`);
    let user = db_battle_data.users[user_index];
    let user_profile = profile.get(`${user.user_id}`);

    if (user_profile.play_thread_id != interaction.channel.id) {
        return interaction.user.send('Stop trying to use other peoples buttons! They are not for you!')
    }

    //Check whether stances are enabled
    let stancesEnabled = (profile.get(`${user.user_id}`, 'flags').includes('stances_enable'));

    const pre = `battle_${battle_id}_${user_index}_`;

    // #region Make Buttons

    let [inputRow, inputRow2, inputRow3] = await battle_input_create(battle_id, user_index);
            
    let moveButtons1 = new ActionRowBuilder();
    let moveButtons2 = new ActionRowBuilder();
    let moveInfoViewing = false;

    let targetButtons1 = new ActionRowBuilder();
    let targetButtons2 = new ActionRowBuilder();

    let switchButtons1 = new ActionRowBuilder();
    let switchButtons2 = new ActionRowBuilder();
    let bagButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}heal`)
                .setLabel('Healing')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(get_emote_string('item_potion_magic')),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}prism`)
                .setLabel('Prism')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(get_emote_string('item_prism'))
                .setDisabled(true),
        )

    const backButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}back`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        )

    const moveBackButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}back`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        )
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}view_move_info`)
                .setLabel('View Moves Info')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗒️'),
        )

    // #endregion

    async function end_prompt_input(db_battle_data, interaction) {
        console.log(db_battle_data.users);
        if (db_battle_data.users.every(u => u.action_selected !== false)) {
            db_battle_data.battle_msg_counter -= 1;
            battle_data.set(battle_id, db_battle_data);
            const waitText = new TextDisplayBuilder().setContent(`Waiting for other players...`);
            const waitContainer = new ContainerBuilder().addTextDisplayComponents(waitText);
            await interaction.update({ components: [waitContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

            // Delete all input messages
            for (let user of db_battle_data.users) {
                if (user.is_player) {
                    let thread = botClient.channels.cache.get(`${user.thread_id}`);
                    await thread.bulkDelete(1).catch(() => {});
                }
            }

            await process_battle_actions(battle_id);
        } else {
            const waitText2 = new TextDisplayBuilder().setContent('Waiting for other players...');
            const waitContainer2 = new ContainerBuilder().addTextDisplayComponents(waitText2);
            await interaction.update({ components: [waitContainer2], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        }
    }

    // Run functions

    // END BATTLE
    if (customId.startsWith(`battle_${battle_id}_0_end_battle`)) {
        const endText = new TextDisplayBuilder().setContent('Ending battle...');
        const endContainer = new ContainerBuilder().addTextDisplayComponents(endText);
        await interaction.update({ components: [endContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        await interaction.deleteReply().catch(() => {});

        for(let user of db_battle_data.users) {
            if(user.is_player){
                await finish_battle(db_battle_data, user.user_index);
            }
        }
    }

    // MAIN BACK
    if (customId == `${pre}back`) {
        const header = new TextDisplayBuilder().setContent(`**-- Select An Action --**`);
        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addActionRowComponents(inputRow, inputRow2, inputRow3);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }




    // MAIN ATTACK
    if (customId == `${pre}fight`) {
        let activeOoch = user.party[user.active_slot];
        let move_id, move_name, move_type, move_damage, move_effective_emote = '',
        buttonStyle = ButtonStyle.Primary;

        moveButtons1 = new ActionRowBuilder()
        moveButtons2 = new ActionRowBuilder()



        // Get the Oochamon's Attack options
        for (let i = 0; i < activeOoch.moveset.length; i++) {
            move_id = activeOoch.moveset[i];
            move_name = move_data.get(`${move_id}`, 'name')
            move_type = move_data.get(`${move_id}`, 'type')
            move_damage = move_data.get(`${move_id}`, 'damage')

            if (db_battle_data.users.length == 2) {
                let enemy_user = db_battle_data.users.filter(u => u.team_id != user.team_id)[0];
                move_effective_emote = type_effectiveness(move_type, enemy_user.party[enemy_user.active_slot].type);
                if (move_effective_emote[0] > 1) {
                    move_effective_emote = ' △';
                    buttonStyle = ButtonStyle.Success
                } else if (move_effective_emote[0] < 1) {
                    move_effective_emote = ' ▽';
                    buttonStyle = ButtonStyle.Danger
                } else {
                    move_effective_emote = '';
                    buttonStyle = ButtonStyle.Primary
                }

                if (move_damage == 0) {
                    move_effective_emote = '';
                    buttonStyle = ButtonStyle.Secondary
                }
            }

            ((i <= 1) ? moveButtons1 : moveButtons2).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}atk_${move_id}`)
                    .setLabel(`${move_name} ${move_effective_emote}`)
                    .setStyle(buttonStyle)
                    .setEmoji(`${type_to_emote(move_type)}`)
            )
        }

        if (stancesEnabled) inputRow3.components[1].setDisabled((activeOoch.stance_cooldown != 0))

        // Switch message to be about using the move input
        let moveSelMsg = `Select a move to use!\n**Current Stance: ${stance_data.get(`${activeOoch.stance}`, 'name')}**`;
        if (!stancesEnabled) moveSelMsg = `Select a move to use!`;

        const moveHeader = new TextDisplayBuilder().setContent(moveSelMsg);
        const moveContainer = new ContainerBuilder().addTextDisplayComponents(moveHeader);

        if (moveButtons2.components.length != 0) {
            moveContainer.addActionRowComponents(moveButtons1, moveButtons2, moveBackButton);
        } else {
            moveContainer.addActionRowComponents(moveButtons1, moveBackButton);
        }

        await interaction.update({ components: [moveContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }

    // PROCESS ATTACK
    if (customId.startsWith(`${pre}atk`)) {
        let move_id = customId.replace(`${pre}atk_`, '');
        let self_target = move_data.get(`${move_id}`, 'self_target');

        if (db_battle_data.users.length == 2 || self_target == true) {
            let enemy_user = db_battle_data.users.filter(u => u.team_id != user.team_id)[0];
            user.action_selected = true;
            new_battle_action_attack(db_battle_data, user.user_index, enemy_user.user_index, move_id);

            // Continue on if everyone has selected (which should happen at the end)
            await end_prompt_input(db_battle_data, interaction);

        } else {
            // Select an Oochamon to attack
            let user_list = db_battle_data.users.filter(usr => usr.team_id != user.team_id);
            let ooch_options = user_list.map(usr => [usr.party[usr.active_slot], usr]);
            let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_disable;
            
            targetButtons1 = new ActionRowBuilder();
            targetButtons2 = new ActionRowBuilder();

            for (let i = 0; i < ooch_options.length; i++) {
                ooch_check = ooch_options[i][0];
                ooch_emote = monster_data.get(`${[ooch_check.id]}`, 'emote');
                ooch_name = ooch_check.nickname;
                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;

                ooch_disable = ooch_check.alive == false;

                ((i <= 1) ? targetButtons1 : targetButtons2).addComponents(
                    new ButtonBuilder()
                        // pre_target_teamId_userId_atkId
                        .setCustomId(`${pre}target_${ooch_options[i][1].team_id}_${ooch_options[i][1].user_id}_${move_id}`)
                        .setLabel(`${ooch_name} (${ooch_hp})`)
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(ooch_emote)
                        .setDisabled(ooch_disable),
                )
            }

            const targetHeader = new TextDisplayBuilder().setContent(`**-- Select An Oochamon To Use Move On --**`);
            const targetContainer = new ContainerBuilder().addTextDisplayComponents(targetHeader);

            if (targetButtons2.components.length != 0) {
                targetContainer.addActionRowComponents(targetButtons1, targetButtons2, backButton);
            } else {
                targetContainer.addActionRowComponents(targetButtons1, backButton);
            }

            await interaction.update({ components: [targetContainer], flags: MessageFlags.IsComponentsV2 });
        }
    }

    // TARGET ATTACK
    if (customId.startsWith(`${pre}target`)) {
        let parts = customId.split('_'); // REMEMBER TO ACCOUNT FOR PRE
        let team_id = parts[1]; 
        let user_id = parts[2];
        let move_id = parts[3];

        let enemy_user = db_battle_data.users.filter(u => u.team_id == team_id && u.user_id == user_id)[0];
        user.action_selected = true;
        new_battle_action_attack(db_battle_data, user.user_index, enemy_user.user_index, move_id);

        // Continue on if everyone has selected (which should happen at the end)
        await end_prompt_input(db_battle_data, interaction);
    }

    if (customId == `${pre}view_move_info`) {
        let activeOoch = user.party[user.active_slot];

        // Populate move buttons (same logic as fight handler)
        let move_id, move_name, move_type, move_damage, move_effective_emote = '',
        buttonStyle = ButtonStyle.Primary;

        moveButtons1 = new ActionRowBuilder();
        moveButtons2 = new ActionRowBuilder();

        for (let i = 0; i < activeOoch.moveset.length; i++) {
            move_id = activeOoch.moveset[i];
            move_name = move_data.get(`${move_id}`, 'name');
            move_type = move_data.get(`${move_id}`, 'type');
            move_damage = move_data.get(`${move_id}`, 'damage');

            if (db_battle_data.users.length == 2) {
                let enemy_user = db_battle_data.users.filter(u => u.team_id != user.team_id)[0];
                move_effective_emote = type_effectiveness(move_type, enemy_user.party[enemy_user.active_slot].type);
                if (move_effective_emote[0] > 1) {
                    move_effective_emote = ' △';
                    buttonStyle = ButtonStyle.Success;
                } else if (move_effective_emote[0] < 1) {
                    move_effective_emote = ' ▽';
                    buttonStyle = ButtonStyle.Danger;
                } else {
                    move_effective_emote = '';
                    buttonStyle = ButtonStyle.Primary;
                }

                if (move_damage == 0) {
                    move_effective_emote = '';
                    buttonStyle = ButtonStyle.Secondary;
                }
            }

            ((i <= 1) ? moveButtons1 : moveButtons2).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}atk_${move_id}`)
                    .setLabel(`${move_name} ${move_effective_emote}`)
                    .setStyle(buttonStyle)
                    .setEmoji(`${type_to_emote(move_type)}`)
            );
        }

        // Show move info
        let moveInfoText = `## Move Info\n\n`;
        for (let i = 0; i < activeOoch.moveset.length; i++) {
            let mid = activeOoch.moveset[i];
            let db_move_data = move_data.get(`${mid}`);
            if (db_move_data.accuracy == -1) db_move_data.accuracy = 100;

            moveInfoText += `**${type_to_emote([db_move_data.type])} ${db_move_data.name}**\n`;
            moveInfoText += `${db_move_data.damage > 0 ? `**${db_move_data.damage} Power / ` : `**`}${db_move_data.accuracy}% Accuracy**\n`;
            moveInfoText += `*${db_move_data.description}*\n\n`;
        }

        const moveInfoDisplay = new TextDisplayBuilder().setContent(moveInfoText);
        const container = new ContainerBuilder().addTextDisplayComponents(moveInfoDisplay);

        if (moveButtons2.components.length != 0) {
            container.addActionRowComponents(moveButtons1, moveButtons2, moveBackButton);
        } else {
            container.addActionRowComponents(moveButtons1, moveBackButton);
        }
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (customId == `${pre}shift_stance`) {
        let activeOoch = user.party[user.active_slot];
        let stance_list = get_stance_options(activeOoch);
                        
        let stanceSelectMenu = new ActionRowBuilder();
        let stanceSelectOptions = [];
        
        for (let stance of stance_list) {
            stanceSelectOptions.push({ 
                label: `${stance.name}`,
                description: stance.description_short.slice(0, 100),
                value: `stance_sel_${stance.id}`
            })
        }

        stanceSelectMenu.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}stance_shift_select`)
                .setPlaceholder('Select a stance to shift to.')
                .addOptions(stanceSelectOptions),
        );

        const stanceHeader = new TextDisplayBuilder().setContent(`**Select the new stance to shift to! (You will be unable to switch off of this for the next 2 turns)**\n**Current Stance: ${stance_data.get(`${activeOoch.stance}`, 'name')}**`);
        const stanceContainer = new ContainerBuilder()
            .addTextDisplayComponents(stanceHeader)
            .addActionRowComponents(stanceSelectMenu, backButton);

        await interaction.update({ components: [stanceContainer], flags: MessageFlags.IsComponentsV2 });
    }

    // THIS IS A SELECT MENU INTERACTION
    if (customId == `${pre}stance_shift_select`) {
        let activeOoch = user.party[user.active_slot];
        let stance_id = selected.split('_')[2];
        activeOoch.stance = stance_id;
        activeOoch.stance_cooldown = 3;

        new_battle_action_stance_change(db_battle_data, user.user_index, stance_id);
        inputRow3.components[1].setDisabled(true)

        const header = new TextDisplayBuilder().setContent(`**-- Select An Action --**`);
        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addActionRowComponents(inputRow, inputRow2, inputRow3);
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (customId == `${pre}switch`) {
        let ooch_inv = user.party;
        let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_disable;
        
        switchButtons1 = new ActionRowBuilder();
        switchButtons2 = new ActionRowBuilder();

        for (let i = 0; i < ooch_inv.length; i++) {
            ooch_check = ooch_inv[i];
            ooch_emote = monster_data.get(`${ooch_check.id}`, 'emote');
            ooch_name = ooch_check.nickname;
            ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
            ooch_button_color = ButtonStyle.Primary;
            ooch_disable = false;

            if (i == user.active_slot) {
                ooch_button_color = ButtonStyle.Success;
                // ooch_prev = ooch_check;
                ooch_disable = true;
            }
            else if (ooch_check.current_hp <= 0) {
                ooch_disable = true;
            }

            ((i <= 1) ? switchButtons1 : switchButtons2).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}switch_${i}`)
                    .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                    .setStyle(ooch_button_color)
                    .setEmoji(ooch_emote)
                    .setDisabled(ooch_disable),
            )
        }

        const switchHeader = new TextDisplayBuilder().setContent(`**-- Select An Oochamon To Switch To --**`);
        const switchContainer = new ContainerBuilder().addTextDisplayComponents(switchHeader);

        if (switchButtons2.components.length != 0) {
            switchContainer.addActionRowComponents(switchButtons1, switchButtons2, backButton);
        } else {
            switchContainer.addActionRowComponents(switchButtons1, backButton);
        }

        await interaction.update({ components: [switchContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (customId.startsWith(`${pre}switch_`)) {
        user.action_selected = new_battle_action_switch(db_battle_data, user.user_index, customId.replace(`${pre}switch_`, ''), true, false);

        // Continue on if everyone has selected (which should happen at the end
        await end_prompt_input(db_battle_data, interaction);
    }

    if (customId == `${pre}bag`) {
        const bagHeader = new TextDisplayBuilder().setContent(`Select the item category you'd like to use an item in!`);
        const bagContainer = new ContainerBuilder()
            .addTextDisplayComponents(bagHeader)
            .addActionRowComponents(bagButtons, backButton);
        await interaction.update({ components: [bagContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (customId == `${pre}bag_heal`) {
        let consumable_inv = user.inventory[ItemCategory.Consumable];
        let bag_select = new ActionRowBuilder();
        let heal_select_options = [];
        
        for (let c of consumable_inv) {
            const consumable_data = item_data.get(`${c.id}`);
            if (consumable_data.type != ItemType.Potion && consumable_data.type != ItemType.Status) continue;
            if (c.quantity > 0 && c.quantity != undefined) {
                heal_select_options.push({ 
                    label: `${consumable_data.name} (${c.quantity})`,
                    description: consumable_data.description_short.slice(0, 100),
                    value: `${consumable_data.id}`,
                    emoji: consumable_data.emote,
                })
            }
        }

        if (heal_select_options.length > 0) {
            bag_select.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`${pre}heal_item_select`)
                    .setPlaceholder('Select a healing item to use!')
                    .addOptions(heal_select_options),
            );

            const healHeader = new TextDisplayBuilder().setContent(`Select the healing item you'd like to use!`);
            const healContainer = new ContainerBuilder()
                .addTextDisplayComponents(healHeader)
                .addActionRowComponents(bag_select, bagButtons, backButton);
            await interaction.update({ components: [healContainer], flags: MessageFlags.IsComponentsV2 })
        } else {
            const bagHeader = new TextDisplayBuilder().setContent(`Select the item category you'd like to use an item in!`);
            const bagContainer = new ContainerBuilder()
                .addTextDisplayComponents(bagHeader)
                .addActionRowComponents(bagButtons, backButton);
            await interaction.update({ components: [bagContainer], flags: MessageFlags.IsComponentsV2 })
        }
    }

    if (customId == `${pre}bag_prism`) {
        let prism_inv = user.inventory[ItemCategory.Prism];
        let bag_select = new ActionRowBuilder();
        let prism_select_options = [];
        
        for (let p of prism_inv) {
            const prism_data = item_data.get(`${p.id}`);
            if (p.quantity > 0 && p.quantity != undefined) {
                prism_select_options.push({ 
                    label: `${prism_data.name} (${p.quantity})`,
                    description: prism_data.description_short.slice(0, 100),
                    value: `${prism_data.id}`,
                    emoji: prism_data.emote,
                })
            }
        }

        bag_select.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}prism_item_select`)
                .setPlaceholder('Select a prism to use!')
                .addOptions(prism_select_options),
        );

        const prismHeader = new TextDisplayBuilder().setContent(`Select the prism you'd like to use!`);
        const prismContainer = new ContainerBuilder()
            .addTextDisplayComponents(prismHeader)
            .addActionRowComponents(bag_select, bagButtons, backButton);
        await interaction.update({ components: [prismContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (customId.includes('_item_select') && interaction.startsWith(`${pre}`)) {

        let ooch_inv = user.party;
        let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_disable;
        
        let healSelectButtons1, healSelectButtons2
        healSelectButtons1 = new ActionRowBuilder();
        healSelectButtons2 = new ActionRowBuilder();

        if (customId == 'heal_item_select') {
            for (let slot = 0; slot < ooch_inv.length; slot++) {
                ooch_check = ooch_inv[slot];
                ooch_emote = monster_data.get(`${ooch_check.id}`, 'emote');
                ooch_name = ooch_check.nickname;
                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                ooch_button_color = ButtonStyle.Primary;
                ooch_disable = false;

                if (slot == user.active_slot) {
                    ooch_button_color = ButtonStyle.Success;
                    ooch_disable = true;
                }
                else if (ooch_check.current_hp <= 0 || ooch_check.current_hp == ooch_check.stats.hp) {
                    ooch_disable = true;
                }

                ((slot <= 1) ? healSelectButtons1 : healSelectButtons2).addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${pre}${selected}_${slot}_item_sel_target`)
                        .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                        .setStyle(ooch_button_color)
                        .setEmoji(ooch_emote)
                        .setDisabled(ooch_disable),
                )
            }

            const healTargetHeader = new TextDisplayBuilder().setContent(`**-- Select An Oochamon To Heal --**`);
            const healTargetContainer = new ContainerBuilder().addTextDisplayComponents(healTargetHeader);

            if (healSelectButtons2.components.length != 0) {
                healTargetContainer.addActionRowComponents(healSelectButtons1, healSelectButtons2, backButton);
            } else {
                healTargetContainer.addActionRowComponents(healSelectButtons1, backButton);
            }

            await interaction.update({ components: [healTargetContainer], flags: MessageFlags.IsComponentsV2 });
        } else {
            let user_to_catch;
            for(let catch_target of db_battle_data.users){
                if(catch_target.is_catchable && catch_target.party[catch_target.active_slot].current_hp > 0){
                    user_to_catch = catch_target.user_index;
                }
            }
            
            user.action_selected = new_battle_action_prism(db_battle_data, user.user_index, selected, user_to_catch);

            // Continue on if everyone has selected (which should happen at the end)
            await end_prompt_input(db_battle_data, interaction);                                
        }
    } 

    if (customId.includes('_item_sel_target') && customId.startsWith(`${pre}`)) {
        let custom_id_data = customId.split('_');
        user.action_selected = new_battle_action_heal(db_battle_data, user.user_index, custom_id_data[0], custom_id_data[1]);

        // Continue on if everyone has selected (which should happen at the end)
        await end_prompt_input(db_battle_data, interaction); 
    }

    if (customId == `${pre}run`) {
        user.action_selected = new_battle_action_run(db_battle_data, user.user_index);

        // Continue on if everyone has selected (which should happen at the end)
        await end_prompt_input(db_battle_data, interaction);  
    }

    if (customId == `${pre}info` || customId.startsWith(`${pre}info_page_`)) {
        // Get current page (default to 0 for player)
        let currentPage = 0;
        if (customId.startsWith(`${pre}info_page_`)) {
            currentPage = parseInt(customId.split('_page_')[1]);
        }

        // Get all participants to show info for
        let allParticipants = db_battle_data.users;
        let totalPages = allParticipants.length;

        // Wrap around pages
        if (currentPage < 0) currentPage = totalPages - 1;
        if (currentPage >= totalPages) currentPage = 0;

        let targetUser = allParticipants[currentPage];

        // Build info text for the current page
        let oochPrisms = '';
        for (let ooch of targetUser.party) {
            oochPrisms += ooch.alive ? get_emote_string('item_prism') : `❌`;
        }

        let ooch = targetUser.party[targetUser.active_slot];
        let oochStatusEffects = ooch.status_effects.map(v => status_data.get(`${v}`, 'emote'));

        let battleInfoText = `## Battle Information 📒\n` +
                    `**Turn #${db_battle_data.turn_counter + 1}** | Page ${currentPage + 1}/${totalPages}\n\n` +
                    `**${targetUser.name_possessive} (Lv. ${ooch.level} ${ooch.emote} ${ooch.nickname})**\n` +
                    `**Oochamon Left:** ${oochPrisms}\n` +
                    `**Type:** ${type_to_emote(ooch.type)} **${ooch.type.map(v => capitalize(v)).join(' | ')}**\n` +
                    `**Ability:** ${ability_data.get(`${ooch.ability}`, 'name')}\n` +
                    `**Status Effects:** ${oochStatusEffects.length != 0 ? `${oochStatusEffects.join('')}` : `None`}\n\n` +
                    `**Stat Changes:**\n` +
                    `Atk: ${formatStatBar(ooch.stats.atk_mul)}\n` +
                    `Def: ${formatStatBar(ooch.stats.def_mul)}\n` +
                    `Spd: ${formatStatBar(ooch.stats.spd_mul)}\n` +
                    `Eva: ${formatStatBar(ooch.stats.eva_mul)}\n` +
                    `Acc: ${formatStatBar(ooch.stats.acc_mul)}\n`;

        const infoText = new TextDisplayBuilder().setContent(battleInfoText);
        const infoContainer = new ContainerBuilder().addTextDisplayComponents(infoText);

        // Add pagination buttons if there are multiple participants
        if (totalPages > 1) {
            const pageButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${pre}info_page_${currentPage - 1}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⬅️'),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${pre}info_page_${currentPage + 1}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('➡️'),
                );
            infoContainer.addActionRowComponents(pageButtons, backButton);
        } else {
            infoContainer.addActionRowComponents(backButton);
        }

        await interaction.update({ components: [infoContainer], flags: MessageFlags.IsComponentsV2 });
    }


    //#region PROMPT FUNCTION
    /* TODOs: 
        - Ensure the turn msg counters are correct after this is correct globally
        - Make sure messages are updated properly
        - Disable the switch button if you have no oochamon is selected
        - Setup submenu to select Oochamon to heal, rather than only being able to heal the currently sent out Oochamon.
    */

    //#endregion
}