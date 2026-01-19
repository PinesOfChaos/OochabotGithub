import { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder, MessageFlags, EmbedBuilder } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState, UserType, Weather } from '../types.js';
import wait from 'wait';
import { buildBoxData } from '../func_other.js';
import { generate_battle_user, setup_battle, get_stats } from '../func_battle.js';
import { clamp } from 'lodash-es';

export const data = new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Battle in Oochamon!')
    .addSubcommand(subcommand => subcommand
        .setName('server')
        .setDescription('Battle against someone in your own server!')
        .addUserOption(option => option.setName('battle_user')
            .setDescription('The user to battle with.')
            .setRequired(true))

        .addNumberOption(option => option.setName('level_to_scale')
            .setDescription('Level to scale all Oochamon to. Level 25 is the default.')
            .setRequired(false))

        .addStringOption(option => option.setName('dont_scale_levels')
            .setDescription('If set, keeps your levels as is, rather than scaling them. Scales levesl by default.')
            .setRequired(false)
            .addChoices({ name: 'yes', value: 'yes' })));

export async function execute(interaction) {

    let otherBattleUser = interaction.options.getUser('battle_user');
    if (otherBattleUser.bot == true) return interaction.reply({ content: 'You cannot fight a Discord Bot.', flags: MessageFlags.Ephemeral });
    let levelScale = interaction.options.getNumber('level_to_scale');
    if (levelScale == null) levelScale = 25;
    levelScale = clamp(Math.round(levelScale), 1, 50);
    let disableScaleLevel = interaction.options.getString('dont_scale_levels');
    if (disableScaleLevel == 'yes') levelScale = false;

    console.log("Test");

    let intBattleUser = interaction.user;
    let otherBattleMember = await interaction.guild.members.fetch(otherBattleUser.id);
    let intUserState = profile.get(`${interaction.user.id}`, 'player_state');
    let otherUserState = profile.get(`${otherBattleUser.id}`, 'player_state');

    if (intUserState == PlayerState.NotPlaying) {
        return interaction.reply({ content: 'You must be playing the game to battle with other users.', flags: MessageFlags.Ephemeral });
    } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != profile.get(`${interaction.user.id}`, 'play_thread_id')) {
        return interaction.reply({ content: 'You can\'t battle here.', flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Combat) {
        return interaction.reply({ content: `You are in the middle of a battle. If you are not mid battle, please restart the game by running \`/play\` again.`, flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Invited) {
        return interaction.reply({ content: `You currently have a battle invitation.`, flags: MessageFlags.Ephemeral });
    } else if (intUserState == PlayerState.Intro) {
        return interaction.reply({ content: `You cannot battle in the intro.`, flags: MessageFlags.Ephemeral });
    }

    if (otherUserState == PlayerState.NotPlaying) {
        return interaction.reply({ content: `**${otherBattleMember.displayName}** is not in game right now.`, flags: MessageFlags.Ephemeral });
    } else if (otherUserState == PlayerState.Combat) {
        return interaction.reply({ content: `**${otherBattleMember.displayName}** is in the middle of a battle right now.`, flags: MessageFlags.Ephemeral });
    } else if (otherUserState !== PlayerState.Playspace) {
        return interaction.reply({ content: `**${otherBattleMember.displayName}** is unable to battle right now, as they are in a different battle or in a menu.` });
    } else if (otherUserState == PlayerState.Invited) {
        return interaction.reply({ content: `**${otherBattleMember.displayName}** has already been invited to a battle.` });
    } else if (otherUserState == PlayerState.Intro) {
        return interaction.reply({ content: `**${otherBattleMember.displayName}** is in the intro, and cannot battle.` });
    }

    let otherUserThreadId = profile.get(`${otherBattleUser.id}`, 'play_thread_id');
    let otherUserThread = await interaction.guild.channels.cache.get(`${otherUserThreadId}`);
    if (!otherUserThread || !otherUserThread.isThread()) {
        return interaction.reply({ content: `**${otherBattleMember.displayName}** is not in game right now.`, flags: MessageFlags.Ephemeral });
    }

    //#region Setup Rows/Functions
    let confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success)).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger));

    let cancelButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('cancel').setLabel('Cancel Invite').setStyle(ButtonStyle.Danger));

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
    //#endregion

    async function start_battle() {
        profile.set(interaction.user.id, PlayerState.Combat, 'player_state');
        profile.set(otherBattleUser.id, PlayerState.Combat, 'player_state');

        let intBattleDataUser = await generate_battle_user(UserType.Player, { user_id: intBattleUser.id, team_id: 0, thread_id: interaction.channel.id, guild_id: interaction.guild.id });
        let otherBattleDataUser = await generate_battle_user(UserType.Player, { user_id: otherBattleUser.id, team_id: 1, thread_id: otherUserThread.id, guild_id: interaction.guild.id });

        // Apply level scaling if enabled
        if (levelScale !== false) {
            [intBattleDataUser, otherBattleDataUser].forEach(user => {
                user.party.forEach(ooch => {
                    let new_stats = get_stats(ooch.id, levelScale, ooch.stats.hp_iv, ooch.stats.atk_iv, ooch.stats.def_iv, ooch.stats.spd_iv);
                    ooch.stats.hp = new_stats[0];
                    ooch.stats.atk = new_stats[1];
                    ooch.stats.def = new_stats[2];
                    ooch.stats.spd = new_stats[3];
                    ooch.current_hp = ooch.stats.hp;
                    ooch.level = levelScale;
                });
            });
        }

        await intUserBattleMsg.delete().catch(() => { });
        await otherUserBattleMsg.delete().catch(() => { });

        await setup_battle([intBattleDataUser, otherBattleDataUser], Weather.None, 0, 0, false, false, false, true, levelScale, 'battle_bg_tutorial', true);
    }

    let intUserBattleMsg;
    await interaction.reply({ content: `Battle invitation sent to **${otherBattleMember.displayName}**! Waiting for response...`, components: [cancelButton] });
    intUserBattleMsg = await interaction.fetchReply();

    profile.set(otherBattleUser.id, PlayerState.Invited, 'player_state');
    profile.set(intBattleUser.id, PlayerState.Invited, 'player_state');
    let otherUserBattleMsg = await otherUserThread.send({
        content: `You have received an invitation to battle from **${interaction.member.displayName}**! Would you like to accept?\n` +
            `*(Battle Options: ${levelScale != false ? `Scaled to* ***level ${levelScale}*** *Oochamon` : `* ***Normal Oochamon levels*** *`})*`, components: [confirmButtons]
    });

    // Start the battle invitation process
    let confirm_collector = otherUserBattleMsg.createMessageComponentCollector({ time: 600000 });
    let cancel_collector = intUserBattleMsg.createMessageComponentCollector({ time: 600000 });

    cancel_collector.on('collect', async (i) => {
        if (i.customId == 'cancel') {
            await confirm_collector.stop();
            await cancel_collector.stop();
        }
    });

    confirm_collector.on('collect', async (i) => {
        if (i.customId == 'yes') {
            let intBoxData = buildBoxData(intBattleUser.id, profile.get(`${intBattleUser.id}`), 0);
            let otherBoxData = buildBoxData(otherBattleUser.id, profile.get(`${otherBattleUser.id}`), 0);

            await i.update({ content: `**Oochabox:**`, components: [otherBoxData[0], otherBoxData[1], otherBoxData[2], otherBoxData[3], box_battle_buttons] });
            await intUserBattleMsg.edit({ content: `**Oochabox:**`, components: [intBoxData[0], intBoxData[1], intBoxData[2], intBoxData[3], box_battle_buttons] });

            profile.set(interaction.user.id, PlayerState.CombatOochSelect, 'player_state');
            profile.set(otherBattleUser.id, PlayerState.CombatOochSelect, 'player_state');

            let otherIsReady = false;
            let intIsReady = false;
            let otherPageNum = 0;
            let intPageNum = 0;
            let pages = 9;

            let otherBoxCollector = otherUserThread.createMessageComponentCollector({ time: 600000 });
            let intBoxCollector = interaction.channel.createMessageComponentCollector({ time: 600000 });

            async function checkReady() {
                if (otherIsReady && intIsReady) {
                    await intBoxCollector.stop();
                    await otherBoxCollector.stop();
                    await confirm_collector.stop();
                    await cancel_collector.stop();
                    await start_battle();
                }
            }

            intBoxCollector.on('collect', async (selected) => {
                if (selected.user.id !== intBattleUser.id) return selected.reply({ content: 'Not your box!', ephemeral: true });

                if (selected.customId == 'box_left' || selected.customId == 'box_right') {
                    selected.customId == 'box_left' ? intPageNum -= 1 : intPageNum += 1;
                    intPageNum = (intPageNum + pages) % pages;
                    let intBoxRow = buildBoxData(intBattleUser.id, profile.get(`${intBattleUser.id}`), intPageNum);
                    let local_box_battle_buttons = ActionRowBuilder.from(box_battle_buttons);
                    local_box_battle_buttons.components[3].setLabel(`${intPageNum + 1}`);
                    await selected.update({ content: `**Oochabox**`, components: [intBoxRow[0], intBoxRow[1], intBoxRow[2], intBoxRow[3], local_box_battle_buttons] });
                } else if (selected.customId == 'box_finalize_team') {
                    intIsReady = true;
                    await selected.update({ content: 'Waiting for other player to choose their team... ', components: [] });
                    await checkReady();
                }
            });

            otherBoxCollector.on('collect', async (selected) => {
                if (selected.user.id !== otherBattleUser.id) return selected.reply({ content: 'Not your box!', ephemeral: true });

                if (selected.customId == 'box_left' || selected.customId == 'box_right') {
                    selected.customId == 'box_left' ? otherPageNum -= 1 : otherPageNum += 1;
                    otherPageNum = (otherPageNum + pages) % pages;
                    let otherBoxRow = buildBoxData(otherBattleUser.id, profile.get(`${otherBattleUser.id}`), otherPageNum);
                    let local_box_battle_buttons = ActionRowBuilder.from(box_battle_buttons);
                    local_box_battle_buttons.components[3].setLabel(`${otherPageNum + 1}`);
                    await selected.update({ content: `**Oochabox**`, components: [otherBoxRow[0], otherBoxRow[1], otherBoxRow[2], otherBoxRow[3], local_box_battle_buttons] });
                } else if (selected.customId == 'box_finalize_team') {
                    otherIsReady = true;
                    await selected.update({ content: 'Waiting for other player to choose their team... ', components: [] });
                    await checkReady();
                }
            });

        } else if (i.customId == 'no') {
            await confirm_collector.stop();
        }
    });

    confirm_collector.on('end', async (collected) => {
        let doDelete = false;
        if (collected.first() == undefined || collected.first().customId == 'no') {
            doDelete = true;
            profile.set(otherBattleUser.id, PlayerState.Playspace, 'player_state');
            profile.set(intBattleUser.id, PlayerState.Playspace, 'player_state');
        }

        if (doDelete) {
            await cancel_collector.stop();
            await otherUserBattleMsg.delete().catch(() => { });
            await intUserBattleMsg.edit({ content: `**${otherBattleMember.displayName}** has declined your battle offer.`, components: [] });
            await wait(5000);
            await intUserBattleMsg.delete().catch(() => { });
        }
    });

}