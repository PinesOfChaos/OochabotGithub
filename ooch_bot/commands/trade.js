import { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder, MessageFlags } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';
import wait from 'wait';
import { buildBoxData } from '../func_other.js';
import { create_trade_session } from '../event_handlers/trade_handler.js';

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

    if (intUserState == PlayerState.NotPlaying) {
        return interaction.reply({ content: 'You must be playing the game to trade with other users.', flags: MessageFlags.Ephemeral });
    } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != profile.get(`${interaction.user.id}`, 'play_thread_id')) {
        return interaction.reply({ content: 'You can\'t trade here.', flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Trading) {
        return interaction.reply({ content: `You are in the middle of a trade. If you are not mid trade, please restart the game by running \`/play\` again.`, flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Intro) {
        return interaction.reply({ content: `You are unable to trade right now, as you are in the intro.` });
    } else if (profile.get(`${interaction.user.id}`, 'location_data')?.area?.toLowerCase() === 'tutorial') {
        return interaction.reply({ content: `You cannot trade in the tutorial map.`, flags: MessageFlags.Ephemeral });
    }

    if (otherTradeUser.id == intTradeUser.id) {
        return interaction.reply({ content: `You can't trade with yourself!`, flags: MessageFlags.Ephemeral });
    }

    if (otherUserState == PlayerState.NotPlaying) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, flags: MessageFlags.Ephemeral });
    } else if (otherUserState == PlayerState.Trading) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is in the middle of a trade right now.`, flags: MessageFlags.Ephemeral });
    } else if (otherUserState !== PlayerState.Playspace) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is unable to trade right now, as they are in a battle or in a menu.` });
    } else if (otherUserState == PlayerState.Intro) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is unable to trade right now, as they are in the intro.` });
    } else if (profile.get(`${otherTradeUser.id}`, 'location_data')?.area?.toLowerCase() === 'tutorial') {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is in the tutorial map and cannot trade.` });
    }

    let otherUserThread = await interaction.guild.channels.cache.get(`${profile.get(otherTradeUser.id, 'play_thread_id')}`);
    if (!otherUserThread || !otherUserThread.isThread()) {
        return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, flags: MessageFlags.Ephemeral });
    }

    let intUserThread = interaction.channel;

    let confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('tradeinvite_accept').setLabel('Yes').setStyle(ButtonStyle.Success)
        ).addComponents(
            new ButtonBuilder().setCustomId('tradeinvite_decline').setLabel('No').setStyle(ButtonStyle.Danger)
        );

    let intUserTradeMsg;
    await interaction.reply({ content: `Trade invitation sent to **${otherTradeMember.displayName}**! Waiting for response...` });
    await interaction.fetchReply().then(msg => {
        intUserTradeMsg = msg;
    });

    let otherUserTradeMsg = await otherUserThread.send({
        content: `You have received an invitation to trade Oochamon from **${interaction.member.displayName}**! Would you like to accept?`,
        components: [confirmButtons]
    });

    let confirm_collector = otherUserTradeMsg.createMessageComponentCollector({ max: 1, time: 60000 });

    confirm_collector.on('collect', async (i) => {
        if (i.customId == 'tradeinvite_accept') {
            await i.update({ content: `Accepted trade offer! Setting up trade with **${interaction.member.displayName}** now...`, components: [] });

            profile.set(interaction.user.id, PlayerState.Trading, 'player_state');
            profile.set(otherTradeUser.id, PlayerState.Trading, 'player_state');

            const intPre = `trade_${intTradeUser.id}_`;
            const otherPre = `trade_${otherTradeUser.id}_`;

            let intBoxRow = buildBoxData(intTradeUser.id, profile.get(`${intTradeUser.id}`), 0, intPre);
            let otherBoxRow = buildBoxData(otherTradeUser.id, profile.get(`${otherTradeUser.id}`), 0, otherPre);

            let intBoxButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`${intPre}exit`).setLabel('Exit').setStyle(ButtonStyle.Danger)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${intPre}left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${intPre}right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${intPre}num_label`).setLabel('1').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${intPre}party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
                );

            let otherBoxButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`${otherPre}exit`).setLabel('Exit').setStyle(ButtonStyle.Danger)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${otherPre}left`).setEmoji('⬅️').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${otherPre}right`).setEmoji('➡️').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${otherPre}num_label`).setLabel('1').setStyle(ButtonStyle.Primary)
                ).addComponents(
                    new ButtonBuilder().setCustomId(`${otherPre}party_label`).setLabel('Party').setStyle(ButtonStyle.Success)
                );

            await intUserTradeMsg.edit({
                content: `**Trade with ${otherTradeMember.displayName}:**\nPlease select an Oochamon to trade!`,
                components: [intBoxRow[0], intBoxRow[1], intBoxRow[2], intBoxRow[3], intBoxButtons]
            });

            await otherUserTradeMsg.edit({
                content: `**Trade with ${intTradeMember.displayName}:**\nPlease select an Oochamon to trade!`,
                components: [otherBoxRow[0], otherBoxRow[1], otherBoxRow[2], otherBoxRow[3], otherBoxButtons]
            });

            let trade_id = `${intTradeUser.id}_${otherTradeUser.id}_${Date.now()}`;

            let initiator_data = {
                user_id: intTradeUser.id,
                display_name: intTradeMember.displayName,
                thread_id: intUserThread.id,
                trade_msg_id: intUserTradeMsg.id,
                page_num: 0,
                ooch_selected: null,
                ooch_is_party: false,
                ooch_slot_num: 0,
                ready_to_trade: false,
                trade_confirmed: false
            };

            let target_data = {
                user_id: otherTradeUser.id,
                display_name: otherTradeMember.displayName,
                thread_id: otherUserThread.id,
                trade_msg_id: otherUserTradeMsg.id,
                page_num: 0,
                ooch_selected: null,
                ooch_is_party: false,
                ooch_slot_num: 0,
                ready_to_trade: false,
                trade_confirmed: false
            };

            create_trade_session(trade_id, initiator_data, target_data);
        }
    });

    confirm_collector.on('end', async (collected) => {
        let doDelete = false;
        if (collected.first() == undefined) {
            doDelete = true;
        } else {
            if (collected.first().customId == 'tradeinvite_decline') doDelete = true;
        }

        if (doDelete) {
            await otherUserTradeMsg.delete().catch(() => {});
            await intUserTradeMsg.edit(`**${otherTradeMember.displayName}** has declined your trade offer.`);
            await wait(5000);
            await intUserTradeMsg.delete().catch(() => {});
        }
    });
}
