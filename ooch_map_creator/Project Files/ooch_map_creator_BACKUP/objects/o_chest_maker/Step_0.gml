if(local_pause){exit;}

if(keyboard_check_pressed(vk_escape)){
	instance_destroy();	
}
if(keyboard_check_pressed(vk_delete)){
	array_delete(chest_list, chest_data.id, 1);
	refresh_ids();
	instance_destroy();	
}

var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

switch(state){
	case "place":
		chest_data.x = tile_mouse_x;
		chest_data.y = tile_mouse_y;
		if(mouse_check_button_pressed(mb_left)){
			state = "update";
		}
	break;
	case "move":
		chest_data.x = tile_mouse_x;
		chest_data.y = tile_mouse_y;
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
					state = "x_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,60,128,80)){
					state = "y_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,100,128,132)){
					//add a POTION to the contents of the chest
					array_push(chest_data.contents,items_list[0]);
					
				}
				else if(tile_mouse_x == chest_data.x && tile_mouse_y == chest_data.y){
					state = "move";
				}
				else{
					for(var i = 0; i < array_length(chest_data.contents); i++){
						if(point_in_rectangle(mgx,mgy,0,132+i*tile_size,128,164+tile_size+i*tile_size)){
							position_to_update = i;
							local_pause = true;
							state = "item_input";
							my_input = instance_create_layer(0,0,"Instances",o_item_input)
							my_input.parent = id;
						}
					}
				}
				
			}	
		}
	break;
	case "x_input":	
		if(text_recieve != -1){
			chest_data.x = text_recieve;
			state = initial_entries?"y_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("X Position","number",chest_data.x);
			local_pause = true;
		}
	break;
	case "y_input":	
		if(text_recieve != -1){
			chest_data.y = text_recieve;
			state = initial_entries?"facing_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Y Position","number",chest_data.y);
			local_pause = true;
		}
	break;
	case "sprite_input":	
		if(text_recieve != -1){
			state = initial_entries?"update":"update";
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_chest_sprite_input);
			my_input.parent = id;
			local_pause = true;
		}
	break;
	case "update":
		initial_entries = false;
		state = "await";
		chest_list[chest_data.id] = chest_data;
	break;
	case "item_input":
		if(!local_pause){
			state = "update";
		}
	break;
	
}

