import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import _ from 'lodash-es';
import wait from 'wait';
import { setup_playspace_str } from '../func_play.js';

export const data = new SlashCommandBuilder()

    .setName('move_player')
    .setDescription('[DEV] Moves a user to a location.')
    .addUserOption(option => option.setName('move_user')
        .setDescription('The user to move.')
        .setRequired(true))
    .addStringOption(option => option.setName('move_map')
        .setDescription('Map to move to.')
        .setRequired(true))
    .addIntegerOption(option => option.setName('move_x')
        .setDescription('X position to move to.')
        .setRequired(true))
    .addIntegerOption(option => option.setName('move_y')
        .setDescription('Y position to move to.')
        .setRequired(true))
    .addBooleanOption(option => option.setName('set_checkpoint')
        .setDescription('Make this the user\'s checkpoint?')
        .setRequired(true));
export async function execute(interaction) {
    if (interaction.user.id != "145342159724347393" && interaction.user.id != "122568101995872256") return interaction.reply({ content: 'You can\'t use this!', ephemeral: true });

    let move_user = interaction.options.getUser('move_user');
    let move_map = interaction.options.getString('move_map');
    let move_x = interaction.options.getInteger('move_x');
    let move_y = interaction.options.getInteger('move_y');
    let set_checkpoint = interaction.options.getBoolean('set_checkpoint');

    profile.set(move_user.id, { area: move_map, x: move_x, y: move_y }, 'location_data');
    let string_to_send = `Moved user ${move_user} to ${move_map} [x : ${move_x}, y : ${move_y}].`;

    if (set_checkpoint) {
        profile.set(move_user.id, { area: move_map, x: move_x, y: move_y }, 'checkpoint_data');
        string_to_send += ` Also set their Checkpoint to this location.`;
    }

    let playspace_str = await setup_playspace_str(interaction.user.id);
    let msg_to_edit = profile.get(`${interaction.user.id}`, 'display_msg_id');
    await interaction.channel.messages.fetch(msg_to_edit).then((msg) => {
        msg.edit({ content: playspace_str[0], components: playspace_str[1] });
    }).catch(() => { });

    let reply_msg = await interaction.reply({ content: string_to_send });
    await wait(5000);
    await reply_msg.delete().catch(() => { });
}