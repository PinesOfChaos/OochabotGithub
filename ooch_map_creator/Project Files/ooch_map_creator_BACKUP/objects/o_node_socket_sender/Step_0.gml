if(!instance_exists(parent_node)){
	instance_destroy();
	exit;
}
else{
	x = parent_node.x + x_offset;
	y = parent_node.y + y_offset;
}

switch(state){
	case "new":
		x_offset = xstart - parent_node.x;
		y_offset = ystart - parent_node.y;
		
		if(socket_parent_find != -1 && object_index != o_node_socket_reciever){
			with(o_node_socket_reciever){
				if(parent_node == other.socket_parent_find && id != other.id){
					connected_socket = other.id;
					other.connected_socket = id;
				}
			}
		}
		
		state = "wait";
	break;
	case "wait":
		image_index = (connected_socket != noone);
		if(point_in_rectangle(mouse_x, mouse_y, bbox_left, bbox_top, bbox_right, bbox_bottom)){
			if(mouse_check_button_pressed(mb_left)){
				state = "hold";	
			}
			else if(mouse_check_button_pressed(mb_right)){
				with(connected_socket){
					connected_socket = noone;	
				}
				connected_socket = noone;
			}
		}
	break;
	case "hold":
		image_index = 1;
		if(mouse_check_button_released(mb_left)){
			var inst = instance_position(mouse_x,mouse_y,(object_index == o_node_socket_reciever) ? o_node_socket_sender : o_node_socket_reciever);
			var disconnect = false;
			if(inst != noone){
				//Set the connected socket of the connector
				connected_socket = inst;
				with(inst){
					//Disconnect any socket previously connected to this one
					if(connected_socket == other.id){
						disconnect = true;
						other.connected_socket = noone;
					}
					else if(connected_socket != noone){
						with(connected_socket){
							connected_socket = noone;
						}
					}
					//Set the connected socket of the connectee
					connected_socket = (disconnect ? noone : other.id);	
				}
			}
			state = "wait";
		}
	break;
}
