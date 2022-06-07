if(mouse_check_button_pressed(mb_left)){
	var complete = false;
	for(var i = 0; i < array_length(trainer_list); i ++){
		var o = trainer_list[i];
		var xx = o.x*tile_size;
		var yy = o.y*tile_size;
		if(point_in_rectangle(mouse_x,mouse_y,xx,yy,xx+tile_size,yy+tile_size)){
			with(Manager){
				my_encounter = instance_create_layer(0,0,"Instances",o_encounter_maker);
				my_encounter.trainer_data = trainer_list[i];
				my_encounter.initial_entries = false;
				my_encounter.state = "update";
			}
			instance_destroy();
			complete = true;
		}
	}
	if(complete){exit;}
	for(var i = 0; i < array_length(npc_list); i ++){
		var o = npc_list[i];
		var xx = o.x*tile_size;
		var yy = o.y*tile_size;
		if(point_in_rectangle(mouse_x,mouse_y,xx,yy,xx+tile_size,yy+tile_size)){
			with(Manager){
				my_npc = instance_create_layer(0,0,"Instances",o_npc_maker);
				my_npc.npc_data = npc_list[i];
				my_npc.initial_entries = false;
				my_npc.state = "update";
			}
			instance_destroy();
			complete = true;
		}
	}
}