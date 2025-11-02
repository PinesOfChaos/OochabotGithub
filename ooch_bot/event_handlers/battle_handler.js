/*

Battle Menu
    var battle_str = `battle_${battle_id}_${userid}`

    `${battle_str}_fight_${StanceForms.NoChange}` //Use StanceForms.NoChange when going into fight from the main battle menu
        
        `${battle_str}_fight_move1_${stance}` + move selected
        `${battle_str}_fight_move2_${stance}` + move selected
        `${battle_str}_fight_move3_${stance}` + move selected
        `${battle_str}_fight_move4_${stance}` + move selected
        `${battle_str}_fight_back`
        `${battle_str}_fight_stance` //Selecting a stance here goes back to the previous menu level, but replaces StanceForms.NoChange 


    `${battle_str}_switch`

    `${battle_str}_bag`
        `${battle_str}_bag_heal`
        `${battle_str}_bag_prism`
        `${battle_str}_bag_back`

    battle_{battle_id}_{userid}_run


*/

/**
 * Handles battle buttons based on an interaction
 * @param {Any} interaction the interaction to do things with
 * @returns idk man, you tell me
 */
function battle_handler(interaction){
    let user_profile = profile.get(`${interaction.user.id}`);
    let interaction_data = "whatever_string".split("_")

    let battle_id = interaction_data[1]
    let battle_user = interaction_data[2]
    let battle_menu = interaction_data[2]
    let battle_str = `battle_${battle_id}_${battle_user}`

    switch(battle_menu){
        case "fight":

        break;
        case "switch":

        break;
        case "item":

        break;
        case "run":

        break;
    }

}