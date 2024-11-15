const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { map_emote_string } = require('../func_play.js');
const wait = require('wait');
const { PlayerState } = require('../types.js');

module.exports = {
    data: new SlashCommandBuilder()

    .setName('teleport')
    .setDescription('Use a portable teleporter.'),
    async execute(interaction) {
        let target = interaction.user.id;
        let biome_from = db.profile.get(target, 'location_data.area');

        if (db.profile.get(target, 'player_state') !== PlayerState.Playspace) {
            return interaction.reply({ content: 'You can\'t teleport right now.', ephemeral: true })
        }

        let checkpoint = db.profile.get(target, 'checkpoint_data');
        let biome_to = checkpoint.area;

        let map_obj = db.maps.get(biome_to);
        let map_arr = map_obj.map_tiles;
        let map_savepoints = map_obj.map_savepoints;
        map_savepoints = map_savepoints.filter(v => v.is_default !== false);
        if (map_savepoints.length == 0) {
            map_savepoints = [map_obj.map_savepoints[0]];
        }

        //remove the player's info from the old biome and add it to the new one
        db.player_positions.set(biome_to, { x: map_savepoints[0].x, y: map_savepoints[0].y }, target);
        db.player_positions.delete(biome_from, target);
        db.profile.set(target, { area: biome_to, x: map_savepoints[0].x, y: map_savepoints[0].y }, 'location_data')

        for (let i = 0; i < db.profile.get(interaction.user.id, 'ooch_party').length; i++) {
            db.profile.set(interaction.user.id, db.profile.get(interaction.user.id, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
            db.profile.set(interaction.user.id, true, `ooch_party[${i}].alive`);
        }

        let msg_to_edit = db.profile.get(target, 'display_msg_id');
        (interaction.channel.messages.fetch(msg_to_edit)).then((msg) => {
            msg.edit({ content: map_emote_string(biome_to, map_arr, map_savepoints[0].x, map_savepoints[0].y, target) }).catch(() => {});
        });

        let travelMsg = await interaction.reply({ content: `Successfully teleported to ${biome_to} and healed all your Oochamon!` });
        await wait(5000);
        await travelMsg.delete();
        
    },
};