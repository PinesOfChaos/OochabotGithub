if(mouse_check_button_pressed(mb_left)){
	for(var i = 0; i < array_length(chest_list); i ++){
		var o = chest_list[i];
		var xx = o.x*tile_size;
		var yy = o.y*tile_size;
		if(point_in_rectangle(mouse_x,mouse_y,xx,yy,xx+tile_size,yy+tile_size)){
			with(Manager){
				my_chest = instance_create_layer(0,0,"Instances",o_chest_maker);
				my_chest.chest_data = chest_list[i];
				my_chest.initial_entries = false;
				my_chest.state = "update";
			}
			instance_destroy();
		}
	}
}