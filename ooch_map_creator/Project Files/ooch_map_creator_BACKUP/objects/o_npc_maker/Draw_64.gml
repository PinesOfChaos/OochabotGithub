var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

draw_set_color(c_black);
draw_rectangle(0,0,128,h,false);
draw_set_color(c_white);
draw_rectangle(0,0,128,h,true);


//General Info
draw_sprite(npc_data.sprite,0,0,0)
draw_text(40,0,"ID: [" + string(npc_data.id) + "]");
draw_text(0,40,"Name: " + npc_data.name);

//Position Info
draw_text(0,60,"X: " + string(npc_data.x));
draw_text(0,80,"Y: " + string(npc_data.y));

draw_text(0,120,"Pre-Key Nodes" + (npc_data.nodes_pre != "" ? "" : "*"));
draw_text(0,140,"Default Nodes" + (npc_data.nodes_default != "" ? "" : "*"));
draw_text(0,160,"Post Nodes" + (npc_data.nodes_post != "" ? "" : "*"));
draw_text(0,180,"Key" + string(npc_data.key_required));

draw_set_alpha(1);
draw_set_color(c_white);