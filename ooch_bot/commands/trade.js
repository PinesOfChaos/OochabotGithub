import { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder, MessageFlags } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';
import wait from 'wait';
import { buildBoxData } from '../func_other.js';
import { trade_handler } from '../event_handlers/trade_handler.js';

export const data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade Oochamon with other server members!')
    .addUserOption(option => option.setName('trade_user')
        .setDescription('User you want to trade with.')
        .setRequired(true));
export async function execute(interaction) {
    let otherTradeUser = interaction.options.getUser('trade_user');
    let intTradeUser = interaction.user;
    let otherTradeMember = await interaction.guild.members.fetch(otherTradeUser.id);
    let intTradeMember = interaction.member;
    let intUserState = profile.get(`${interaction.user.id}`, 'player_state');
    let otherUserState = profile.get(`${otherTradeUser.id}`, 'player_state');
    let tradeState = 'trading';

    if (intUserState == PlayerState.NotPlaying) {
        return interaction.reply({ content: 'You must be playing the game to trade with other users.', flags: MessageFlags.Ephemeral });
    } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != profile.get(`${interaction.user.id}`, 'play_thread_id')) {
        return interaction.reply({ content: 'You can\'t trade here.', flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Trading) {
        return interaction.reply({ content: `You are in the middle of a trade. If you are not mid trade, please restart the game by running \`/play\` again.`, flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Intro) {
        return interaction.reply({ content: `You are unable to trade right now, as you are in the intro.` });
    }

    if (otherUserState == PlayerState.NotPlaying) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, flags: MessageFlags.Ephemeral });
    } else if (otherUserState == PlayerState.Trading) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is in the middle of a trade right now.`, flags: MessageFlags.Ephemeral });
    } else if (otherUserState !== PlayerState.Playspace) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is unable to trade right now, as they are in a battle or in a menu.` });
    } else if (otherUserState == PlayerState.Intro) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is unable to trade right now, as they are in the intro.` });
    }

    let otherUserThread = profile.get(`${otherTradeUser.id}`, 'play_thread_id');
    otherUserThread = await interaction.guild.channels.cache.get(`${profile.get(otherTradeUser.id, 'play_thread_id')}`);
    if (!otherUserThread || !otherUserThread.isThread()) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, flags: MessageFlags.Ephemeral });
    }

    //#region Setup Rows/Functions
    let confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success)).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger));

    let intBoxButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('exit').setLabel('Exit').setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('num_label').setLabel('1').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('party_label').setLabel('Party').setStyle(ButtonStyle.Success)
        );

    let otherBoxButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('exit').setLabel('Exit').setStyle(ButtonStyle.Danger)
        ).addComponents(
            new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('num_label').setLabel('1').setStyle(ButtonStyle.Primary)
        ).addComponents(
            new ButtonBuilder().setCustomId('party_label').setLabel('Party').setStyle(ButtonStyle.Success)
        );

    let intUserTradeMsg;
    await interaction.reply({ content: `Trade invitation sent to **${otherTradeMember.displayName}**! Waiting for response...` });
    await interaction.fetchReply().then(msg => {
        intUserTradeMsg = msg;
    });

    let intUserThread = interaction.channel;
    let otherUserTradeMsg = await otherUserThread.send({ content: `You have received an invitation to trade Oochamon from **${interaction.member.displayName}**! Would you like to accept?`, components: [confirmButtons] });

    // Setup trade display for interaction user
    let intPages = 9; // Number of pages, starts at 0
    let intPageNum = 0;
    let intBoxRow = await buildBoxData(profile.get(`${intTradeUser.id}`), intPageNum);
    let intUserPageData = {
        type: 'int',
        user: intTradeUser,
        member: intTradeMember,
        other_user: otherTradeUser,
        other_member: otherTradeMember,
        trade_msg: intUserTradeMsg,
        thread: intUserThread,
        pages: intPages,
        page_num: intPageNum,
        box_row: intBoxRow,
        box_buttons: intBoxButtons,
        ooch_selected: null,
        ready_to_trade: false,
        trade_confirmed: false,
    };

    // Setup trade display for other user
    let otherPages = 9; // Number of pages, starts at 0
    let otherPageNum = 0;
    let otherBoxRow = await buildBoxData(profile.get(`${otherTradeUser.id}`), otherPageNum);
    let otherUserPageData = {
        type: 'other',
        user: otherTradeUser,
        member: otherTradeMember,
        other_user: intTradeUser,
        other_member: intTradeMember,
        trade_msg: otherUserTradeMsg,
        thread: otherUserThread,
        pages: otherPages,
        page_num: otherPageNum,
        box_row: otherBoxRow,
        box_buttons: otherBoxButtons,
        ooch_selected: null,
        ready_to_trade: false,
        trade_confirmed: false,
        ooch_is_party: false,
        ooch_slot_num: 0,
    };

    async function handleTradeInput(i, userPageData) {
        let oppUserPageData, oppUserThread, oppTradeMember, oppTradeMsg;
        switch (userPageData.type) {
            case 'int':
                oppUserPageData = otherUserPageData;
                oppUserThread = otherUserThread;
                oppTradeMember = otherTradeMember;
                oppTradeMsg = otherUserTradeMsg;
                break;

            case 'other':
                oppUserPageData = intUserPageData;
                oppUserThread = intUserThread;
                oppTradeMember = intTradeMember;
                oppTradeMsg = intUserTradeMsg;
                break;
        }

        // Call the trade handler and update tradeState
        tradeState = await trade_handler(i, userPageData, oppUserPageData, oppUserThread, oppTradeMember, oppTradeMsg, tradeState);
    }
    //#endregion
    // Start the trading invitation process
    let confirm_collector = otherUserTradeMsg.createMessageComponentCollector({ max: 1, time: 60000 });

    confirm_collector.on('collect', async (i) => {
        if (i.customId == 'yes') {
            i.update({ content: `Accepted trade offer! Setting up trade with **${interaction.member.displayName} now...**`, components: [] });
            profile.set(interaction.user.id, PlayerState.Trading, 'player_state');
            profile.set(otherTradeUser.id, PlayerState.Trading, 'player_state');

            await intUserTradeMsg.edit({ content: `**Trade with ${otherTradeMember.displayName}:**\nPlease select an Oochamon to trade!`, components: [intBoxRow[0], intBoxRow[1], intBoxRow[2], intBoxRow[3], intBoxButtons] });
            let intTradeMsgCollector = intUserTradeMsg.createMessageComponentCollector({ idle: 300000 });
            intTradeMsgCollector.on('collect', async (i) => {
                await handleTradeInput(i, intUserPageData);
            });

            await otherUserTradeMsg.edit({ content: `**Trade with ${intTradeMember.displayName}:**\nPlease select an Oochamon to trade!`, components: [otherBoxRow[0], otherBoxRow[1], otherBoxRow[2], otherBoxRow[3], otherBoxButtons] });
            let otherTradeMsgCollector = otherUserTradeMsg.createMessageComponentCollector({ idle: 300000 });
            otherTradeMsgCollector.on('collect', async (i) => {
                await handleTradeInput(i, otherUserPageData);
            });
        }
    });

    confirm_collector.on('end', async (collected) => {
        let doDelete = false;
        if (collected.first() == undefined) {
            doDelete = true;
        } else {
            if (collected.first().customId == 'no') doDelete = true;
        }

        if (doDelete) {
            otherUserTradeMsg.delete();
            await intUserTradeMsg.edit(`**${otherTradeMember.displayName}** has declined your trade offer.`);
            await wait(5000);
            await intUserTradeMsg.delete();
        }
    });

}