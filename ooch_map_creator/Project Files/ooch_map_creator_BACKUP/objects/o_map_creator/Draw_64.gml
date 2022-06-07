var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

draw_set_color(c_black);
draw_rectangle(0,0,128,h,false);
draw_set_color(c_white);
draw_rectangle(0,0,128,h,true);


for(var i = 0; i < array_length(tiles); i++){
	draw_sprite(tiles[i][0],0,(i mod 4)*tile_size, (i div 4)*tile_size);
	if(i == tile_selected_val){
		draw_sprite(tile_highlight,0,(i mod 4)*tile_size, (i div 4)*tile_size);
	}
}

draw_set_halign(fa_right);
draw_set_valign(fa_bottom);
draw_text(w,h-40,"[Draw Mode: "+draw_mode+"]")
draw_text(w,h-20,"Q/W: Draw/Fill")
draw_text(w,h,"0-9: Draw Size")

draw_set_halign(fa_top);
draw_set_valign(fa_left);