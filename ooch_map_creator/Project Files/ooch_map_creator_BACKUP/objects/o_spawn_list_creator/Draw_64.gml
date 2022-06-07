var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

draw_set_color(c_black);
draw_rectangle(0,0,128,h,false);
draw_set_color(c_white);
draw_rectangle(0,0,128,h,true);

draw_sprite(s_ui_add,0,0,0)
draw_text(32,0,"Add Spawns");
for(var i = 0; i < array_length(spawn_list); i++){
	var entry = spawn_list[i];
	draw_line(0,tile_size*2+i*tile_size,128,tile_size*2+i*tile_size);
	draw_sprite(entry.sprite,0,0,tile_size+i*tile_size);
	draw_text(tile_size,tile_size+i*tile_size,entry.name);
	draw_sprite(s_ui_remove_small,0,128,tile_size+i*tile_size);
}