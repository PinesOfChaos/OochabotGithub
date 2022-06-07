if(local_pause || instance_exists(ParentInput)){exit;}

var b = 8;
var xx = x+b;
var yy = y+b;

switch(state){
	case "new":
		state = "await";
		if(is_first){
			var start_node = noone;
			with(o_node_start){
				start_node = id;
			}
			with(my_reciever){
				with(o_node_socket_sender){
					if(parent_node == start_node){
						other.connected_socket = id;
						connected_socket = other.id;
					}
				}
			}
		}
	break;
	case "await":
		image_index = 0;
		if(mouse_check_button_pressed(mb_left)) && point_in_rectangle(mouse_x,mouse_y,bbox_left,bbox_top,bbox_right,bbox_bottom){
			//disable all other nodes and set this one to be active
			with(o_node){
				state = "await";
			}
			with(o_node_editor){
				local_pause = true;	
			}
			state = "active";
		}
	break;
	case "active":
		with(o_node_editor){
			last_node_x = other.x;
			last_node_y = other.y;
		}
	
		image_index = 1;
		if(keyboard_check_pressed(vk_delete) && !is_initial_node){
			instance_destroy();
		}
		if(keyboard_check_pressed(vk_escape)){
			state = "await";
			with(o_node_editor){
				local_pause = false;	
			}
		}
		if(mouse_check_button_pressed(mb_left)){
			if(point_in_rectangle(mouse_x,mouse_y,xx,yy,xx+node_w,yy+20)){
				state = "drag";
			}
			if(point_in_rectangle(mouse_x,mouse_y,xx,yy+20,xx+node_w,yy+40)){
				state = "text_input";
			}
			else if(point_in_rectangle(mouse_x,mouse_y,xx,yy+40,xx+node_w,yy+60)){
				state = "content_input";
			}
			else if(point_in_rectangle(mouse_x,mouse_y,xx,yy+60,xx+node_w,yy+80)){
				switch(content[0]){
					case "none":
							
					break;
					case "battle":
						state = "content_input_battle";
					break;
					case "item":
						state = "content_input_item";
					break;
					case "oochamon":
						state = "content_input_oochamon";
					break;
					case "currency":
						state = "content_input_currency";
					break;
				}
			}
			else if(point_in_rectangle(mouse_x,mouse_y,xx,yy+80,xx+node_w,yy+100)){
				//state = "end_input"; Removed now that all end_inputs will be options based
			}
			else if(point_in_rectangle(mouse_x,mouse_y,xx,yy+100,xx+node_w,yy+120)){ ///previously used to change the options stuff
				state = "update";
			}
			else if(point_in_rectangle(mouse_x,mouse_y,xx-16,yy+100,xx,yy+100+array_length(end_action[1])*20+16)){
					var i = 0;
					for(var i = 0; i < array_length(end_action[1]); i++){
						if(point_in_rectangle(mouse_x,mouse_y,x-16,y+100+i*20,x,y+100+i*20+16)){ //Remove option
							instance_destroy(end_action[1][i][end_info.socket]);
							array_delete(end_action[1],i,1);
							state = "update"
						}
						else if(point_in_rectangle(mouse_x,mouse_y,xx,yy+100+i*20,xx+node_w,yy+120+i*20)){ //Edit Option
							active_option = i;
							state = "end_input_options";
						}
					}
					if(point_in_rectangle(mouse_x,mouse_y,xx-16,yy+100+i*20,xx,yy+100+i*20+16)){ //add option
					
						var l = array_length(end_action[1]);
						var sock = instance_create_depth(x + sprite_width, yy + 110 + l *20,depth-1,o_node_socket_sender);
						with(sock){
							parent_node = other.id;
						}		
						
						var arr = [];
						
						arr[end_info.zero] = 0;
						arr[end_info.str] = "";
						arr[end_info.socket] = sock;
					
						array_push(end_action[1], arr)
												
						active_option = l;
						state = "end_input_options";
					}
			}
		}
	break;
	case "update":
		state = "active";
	break;
	case "text_input":	
		if(text_recieve != -1){
			text = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Text","string",text);
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "content_input":	
		if(text_recieve != -1){
			if(content[0] != text_recieve){
				content = [];
				content[0] = text_recieve;
			
				switch(text_recieve){
					case "none":
						state = "update";
					break;
					case "battle":
						content[1] = -1;
						state = "content_input_battle";
					break;
					case "item":
						content[1] = 0;
						content[2] = 1;
						state = "content_input_item";
					break;
					case "oochamon":
						content[1] = 0;
						content[2] = 5;
						state = "content_input_oochamon";
					break;
					case "currency":
						content[1] = 0;
						state = "content_input_currency";
					break;
				}
			}
			else{
				state = "update";
			}
			text_recieve = -1;
		}
		else{
			my_input = request_options_input("Content Type",["none","battle","item","oochamon","currency"],content[0]);
			my_input.prev_text = content[0];
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "content_input_battle":	
		state = "update";
		/*
		if(text_recieve != -1){
			content[1] = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Text","string",text);
			my_input.depth = depth-1;
			local_pause = true;
		}
		*/
	break;
	case "content_input_oochamon":	
		if(text_recieve != -1){
			content[1] = text_recieve;
			state = "content_input_oochamon_level";
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_ooch_input);
			my_input.prev_text = content[1];
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "content_input_oochamon_level":	
		if(text_recieve != -1){
			content[2] = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Level","number",content[2])
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "content_input_item":	
		if(text_recieve != -1){
			content[1] = text_recieve;
			state = "content_input_item_amount";
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_item_input)
			my_input.prev_text = content[1];
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "content_input_item_amount":	
		if(text_recieve != -1){
			content[2] = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Amount","number",content[2])
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "content_input_currency":	
		if(text_recieve != -1){
			content[1] = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Oochabux","number",content[1])
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "end_input":	
		if(text_recieve != -1){
			if(end_action[0] != text_recieve){
				end_action[0] = text_recieve;
			
				with(o_node_socket_sender){
					if(parent_node == other.id && object_index!=o_node_socket_reciever){
						instance_destroy();
					}
				}
				
				switch(text_recieve){
					case "options":
						var sock = instance_create_depth(xx + 184, yy + 110,depth-1,o_node_socket_sender);
						with(sock){
							parent_node = other.id;
						}
						
						var arr = [];
						arr[end_info.zero] = 0;
						arr[end_info.str] = "Default";
						arr[end_info.socket] = sock;
					
						end_action[1][0] = arr;
						state = "update";
					break;
				}
			}
			else{
				state = "update";
			}
			text_recieve = -1;
		}
		else{
			my_input = request_options_input("End Type",["terminate","continue","options"],content[0]);
			my_input.prev_text = end_action[0];
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "end_input_options":
		if(text_recieve != -1){
			end_action[1][active_option][1] = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Text Option","string",end_action[1][active_option][1]);
			my_input.prev_text = end_action[1][active_option][1];
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "end_input_other_node":
		if(text_recieve != -1){
			end_action[1] = text_recieve;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Node To","number",end_action[1])
			my_input.prev_text = end_action[1]
			my_input.parent = id;
			my_input.depth = depth-1;
			local_pause = true;
		}
	break;
	case "drag":
		x -= mouse_prev_x-mouse_x;
		y -= mouse_prev_y-mouse_y;
		
		if(mouse_check_button_released(mb_left)){
			state = "update";
		}
	break;
}

mouse_prev_x = mouse_x;
mouse_prev_y = mouse_y;
