const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move your character.')
        .addStringOption(option => 
            option.setName('direction')
                .setDescription('(L)eft, (R)ight, (U)p, or (D)own')
                .setRequired(true)
                .addChoices([['Left','l'],['Right','r'],['Up','u'],['Down','d']])),
    async execute(interaction) {
        let dirstring = interaction.options.getString('direction');
        let target = interaction.user;
        let dir = -1;
        switch(dirstring){
            case('l'):
                dir = 180;
                interaction.editReply(`${target} moves left.`);
            break;
            case('r'):
                dir = 0;
                interaction.editReply(`${target} moves right.`);
            break;
            case('u'):
                dir  = 90;
                interaction.editReply(`${target} moves up.`);
            break;
            case('d'):
                dir = 270;
                interaction.editReply(`${target} moves down.`);
            break;
        }
        
    },
};