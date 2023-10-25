const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { get_stats } = require('../func_battle.js');
const { PlayerState, GraphicsMode } = require('../types.js');

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
            db.profile.set(interaction.user.id, [0, 4], 'global_shop_items'),
            

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
            
            // Setup starter data
            let learn_list = db.monster_data.get(starter, 'move_list');
            let ability_list = db.monster_data.get(starter, 'abilities');
            let move_list = [];

            // Pick a random ability
            let rand_ability = ability_list[_.random(0, ability_list.length - 1)]

            //Set the IVs & Level
            let hp_iv = _.random(0,10)/20+1;
            let atk_iv = _.random(0,10)/20+1;
            let def_iv = _.random(0,10)/20+1;
            let spd_iv = _.random(0,10)/20+1;
            let level = 5;

            //Get the stats accounting for the ID, Level, and IVs
            let stats = get_stats(starter, level, hp_iv, atk_iv, def_iv, spd_iv) //Returns [hp, atk, def, spd]

            //Find what moves the starter should initially know
            learn_list = learn_list.filter(x => x[0] <= level && x[0] != -1)
            for(let i = 0; i < learn_list.length; i++){
                move_list[i] = learn_list[i][1]; //get only the move ID and put it in the move_list
            }

            db.profile.set(interaction.user.id, [ 
                { 
                    id: starter,
                    name: db.monster_data.get(starter, 'name'), 
                    nickname: db.monster_data.get(starter, 'name'),
                    item: -1,
                    ability: rand_ability,
                    og_ability: rand_ability,
                    level: level,
                    moveset: move_list,
                    stats: {
                        hp: stats[0],
                        atk: stats[1],
                        def: stats[2],
                        spd: stats[3],
                        hp_iv: hp_iv,
                        atk_iv: atk_iv,
                        def_iv: def_iv,
                        spd_iv: spd_iv,
                        atk_mul: 1,
                        def_mul: 1,
                        spd_mul: 1,
                        acc_mul: 1, // Accuracy Multiplier, used for accuracy checks
                        eva_mul: 1 // Evasion Multiplier, used for accuracy checks
                    },
                    status_effects: [],
                    current_hp: stats[0],
                    current_exp: 0,
                    next_lvl_exp: level ** 3,
                    alive: true,
                    evo_stage: db.monster_data.get(ooch_id, 'evo_stage'),
                    type: db.monster_data.get(starter, 'type'),
                    emote: db.monster_data.get(starter, 'emote'),
                }
            ], 'ooch_party')

        });

    }
}