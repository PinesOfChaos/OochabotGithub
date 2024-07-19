const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str, buildBoxData } = require('../func_play.js');
const { PlayerState } = require('../types.js');
const wait = require('wait');
const { ooch_info_embed } = require('../func_other.js');

// TODO: HANDLE TIMEOUTS WHILE MID TRADE

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade Oochamon with other server members!')
        .addUserOption(option => 
            option.setName('trade_user')
                .setDescription('User you want to trade with.')
                .setRequired(true)),
    async execute(interaction) {
        let otherTradeUser = interaction.options.getUser('trade_user');
        let intTradeUser = interaction.user;
        let otherTradeMember = await interaction.guild.members.fetch(otherTradeUser.id);
        let intTradeMember = interaction.member;
        let intUserState = db.profile.get(interaction.user.id, 'player_state');
        let otherUserState = db.profile.get(otherTradeUser.id, 'player_state');
        let tradeState = 'trading';

        if (intUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You must be playing the game to trade with other users.', ephemeral: true });
        } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
            return interaction.reply({ content: 'You can\'t trade here.', ephemeral: true });
        } else if (intUserState == PlayerState.Trading) {
            return interaction.reply({ content: `You are in the middle of a trade. If you are not mid trade, please restart the game by running \`/play\` again.`, ephemeral: true });
        }

        if (otherUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, ephemeral: true });
        } else if (otherUserState == PlayerState.Trading) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is in the middle of a trade right now.`, ephemeral: true });
        } else if (otherUserState !== PlayerState.Playspace) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is unable to trade right now, as they are in a battle or in a menu.` })
        }

        //#region Setup Rows/Functions
        let confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );

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
            )

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
            )

        // These buttons are used when we are viewing Oochamon info before confirming to send
        let oochTradeButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger),
            ).addComponents(
                new ButtonBuilder().setCustomId('offer').setLabel('Offer Trade').setStyle(ButtonStyle.Success),
            );

        let tradeWaitButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger),
            );

        let tradeConfirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger),
            ).addComponents(
                new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
            )

        let intUserTradeMsg;
        await interaction.reply({ content: `Trade invitation sent to **${otherTradeMember.displayName}**! Waiting for response...` });
        await interaction.fetchReply().then(msg => {
            intUserTradeMsg = msg;
        });

        let intUserThread = interaction.channel;
        let otherUserThread = interaction.guild.channels.cache.get(db.profile.get(otherTradeUser.id, 'play_thread_id'));
        let otherUserTradeMsg = await otherUserThread.send({ content: `You have received an invitation to trade Oochamon from **${interaction.member.displayName}**! Would you like to accept?`, components: [confirmButtons] });

        // Setup trade display for interaction user
        let intPages = 9; // Number of pages, starts at 0
        let intPageNum = 0;
        let intBoxRow = await buildBoxData(intTradeUser, intPageNum);
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
        }

        // Setup trade display for other user
        let otherPages = 9; // Number of pages, starts at 0
        let otherPageNum = 0;
        let otherBoxRow = await buildBoxData(otherTradeUser, otherPageNum);
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
        }

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

            // Label buttons
            if (i.customId.includes('emp') || i.customId.includes('label')) {
                await i.update({ embeds: [] });
            } else if (i.customId == 'exit') {
                await db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
                await db.profile.set(otherTradeUser.id, PlayerState.Playspace, 'player_state');
                await userPageData.trade_msg.delete();
                await oppTradeMsg.edit({ content: `**${userPageData.member.displayName}** has left the trade.`, embeds: [], components: [] });
                await wait(5000);
                await oppTradeMsg.delete();
            }
            // Page buttons
            else if (i.customId == 'left' || i.customId == 'right') {
                i.customId == 'left' ? userPageData.page_num -= 1 : userPageData.page_num += 1;
                userPageData.page_num = (userPageData.page_num + userPageData.pages) % userPageData.pages; // Handle max page overflow
                
                userPageData.box_row = buildBoxData(userPageData.user, userPageData.page_num);
                userPageData.box_buttons.components[3].setLabel(`${userPageData.page_num + 1}`);
                await i.update({ components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
            } else if (i.customId.includes('box_ooch')) {
                user_profile = db.profile.get(userPageData.user.id);
                let slot_data = i.customId.split('_');
                let slot_num = slot_data[3];
                let party_slot = false;
                if (i.customId.includes('_party')) party_slot = true;

                if (party_slot == false) {
                    ooch_user_data = user_profile.ooch_pc[slot_num]; // Personal Oochamon Data in Oochabox
                } else {
                    ooch_user_data = user_profile.ooch_party[slot_num]; // Personal Oochamon Data in Party
                }

                dexEmbed = ooch_info_embed(ooch_user_data);
                dexPng = dexEmbed[1];
                dexEmbed = dexEmbed[0];
                userPageData.ooch_selected = ooch_user_data;
                userPageData.ooch_is_party = party_slot;
                userPageData.ooch_slot_num = slot_num;

                await i.update({ embeds: [dexEmbed], files: [dexPng], components: [oochTradeButtons] });
            } else if (i.customId == 'back') {
                userPageData.box_row = buildBoxData(userPageData.user, userPageData.page_num);
                userPageData.ready_to_trade = false;
                userPageData.ooch_selected = null;
                userPageData.ooch_is_party = false;
                userPageData.ooch_slot_num = 0;

                oppUserPageData.box_row = buildBoxData(oppUserPageData.user, oppUserPageData.page_num);
                oppUserPageData.ready_to_trade = false;
                oppUserPageData.ooch_selected = null;
                oppUserPageData.ooch_is_party = false;
                oppUserPageData.ooch_slot_num = 0;

                await i.update({ content: `**Trade with ${userPageData.other_member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
                await oppTradeMsg.edit({ content: `**Trade with ${userPageData.member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], components: [oppUserPageData.box_row[0], oppUserPageData.box_row[1], oppUserPageData.box_row[2], oppUserPageData.box_row[3], oppUserPageData.box_buttons] });

                if (tradeState == 'confirm') {
                    let cancelMsg = await userPageData.thread.send(`### Trade Cancelled.\nYou cancelled the trade.`)
                    let oppCancelMsg = await oppUserThread.send(`### Trade Cancelled.\n**${userPageData.member.displayName}** cancelled the trade.`)
                    tradeState = 'trading';

                    await wait(5000);
                    await cancelMsg.delete();
                    await oppCancelMsg.delete();
                }

            } else if (i.customId == 'offer') {
                userPageData.ready_to_trade = true;
                await i.update({ content: `Trading ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.nickname}**! Waiting for response from other user...`, embeds: [], components: [tradeWaitButtons] })

                // Update opposing players message
                if (oppUserPageData.ready_to_trade == false) {
                    await oppTradeMsg.edit(`**Trade with ${userPageData.member.displayName}:**\nPlease select an Oochamon to trade!\n✅ **${userPageData.member.displayName} has selected an Oochamon to trade.**`)
                }
            }

            if (userPageData.ready_to_trade == true && oppUserPageData.ready_to_trade == true && tradeState == 'trading') {
                let oppUserDexEmbed = ooch_info_embed(oppUserPageData.ooch_selected);
                let oppUserDexPng = oppUserDexEmbed[1];
                oppUserDexEmbed = oppUserDexEmbed[0];

                let userDexEmbed = ooch_info_embed(userPageData.ooch_selected)
                let userDexPng = userDexEmbed[1];
                userDexEmbed = userDexEmbed[0];

                await userPageData.trade_msg.edit({ content: `Trading ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.nickname}**!\n${oppTradeMember.displayName} has offered up a ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.name}** for trade!\nDo you accept?`, embeds: [oppUserDexEmbed], files: [oppUserDexPng], components: [tradeConfirmButtons] })
                await oppUserPageData.trade_msg.edit({ content: `Trading ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.nickname}**!\n${userPageData.member.displayName} has offered up a ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.name}** for trade!\nDo you accept?`, embeds: [userDexEmbed], files: [userDexPng], components: [tradeConfirmButtons] })
                tradeState = 'confirm';

            } else if (tradeState == 'confirm' && i.customId == 'confirm' && oppUserPageData.trade_confirmed == false) {

                // Confirm but don't finish, wait for other input
                await i.update({ content: `Trade confirmed! Waiting for response...`, components: [] });
                await oppTradeMsg.edit({ content: `Trading ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.nickname}**!\n${userPageData.member.displayName} has offered up a ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.name}** for trade!\nDo you accept?` + 
                `\n✅ **${userPageData.member.displayName} confirmed their trade.**` }); 
                userPageData.trade_confirmed = true;

            } else if (tradeState == 'confirm' && i.customId == 'confirm' && oppUserPageData.trade_confirmed == true) {
                // Do the trade here
                let userProfile = db.profile.get(userPageData.user.id);
                let oppUserProfile = db.profile.get(userPageData.other_user.id);

                // Add Ooch to PC or party based on
                userPageData.ooch_is_party ? userProfile.ooch_party[userPageData.ooch_slot_num] = oppUserPageData.ooch_selected : userProfile.ooch_pc[userPageData.ooch_slot_num] = oppUserPageData.ooch_selected;
                oppUserPageData.ooch_is_party ? oppUserProfile.ooch_party[oppUserPageData.ooch_slot_num] = userPageData.ooch_selected : oppUserProfile.ooch_pc[oppUserPageData.ooch_slot_num] = userPageData.ooch_selected;

                // Change database
                await db.profile.set(userPageData.user.id, userProfile);
                await db.profile.set(userPageData.other_user.id, oppUserProfile);

                // Cleanup
                userPageData.box_row = buildBoxData(userPageData.user, userPageData.page_num);
                oppUserPageData.box_row = buildBoxData(oppUserPageData.user, oppUserPageData.page_num);

                await i.update({ content: `**Trade with ${userPageData.other_member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], files: [], components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
                await oppTradeMsg.edit({ content: `**Trade with ${userPageData.member.displayName}:**\nPlease select an Oochamon to trade!`, embeds: [], files: [], components: [oppUserPageData.box_row[0], oppUserPageData.box_row[1], oppUserPageData.box_row[2], oppUserPageData.box_row[3], oppUserPageData.box_buttons] });
                let confirmMsg = await userPageData.thread.send(`# Confirmed trade!\nYou have received ${oppUserPageData.ooch_selected.emote} **${oppUserPageData.ooch_selected.name}** from **${oppTradeMember.displayName}**!`)
                let oppConfirmMsg = await oppUserThread.send(`# Confirmed trade!\nYou have received ${userPageData.ooch_selected.emote} **${userPageData.ooch_selected.name}** from **${userPageData.member.displayName}**!`)

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
        }
        //#endregion

        // Start the trading invitation process
        confirm_collector = otherUserTradeMsg.createMessageComponentCollector({ max: 1, time: 60000 });

        confirm_collector.on('collect', async i => {
            if (i.customId == 'yes') {
                i.update({ content: `Accepted trade offer! Setting up trade with **${interaction.member.displayName} now...**`, components: [] });
                db.profile.set(interaction.user.id, PlayerState.Trading, 'player_state');
                db.profile.set(otherTradeUser.id, PlayerState.Trading, 'player_state');

                await intUserTradeMsg.edit({ content: `**Trade with ${otherTradeMember.displayName}:**\nPlease select an Oochamon to trade!`,  components: [intBoxRow[0], intBoxRow[1], intBoxRow[2], intBoxRow[3], intBoxButtons] });
                intTradeMsgCollector = intUserTradeMsg.createMessageComponentCollector({ idle: 300000 });
                intTradeMsgCollector.on('collect', async i => {
                    await handleTradeInput(i, intUserPageData);
                });

                await otherUserTradeMsg.edit({ content: `**Trade with ${intTradeMember.displayName}:**\nPlease select an Oochamon to trade!`,  components: [otherBoxRow[0], otherBoxRow[1], otherBoxRow[2], otherBoxRow[3], otherBoxButtons] });
                otherTradeMsgCollector = otherUserTradeMsg.createMessageComponentCollector({ idle: 300000 });
                otherTradeMsgCollector.on('collect', async i => {
                    await handleTradeInput(i, otherUserPageData);
                });
            }
        })

        confirm_collector.on('end', async collected => {
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
        })

    },
};