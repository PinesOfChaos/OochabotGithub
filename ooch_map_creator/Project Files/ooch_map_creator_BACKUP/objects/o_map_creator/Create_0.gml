tile_paint = -1;
tile_selected_val = -1;

local_pause = false;

draw_mode = "draw";
draw_size = 1;
depth = -8;

cursor_sprite = s_ui_cursor_draw;
window_set_cursor(cr_none);

previous_map_states = array_create(0)