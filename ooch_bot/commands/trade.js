const { SlashCommandBuilder, ThreadAutoArchiveDuration, ChannelType, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
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

        if (intUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You must be playing the game to trade with other users.', ephemeral: true });
        } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
            return interaction.reply({ content: 'You can\'t trade here.', ephemeral: true });
        } else if (intUserState == PlayerState.Trading) {
            return interaction.reply({ content: `You are mid trade. If you are not mid trade, please restart the game by running \`/play\` again.`});
        }
        // } else if (otherUserState != PlayerState.Playspace) {
        //     return interaction.reply({ content: `The user **${otherTradeMember.displayName}** is not playing Oochamon currently, or is unable to trade at this moment.` });
        // }

        //#region Setup Rows/Functions
        let confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );

        let intBoxButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('leave').setLabel('Leave').setStyle(ButtonStyle.Danger)
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
                new ButtonBuilder().setCustomId('leave').setLabel('Leave').setStyle(ButtonStyle.Danger)
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

        async function handleTradeInput(i, userPageData) {
            // Label buttons
            if (i.customId.includes('emp') || i.customId.includes('label')) {
                await i.update({ embeds: [] });
            }
            // Page buttons
            else if (i.customId == 'left' || i.customId == 'right') {
                i.customId == 'left' ? userPageData.page_num -= 1 : userPageData.page_num += 1;
                console.log(userPageData.page_num);
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
                userPageData.ooch_selected = ooch_user_data;

                i.update({ content: null, embeds: [dexEmbed], components: [oochTradeButtons] });
            } else if (i.customId == 'back') {
                userPageData.box_row = buildBoxData(userPageData.user, userPageData.page_num);
                i.update({ embeds: [],  components: [userPageData.box_row[0], userPageData.box_row[1], userPageData.box_row[2], userPageData.box_row[3], userPageData.box_buttons] });
            } else if (i.customId == 'offer') {
                // Add in info here to offer up Oochamon
            }
        }
        //#endregion

        // Start the trading invitation process
        db.profile.set(interaction.user.id, PlayerState.Trading, 'player_state');

        // Delete the current playspace
        let playspace_msg = await interaction.channel.messages.fetch(db.profile.get(interaction.user.id, 'display_msg_id'));
        await playspace_msg.delete();

        let intUserTradeMsg;
        await interaction.reply({ content: `Trade invitation sent to **${otherTradeMember.displayName}**! Waiting for response...` });
        await interaction.fetchReply().then(msg => {
            intUserTradeMsg = msg;
        });

        let otherUserThread = interaction.guild.channels.cache.get(db.profile.get(otherTradeUser.id, 'play_thread_id'));
        let otherUserTradeMsg = await otherUserThread.send({ content: `You have received an invitation to trade Oochamon from **${interaction.member.displayName}**! Would you like to accept?`, components: [confirmButtons] });
        confirm_collector = otherUserTradeMsg.createMessageComponentCollector({ max: 1, time: 60000 });

        confirm_collector.on('collect', async i => {
            if (i.customId == 'yes') {
                i.update({ content: `Accepted trade offer! Setting up trade with **${interaction.member.displayName} now...**`, components: [] });

                // Setup trade display for interaction user
                let intPages = 9; // Number of pages, starts at 0
                let intPageNum = 0;
                let intBoxRow = await buildBoxData(intTradeUser, intPageNum);
                let intUserPageData = {
                    user: intTradeUser,
                    member: intTradeMember,
                    pages: intPages,
                    page_num: intPageNum,
                    box_row: intBoxRow,
                    box_buttons: intBoxButtons,
                    ooch_selected: null,
                }

                // Setup trade display for other user
                db.profile.set(otherTradeUser.id, PlayerState.Trading, 'player_state');
                let otherPages = 9; // Number of pages, starts at 0
                let otherPageNum = 0;
                let otherBoxRow = await buildBoxData(otherTradeUser, otherPageNum);
                let otherUserPageData = {
                    user: otherTradeUser,
                    member: otherTradeMember,
                    pages: otherPages,
                    page_num: otherPageNum,
                    box_row: otherBoxRow,
                    box_buttons: otherBoxButtons,
                    ooch_selected: null,
                }

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
                intUserTradeMsg.edit(`**${otherTradeMember.displayName}** has declined your trade offer. Rebuilding your playspace in 5 seconds.`);
                await wait(5000);
                let playspace_str = setup_playspace_str(interaction.user.id);
    
                await interaction.channel.send({ content: playspace_str }).then(msg => {
                    db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
                });
    
                await db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
                await intUserTradeMsg.delete();
            }
        })

    },
};