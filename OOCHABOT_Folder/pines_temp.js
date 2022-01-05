generate_challenge: function(challenged_id) {
    
    const { random_number, get_stats } = require('./func.js'); 

    // Get the wild oochamon's level
    let chal_name = db.profile.get(challenged_id, 'name');
    let chal_mons = db.profile.get(challenged_id, 'ooch_inventory');
    let chal_party = [];
    let ooch_slot,

    for(let i = 0; i < chal_mons.length; i++){
        ooch_slot = chal_mons[i];
        ooch_slot.evo_stage = 0;
        ooch_slot.current_hp = ooch_slot.stats.hp;
        chal_party.push(ooch_slot);
    }

    return {
        name: chal_name,
        ooch_active_slot: 0,
        party: chal_party
    }

}