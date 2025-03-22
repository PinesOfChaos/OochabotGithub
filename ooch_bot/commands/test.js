const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test development stuff!'),
    async execute(interaction) {
        if (user != '122568101995872256' && user != '145342159724347393') {
            interaction.reply({ content: 'This is not for you!', ephemeral: true });
            return;
        }

        interaction.reply('Test!');
    },
};
