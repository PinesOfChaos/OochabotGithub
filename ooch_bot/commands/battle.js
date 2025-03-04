const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str } = require('../func_play.js');
const { PlayerState, UserType, Weather } = require('../types.js');
const wait = require('wait');
const { ooch_info_embed } = require('../func_other.js');
const { generate_battle_user, setup_battle } = require('../func_battle.js');

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
        if (levelScale > 50) levelScale = 50;
        let disableScaleLevel = interaction.options.getString('dont_scale_levels');
        if (disableScaleLevel == 'yes') levelScale = false;

        let intBattleUser = interaction.user;
        let otherBattleMember = await interaction.guild.members.fetch(otherBattleUser.id);
        let intBattleMember = interaction.member;
        let intUserState = db.profile.get(interaction.user.id, 'player_state');
        let otherUserState = db.profile.get(otherBattleUser.id, 'player_state');

        if (intUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You must be playing the game to battle with other users.', ephemeral: true });
        } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
            return interaction.reply({ content: 'You can\'t battle here.', ephemeral: true });
        } else if (intUserState == PlayerState.Combat) {
            return interaction.reply({ content: `You are in the middle of a battle. If you are not mid battle, please restart the game by running \`/play\` again.`, ephemeral: true });
        }

        if (otherUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is not in game right now.`, ephemeral: true });
        } else if (otherUserState == PlayerState.Combat) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is in the middle of a battle right now.`, ephemeral: true });
        } else if (otherUserState !== PlayerState.Playspace) {
            return interaction.reply({ content: `**${otherBattleMember.displayName}** is unable to battle right now, as they are in a different battle or in a menu.` })
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

        let intUserBattleMsg;
        await interaction.reply({ content: `Battle invitation sent to **${otherBattleMember.displayName}**! Waiting for response...` });
        await interaction.fetchReply().then(msg => {
            intUserBattleMsg = msg;
        });

        let intUserThread = interaction.channel;
        let otherUserBattleMsg = await otherUserThread.send({ content: `You have received an invitation to battle from **${interaction.member.displayName}**! Would you like to accept?\n` + 
            `*(Battle Options: ${levelScale != false ? `Scaled to* ***level ${levelScale}*** *Oochamon` : `* ***Normal Oochamon levels*** *`})*`, components: [confirmButtons] });

        // Start the battle invitation process
        confirm_collector = otherUserBattleMsg.createMessageComponentCollector({ max: 1, time: 60000 });

        confirm_collector.on('collect', async i => {
            if (i.customId == 'yes') {
                i.update({ content: `Accepted battle offer! Setting up battle with **${interaction.member.displayName} now...**`, components: [] });
                db.profile.set(interaction.user.id, PlayerState.Combat, 'player_state');
                db.profile.set(otherBattleUser.id, PlayerState.Combat, 'player_state');

                let intBattleDataUser = await generate_battle_user(UserType.Player, { user_id: intBattleUser.id, team_id: 0, thread_id: intUserThread.id, guild_id: interaction.guild.id });
                let otherBattleDataUser = await generate_battle_user(UserType.Player, { user_id: otherBattleUser.id, team_id: 1, thread_id: otherUserThread.id, guild_id: interaction.guild.id });

                await intUserBattleMsg.delete().catch(() => {});
                await otherUserBattleMsg.delete().catch(() => {});

                await setup_battle([intBattleDataUser, otherBattleDataUser], Weather.None, 0, 0, false, false, false, true, levelScale, 'battle_bg_tutorial', true);
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
                otherUserBattleMsg.delete();
                await intUserBattleMsg.edit(`**${otherBattleMember.displayName}** has declined your battle offer.`);
                await wait(5000);
                await intUserBattleMsg.delete().catch(() => {});
            }
        })

    },
};