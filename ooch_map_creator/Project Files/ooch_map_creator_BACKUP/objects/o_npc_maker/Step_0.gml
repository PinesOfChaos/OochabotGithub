if(local_pause){exit;}

if(keyboard_check_pressed(vk_escape)){
	instance_destroy();	
}
if(keyboard_check_pressed(vk_delete)){
	array_delete(trainer_list, npc_data.id, 1);
	refresh_ids();
	instance_destroy();	
}

var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

switch(state){
	case "place":
		npc_data.x = tile_mouse_x;
		npc_data.y = tile_mouse_y;
		if(mouse_check_button_pressed(mb_left)){
			state = initial_entries?"name_input":"update";
		}
	break;
	case "move":
		npc_data.x = tile_mouse_x;
		npc_data.y = tile_mouse_y;
		if(mouse_check_button_released(mb_left)){
			state = "update";
		}
	break;
	case "await":
		if(initial_entries){
			state = "x_input";
		}
		else{
			if(mouse_check_button_pressed(mb_left)){
				if(point_in_rectangle(mgx,mgy,0,0,tile_size,tile_size)){
					state = "sprite_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,40,128,60)){
					state = "name_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,60,128,80)){
					state = "x_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,80,128,100)){
					state = "y_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,120,128,140)){
					state = "node_editor_pre";
				}
				else if(point_in_rectangle(mgx,mgy,0,140,128,160)){
					state = "node_editor_default";
				}
				else if(point_in_rectangle(mgx,mgy,0,160,128,180)){
					state = "node_editor_post";
				}
				else if(point_in_rectangle(mgx,mgy,0,160,128,200)){
					state = "key_set";
				}
				else if(tile_mouse_x == npc_data.x && tile_mouse_y == npc_data.y){
					state = "move";
				}			
			}	
		}
	break;
	case "x_input":	
		if(text_recieve != -1){
			npc_data.x = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("X Position","number",npc_data.x);
			local_pause = true;
		}
	break;
	case "y_input":	
		if(text_recieve != -1){
			npc_data.y = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Y Position","number",npc_data.y);
			local_pause = true;
		}
	break;
	case "name_input":	
		if(text_recieve != -1){
			npc_data.name = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("NPC Name","string",npc_data.name);
			local_pause = true;
		}
	break;
	case "sprite_input":	
		if(text_recieve != -1){
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_trainer_sprite_input);
			my_input.parent = id;
			local_pause = true;
		}
	break;
	case "node_editor_pre":	
		if(text_recieve != -1){
			state = "update";
			npc_data.nodes_pre = text_recieve;
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_node_editor);
			my_input.parent = id;
			my_input.depth = depth-1;
			my_input.node_string = npc_data.nodes_pre;
			local_pause = true;
		}
	break;
	case "node_editor_default":	
		if(text_recieve != -1){
			state = "update";
			npc_data.nodes_default = text_recieve;
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_node_editor);
			my_input.parent = id;
			my_input.depth = depth-1;
			my_input.node_string = npc_data.nodes_default;
			local_pause = true;
		}
	break;
	case "node_editor_post":	
		if(text_recieve != -1){
			state = "update";
			npc_data.nodes_post = text_recieve;
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_node_editor);
			my_input.parent = id;
			my_input.depth = depth-1;
			my_input.node_string = npc_data.nodes_post;
			local_pause = true;
		}
	break;
	case "key_set":	
		if(text_recieve != -1){
			npc_data.key_required = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Item Name","string",npc_data.key_required);
			local_pause = true;
		}
	break;
	case "update":
		initial_entries = false;
		state = "await";
		npc_list[npc_data.id] = npc_data;
	break;
}

