

// require the discord.js module
const fs = require('fs');
const Discord = require('discord.js');
const { token, client_id, guild_ids } = require('./config.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// create a new Discord client and give it some variables
const { Client, Intents } = require('discord.js');
const { Console } = require('console');
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

    await interaction.deferReply();

    const command = client.commands.get(interaction.commandName);

    if(interaction.commandName == 'setup'){
        const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('sporbee')
                    .setLabel('Sporbee')
                    .setStyle('SPORBEE')
                    .setEmoji('<:ifrmgkng:898658599574859816>'),
            )

        await interaction.reply({content: 'Sporbee!',components: [row] })
    }

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

    let rand = Math.floor(Math.random() * (1000)); 
    console.log(rand);
    if(rand == 2){
        message.member.setNickname('OOCHABOT');
    }
    if(rand == 1){
        message.channel.send(`OOCHABOT slaps <@${message.author.id}>`);
    }
    if(rand == 0){
        message.react('<:consumption_sphere:920855223675813898>');
    }
})



//Log Bot in to the Discord
client.login(token);

