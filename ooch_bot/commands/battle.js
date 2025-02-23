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
                .setName('global')
                .setDescription('Battle with anyone from any server!.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Battle against someone in your own server!')
                .addUserOption(option => 
                    option.setName('battle_user')
                        .setDescription('The user to battle with.')
                        .setRequired(true))),
    async execute(interaction) {
        let otherTradeUser = interaction.options.getUser('battle_user');
        let intTradeUser = interaction.user;
        let otherTradeMember = await interaction.guild.members.fetch(otherTradeUser.id);
        let intTradeMember = interaction.member;
        let intUserState = db.profile.get(interaction.user.id, 'player_state');
        let otherUserState = db.profile.get(otherTradeUser.id, 'player_state');
        let tradeState = 'trading';

        if (intUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You must be playing the game to trade with other users.', ephemeral: true });
        } else if (intUserState != PlayerState.NotPlaying && interaction.channel.id != db.profile.get(interaction.user.id, 'play_thread_id')) {
            return interaction.reply({ content: 'You can\'t battle here.', ephemeral: true });
        } else if (intUserState == PlayerState.Combat) {
            return interaction.reply({ content: `You are in the middle of a battle. If you are not mid battle, please restart the game by running \`/play\` again.`, ephemeral: true });
        }

        if (otherUserState == PlayerState.NotPlaying) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, ephemeral: true });
        } else if (otherUserState == PlayerState.Combat) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is in the middle of a battle right now.`, ephemeral: true });
        } else if (otherUserState !== PlayerState.Playspace) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is unable to trade right now, as they are in a battle or in a menu.` })
        }

        let otherUserThread = db.profile.get(otherTradeUser.id, 'play_thread_id');
        otherUserThread = await interaction.guild.channels.cache.get(db.profile.get(otherTradeUser.id, 'play_thread_id'));
        if (!otherUserThread || !otherUserThread.isThread()) {
            return interaction.reply({ content: `**${otherTradeMember.displayName}** is not in game right now.`, ephemeral: true });
        }

        //#region Setup Rows/Functions
        let confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );

        let intUserTradeMsg;
        await interaction.reply({ content: `Battle invitation sent to **${otherTradeMember.displayName}**! Waiting for response...` });
        await interaction.fetchReply().then(msg => {
            intUserTradeMsg = msg;
        });

        let intUserThread = interaction.channel;
        let otherUserTradeMsg = await otherUserThread.send({ content: `You have received an invitation to battle from **${interaction.member.displayName}**! Would you like to accept?`, components: [confirmButtons] });

        // Start the battle invitation process
        confirm_collector = otherUserTradeMsg.createMessageComponentCollector({ max: 1, time: 60000 });

        confirm_collector.on('collect', async i => {
            if (i.customId == 'yes') {
                i.update({ content: `Accepted battle offer! Setting up battle with **${interaction.member.displayName} now...**`, components: [] });
                db.profile.set(interaction.user.id, PlayerState.Combat, 'player_state');
                db.profile.set(otherTradeUser.id, PlayerState.Combat, 'player_state');

                let intBattleUser = await generate_battle_user(UserType.Player, { user_id: intTradeUser.id, team_id: 0, thread_id: intUserThread.id, guild_id: interaction.guild.id });
                let otherBattleUser = await generate_battle_user(UserType.Player, { user_id: otherTradeUser.id, team_id: 1, thread_id: otherUserThread.id, guild_id: interaction.guild.id });

                await intUserTradeMsg.delete().catch(() => {});
                await otherUserTradeMsg.delete().catch(() => {});

                await setup_battle([intBattleUser, otherBattleUser], Weather.None, 0, 0, false, false, false, true, 25);
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
                await intUserTradeMsg.edit(`**${otherTradeMember.displayName}** has declined your battle offer.`);
                await wait(5000);
                await intUserTradeMsg.delete();
            }
        })

    },
};