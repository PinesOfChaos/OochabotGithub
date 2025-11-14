import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';
import wait from 'wait';
import { ooch_info_embed, buildBoxData } from '../func_other.js';

/**
 * Handles trade interactions (buttons, selects)
 * This is called from the message collectors in commands/trade.js
 *
 * @param {Interaction} interaction - The interaction to handle
 * @param {Object} userPageData - Data for the user who clicked
 * @param {Object} oppUserPageData - Data for the other user in the trade
 * @param {Object} oppUserThread - Thread of the opposing user
 * @param {Object} oppTradeMember - Member object for opposing user
 * @param {Object} oppTradeMsg - Message object for opposing user
 * @param {String} tradeState - Current trade state ('trading' or 'confirm')
 * @returns {String} - Updated trade state
 */
export async function trade_handler(interaction, userPageData, oppUserPageData, oppUserThread, oppTradeMember, oppTradeMsg, tradeState) {

    let oochTradeButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger)).addComponents(
                new ButtonBuilder().setCustomId('offer').setLabel('Offer Trade').setStyle(ButtonStyle.Success));

    let tradeWaitButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger));

    let tradeConfirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger)).addComponents(
                new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success));

    // Label buttons
    if (interaction.customId.includes('emp') || interaction.customId.includes('label')) {
        await interaction.update({ embeds: [] });
    }

    // Exit button
    else if (interaction.customId == 'exit') {
        await profile.set(userPageData.user.id, PlayerState.Playspace, 'player_state');
        await profile.set(oppUserPageData.user.id, PlayerState.Playspace, 'player_state');
        await userPageData.trade_msg.delete();
        await oppTradeMsg.edit({ content: `**${userPageData.member.displayName}** has left the trade.`, embeds: [], components: [] });
        await wait(5000);
        await oppTradeMsg.delete();
    }

    // Page buttons
    else if (interaction.customId == 'left' || interaction.customId == 'right') {
        interaction.customId == 'left' ? userPageData.page_num -= 1 : userPageData.page_num += 1;
        userPageData.page_num = (userPageData.page_num + userPageData.pages) % userPageData.pages; // Handle max page overflow

        userPageData.box_row = buildBoxData(profile.get(userPageData.user.id), userPageData.page_num);
        userPageData.box_buttons.components[3].setLabel(`${userPageData.page_num + 1}`);
        await interaction.update({ components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
    }

    // Select Oochamon
    else if (interaction.customId.includes('box_ooch')) {
        let user_profile = profile.get(`${userPageData.user.id}`);
        let slot_data = interaction.customId.split('_');
        let slot_num = slot_data[3];
        let party_slot = false;
        let ooch_user_data;
        if (interaction.customId.includes('_party')) party_slot = true;

        if (party_slot == false) {
            ooch_user_data = user_profile.ooch_pc[slot_num]; // Personal Oochamon Data in Oochabox
        } else {
            ooch_user_data = user_profile.ooch_party[slot_num]; // Personal Oochamon Data in Party
        }

        let dexEmbed = await ooch_info_embed(ooch_user_data);
        let dexPng = dexEmbed[1];
        dexEmbed = dexEmbed[0];
        userPageData.ooch_selected = ooch_user_data;
        userPageData.ooch_is_party = party_slot;
        userPageData.ooch_slot_num = slot_num;

        await interaction.update({ embeds: [dexEmbed], files: [dexPng], components: [oochTradeButtons] });
    }

    // Back button
    else if (interaction.customId == 'back') {
        userPageData.box_row = buildBoxData(profile.get(userPageData.user.id), userPageData.page_num);
        userPageData.ready_to_trade = false;
        userPageData.ooch_selected = null;
        userPageData.ooch_is_party = false;
        userPageData.ooch_slot_num = 0;

        oppUserPageData.box_row = buildBoxData(profile.get(oppUserPageData.user.id), oppUserPageData.page_num);
        oppUserPageData.ready_to_trade = false;
        oppUserPageData.ooch_selected = null;
        oppUserPageData.ooch_is_party = false;
        oppUserPageData.ooch_slot_num = 0;

        await interaction.update({ content: `**Trade with ${userPageData.other_member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
        await oppTradeMsg.edit({ content: `**Trade with ${userPageData.member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], components: [oppUserPageData.box_row[0], oppUserPageData.box_row[1], oppUserPageData.box_row[2], oppUserPageData.box_row[3], oppUserPageData.box_buttons] });

        if (tradeState == 'confirm') {
            let cancelMsg = await userPageData.thread.send(`### Trade Cancelled.\nYou cancelled the trade.`);
            let oppCancelMsg = await oppUserThread.send(`### Trade Cancelled.\n**${userPageData.member.displayName}** cancelled the trade.`);
            tradeState = 'trading';

            await wait(5000);
            await cancelMsg.delete();
            await oppCancelMsg.delete();
        }

    }

    // Offer trade
    else if (interaction.customId == 'offer') {
        userPageData.ready_to_trade = true;
        await interaction.update({ content: `Trading ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.nickname}**! Waiting for response from other user...`, embeds: [], components: [tradeWaitButtons] });

        // Update opposing players message
        if (oppUserPageData.ready_to_trade == false) {
            await oppTradeMsg.edit(`**Trade with ${userPageData.member.displayName}:**\nPlease select an Oochamon to trade!\n **${userPageData.member.displayName} has selected an Oochamon to trade.**`);
        }
    }

    // Both ready - show confirmation
    if (userPageData.ready_to_trade == true && oppUserPageData.ready_to_trade == true && tradeState == 'trading') {
        let oppUserDexEmbed = await ooch_info_embed(oppUserPageData.ooch_selected);
        let oppUserDexPng = oppUserDexEmbed[1];
        oppUserDexEmbed = oppUserDexEmbed[0];

        let userDexEmbed = await ooch_info_embed(userPageData.ooch_selected);
        let userDexPng = userDexEmbed[1];
        userDexEmbed = userDexEmbed[0];

        await userPageData.trade_msg.edit({ content: `Trading ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.nickname}**!\n${oppTradeMember.displayName} has offered up a ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.name}** for trade!\nDo you accept?`, embeds: [oppUserDexEmbed], files: [oppUserDexPng], components: [tradeConfirmButtons] });
        await oppUserPageData.trade_msg.edit({ content: `Trading ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.nickname}**!\n${userPageData.member.displayName} has offered up a ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.name}** for trade!\nDo you accept?`, embeds: [userDexEmbed], files: [userDexPng], components: [tradeConfirmButtons] });
        tradeState = 'confirm';

    }

    // Confirm trade (first user)
    else if (tradeState == 'confirm' && interaction.customId == 'confirm' && oppUserPageData.trade_confirmed == false) {

        // Confirm but don't finish, wait for other input
        await interaction.update({ content: `Trade confirmed! Waiting for response...`, components: [] });
        await oppTradeMsg.edit({
            content: `Trading ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.nickname}**!\n${userPageData.member.displayName} has offered up a ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.name}** for trade!\nDo you accept?` +
                `\n **${userPageData.member.displayName} confirmed their trade.**`
        });
        userPageData.trade_confirmed = true;

    }

    // Confirm trade (both users)
    else if (tradeState == 'confirm' && interaction.customId == 'confirm' && oppUserPageData.trade_confirmed == true) {
        // Do the trade here
        let userProfile = profile.get(`${userPageData.user.id}`);
        let oppUserProfile = profile.get(`${userPageData.other_user.id}`);

        // Add Ooch to PC or party based on
        userPageData.ooch_is_party ? userProfile.ooch_party[userPageData.ooch_slot_num] = oppUserPageData.ooch_selected : userProfile.ooch_pc[userPageData.ooch_slot_num] = oppUserPageData.ooch_selected;
        oppUserPageData.ooch_is_party ? oppUserProfile.ooch_party[oppUserPageData.ooch_slot_num] = userPageData.ooch_selected : oppUserProfile.ooch_pc[oppUserPageData.ooch_slot_num] = userPageData.ooch_selected;

        // Change database
        await profile.set(userPageData.user.id, userProfile);
        await profile.set(userPageData.other_user.id, oppUserProfile);

        // Cleanup
        userPageData.box_row = buildBoxData(profile.get(`${userPageData.user.id}`), userPageData.page_num);
        oppUserPageData.box_row = buildBoxData(profile.get(`${oppUserPageData.user.id}`), oppUserPageData.page_num);

        await interaction.update({ content: `**Trade with ${userPageData.other_member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], files: [], components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
        await oppTradeMsg.edit({ content: `**Trade with ${userPageData.member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], files: [], components: [oppUserPageData.box_row[0], oppUserPageData.box_row[1], oppUserPageData.box_row[2], oppUserPageData.box_row[3], oppUserPageData.box_buttons] });
        let confirmMsg = await userPageData.thread.send(`# Confirmed trade!\nYou have received ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.name}** from **${oppTradeMember.displayName}**!`);
        let oppConfirmMsg = await oppUserThread.send(`# Confirmed trade!\nYou have received ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.name}** from **${userPageData.member.displayName}**!`);

        userPageData.ready_to_trade = false;
        userPageData.ooch_selected = null;
        userPageData.ooch_is_party = false;
        userPageData.ooch_slot_num = 0;

        oppUserPageData.ready_to_trade = false;
        oppUserPageData.ooch_selected = null;
        oppUserPageData.ooch_is_party = false;
        oppUserPageData.ooch_slot_num = 0;
        tradeState = 'trading';

        await wait(7500);
        await confirmMsg.delete();
        await oppConfirmMsg.delete();
    }

    return tradeState;
}
