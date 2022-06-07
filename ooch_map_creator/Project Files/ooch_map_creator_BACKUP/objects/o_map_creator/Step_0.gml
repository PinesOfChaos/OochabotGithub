if(local_pause){exit};

if(keyboard_lastchar != ""){
	if(keyboard_lastchar == string_digits(keyboard_lastchar)){
		draw_size = real(keyboard_lastchar);
		keyboard_lastchar = "";
	}
}

if(keyboard_check_pressed(ord("Q"))){
	draw_mode = "draw";
	cursor_sprite = s_ui_cursor_draw;
}
if(keyboard_check_pressed(ord("W"))){
	draw_mode = "fill";
	cursor_sprite = s_ui_cursor_fill;
}

if(keyboard_check_pressed(vk_escape)){
	instance_destroy();	
}



var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

if(mouse_check_button_pressed(mb_left)) && (point_in_rectangle(mgx,mgy,0,0,128,h)){
	tile_paint = -1;
	tile_selected_val = -1;
	var xx,yy;
	for(var i = 0; i < array_length(tiles); i++){
		xx = (i mod 4)*tile_size;
		yy = (i div 4)*tile_size;
		if(point_in_rectangle(mgx,mgy,xx,yy,xx+tile_size,yy+tile_size)){
			tile_paint = tiles[i][0];
			tile_selected_val = i;
		}
	}
}
else if(mouse_check_button(mb_left)&&(tile_selected_val!=-1)&&(draw_mode == "draw")&&(tile_mouse_x!=-1)&&(tile_mouse_y!=-1)){
	var xx,yy;
	for(var i = 0; i < draw_size; i++){
		for(var j = 0; j < draw_size; j++){
			xx = tile_mouse_x+i;
			yy = tile_mouse_y+j;
			if(xx >= 0 && xx < map_w && yy >= 0 && yy < map_h){
				map_array[xx][yy] = tiles[tile_selected_val];
			}
		}	
	}
		
}
else if(mouse_check_button_pressed(mb_left)&&(draw_mode == "fill")&&(tile_mouse_x!=-1)&&(tile_mouse_y!=-1)){
	var map_arr = map_array;
	var initial_type = map_array[tile_mouse_x][tile_mouse_y];
	var positions_arr = [[tile_mouse_x, tile_mouse_y]];
	var xx,yy,xxx,yyy,n;
	
	while(array_length(positions_arr) > 0){
		n = array_length(positions_arr)-1
		xx = positions_arr[n][0];
		yy = positions_arr[n][1];
		map_arr[xx,yy] = tiles[tile_selected_val];
		
		//LEFT
		xxx = clamp(xx-1,0,map_w-1);
		yyy = clamp(yy  ,0,map_h-1);
		if(map_arr[xxx][yyy])==initial_type{array_push(positions_arr,[xxx,yyy])}
		
		//RIGHT
		xxx = clamp(xx+1,0,map_w-1);
		yyy = clamp(yy  ,0,map_h-1);
		if(map_arr[xxx][yyy])==initial_type{array_push(positions_arr,[xxx,yyy])}
		
		//UP
		xxx = clamp(xx  ,0,map_w-1);
		yyy = clamp(yy-1,0,map_h-1);
		if(map_arr[xxx][yyy])==initial_type{array_push(positions_arr,[xxx,yyy])}
		
		//DOWN
		xxx = clamp(xx  ,0,map_w-1);
		yyy = clamp(yy+1,0,map_h-1);
		if(map_arr[xxx][yyy])==initial_type{array_push(positions_arr,[xxx,yyy])}
		
		array_delete(positions_arr,n,1);
	}
	
	
	map_array = map_arr;
}

//UNDO STUFF
if(mouse_check_button_released(mb_left)){
	var n = array_length(previous_map_states);
	
	for(var i = 0; i < map_w; i++){
		for(var j = 0; j < map_h; j++){
			previous_map_states[n][i][j] = map_array[i][j];
		}	
	}
	
	if(n > 10){
		array_delete(previous_map_states,0,1);	
	}
	
	show_debug_message(n)
}

if(keyboard_check(vk_control) && keyboard_check_pressed(ord("Z"))){ 
	var n = array_length(previous_map_states);
	if(n > 1){
		for(var i = 0; i < map_w; i++){
			for(var j = 0; j < map_h; j++){
				map_array[i][j] = previous_map_states[n-2][i][j];
			}	
		}
		array_delete(previous_map_states,n-1,1);
	}
}