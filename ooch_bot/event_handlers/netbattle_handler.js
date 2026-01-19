import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { ability_data, battle_data, item_data, monster_data, move_data, profile, stance_data, status_data } from "../db.js";
import { finish_battle, get_stance_options, new_battle_action_attack, new_battle_action_heal, new_battle_action_run, new_battle_action_stance_change, new_battle_action_switch, process_battle_actions, type_effectiveness, type_to_emote } from "../func_battle.js";
import { formatStatBar, get_emote_string } from "../func_other.js";
import { ItemCategory, ItemType, PlayerState } from "../types.js";
import { botClient } from "../index.js";
import { capitalize } from "lodash-es";

export const netbattle_sessions = new Map();

export async function netbattle_input_create(battle_id, user_index) {
    const pre = `netbattle_${battle_id}_${user_index}_`;
    let db_battle_data = battle_data.get(`${battle_id}`);

    let inputRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}fight`)
                .setLabel('Fight')
                .setEmoji('⚔️')
                .setStyle(ButtonStyle.Primary),
        ).addComponents(
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
        ).addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}forfeit`)
                .setLabel('Forfeit')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏳️'),
        );

    let inputRow3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}info`)
                .setLabel('Info')
                .setEmoji('📒')
                .setStyle(ButtonStyle.Secondary),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}shift_stance`)
                .setLabel('Stance')
                .setEmoji('🤺')
                .setStyle(ButtonStyle.Secondary)
        );

    return [inputRow, inputRow2, inputRow3];
}

