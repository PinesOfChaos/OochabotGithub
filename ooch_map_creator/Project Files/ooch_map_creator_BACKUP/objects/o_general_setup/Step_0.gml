if(local_pause){exit;}

if(keyboard_check_pressed(vk_escape)){
	instance_destroy();	
}

var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

switch(state){	
	case "await":
		if(mouse_check_button_pressed(mb_left)){
			if(point_in_rectangle(mgx,mgy,0,0,128,20)){
				state = "name_input";
			}
			else if(point_in_rectangle(mgx,mgy,0,20,128,40)){
				state = "width_input";
			}
			else if(point_in_rectangle(mgx,mgy,0,40,128,60)){
				state = "height_input";
			}
			else if(point_in_rectangle(mgx,mgy,0,60,128,80)){
				state = "spawn_x_input";
			}
			else if(point_in_rectangle(mgx,mgy,0,80,128,100)){
				state = "spawn_y_input";
			}
			else if(point_in_rectangle(mouse_x,mouse_y,spawnx*tile_size,spawny*tile_size,spawnx*tile_size+tile_size,spawny*tile_size+tile_size)){
				state = "drag_spawn";
			}
			else if(point_in_rectangle(mgx,mgy,0,100,128,132)){
				array_push(spawn_list,ooch_array[0]);	
			}
			else{
				for(var i = 0; i < array_length(spawn_list); i++){
					if(point_in_rectangle(mgx,mgy,0,tile_size+i*tile_size+100,128,tile_size*2+i*tile_size+100)){
						position_to_update = i;
						local_pause = true;
						with instance_create_layer(0,0,"Instances",o_ooch_input){
							parent = other.id;
						}
					}
					if(point_in_rectangle(mgx,mgy,128,tile_size+i*tile_size+100,128+16,tile_size+i*tile_size+16+100)){
						array_delete(spawn_list,i,1);	
					}
				}
			}
		}	
	break;
	case "name_input":
		if(text_recieve != -1){
			map_name = text_recieve;
			state = initial_entries?"y_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Map Name","string",map_name);
			local_pause = true;
		}
	break;
	case "spawn_x_input":
		if(text_recieve != -1){
			spawnx = (text_recieve < map_w) ? text_recieve : spawnx;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Spawn X","number",spawnx);
			local_pause = true;
		}
	break;
	case "spawn_y_input":
		if(text_recieve != -1){
			spawny = (text_recieve < map_h) ? text_recieve : spawnx;
			state = "update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Spawn Y","number",spawny);
			local_pause = true;
		}
	break;
	case "width_input":	
		if(text_recieve != -1){
			if(map_w != text_recieve && text_recieve!= 0){
				var map_temp = array_create(0);
				for(var i = 0; i < text_recieve; i++){
					for(var j = 0; j < map_h; j++){
						if(i < map_w && j < map_h){
							map_temp[i][j] = map_array[i][j];
						}
						else{
							map_temp[i][j] = tiles[7];
						}
					}
				}
				map_w = text_recieve;
				map_array = map_temp;
			}
			
			state = initial_entries?"y_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Map Width","number",map_w);
			local_pause = true;
		}
	break;
	case "height_input":	
		if(text_recieve != -1){
			if(map_h != text_recieve && text_recieve!= 0){
				var map_temp = array_create(0);
				for(var i = 0; i < map_w; i++){
					for(var j = 0; j < text_recieve; j++){
						if(i < map_w && j < map_h){
							map_temp[i][j] = map_array[i][j];
						}
						else{
							map_temp[i][j] = tiles[7];
						}
					}
				}
				map_h = text_recieve;
				map_array = map_temp;
			}
			
			state = initial_entries?"facing_input":"update";
			text_recieve = -1;
		}
		else{
			my_input = request_text_input("Map Height","number",map_h);
			local_pause = true;
		}
	break;
	case "update":
		initial_entries = false;
		state = "await";
	break;
	case "drag_spawn":
		if(mouse_check_button_released(mb_left)){
			state = "update";
		}
		else{
			spawnx = mouse_x div tile_size;
			spawny = mouse_y div tile_size;
		}
	break;
}

