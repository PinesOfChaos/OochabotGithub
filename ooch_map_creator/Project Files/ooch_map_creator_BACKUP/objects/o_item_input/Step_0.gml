var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

hover = -1;
for(var i = 0; i < array_length(items_list); i++){
	var xx = (i mod 10)*tile_size+x-tile_size*5;
	var yy = (i div 10)*tile_size+y;
		
	if(point_in_rectangle(mgx,mgy,xx,yy,xx+tile_size,yy+tile_size)){
		hover = i;
			
	}
}

if(mouse_check_button_pressed(mb_left)){
	
	with(parent){
		local_pause = false;
		if(other.hover != -1){
			switch(object_index){
				case o_chest_maker:
					state = "update";
					chest_data.contents[position_to_update] = items_list[other.hover];
				break;
				case o_node:
					text_recieve = other.hover
				break;
			}
			
		}
	}
	instance_destroy();
}