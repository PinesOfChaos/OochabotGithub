import { SlashCommandBuilder } from 'discord.js';
import { profile, item_data as _item_data } from '../db.js';
import { PlayerState } from '../types.js';
import { item_use } from '../func_battle.js';
import { setup_playspace_str } from '../func_play.js';
import wait from 'wait';

export const data = new SlashCommandBuilder()
  .setName('quick_use')
  .setDescription('Quick use a compatible item from your inventory.')
  .addStringOption(option => option.setName('item')
    .setDescription('The item you would like to use')
    .setAutocomplete(true)
    .setRequired(true));
export async function execute(interaction) {
  await interaction.deferReply();
  if (!profile.has(interaction.user.id)) {
    return interaction.editReply({ content: `You must be playing the Oochamon to use this command!`, ephemeral: true });
  }

  let playerState = profile.get(`${interaction.user.id}`, 'player_state');
  if (playerState === PlayerState.NotPlaying) {
    return interaction.editReply({ content: 'You must be playing the game to use an item.', ephemeral: true });
  } else if (playerState !== PlayerState.Playspace) {
    return interaction.editReply({ content: 'You cannot use an item here.', ephemeral: true });
  }

  let item_id = interaction.options.getString('item');
  if (!_item_data.has(item_id)) return interaction.editReply({ content: 'Invalid item id!', ephemeral: true });
  let item_data = _item_data.get(`${item_id}`);

  if (item_data.type == 'teleport' && profile.get(`${interaction.user.id}`, 'allies_list').length != 0) {
    return interaction.editReply({ content: 'You cannot use a teleport right now.', ephemeral: true });
  }

  let item_usage_text = '';
  switch (item_data.type) {
    case 'repel': item_usage_text = `Used a **${item_data.name}**, you will no longer have wild encounters for ${item_data.potency} more steps.`; break;
    case 'teleport': item_usage_text = `Used a **${item_data.name}**, and teleported back to the previously used teleporter while healing your Oochamon.`; break;
  }

  if (item_data.type == 'repel' || item_data.type == 'teleport') {
    switch (item_data.type) {
      case 'repel':
        await item_use(interaction.user.id, {}, item_id);
        break;
      case 'teleport':
        await item_use(interaction.user.id, {}, item_id);
        let playspace_str = await setup_playspace_str(interaction.user.id);
        let msg_to_edit = profile.get(`${interaction.user.id}`, 'display_msg_id');
        await interaction.channel.messages.fetch(msg_to_edit).then((msg) => {
          msg.edit({ content: playspace_str[0], components: playspace_str[1] });
        }).catch(() => { });
        break;
    }

    await profile.math(interaction.user.id, '-', 1, `other_inv.${item_id}`);
    if (profile.get(`${interaction.user.id}`, `other_inv.${item_id}`) <= 0) {
      await profile.delete(interaction.user.id, `other_inv.${item_id}`);
    }

    let followUpMsg = await interaction.editReply({ content: item_usage_text });
    await wait(5000);
    await followUpMsg.delete().catch(() => { });
  }
}