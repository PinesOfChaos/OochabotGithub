const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { get_stats } = require('../func_battle.js');
const { PlayerState, GraphicsMode, Item } = require('../types.js');
const { create_ooch } = require('../func_play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Choose your starter'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('s')
                    .setLabel('Sporbee')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:sporbee:921141752029646938>'),
            ) .addComponents(
                new ButtonBuilder()
                    .setCustomId('r')
                    .setLabel('Roocky')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:roocky:921156272512974868>'),
            ) .addComponents(
                new ButtonBuilder()
                    .setCustomId('p')
                    .setLabel('Puppyre')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:puppyre:921176686102454282>'),
            );

        // if (db.profile.has(interaction.user.id)) return interaction.editReply('You have already set up the game! Go play it!')
        let starter;
        await interaction.editReply({content: 'Pick your starter!', components: [row] });
        const collector = interaction.channel.createMessageComponentCollector({ max: 1 });

        await collector.on('collect', async i => {
            switch(i.customId) {
                case 's': await i.update({ content: 'Sporbee has been chosen!', components: [] }); starter = 0; break;
                case 'r': await i.update({ content: 'Roocky has been chosen!', components: [] }); starter = 3; break;
                case 'p': await i.update({ content: 'Puppyre has been chosen!', components: [] }); starter = 6; break;
            }

            // Setup user data
            db.profile.set(interaction.user.id, interaction.member.displayName, 'player_name');
            db.profile.set(interaction.user.id, '<:t050:1095915042165235812>', 'player_sprite');
            db.profile.set(interaction.user.id, [], 'ooch_pc')
            db.profile.set(interaction.user.id, 0, 'ooch_active_slot')
            db.profile.set(interaction.user.id, {}, 'other_inv')
            db.profile.set(interaction.user.id, {}, 'prism_inv')
            db.profile.set(interaction.user.id, {}, 'heal_inv')
            db.profile.set(interaction.user.id, 0, 'oochabux')
            db.profile.set(interaction.user.id, PlayerState.Intro, 'player_state')
            db.profile.set(interaction.user.id, {}, 'ooch_enemy')
            db.profile.set(interaction.user.id, { area: 'testmap', x: 8, y: 16 }, 'location_data')
            db.profile.set(interaction.user.id, { area: 'testmap', x: 8, y: 16 }, 'savepoint_data');
            db.profile.set(interaction.user.id, -1, 'display_msg_id');
            db.profile.set(interaction.user.id, -1, 'play_thread_id');
            db.profile.set(interaction.user.id, 0, 'battle_msg_counter');
            db.profile.set(interaction.user.id, 0, 'battle_turn_counter');
            db.profile.set(interaction.user.id, [], 'oochadex');
            db.profile.set(interaction.user.id, [], 'flags');
            db.profile.set(interaction.user.id, [Item.Potion, Item.Prism], 'global_shop_items'),
            
            // These values are used because when we enter a battle, we have to drop the event loop to handle the battle.
            // With these values, we can keep track of our event data position, and the event data related to the NPC that is being battled.
            db.profile.set(interaction.user.id, [], 'npc_event_data'); 
            db.profile.set(interaction.user.id, 0, 'npc_event_pos');
            
            db.profile.set(interaction.user.id, {
                graphics: GraphicsMode.Quality,
                battle_cleanup: true
            }, 'settings');

            // Setup Oochadex template
            for (ooch_id in db.monster_data.keyArray()) {
                ooch_id = parseInt(ooch_id);
                if (ooch_id == starter) {
                    db.profile.push(interaction.user.id, { id: ooch_id, seen: 1, caught: 1 }, 'oochadex') 
                } else if ([0, 3, 6].filter(v => v != starter).includes(ooch_id)) {
                    db.profile.push(interaction.user.id, { id: ooch_id, seen: 1, caught: 0 }, 'oochadex')
                } else {
                    db.profile.push(interaction.user.id, { id: ooch_id, seen: 0, caught: 0 }, 'oochadex')
                }
            }

            let ooch = create_ooch(ooch_id);
            db.profile.set(interaction.user.id, [ooch], 'ooch_party');

        });

    }
}