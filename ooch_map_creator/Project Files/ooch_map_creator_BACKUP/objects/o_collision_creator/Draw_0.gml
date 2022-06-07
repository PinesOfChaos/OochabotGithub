var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);


if(tile_mouse_x!=-1 && tile_mouse_y !=-1){
	for(var i = 0; i < draw_size; i++){
		for(var j = 0; j < draw_size; j++){
			switch(collision_array[i][j]){
				case BLOCKED:
					draw_sprite(s_tile_collision,0,(tile_mouse_x+i)*tile_size,(tile_mouse_y+j)*tile_size);
				break;
			}
		}	
	}
}

for(var i = 0; i < map_w; i++){
		for(var j = 0; j < map_h; j++){
			switch(collision_array[i][j]){
				case BLOCKED:
					draw_sprite_ext(s_tile_collision,0,i*tile_size,j*tile_size,1,1,0,c_white,dsin(-current_time/8+(i+j)*tile_size)/4+.5);
				break;
			}
		}	
	}