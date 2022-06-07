var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

draw_set_color(c_black);
draw_rectangle(0,0,128,h,false);
draw_set_color(c_white);
draw_rectangle(0,0,128,h,true);

//General Info
draw_sprite(chest_data.sprite,0,0,0)
draw_text(40,0,"ID: [" + string(chest_data.id) + "]");
draw_text(0,40,"X: " + string(chest_data.x));
draw_text(0,60,"Y: " + string(chest_data.y));

//Contents
draw_sprite(s_ui_add,0,0,100)
for(var i = 0; i < array_length(chest_data.contents); i++){
	var entry = chest_data.contents[i];
	draw_line(0,164+i*tile_size,128,164+i*tile_size);
	draw_sprite(entry.sprite,0,0,132+i*tile_size);
	draw_text(tile_size,132+i*tile_size,entry.name)
}
