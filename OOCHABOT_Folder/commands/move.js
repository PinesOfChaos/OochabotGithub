const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js')

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
        let xmove = 0;
        let ymove = 0;
        
        //Get the player's location
        let player_location = db.profile.get(target, 'location_data');
        let biome = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;

        //Get the map array based on the player's current biome
        let map_obj = db.maps.get(biome);
        let map_arr = map_obj[1]; //this should be the actual map array?

        //set where the player is going to move
        switch(dirstring){
            case('l'):
                xmove = -1;
            break;
            case('r'):
                xmove = 1;
            break;
            case('u'):
                ymove  = -1;
            break;
            case('d'):
                ymove = 1;
            break;
        }
        
        //0 path, 1 block, 2 spawn, 3 chest

        if(map_arr[playerx+xmove][playery+ymove]!=1){//if the space the player wants to move to is NOT a blocked space
            playerx+=xmove;
            playery+=ymove;
        }

        //Update the player's profile with their new x & y positions
        db.profile.set(target, { area: biome, x: playerx, y: playery }, 'location_data');

        //Send reply displaying the player's location on the map
        interaction.editReply(map_emote_string(biome, map_arr, playerx, playery));
    },
};

/* THIS IS JUST STOLEN FROM THE SETUP INTERACTION FOR REFERENCE
db.profile.set(interaction.user.id, interaction.member.displayName, 'player_name');
db.profile.set(interaction.user.id, [], 'ooch_pc')
db.profile.set(interaction.user.id, [], 'item_inventory')
db.profile.set(interaction.user.id, 0, 'currency')
db.profile.set(interaction.user.id, 'overworld', 'player_state') // States are not_playing, overworld, battle, shop, menu, party_menu
db.profile.set(interaction.user.id, -1, 'battle_thread_id')
db.profile.set(interaction.user.id, {}, 'ooch_enemy')
db.profile.set(interaction.user.id, { area: 'hub', x: 5, y: 5 }, 'location_data')

*/