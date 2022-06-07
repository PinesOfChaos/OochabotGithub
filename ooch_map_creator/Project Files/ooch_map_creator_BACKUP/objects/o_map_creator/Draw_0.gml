var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);


if(tile_mouse_x!=-1 && tile_mouse_y !=-1 && tile_selected_val != -1){
	switch(draw_mode){
		case "draw":
			for(var i = 0; i < draw_size; i++){
				for(var j = 0; j < draw_size; j++){
					draw_sprite(tile_paint,0,(tile_mouse_x+i)*tile_size,(tile_mouse_y+j)*tile_size);
				}	
			}
		break;
		case "fill":
			draw_sprite(tile_paint,0,tile_mouse_x*tile_size,tile_mouse_y*tile_size);
		break;
	
	}
}
