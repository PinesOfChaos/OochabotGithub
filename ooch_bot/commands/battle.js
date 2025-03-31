const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str, box_collector_event } = require('../func_play.js');
const { PlayerState, UserType, Weather } = require('../types.js');
const wait = require('wait');
const { ooch_info_embed, buildBoxData } = require('../func_other.js');
const { generate_battle_user, setup_battle } = require('../func_battle.js');
const _ = require('lodash');

// Create box action rows
let box_battle_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('box_finalize_team').setLabel('Ready Up').setStyle(ButtonStyle.Success)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_num_label').setLabel('1').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_party_label').setLabel('Party').setStyle(ButtonStyle.Success)
    )

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Battle in Oochamon!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Battle against someone in your own server!')
                .addUserOption(option => 
                    option.setName('battle_user')
                        .setDescription('The user to battle with.')
                        .setRequired(true))

                .addNumberOption(option => 
                    option.setName('level_to_scale')
                        .setDescription('Level to scale all Oochamon to. Level 25 is the default.')
                        .setRequired(false))

                .addStringOption(option => 
                    option.setName('dont_scale_levels')
                        .setDescription('If set, keeps your levels as is, rather than scaling them. Scales levesl by default.')
                        .setRequired(false)
                        .addChoices({ name: 'yes', value: 'yes' }))),

    async execute(interaction) {

        let otherBattleUser = interaction.options.getUser('battle_user');
        if (otherBattleUser.bot == true) return interaction.reply({ content: 'You cannot fight a Discord Bot.', ephemeral: true });
        let levelScale = interaction.options.getNumber('level_to_scale');
        if (levelScale == null) levelScale = 25;
        levelScale = _.clamp(Math.round(levelScale), 1, 50);
        let disableScaleLevel = interaction.options.getString('dont_scale_levels');
        if (disableScaleLevel == 'yes') levelScale = false;

        let intBattleUser = interaction.user;
        let otherBattleMember = await interaction.guild.members.fetch(otherBattleUser.id);
        let intUserState = db.profile.get(interaction.user.id, 'player_state');
        let otherUserState = db.profile.get(otherBattleUser.id, 'player_state');

        if (intUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You must be playing the game to battle with other users.', ephemeral: true });
        } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
            return interaction.reply({ content: 'You can\'t battle here.', ephemeral: true });
        } else if (intUserState == PlayerState.Combat) {
            return interaction.reply({ content: `You are in the middle of a battle. If you are not mid battle, please restart the game by running \`/play\` again.`, ephemeral: true });
        } else if (intUserState == PlayerState.Invited) {
            return interaction.reply({ content: `You currently have a battle invitation.`, ephemeral: true })
        } else if (intUserState == PlayerState.Intro) {
            return interaction.reply({ content: `You cannot battle in the intro.`, ephemeral: true })
        }
