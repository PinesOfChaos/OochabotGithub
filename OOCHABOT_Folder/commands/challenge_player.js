const { SlashCommandBuilder } = require('@discordjs/builders');
const { generate_challenge, prompt_battle_input } = require('../func_battle.js')
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('challenge')
        .setDescription('Like PVP but worse.')
        .addUserOption(option => 
            option.setName('name')
                .setDescription('Whomst?')
                .setRequired(true)),
    async execute(interaction) {
        console.log()

        let player = `${interaction.user.id}`;
        let player_name = interaction.user.username;

        let chal = interaction.options.getUser('name').id;
        let chal_name = interaction.options.getUser('name').username;

        let chal_gen =  generate_challenge(chal);
        db.profile.set(player, 0, 'ooch_active_slot');

        const thread = await interaction.channel.threads.create({
            name: `${player_name} vs ${chal_name}\'s Clone Battle, join this to battle!`,
            autoArchiveDuration: 60,
            reason: '\"PVP\" Battle thread',
        });

        let msg = {author: {id: player}};

        if (thread.joinable) await thread.join();
        await thread.members.add(player);
        await thread.setLocked(true);

        let ooch_plr = db.profile.get(player, 'ooch_inventory')[0];
        let ooch_enemy = chal_gen.party[0];

        await thread.send(`${player_name}, you've challenged ${chal_name}'s clone! Use this thread to battle!!`+
                        `\n${chal_name} sends out a **LV ${ooch_enemy.level} ${ooch_enemy.name}**!`+
                        `\nGo, ${ooch_plr.name}!`+
                        `\n*Your ${ooch_plr.name} HP: (${ooch_plr.current_hp}/${ooch_plr.stats.hp})*`+
                        `\n*Enemy ${ooch_enemy.name} HP: (${ooch_enemy.current_hp}/${ooch_enemy.stats.hp})*`);

        await db.profile.set(player, 'battle', 'player_state')
        await db.profile.set(player, chal_gen, 'ooch_enemy')
        await db.profile.set(player, thread.id, 'battle_thread_id')

        await prompt_battle_input(thread, msg);

        interaction.reply('Starting Clone Battle');
        interaction.deleteReply();
    },
};