var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

draw_set_color(c_black);
if(state == "node_editor_pre" || state == "node_editor_default" || state == "node_editor_post"){
	draw_set_alpha(.8);
	draw_rectangle(0,0,960,540,false)
	draw_set_alpha(1);
}
draw_rectangle(0,0,128,h,false);
draw_set_color(c_white);