export async function netbattle_handler(interaction) {
    let selected, customId;

    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
    } else {
        customId = interaction.customId;
        selected = interaction.values[0];
    }

    let customId_data = customId.split('_');
    let battle_id = customId_data[1];
    let user_index = parseInt(customId_data[2]);
    let db_battle_data = battle_data.get(`${battle_id}`);

    if (!db_battle_data) {
        return interaction.reply({ content: 'Battle not found.', ephemeral: true });
    }

    let user = db_battle_data.users[user_index];
    let user_profile = profile.get(`${user.user_id}`);

    if (user_profile.play_thread_id != interaction.channel.id) {
        return interaction.user.send('Stop trying to use other peoples buttons! They are not for you!');
    }

    let stancesEnabled = (profile.get(`${user.user_id}`, 'flags').includes('stances_enable'));

    const pre = `netbattle_${battle_id}_${user_index}_`;

    let [inputRow, inputRow2, inputRow3] = await netbattle_input_create(battle_id, user_index);

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
        );

    const backButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}back`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        );

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
        );

    async function end_prompt_input(db_battle_data, interaction) {
        if (db_battle_data.users.every(u => u.action_selected !== false)) {
            db_battle_data.battle_msg_counter -= 1;
            battle_data.set(battle_id, db_battle_data);
            await interaction.update({ content: `Waiting for other players...`, components: [], embeds: [] }).catch(() => {});

            for (let user of db_battle_data.users) {
                if (user.is_player) {
                    let thread = botClient.channels.cache.get(`${user.thread_id}`);
                    if (thread) {
                        await thread.bulkDelete(1).catch(() => {});
                    }
                }
            }

            await process_battle_actions(battle_id);
        } else {
            await interaction.update({ content: 'Waiting for other players...', components: [], embeds: [] }).catch(() => {});
        }
    }

    if (customId.startsWith(`netbattle_${battle_id}_${user_index}_end_battle`)) {
        await interaction.update({ content: 'Ending battle...', components: [] }).catch(() => {});
        await interaction.deleteReply().catch(() => {});

        for (let u of db_battle_data.users) {
            if (u.is_player) {
                await finish_battle(db_battle_data, u.user_index);
            }
        }
        netbattle_sessions.delete(battle_id);
    }

    if (customId == `${pre}back`) {
        await interaction.update({ content: `**-- Select An Action --**`, embeds: [], components: [inputRow, inputRow2, inputRow3] });
    }

    if (customId == `${pre}forfeit`) {
        let enemy_user = db_battle_data.users.find(u => u.user_index != user_index);

        await interaction.update({ content: `You have forfeited the battle!`, components: [] });

        for (let u of db_battle_data.users) {
            if (u.is_player) {
                profile.set(u.user_id, PlayerState.Playspace, 'player_state');
            }
        }

        if (enemy_user && enemy_user.is_player) {
            let oppThread = botClient.channels.cache.get(`${enemy_user.thread_id}`);
            if (oppThread) {
                await oppThread.send(`**${user.name}** has forfeited! You win!`);
            }
        }

        netbattle_sessions.delete(battle_id);
        battle_data.delete(battle_id);
    }

    if (customId == `${pre}fight`) {
        let activeOoch = user.party[user.active_slot];
        let move_id, move_name, move_type, move_damage, move_effective_emote = '',
            buttonStyle = ButtonStyle.Primary;

        moveButtons1 = new ActionRowBuilder();
        moveButtons2 = new ActionRowBuilder();

        for (let i = 0; i < activeOoch.moveset.length; i++) {
            move_id = activeOoch.moveset[i];
            move_name = move_data.get(`${move_id}`, 'name');
            move_type = move_data.get(`${move_id}`, 'type');
            move_damage = move_data.get(`${move_id}`, 'damage');

            let enemy_user = db_battle_data.users.find(u => u.team_id != user.team_id);
            if (enemy_user) {
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

        if (stancesEnabled) inputRow3.components[1].setDisabled((activeOoch.stance_cooldown != 0));

        let moveSelMsg = `Select a move to use!\n**Current Stance: ${stance_data.get(`${activeOoch.stance}`, 'name')}**`;
        if (!stancesEnabled) moveSelMsg = `Select a move to use!`;
        await interaction.update({ content: moveSelMsg, components: (moveButtons2.components.length != 0) ? [moveButtons1, moveButtons2, moveBackButton] : [moveButtons1, moveBackButton] }).catch(() => {});
    }

    if (customId.startsWith(`${pre}atk`)) {
        let move_id = customId.replace(`${pre}atk_`, '');
        let enemy_user = db_battle_data.users.find(u => u.team_id != user.team_id);

        user.action_selected = true;
        new_battle_action_attack(db_battle_data, user.user_index, enemy_user.user_index, move_id);

        await end_prompt_input(db_battle_data, interaction);
    }

    if (customId == `${pre}view_move_info`) {
        let moveInfoEmbed = new EmbedBuilder()
            .setTitle('Move Info');
        let moveInfoFields = [];
        let activeOoch = user.party[user.active_slot];

        for (let i = 0; i < activeOoch.moveset.length; i++) {
            let move_id = activeOoch.moveset[i];
            let db_move_data = move_data.get(`${move_id}`);
            if (db_move_data.accuracy == -1) db_move_data.accuracy = 100;
            let move_string = `
            ${db_move_data.damage > 0 ? `**${db_move_data.damage} Power / ` : `**`}${db_move_data.accuracy}% Accuracy**
                *${db_move_data.description}*
            `;

            moveInfoFields.push({
                name: `${type_to_emote([db_move_data.type])} ${db_move_data.name}`,
                value: move_string,
                inline: true
            });
        }

        moveInfoFields.splice(2, 0, { name: '\u200B', value: '\u200B', inline: true });
        if (moveInfoFields.length > 5) moveInfoFields.splice(5, 0, { name: '\u200B', value: '\u200B', inline: true });
        moveInfoEmbed.addFields(moveInfoFields);

        if (moveInfoViewing == true) {
            moveBackButton.components[1].setLabel('View Move Info');
            interaction.update({ embeds: [], components: (moveButtons2.components.length != 0) ? [moveButtons1, moveButtons2, moveBackButton] : [moveButtons1, moveBackButton] });
            moveInfoViewing = false;
        } else {
            moveBackButton.components[1].setLabel('Close Move Info');
            interaction.update({ embeds: [moveInfoEmbed], components: (moveButtons2.components.length != 0) ? [moveButtons1, moveButtons2, moveBackButton] : [moveButtons1, moveBackButton] });
            moveInfoViewing = true;
        }
    }

    // STANCE SHIFT MENU
    if (customId == `${pre}stance_shift`) {
        let activeOoch = user.party[user.active_slot];
        let stance_list = get_stance_options(activeOoch);

        let stanceSelectMenu = new ActionRowBuilder();
        let stanceSelectOptions = [];

        for (let stance of stance_list) {
            stanceSelectOptions.push({
                label: `${stance.name}`,
                description: stance.description_short.slice(0, 100),
                value: `stance_sel_${stance.id}`
            });
        }

        stanceSelectMenu.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${pre}stance_shift_select`)
                .setPlaceholder('Select a stance to shift to.')
                .addOptions(stanceSelectOptions),
        );

        await interaction.update({ content: `**Select the new stance to shift to! (You will be unable to switch off of this for the next 2 turns)**\n**Current Stance: ${stance_data.get(`${activeOoch.stance}`, 'name')}**`, components: [stanceSelectMenu, backButton] });
    }

    // STANCE SHIFT SELECT
    if (customId == `${pre}stance_shift_select`) {
        let activeOoch = user.party[user.active_slot];
        let stance_id = selected.split('_')[2];
        activeOoch.stance = stance_id;
        activeOoch.stance_cooldown = 3;

        new_battle_action_stance_change(db_battle_data, user.user_index, stance_id);
        inputRow3.components[1].setDisabled(true);

        await interaction.update({ content: `**-- Select An Action --**`, embeds: [], components: [inputRow, inputRow2, inputRow3] });
    }

    // SWITCH MENU
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
                ooch_disable = true;
            } else if (ooch_check.current_hp <= 0) {
                ooch_disable = true;
            }

            ((i <= 1) ? switchButtons1 : switchButtons2).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}switch_${i}`)
                    .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                    .setStyle(ooch_button_color)
                    .setEmoji(ooch_emote)
                    .setDisabled(ooch_disable),
            );
        }

        await interaction.update({ content: `**-- Select An Oochamon To Switch To --**`, components: (switchButtons2.components.length != 0) ? [switchButtons1, switchButtons2, backButton] : [switchButtons1, backButton] });
    }

    // SWITCH ACTION
    if (customId.startsWith(`${pre}switch_`)) {
        user.action_selected = new_battle_action_switch(db_battle_data, user.user_index, customId.replace(`${pre}switch_`, ''), true, false);

        await end_prompt_input(db_battle_data, interaction);
    }

    // BAG MENU
    if (customId == `${pre}bag`) {
        await interaction.update({ content: `Select the item category you'd like to use an item in!`, components: [bagButtons, backButton] });
    }

    // HEAL ITEM SELECT
    if (customId == `${pre}heal`) {
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
                });
            }
        }

        if (heal_select_options.length > 0) {
            bag_select.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`${pre}heal_item_select`)
                    .setPlaceholder('Select a healing item to use!')
                    .addOptions(heal_select_options),
            );

            await interaction.update({ content: `Select the healing item you'd like to use!`, components: [bag_select, bagButtons, backButton] });
        } else {
            await interaction.update({ content: `You have no healing items!`, components: [bagButtons, backButton] });
        }
    }

    // HEAL ITEM SELECTED
    if (customId == `${pre}heal_item_select`) {
        let ooch_inv = user.party;
        let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_disable;

        let healSelectButtons1 = new ActionRowBuilder();
        let healSelectButtons2 = new ActionRowBuilder();

        for (let slot = 0; slot < ooch_inv.length; slot++) {
            ooch_check = ooch_inv[slot];
            ooch_emote = monster_data.get(`${ooch_check.id}`, 'emote');
            ooch_name = ooch_check.nickname;
            ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
            ooch_button_color = ButtonStyle.Primary;
            ooch_disable = false;

            if (ooch_check.current_hp <= 0 || ooch_check.current_hp == ooch_check.stats.hp) {
                ooch_disable = true;
            }

            ((slot <= 1) ? healSelectButtons1 : healSelectButtons2).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}${selected}_${slot}_item_sel_target`)
                    .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                    .setStyle(ooch_button_color)
                    .setEmoji(ooch_emote)
                    .setDisabled(ooch_disable),
            );
        }

        await interaction.update({ content: `**-- Select An Oochamon To Heal --**`, components: (healSelectButtons2.components.length != 0) ? [healSelectButtons1, healSelectButtons2, backButton] : [healSelectButtons1, backButton] });
    }

    // HEAL TARGET SELECTED
    if (customId.includes('_item_sel_target') && customId.startsWith(`${pre}`)) {
        let custom_id_data = customId.replace(pre, '').split('_');
        user.action_selected = new_battle_action_heal(db_battle_data, user.user_index, custom_id_data[0], custom_id_data[1]);

        await end_prompt_input(db_battle_data, interaction);
    }

    // INFO PANEL
    if (customId == `${pre}info`) {
        let oochPrisms = '';
        for (let ooch of user.party) {
            oochPrisms += ooch.alive ? get_emote_string('item_prism') : `❌`;
        }

        let oochInfoFields = [];
        let activeOoch = user.party[user.active_slot];
        let oochStatusEffects = activeOoch.status_effects.map(v => status_data.get(`${v}`, 'emote'));

        let infoStr = `**Oochamon Left:** ${oochPrisms}\n` +
            `**Type:** ${type_to_emote(activeOoch.type)} **${activeOoch.type.map(v => capitalize(v)).join(' | ')}**\n` +
            `**Ability:** ${ability_data.get(`${activeOoch.ability}`, 'name')}\n` +
            `**Status Effects:** ${oochStatusEffects.length != 0 ? `${oochStatusEffects.join('')}` : `None`}\n\n` +
            `**Stat Changes:**\n` +
            `Atk: ${formatStatBar(activeOoch.stats.atk_mul)}\n` +
            `Def: ${formatStatBar(activeOoch.stats.def_mul)}\n` +
            `Spd: ${formatStatBar(activeOoch.stats.spd_mul)}\n` +
            `Eva: ${formatStatBar(activeOoch.stats.eva_mul)}\n` +
            `Acc: ${formatStatBar(activeOoch.stats.acc_mul)}\n`;

        oochInfoFields.push({
            name: `${user.name_possessive} (Lv. ${activeOoch.level} ${activeOoch.emote} ${activeOoch.nickname})`,
            value: infoStr,
            inline: true,
        });

        let battleInfoEmbed = new EmbedBuilder()
            .setTitle('Battle Information 📒')
            .setDescription(`**Turn #${db_battle_data.turn_counter + 1}**\n`)
            .addFields(oochInfoFields);

        await interaction.update({ content: null, embeds: [battleInfoEmbed], components: [backButton] });
    }
}

// Create a new netbattle session
export function create_netbattle_session(battle_id, user1_data, user2_data) {
    netbattle_sessions.set(battle_id, {
        battle_id: battle_id,
        users: [user1_data, user2_data],
        state: 'active'
    });
}

// Clean up a netbattle session
export function end_netbattle_session(battle_id) {
    netbattle_sessions.delete(battle_id);
    battle_data.delete(battle_id);
}
