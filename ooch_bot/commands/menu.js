import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder, MessageFlags } from 'discord.js';
import { profile, move_data, monster_data, item_data, ability_data } from '../db.js';
import { inRange, clamp } from 'lodash-es';
import wait from 'wait';
import { setup_playspace_str, create_ooch, remove_item, get_all_item_type, get_inv_item, add_item } from '../func_play.js';
import { ItemCategory, ItemType, PlayerState, TamingAction } from '../types.js';
import { type_to_emote, item_use, get_stance_options } from '../func_battle.js';
import { ooch_info_embed, get_ooch_art, get_art_file, get_emote_string, setup_taming_picture, get_tame_string, pet_text, feed_text, update_tame_value, walk_get_rewards } from '../func_other.js';
 
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

    let user_profile = profile.get(`${interaction.user.id}`);

    await interaction.editReply({ content: `## Menu${user_profile.settings.objective ? `\n**Current Objective:** ***${user_profile.objective}***` : ``}${user_profile.repel_steps > 0 ? `\n*Repulsor Steps: ${user_profile.repel_steps}*` : ``}`, components: [settings_row_1, settings_row_2, settings_row_3] });
    await interaction.fetchReply().then(msg => {
        menuMsg = msg;
    });

    // Enable party healing button if we have healing items
    let healItems = get_all_item_type(interaction.user.id, ItemCategory.Consumable, ItemType.Potion);
    if (healItems.length != 0) {
        for (let item of healItems) {
            ooch_back_button.components[1].setDisabled(item.quantity == 0);
        }
    }

    // Disable the party healing button if all Oochamon are at full HP
    let oochHpCheck = profile.get(`${interaction.user.id}`, 'ooch_party');
    //console.log(oochHpCheck)
    oochHpCheck = oochHpCheck.filter(ooch => ooch.current_hp !== ooch.stats.hp);
    if (oochHpCheck.length === 0) ooch_back_button.components[1].setDisabled(true);

    // Taming button undisable with flag
    if (user_profile.flags.includes('ev_tamagoochi')) party_extra_buttons_2.components[2].setDisabled(false);
}