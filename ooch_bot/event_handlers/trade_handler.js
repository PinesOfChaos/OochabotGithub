import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { profile } from "../db.js";
import { PlayerState } from "../types.js";
import { buildBoxData, ooch_info_embed } from "../func_other.js";
import { setup_playspace_str } from "../func_play.js";
import wait from "wait";
import { botClient } from "../index.js";

export const trade_sessions = new Map();

function getTradeSessionForUser(user_id) {
    for (let [trade_id, session] of trade_sessions) {
        if (session.initiator.user_id == user_id || session.target.user_id == user_id) {
            return { trade_id, session };
        }
    }
    return null;
}

function getUserData(session, user_id) {
    if (session.initiator.user_id == user_id) {
        return { userData: session.initiator, oppData: session.target, type: 'initiator' };
    } else {
        return { userData: session.target, oppData: session.initiator, type: 'target' };
    }
}

export async function trade_handler(interaction) {
    let customId, selected;

    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
    } else {
        customId = interaction.customId;
        selected = interaction.values[0];
    }

    const parts = customId.split('_');
    const user_id = parts[1];
    const pre = `trade_${user_id}_`;
    let action = customId.replace(pre, '');

    let tradeInfo = getTradeSessionForUser(user_id);
    if (!tradeInfo) {
        return interaction.reply({ content: 'No active trade session found.', ephemeral: true });
    }

    let { trade_id, session } = tradeInfo;
    let { userData, oppData } = getUserData(session, user_id);

    if (interaction.user.id != user_id) {
        return interaction.user.send('Stop trying to use other peoples buttons! They are not for you!');
    }

    let boxButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}exit`).setLabel('Exit').setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}num_label`).setLabel(`${userData.page_num + 1}`).setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
        );

    let oochTradeButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}offer`).setLabel('Offer Trade').setStyle(ButtonStyle.Success)
        );

    let tradeWaitButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        );

    let tradeConfirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`${pre}back`).setLabel('Back').setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId(`${pre}confirm`).setLabel('Confirm').setStyle(ButtonStyle.Success)
        );

    let userThread = await botClient.channels.cache.get(userData.thread_id);
    let oppThread = await botClient.channels.cache.get(oppData.thread_id);
    let oppPre = `trade_${oppData.user_id}_`;

    function rebuildBoxButtons(pageNum) {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`${pre}exit`).setLabel('Exit').setStyle(ButtonStyle.Danger)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${pre}left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${pre}right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${pre}num_label`).setLabel(`${pageNum + 1}`).setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${pre}party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
            );
    }

    if (action.includes('label')) {
        await interaction.update({});
        return;
    }

    if (action == 'exit') {
        profile.set(userData.user_id, PlayerState.Playspace, 'player_state');
        profile.set(oppData.user_id, PlayerState.Playspace, 'player_state');

        try {
            let userMsg = await userThread.messages.fetch(userData.trade_msg_id);
            await userMsg.delete().catch(() => {});
        } catch (e) {}

        try {
            let oppMsg = await oppThread.messages.fetch(oppData.trade_msg_id);
            await oppMsg.edit({ content: `**${userData.display_name}** has left the trade.`, embeds: [], components: [] });
            await wait(5000);
            await oppMsg.delete().catch(() => {});
        } catch (e) {}

        trade_sessions.delete(trade_id);
        return;
    }

    if (action == 'left' || action == 'right') {
        action == 'left' ? userData.page_num -= 1 : userData.page_num += 1;
        userData.page_num = (userData.page_num + 9) % 9;

        let user_profile = profile.get(`${userData.user_id}`);
        let boxRow = buildBoxData(userData.user_id, user_profile, userData.page_num, pre);
        let updatedBoxButtons = rebuildBoxButtons(userData.page_num);

        await interaction.update({
            content: `**Trade with ${oppData.display_name}:**\nPlease select an Oochamon to trade!`,
            components: [boxRow[0], boxRow[1], boxRow[2], boxRow[3], updatedBoxButtons]
        });
        return;
    }

    if (action.includes('box_ooch')) {
        let user_profile = profile.get(`${userData.user_id}`);
        let slot_data = action.split('_');
        let slot_num = parseInt(slot_data[3]);
        let party_slot = action.includes('_party');
        let ooch_user_data;

        console.log(user_profile, slot_data, slot_num);

        if (party_slot == false) {
            ooch_user_data = user_profile.ooch_pc[slot_num];
        } else {
            ooch_user_data = user_profile.ooch_party[slot_num];
        }

        userData.ooch_selected = ooch_user_data;
        userData.ooch_is_party = party_slot;
        userData.ooch_slot_num = slot_num;

        let dexEmbed = await ooch_info_embed(ooch_user_data, userData.user_id);
        let dexPng = dexEmbed[1];
        dexEmbed = dexEmbed[0];

        await interaction.update({ embeds: [dexEmbed], files: [dexPng], components: [oochTradeButtons] });
        return;
    }

    if (action == 'back') {
        let user_profile = profile.get(`${userData.user_id}`);
        let opp_profile = profile.get(`${oppData.user_id}`);

        userData.ready_to_trade = false;
        userData.trade_confirmed = false;
        userData.ooch_selected = null;
        userData.ooch_is_party = false;
        userData.ooch_slot_num = 0;

        oppData.ready_to_trade = false;
        oppData.trade_confirmed = false;
        oppData.ooch_selected = null;
        oppData.ooch_is_party = false;
        oppData.ooch_slot_num = 0;

        session.state = 'trading';

        let boxRow = buildBoxData(userData.user_id, user_profile, userData.page_num, pre);
        let updatedBoxButtons = rebuildBoxButtons(userData.page_num);

        await interaction.update({
            content: `**Trade with ${oppData.display_name}:**\nPlease select an Oochamon to trade!`,
            embeds: [],
            files: [],
            components: [boxRow[0], boxRow[1], boxRow[2], boxRow[3], updatedBoxButtons]
        });

        let oppBoxRow = buildBoxData(oppData.user_id, opp_profile, oppData.page_num, oppPre);
        let oppBoxButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`${oppPre}exit`).setLabel('Exit').setStyle(ButtonStyle.Danger)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${oppPre}left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${oppPre}right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${oppPre}num_label`).setLabel(`${oppData.page_num + 1}`).setStyle(ButtonStyle.Primary)
            ).addComponents(
                new ButtonBuilder().setCustomId(`${oppPre}party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
            );

        try {
            let oppMsg = await oppThread.messages.fetch(oppData.trade_msg_id);
            await oppMsg.edit({
                content: `**Trade with ${userData.display_name}:**\nPlease select an Oochamon to trade!`,
                embeds: [],
                files: [],
                components: [oppBoxRow[0], oppBoxRow[1], oppBoxRow[2], oppBoxRow[3], oppBoxButtons]
            });
        } catch (e) {}

        if (session.state == 'confirm') {
            let cancelMsg = await userThread.send(`### Trade Cancelled.\nYou cancelled the trade.`);
            let oppCancelMsg = await oppThread.send(`### Trade Cancelled.\n**${userData.display_name}** cancelled the trade.`);

            await wait(5000);
            await cancelMsg.delete().catch(() => {});
            await oppCancelMsg.delete().catch(() => {});
        }
        return;
    }

    if (action == 'offer') {
        userData.ready_to_trade = true;

        await interaction.update({
            content: `Trading ${userData.ooch_selected.emote} **${userData.ooch_selected.nickname}**! Waiting for response from other user...`,
            embeds: [],
            files: [],
            components: [tradeWaitButtons]
        });

        if (oppData.ready_to_trade == false) {
            try {
                let oppMsg = await oppThread.messages.fetch(oppData.trade_msg_id);
                await oppMsg.edit({
                    content: `**Trade with ${userData.display_name}:**\nPlease select an Oochamon to trade!\n✅ **${userData.display_name} has selected an Oochamon to trade.**`
                });
            } catch (e) {}
        }

        if (userData.ready_to_trade && oppData.ready_to_trade) {
            session.state = 'confirm';

            let oppDexEmbed = await ooch_info_embed(oppData.ooch_selected, oppData.user_id);
            let oppDexPng = oppDexEmbed[1];
            oppDexEmbed = oppDexEmbed[0];

            let userDexEmbed = await ooch_info_embed(userData.ooch_selected, userData.user_id);
            let userDexPng = userDexEmbed[1];
            userDexEmbed = userDexEmbed[0];

            try {
                let userMsg = await userThread.messages.fetch(userData.trade_msg_id);
                await userMsg.edit({
                    content: `Trading ${userData.ooch_selected.emote} **${userData.ooch_selected.nickname}**!\n${oppData.display_name} has offered up a ${oppData.ooch_selected.emote} **${oppData.ooch_selected.name}** for trade!\nDo you accept?`,
                    embeds: [oppDexEmbed],
                    files: [oppDexPng],
                    components: [tradeConfirmButtons]
                });
            } catch (e) {}

            let oppTradeConfirmButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}back`).setLabel('Back').setStyle(ButtonStyle.Danger)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}confirm`).setLabel('Confirm').setStyle(ButtonStyle.Success)
                );

            try {
                let oppMsg = await oppThread.messages.fetch(oppData.trade_msg_id);
                await oppMsg.edit({
                    content: `Trading ${oppData.ooch_selected.emote} **${oppData.ooch_selected.nickname}**!\n${userData.display_name} has offered up a ${userData.ooch_selected.emote} **${userData.ooch_selected.name}** for trade!\nDo you accept?`,
                    embeds: [userDexEmbed],
                    files: [userDexPng],
                    components: [oppTradeConfirmButtons]
                });
            } catch (e) {}
        }
        return;
    }

    if (action == 'confirm') {
        if (session.state != 'confirm') return;

        if (!oppData.trade_confirmed) {
            userData.trade_confirmed = true;

            await interaction.update({
                content: `Trade confirmed! Waiting for **${oppData.display_name}** to confirm...`,
                components: []
            });

            try {
                let oppMsg = await oppThread.messages.fetch(oppData.trade_msg_id);
                let currentContent = oppMsg.content;
                await oppMsg.edit({
                    content: currentContent + `\n✅ **${userData.display_name} confirmed their trade.**`
                });
            } catch (e) {}
        } else {
            let userProfile = profile.get(`${userData.user_id}`);
            let oppProfile = profile.get(`${oppData.user_id}`);

            if (userData.ooch_is_party) {
                userProfile.ooch_party[userData.ooch_slot_num] = oppData.ooch_selected;
            } else {
                userProfile.ooch_pc[userData.ooch_slot_num] = oppData.ooch_selected;
            }

            if (oppData.ooch_is_party) {
                oppProfile.ooch_party[oppData.ooch_slot_num] = userData.ooch_selected;
            } else {
                oppProfile.ooch_pc[oppData.ooch_slot_num] = userData.ooch_selected;
            }

            profile.set(userData.user_id, userProfile);
            profile.set(oppData.user_id, oppProfile);

            let user_profile_fresh = profile.get(`${userData.user_id}`);
            let opp_profile_fresh = profile.get(`${oppData.user_id}`);

            userData.ready_to_trade = false;
            userData.trade_confirmed = false;
            userData.ooch_selected = null;
            userData.ooch_is_party = false;
            userData.ooch_slot_num = 0;

            oppData.ready_to_trade = false;
            oppData.trade_confirmed = false;
            let tradedOoch = oppData.ooch_selected;
            oppData.ooch_selected = null;
            oppData.ooch_is_party = false;
            oppData.ooch_slot_num = 0;

            session.state = 'trading';

            let boxRow = buildBoxData(userData.user_id, user_profile_fresh, userData.page_num, pre);
            let updatedBoxButtons = rebuildBoxButtons(userData.page_num);

            await interaction.update({
                content: `**Trade with ${oppData.display_name}:**\nPlease select an Oochamon to trade!`,
                embeds: [],
                files: [],
                components: [boxRow[0], boxRow[1], boxRow[2], boxRow[3], updatedBoxButtons]
            });

            let oppBoxRow = buildBoxData(oppData.user_id, opp_profile_fresh, oppData.page_num, oppPre);
            let oppBoxButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}exit`).setLabel('Exit').setStyle(ButtonStyle.Danger)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}num_label`).setLabel(`${oppData.page_num + 1}`).setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${oppPre}party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
                );

            try {
                let oppMsg = await oppThread.messages.fetch(oppData.trade_msg_id);
                await oppMsg.edit({
                    content: `**Trade with ${userData.display_name}:**\nPlease select an Oochamon to trade!`,
                    embeds: [],
                    files: [],
                    components: [oppBoxRow[0], oppBoxRow[1], oppBoxRow[2], oppBoxRow[3], oppBoxButtons]
                });
            } catch (e) {}

            let confirmMsg = await userThread.send(`# Confirmed trade!\nYou have received ${tradedOoch.emote} **${tradedOoch.nickname}** from **${oppData.display_name}**!`);
            let oppConfirmMsg = await oppThread.send(`# Confirmed trade!\nYou have received ${userData.ooch_selected ? userData.ooch_selected.emote : ''} **${userData.ooch_selected ? userData.ooch_selected.nickname : 'the Oochamon'}** from **${userData.display_name}**!`);

            await wait(7500);
            await confirmMsg.delete().catch(() => {});
            await oppConfirmMsg.delete().catch(() => {});
        }
        return;
    }
}

export function create_trade_session(trade_id, initiator_data, target_data) {
    trade_sessions.set(trade_id, {
        trade_id: trade_id,
        state: 'trading',
        initiator: initiator_data,
        target: target_data
    });
}

export function end_trade_session(trade_id) {
    trade_sessions.delete(trade_id);
}
