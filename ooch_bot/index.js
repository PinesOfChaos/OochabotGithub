// require the discord.js module
const fs = require('fs');
const Discord = require('discord.js');
const { token, client_id, guild_ids } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const wait = require('wait');
const _ = require('lodash');

// create a new Discord client and give it some variables
const { Client, Intents } = require('discord.js');
const db = require('./db.js');
const { prompt_battle_input, generate_battle } = require('./func_battle.js');
const { move } = require('./func_play.js');
const myIntents = new Intents();
myIntents.add('GUILD_PRESENCES', 'GUILD_MEMBERS', 'GUILD_PRESENCES');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
                            Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
client.commands = new Discord.Collection();
const registerCommands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

//#region 
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.type === undefined) {
        // Slash Commands
        client.commands.set(command.data.name, command);
        registerCommands.push(command.data.toJSON());
    } else {
        // Context Menu Commands (these have a different structure)
        client.commands.set(command.name, command);
        registerCommands.push(command);
    }
}

const rest = new REST({ version: '9' }).setToken(token);

for(let i = 0; i < guild_ids.length; i++){
    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationGuildCommands(client_id, guild_ids[i]),
                { body: registerCommands },
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}
//#endregion

client.on('ready', async () => {
    console.log('Bot Ready')
})

// Listen for interactions (INTERACTION COMMAND HANDLER)
client.on('interactionCreate', async interaction => {

    if (interaction.isAutocomplete()) {
       if (interaction.commandName == 'oochadex') {
           let ooch_ids = db.monster_data.array()
           let ooch_names = ooch_ids.map(v => v.name.toLowerCase());

           function letter_filter(v) {
                let msg = interaction.options.getString('oochamon').toLowerCase();
                let search_segment = v.slice(0, msg.length)
                return msg == search_segment;
           }

           // Search filters
           ooch_names = ooch_names.filter(v => v != 'i');
           ooch_names = ooch_names.filter(letter_filter);
           ooch_names = ooch_names.slice(0, 25);
           ooch_names = ooch_names.map(v => v = { name: _.capitalize(v), value: _.capitalize(v) });
           interaction.respond(ooch_names);
       }
    }

    if (!interaction.isCommand() && !interaction.isContextMenu()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        await console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
    
});

//
client.on('messageCreate', async message => {

    if (message.guild.id == '688947207893942314') {
        return;
    }

    if (message.author.id == '397879158962782219') {
        if (message.type == 'THREAD_CREATED') {
            console.log('type')
            await wait(10000)
            return message.delete();
        } else {
            return;
        }
    }

    if (message.content == 'start battle') {
        ooch_gen = await generate_battle(db.profile.get(message.author.id, 'ooch_party'), [0, 3, 6]) // Sporbee, Roocky, Puppyre
        console.log(ooch_gen);
        db.profile.set(message.author.id, 0, 'ooch_active_slot');
        const thread = await message.channel.threads.create({
            name: `${message.member.displayName} Wild Battle, join this to battle!`,
            autoArchiveDuration: 60,
            reason: 'Battle thread',
        });

        if (thread.joinable) await thread.join();
        await thread.members.add(message.author.id);
        await thread.setLocked(true);
        await thread.send(`${message.member.displayName}, please use this thread to battle!\nYou encounter a wild level ${ooch_gen.ooch_party[0].level} ${db.monster_data.get(ooch_gen.ooch_party[0].id, 'name')}!\n`)

        await db.profile.set(message.author.id, 'battle', 'player_state')
        await db.profile.set(message.author.id, ooch_gen, 'ooch_enemy')
        await db.profile.set(message.author.id, thread.id, 'battle_thread_id')

        await prompt_battle_input(thread, message);

        message.delete();
    }

    // Funi game logic for controlling the game
    if (db.profile.has(message.author.id)) {
        player_state = db.profile.get(message.author.id, 'player_state')
        switch (player_state) {
            case 'overworld': 
                if (message.channel.id == '921969875482738749') {
                    switch (message.content) {
                        case 'd': move(message, 'd'); break;
                        case 's': move(message, 's'); break;
                        case 'a': move(message, 'a'); break; 
                        case 'w': move(message, 'w'); break;
                    }
                    message.delete();
                }
            break;
        }
    }
})



//Log Bot in to the Discord
client.login(token);

