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

if((tile_mouse_x!=-1)&&(tile_mouse_y!=-1)){
	if(mouse_check_button(mb_left)){
		var xx,yy
		for(var i = 0; i < draw_size; i++){
			for(var j = 0; j < draw_size; j++){
				xx = tile_mouse_x+i;
				yy = tile_mouse_y+j;
				if(xx >= 0 && xx < map_w && yy >= 0 && yy < map_h){
					collision_array[xx][yy] = BLOCKED;
				}
			}	
		}
	}
	if(mouse_check_button(mb_right)){
		var xx,yy
		for(var i = 0; i < draw_size; i++){
			for(var j = 0; j < draw_size; j++){
				xx = tile_mouse_x+i;
				yy = tile_mouse_y+j;
				if(xx >= 0 && xx < map_w && yy >= 0 && yy < map_h){
					collision_array[xx][yy] = FLOOR;
				}
			}	
		}
	}	
}