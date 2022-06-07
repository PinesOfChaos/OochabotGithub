local_pause = false;
selected_node = -1;

mouse_prev_x = 0;
mouse_prev_y = 0;

state = "load";
node_string = "";

active_node_id = -1;
active_option = -1;
text_recieve = -1;

x_offset = 0;
y_offset = 0;

last_node_x = camera_get_view_x(view_camera[0]);
last_node_y = camera_get_view_y(view_camera[0]);

instance_create_depth(last_node_x+200,last_node_y+32,-1000,o_node_start);


