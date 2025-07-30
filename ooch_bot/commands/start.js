import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { reset_oochamon } from '../func_other.js';

export const data = new SlashCommandBuilder()
    .setName('start')
    .setDescription('Begin your Oochamon quest!');
export async function execute(interaction, client) {

    if (!profile.has(interaction.user.id)) {
        await reset_oochamon(interaction.user.id);
    }

    // Begin introduction!
    let command = client.commands.get(`${'play'}`);
    await command.execute(interaction);

}