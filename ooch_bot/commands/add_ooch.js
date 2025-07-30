import { SlashCommandBuilder } from 'discord.js';
import { profile, monster_data } from '../db.js';
import _ from 'lodash-es';
import { create_ooch } from '../func_play.js';

export const data = new SlashCommandBuilder()
    .setName('add_ooch')
    .setDescription('Add an oochamon to your party!')
    .addStringOption(option => option.setName('oochamon')
        .setDescription('ID of ooch')
        .setAutocomplete(true)
        .setRequired(true))
    .addIntegerOption(option => option.setName('lv')
        .setDescription('Level of ooch')
        .setRequired(false));
export async function execute(interaction) {
    await interaction.deferReply();
    if (interaction.user.id != "145342159724347393" && interaction.user.id != "122568101995872256") return interaction.editReply({ content: 'You can\'t use this!', ephemeral: true });
    let ooch_id = interaction.options.getString('oochamon');
    if (isNaN(ooch_id)) return interaction.editReply('You must input an oochamon ID here.');
    ooch_id = parseInt(ooch_id);
    let level = interaction.options.getInteger('lv');
    if (level == null) level = 5;

    let ooch = await create_ooch(ooch_id, level);

    let dest;
    if (profile.get(`${interaction.user.id}`, 'ooch_party').length == 4) {
        dest = 'ooch_pc';
    } else {
        dest = 'ooch_party';
    }

    profile.push(interaction.user.id, ooch, dest);
    profile.math(interaction.user.id, '+', 1, `oochadex[${ooch_id}].caught`);

    return interaction.editReply(`Added **${ooch_id}**: ${monster_data.get(`${ooch_id}`, 'emote')} **${monster_data.get(`${ooch_id}`, 'name')}** (level ${level}) to ${dest == 'ooch_party' ? 'your party!' : 'the Oochabox!'}`);
}

