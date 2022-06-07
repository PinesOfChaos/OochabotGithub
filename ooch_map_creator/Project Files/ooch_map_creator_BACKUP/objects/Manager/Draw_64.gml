var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

var w_half = w/2;

draw_sprite(s_ui_save,0,w-tile_size,0);

draw_sprite(s_ui_map_creator,0,w_half-192,0);
draw_sprite(s_ui_collisions_creator,0,w_half-160,0);

draw_sprite(s_ui_npc_maker,0,w_half-96,0);
draw_sprite(s_ui_encounter_maker,0,w_half-64,0);
draw_sprite(s_ui_encounter_selector,0,w_half-32,0);

draw_sprite(s_ui_chest_maker,0,w_half+32,0);
draw_sprite(s_ui_chest_selector,0,w_half+64,0);

draw_sprite(s_ui_general_info,0,w_half+128,0);