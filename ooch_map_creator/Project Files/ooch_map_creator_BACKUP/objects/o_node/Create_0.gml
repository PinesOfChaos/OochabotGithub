depth = -1000;

image_xscale = 5;
image_yscale = 6;

node_w = sprite_width;
node_h = sprite_height;

local_pause = false;
selected_node = -1;

mouse_prev_x = 0;
mouse_prev_y = 0;

state = "new";

active_node_id = -1;
active_option = -1;
text_recieve = -1;

is_initial_node = false;

//Stored information
text = "No Text";				//Dialogue displayed
content = ["none",-1];			//options are NONE, BATTLE, ITEM, OOCHAMON, CURRENCY
end_action = ["options",[]];	
temp_id = "";

is_first = false;

my_reciever = (instance_create_depth(x,y,depth-1,o_node_socket_reciever))
with(my_reciever){
	parent_node = other.id;
}

enum end_info{
	zero,
	str,
	socket
}



