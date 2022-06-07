// Script assets have changed for v2.3.0 see
// https://help.yoyogames.com/hc/en-us/articles/360005277377 for more information
function create_monster(id,sprite,name,image,oochive_entry,type,hp,atk,def,spd,move_list,abilities,evo_id,evo_level){
	var mon = {
		id :			id,
		sprite :		sprite,
		name :			name,
		image :			image,
		oochive_entry : oochive_entry,
		type :			type,
		hp :			hp,
		atk :			atk,
		def :			def,
		spd :			spd,
		move_list:		move_list,
		abilities:		abilities,
		evo_id:			evo_id,
		evo_level:		evo_level,
	}
	array_push(ooch_array,mon);
}