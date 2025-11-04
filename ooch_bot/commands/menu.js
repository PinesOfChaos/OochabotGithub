import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';
import { menu_handler } from '../event_handlers/menu_handler.js';
 
export const data = new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Pull up the menu.');
export async function execute(interaction) {
    await interaction.deferReply();
    let playerState = profile.get(`${interaction.user.id}`, 'player_state');

    if (playerState == PlayerState.NotPlaying) {
        return interaction.editReply({ content: 'You must be playing the game to pull up the menu.' });
    } else if (playerState != PlayerState.NotPlaying && interaction.channel.id != profile.get(`${interaction.user.id}`, 'play_thread_id')) {
        return interaction.editReply({ content: 'You can\'t pull up the menu here.' });
    } else if (playerState == PlayerState.Menu) {
        return interaction.editReply({ content: `The menu is already open, you cannot open it again! If you don't have the menu open, please restart the game by running \`/play\`.` });
    } else if (playerState != PlayerState.Playspace) {
        return interaction.editReply({ content: 'You can\'t pull up the menu right now.' });
    }

    profile.set(interaction.user.id, PlayerState.Menu, 'player_state');
    // Delete the current playspace
    let playspace_msg = await interaction.channel.messages.fetch(profile.get(`${interaction.user.id}`, 'display_msg_id')).catch(() => {});
    await playspace_msg.delete().catch(() => { });;

    await menu_handler(interaction, true);
    
    // // Enable party healing button if we have healing items
    // let healItems = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);
    // if (healItems.length != 0) {
    //     for (let item of healItems) {
    //         ooch_back_button.components[1].setDisabled(item.quantity == 0);
    //     }
    // }

    // // Disable the party healing button if all Oochamon are at full HP
    // let oochHpCheck = profile.get(`${interaction.user.id}`, 'ooch_party');
    // //console.log(oochHpCheck)
    // oochHpCheck = oochHpCheck.filter(ooch => ooch.current_hp !== ooch.stats.hp);
    // if (oochHpCheck.length === 0) ooch_back_button.components[1].setDisabled(true);

    // // Taming button undisable with flag
    // if (user_profile.flags.includes('ev_tamagoochi')) party_extra_buttons_2.components[2].setDisabled(false);
}