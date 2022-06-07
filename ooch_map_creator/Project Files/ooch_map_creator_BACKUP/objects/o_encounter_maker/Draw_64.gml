var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

var pre = string_copy(trainer_data.dialogue_start,1,6)+"...";
var post = string_copy(trainer_data.dialogue_end,1,6)+"...";

draw_set_color(c_black);
draw_rectangle(0,0,128,h,false);
draw_set_color(c_white);
draw_rectangle(0,0,128,h,true);

//General Info
draw_sprite(trainer_data.sprite,0,0,0)
draw_text(40,0,"ID: [" + string(trainer_data.id) + "]");
draw_text(0,40,"Class: " + trainer_data.class);
draw_text(0,60,"Name: " + trainer_data.name);

//Position Info
draw_text(0,100,"X: " + string(trainer_data.x));
draw_text(0,120,"Y: " + string(trainer_data.y));
draw_text(0,140,"Facing: " + trainer_data.facing);
draw_text(0,160,"Pre-Fight: " + pre);
draw_text(0,180,"Post-Fight: " + post);

//Party
draw_sprite(s_ui_add,0,0,200)
draw_text(32,200,"Add Party")
for(var i = 0; i < array_length(trainer_data.party); i++){
	var entry = trainer_data.party[i];
	draw_line(0,248+i*tile_size,128,248+i*tile_size);
	draw_sprite(entry.sprite,0,0,232+i*tile_size);
	draw_text(tile_size,232+i*tile_size,entry.name)
	draw_sprite(s_ui_remove_small,0,128,232+i*tile_size);
}

var o = 8+8*(window_get_fullscreen()?0:1);
if(point_in_rectangle(mgx,mgy,0,160,128,180)){
	draw_set_color(c_black);
	draw_rectangle(mgx+o,mgy+o,mgx+320+o,mgy+128+o,false);
	draw_set_color(c_white);
	draw_text_ext(mgx+o,mgy+o,trainer_data.dialogue_start,20,320);
	draw_rectangle(mgx+o,mgy+o,mgx+320+o,mgy+128+o,true);
}
else if(point_in_rectangle(mgx,mgy,0,180,128,200)){
	draw_set_color(c_black);
	draw_rectangle(mgx+o,mgy+o,mgx+320+o,mgy+128+o,false);
	draw_set_color(c_white);
	draw_text_ext(mgx+o,mgy+o,trainer_data.dialogue_end,20,320);
	draw_rectangle(mgx+o,mgy+o,mgx+320+o,mgy+128+o,true);
}