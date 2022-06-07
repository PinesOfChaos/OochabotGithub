if(local_pause){exit;}

if(keyboard_check_pressed(vk_escape)){
	instance_destroy();	
}
if(keyboard_check_pressed(vk_delete)){
	array_delete(trainer_list, trainer_data.id, 1);
	refresh_ids();
	instance_destroy();	
}

var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

switch(state){
	case "place":
		trainer_data.x = tile_mouse_x;
		trainer_data.y = tile_mouse_y;
		if(mouse_check_button_pressed(mb_left)){
			state = initial_entries?"facing_input":"update";
		}
	break;
	case "move":
		trainer_data.x = tile_mouse_x;
		trainer_data.y = tile_mouse_y;
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
					state = "class_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,60,128,80)){
					state = "name_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,100,128,120)){
					state = "x_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,120,128,140)){
					state = "y_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,140,128,160)){
					state = "facing_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,160,128,180)){
					state = "dialogue_start_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,180,128,200)){
					state = "dialogue_end_input";
				}
				else if(point_in_rectangle(mgx,mgy,0,200,128,212)){
					//Add a sporbee to an empty party slot
					if(array_length(trainer_data.party)<6){
						array_push(trainer_data.party,ooch_array[0]);
					}
				}
				else if(tile_mouse_x == trainer_data.x && tile_mouse_y == trainer_data.y){
					state = "move";
				}
				else{
					for(var i = 0; i < array_length(trainer_data.party); i++){
						if(point_in_rectangle(mgx,mgy,0,232+i*tile_size,128,232+tile_size+i*tile_size)){
							position_to_update = i;
							local_pause = true;
							state = "ooch_input";
							my_input = instance_create_layer(0,0,"Instances",o_ooch_input)
							my_input.parent = id;
						}
						if(point_in_rectangle(mgx,mgy,128,212+i*tile_size,128+16,212+i*tile_size+16)){
							array_delete(trainer_data.party,i,1);
							state = "update";
						}
					}
				}
				
			}	
		}
	break;
	case "x_input":	
		if(text_recieve != -1){
			trainer_data.x = text_recieve;
			state = initial_entries?"y_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("X Position","number",trainer_data.x);
			local_pause = true;
		}
	break;
	case "y_input":	
		if(text_recieve != -1){
			trainer_data.y = text_recieve;
			state = initial_entries?"facing_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Y Position","number",trainer_data.y);
			local_pause = true;
		}
	break;
	case "facing_input":
		if(text_recieve != -1){
			if(text_recieve == "left" || text_recieve == "right" || text_recieve == "up" || text_recieve == "down"){
				trainer_data.facing = text_recieve;
			}
			state = initial_entries?"name_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_options_input("Direction",["up","down","left","right"],trainer_data.facing);
			local_pause = true;
		}
	break;
	case "name_input":	
		if(text_recieve != -1){
			trainer_data.name = text_recieve;
			state = initial_entries?"class_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Trainer Name","string",trainer_data.name);
			local_pause = true;
		}
	break;
	case "class_input":	
		if(text_recieve != -1){
			trainer_data.class = text_recieve;
			state = initial_entries?"update":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Trainer Class","string",trainer_data.class);
			local_pause = true;
		}
	break;
	case "dialogue_start_input":	
		if(text_recieve != -1){
			trainer_data.dialogue_start = text_recieve;
			state = initial_entries?"update":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Pre-Battle Dialogue","string",trainer_data.dialogue_start);
			local_pause = true;
		}
	break;
	case "dialogue_end_input":	
		if(text_recieve != -1){
			trainer_data.dialogue_end = text_recieve;
			state = initial_entries?"update":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Post-Battle Dialogue","string",trainer_data.dialogue_end);
			local_pause = true;
		}
	break;
	case "sprite_input":	
		if(text_recieve != -1){
			state = initial_entries?"update":"update";
			text_recieve = -1;
		}
		else{
			my_input = instance_create_layer(0,0,"Instances",o_trainer_sprite_input);
			my_input.parent = id;
			local_pause = true;
		}
	break;
	case "update":
		initial_entries = false;
		state = "await";
		trainer_list[trainer_data.id] = trainer_data;
	break;
	case "ooch_input":
		if(!local_pause){
			state = "update";
		}
	break;
	
}

