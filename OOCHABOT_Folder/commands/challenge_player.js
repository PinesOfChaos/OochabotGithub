const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('Like PVP but worse.')
        .addUserOption(option => 
            option.setName('name')
                .setDescription('Whomst?')
                .setRequired(true)),
    async execute(interaction) {
        let target = interaction.options.getUser('name');
        let chal_gen =  generate_challenge(target);
        db.profile.set(interaction.author.id, 0, 'ooch_active_slot');

        const thread = await interaction.channel.threads.create({
            name: `${message.member.displayName} vs ${target} Clone Battle, join this to battle!`,
            autoArchiveDuration: 60,
            reason: '\"PVP\" Battle thread',
        });

        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.author.id);
        await thread.setLocked(true);
        await thread.send(`${interaction.member.displayName}, you've challenged ${target}'s clone! Use this thread to battle!!`)

        await db.profile.set(interaction.author.id, 'battle', 'player_state')
        await db.profile.set(interaction.author.id, chal_gen, 'ooch_enemy')
        await db.profile.set(interaction.author.id, thread.id, 'battle_thread_id')

        await prompt_battle_input(thread, interaction);

        
        interaction.channel.send(`OOCHABOT slaps ${target}`);
        interaction.reply('Sending slap');
        interaction.deleteReply();
    },
};