import { MessageFlags, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test development stuff!');
export async function execute(interaction) {
    if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
        interaction.reply({ content: 'This is not for you!', flags: MessageFlags.Ephemeral });
        return;
    }

    interaction.reply('Test!');
}
