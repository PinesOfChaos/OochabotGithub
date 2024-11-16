const { SlashCommandBuilder, ComponentType, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Restart your Oochamon quest! THIS WILL DELETE ALL OF YOUR DATA!'),
    async execute(interaction, client) {

		const confirm = new ButtonBuilder()
			.setCustomId('reset')
			.setLabel('Confirm Reset')
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Primary);

		const row = new ActionRowBuilder()
			.addComponents(confirm, cancel);

		let msg = await interaction.reply({
			content: `Are you sure you want to reset your Oochamon progress? This **WILL RESET IT, YOU WON'T BE ABLE TO GET IT BACK!**`,
			components: [row],
		});

        const collector = msg.createMessageComponentCollector({ time: 3_600_000 });

        collector.on('collect', async i => {
            if (i.customId == 'reset') {
                await msg.delete().catch(() => {});
                await db.profile.delete(interaction.user.id);
                // Begin introduction!
                let command = client.commands.get('start');
                await command.execute(interaction, client);
            } else if (i.customId == 'cancel') {
                await msg.delete();
            }
        });



    }
}