``
        if (otherUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is not in game right now.`, ephemeral: true });
        } else if (otherUserState == PlayerState.Combat) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is in the middle of a battle right now.`, ephemeral: true });
        } else if (otherUserState !== PlayerState.Playspace) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is unable to battle right now, as they are in a different battle or in a menu.` })
        } else if (otherUserState == PlayerState.Invited) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** has already been invited to a battle.` })
        } else if (otherUserState == PlayerState.Intro) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is in the intro, and cannot battle.` })
        }

        let otherUserThread = db.profile.get(otherBattleUser.id, 'play_thread_id');
        otherUserThread = await interaction.guild.channels.cache.get(db.profile.get(otherBattleUser.id, 'play_thread_id'));
        if (!otherUserThread || !otherUserThread.isThread()) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is not in game right now.`, ephemeral: true });
        }

        //#region Setup Rows/Functions
        let confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );

        let cancelButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('cancel').setLabel('Cancel Invite').setStyle(ButtonStyle.Danger),
            );
        //#endregion

        async function start_battle(intProfile, otherProfile) {
            db.profile.set(interaction.user.id, PlayerState.Combat, 'player_state');
            db.profile.set(otherBattleUser.id, PlayerState.Combat, 'player_state');

            let intBattleDataUser = await generate_battle_user(UserType.Player, { profile: intProfile, user_id: intBattleUser.id, team_id: 0, thread_id: intUserThread.id, guild_id: interaction.guild.id });
            let otherBattleDataUser = await generate_battle_user(UserType.Player, { profile: otherProfile, user_id: otherBattleUser.id, team_id: 1, thread_id: otherUserThread.id, guild_id: interaction.guild.id });

            await intUserBattleMsg.delete().catch(() => {});
            await otherUserBattleMsg.delete().catch(() => {});

            await setup_battle([intBattleDataUser, otherBattleDataUser], Weather.None, 0, 0, false, false, false, true, levelScale, 'battle_bg_tutorial', true);
        }

        let intUserBattleMsg;
        await interaction.reply({ content: `Battle invitation sent to **${otherBattleMember.displayName}**! Waiting for response...`, components: [cancelButton] });
        await interaction.fetchReply().then(msg => {
            intUserBattleMsg = msg;
        });

        let intUserThread = interaction.channel;
        db.profile.set(otherBattleUser.id, PlayerState.Invited, 'player_state');
        db.profile.set(intBattleUser.id, PlayerState.Invited, 'player_state');
        let otherUserBattleMsg = await otherUserThread.send({ content: `You have received an invitation to battle from **${interaction.member.displayName}**! Would you like to accept?\n` + 
            `*(Battle Options: ${levelScale != false ? `Scaled to* ***level ${levelScale}*** *Oochamon` : `* ***Normal Oochamon levels*** *`})*`, components: [confirmButtons] });

        // Start the battle invitation process
        confirm_collector = otherUserBattleMsg.createMessageComponentCollector({ time: 600000 });
        cancel_collector = intUserBattleMsg.createMessageComponentCollector({ time: 600000 });

        cancel_collector.on('collect', async i => {
            if (i.customId == 'cancel') {
                await confirm_collector.stop();
                await cancel_collector.stop();
            }
        });

        confirm_collector.on('collect', async i => {
            if (i.customId == 'yes') {
                let intBoxData = buildBoxData(db.profile.get(intBattleUser.id), 0);
                let otherBoxData = buildBoxData(db.profile.get(otherBattleUser.id), 0);
                i.update({ content: `**Oochabox:**`, components: [otherBoxData[0], otherBoxData[1], otherBoxData[2], otherBoxData[3], box_battle_buttons] });
                intUserBattleMsg.edit({ content: `**Oochabox:**`, components: [intBoxData[0], intBoxData[1], intBoxData[2], intBoxData[3], box_battle_buttons] })
                    
                db.profile.set(interaction.user.id, PlayerState.CombatOochSelect, 'player_state');
                db.profile.set(otherBattleUser.id, PlayerState.CombatOochSelect, 'player_state');
                let otherIsReady = false;
                let intIsReady = false;
                let otherPageNum = 0;
                let intPageNum = 0;
                let intProfile = db.profile.get(intBattleUser.id);
                let otherProfile = db.profile.get(otherBattleUser.id);
                let pages = 9;
                let intBoxRow = [];
                let otherBoxRow = [];

                otherBoxCollector = otherUserThread.createMessageComponentCollector();
                intBoxCollector = intUserThread.createMessageComponentCollector();

                intBoxCollector.on('collect', async selected => {
                    // Page buttons
                    if (selected.customId == 'box_left' || selected.customId == 'box_right') {
                        selected.customId == 'box_left' ? intPageNum -= 1 : intPageNum += 1;
                        intPageNum = (intPageNum + pages) % pages; // Handle max page overflow
                        
                        intBoxRow = buildBoxData(intProfile, intPageNum);
                        box_battle_buttons.components[3].setLabel(`${intPageNum + 1}`);
                        selected.update({ content: `**Oochabox**`, components: [box_row[0], box_row[1], box_row[2], box_row[3], box_battle_buttons], files: [] });
                    }

                    else if (selected.customId.includes('box')) {
                        intIsReady = await box_collector_event(intBattleUser.id, selected, intPageNum, intProfile, true);
                        
                        if (intIsReady) {
                            if (otherIsReady && intIsReady) {
                                await intBoxCollector.stop();
                                await otherBoxCollector.stop();
                                await confirm_collector.stop();
                                await cancel_collector.stop();
                                selected.update({ content: 'Starting up battle...', components: [] });
                                await start_battle(intProfile, otherProfile);
                            } else {
                                selected.update({ content: 'Waiting for other player to choose their team... ', components: [] });
                            }
                        }
                    }
                });

                otherBoxCollector.on('collect', async selected => {
                    // Page buttons
                    if (selected.customId == 'box_left' || selected.customId == 'box_right') {
                        selected.customId == 'box_left' ? otherPageNum -= 1 : otherPageNum += 1;
                        otherPageNum = (otherPageNum + pages) % pages; // Handle max page overflow
                        
                        otherBoxRow = buildBoxData(otherProfile, otherPageNum);
                        box_battle_buttons.components[3].setLabel(`${otherPageNum + 1}`);
                        selected.update({ content: `**Oochabox**`, components: [box_row[0], box_row[1], box_row[2], box_row[3], box_battle_buttons], files: [] });
                    }
                    
                    else if (selected.customId.includes('box')) {
                        otherIsReady = await box_collector_event(otherBattleUser.id, selected, otherPageNum, otherProfile, true);

                        if (otherIsReady) {
                            otherIsReady = true;
                            if (otherIsReady && intIsReady) {
                                await intBoxCollector.stop();
                                await otherBoxCollector.stop();
                                await confirm_collector.stop();
                                await cancel_collector.stop();
                                selected.update({ content: 'Starting up battle...', components: [] });
                                await start_battle(intProfile, otherProfile);
                            } else {
                                selected.update({ content: 'Waiting for other player to choose their team... ', components: [] });
                            }
                        }
                    }
                });
            } else if (i.customId == 'no') {
                await confirm_collector.stop();
            }
        });

        confirm_collector.on('end', async collected => {
            let doDelete = false;
            if (collected.first() == undefined) {
                await otherUserBattleMsg.delete().catch(() => {});
                await intUserBattleMsg.delete().catch(() => {});
                db.profile.set(otherBattleUser.id, PlayerState.Playspace, 'player_state');
                db.profile.set(intBattleUser.id, PlayerState.Playspace, 'player_state');
            } else {
                if (collected.first().customId == 'no') {
                    doDelete = true;
                    db.profile.set(otherBattleUser.id, PlayerState.Playspace, 'player_state');
                    db.profile.set(intBattleUser.id, PlayerState.Playspace, 'player_state');
                }
            }

            if (doDelete) {
                await cancel_collector.stop();
                await otherUserBattleMsg.delete().catch(() => {});
                await intUserBattleMsg.edit({ content: `**${otherBattleMember.displayName}** has declined your battle offer.`, components: [] });
                await wait(5000);
                await intUserBattleMsg.delete().catch(() => {});
            }
        })

    },
};