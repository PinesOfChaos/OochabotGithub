if(local_pause){exit};

if(keyboard_check_pressed(vk_escape)){
	instance_destroy();	
}

var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

if(mouse_check_button_pressed(mb_left)){
	if(point_in_rectangle(mgx,mgy,0,0,128,32)){
		array_push(spawn_list,ooch_array[0]);	
	}
	for(var i = 0; i < array_length(spawn_list); i++){
		if(point_in_rectangle(mgx,mgy,0,tile_size+i*tile_size,128,tile_size*2+i*tile_size)){
			position_to_update = i;
			local_pause = true;
			with instance_create_layer(0,0,"Instances",o_ooch_input){
				parent = other.id;
			}
		}
		if(point_in_rectangle(mgx,mgy,128,tile_size+i*tile_size,128+16,tile_size+i*tile_size+16)){
			array_delete(spawn_list,i,1);	
		}
	}
}