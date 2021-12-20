// require the discord.js module
const fs = require('fs');
const Discord = require('discord.js');
const { token, client_id, guild_ids } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const wait = require('wait');

// create a new Discord client and give it some variables
const { Client, Intents } = require('discord.js');
const db = require('./db.js');
const { move, battle } = require('./func');
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

client.on('ready',  async() => {
    client.user.setStatus('invisible')
    console.log('Bot Ready')
})

// Listen for interactions (INTERACTION COMMAND HANDLER)
client.on('interactionCreate', async interaction => {

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

    if (message.author.id == '397879158962782219') {
        if (message.type == 'THREAD_CREATED') {
            console.log('type')
            await wait(5000)
            return message.delete();
        }
    }

    /*let rand = Math.floor(Math.random() * (1000)); 
    console.log(rand);
    if(rand == 2){
        message.member.setNickname('OOCHABOT');
    }
    if(rand == 1){
        message.channel.send(`OOCHABOT slaps <@${message.author.id}>`);
    }
    if(rand == 0){
        message.react('<:consumption_sphere:920855223675813898>');
    }*/

    if (message.content == 'start battle') {
        const thread = await message.channel.threads.create({
            name: `${message.member.displayName} wild battle`,
            autoArchiveDuration: 60,
            reason: 'Battle thread',
        });

        if (thread.joinable) await thread.join();
        await thread.setLocked(true);
        
        console.log(`Created thread: ${thread.name}`);
    }

    // Funi game logic for controlling the game
    if (message.channel.id == '921969875482738749' || message.channel.id == '921977447510081547') {
        player_state = db.profile.get(message.author.id, 'player_state')
        switch (player_state) {
            case 'overworld': 
                switch (message.content) {
                    case 'r': move(message.author.id, 0); break;
                    case 'd': move(message.author.id, 90); break;
                    case 'l': move(message.author.id, 180); break; 
                    case 'u': move(message.author.id, 270); break;
                }
            break;

            case 'battle':
                switch (message.content) {
                    case 'fight': battle(message.author.id, 'fight'); break;
                    case 'bag': battle(message.author.id, 'bag'); break;
                    case 'oochamon': battle(message.author.id, 'oochamon'); break;
                    case 'run': battle(message.author.id, 'run'); break;
                }
            break;
        }
        message.delete()
    }

})



//Log Bot in to the Discord
client.login(token);

