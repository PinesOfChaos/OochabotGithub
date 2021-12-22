const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const db = require('../db.js');
const { random_number } = require('../func.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Choose your starter'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('s')
                    .setLabel('Sporbee')
                    .setStyle('SECONDARY')
                    .setEmoji('<:sporbee:921141752029646938>'),
            ) .addComponents(
                new Discord.MessageButton()
                    .setCustomId('r')
                    .setLabel('Roocky')
                    .setStyle('SECONDARY')
                    .setEmoji('<:roocky:921156272512974868>'),
            ) .addComponents(
                new Discord.MessageButton()
                    .setCustomId('p')
                    .setLabel('Puppyre')
                    .setStyle('SECONDARY')
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
            db.profile.set(interaction.user.id, [], 'ooch_pc')
            db.profile.set(interaction.user.id, [], 'item_inventory')
            db.profile.set(interaction.user.id, 0, 'currency')
            db.profile.set(interaction.user.id, 'overworld', 'player_state') // States are not_playing, overworld, battle, shop, menu, party_menu
            db.profile.set(interaction.user.id, -1, 'battle_thread_id')
            db.profile.set(interaction.user.id, {}, 'ooch_enemy')
            db.profile.set(interaction.user.id, { area: 'Hub', x: 5, y: 5 }, 'location_data')

            // Setup starter data
            let move_list = db.monster_data.get(starter, 'move_list');
            let ability_list = db.monster_data.get(starter, 'abilities');

            // Pick a random ability
            let rand_ability = ability_list[random_number(0, ability_list.length - 1)]

            move_list = move_list.filter(x => x[0] <= 5 && x[0] != -1)

            db.profile.set(interaction.user.id, [ 
                { 
                    id: starter,
                    name: db.monster_data.get(starter, 'name'), 
                    nickname: false,
                    item: false,
                    ability: false,
                    level: 5,
                    moveset: move_list,
                    stats: {
                        hp: db.monster_data.get(starter, 'hp'),
                        atk: db.monster_data.get(starter, 'atk'),
                        def: db.monster_data.get(starter, 'def'),
                        spd: db.monster_data.get(starter, 'spd')
                    },
                    current_hp: db.monster_data.get(starter, 'hp'),
                    alive: true,
                }
            ], 'ooch_inventory')

        });

    }
 }