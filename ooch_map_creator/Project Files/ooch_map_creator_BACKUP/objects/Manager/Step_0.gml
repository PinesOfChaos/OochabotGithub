tile_mouse_x = mouse_x div tile_size;
tile_mouse_y = mouse_y div tile_size;

tile_mouse_x = (tile_mouse_x >= 0 && tile_mouse_x < map_w) ? tile_mouse_x:-1;
tile_mouse_y = (tile_mouse_y >= 0 && tile_mouse_y < map_h) ? tile_mouse_y:-1;

if(notification_fade > 0){
	notification_fade -= .01;
}

if(local_pause){exit;}

var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);
var w_half = w/2;
var wheel = mouse_wheel_down()-mouse_wheel_up()

if(mouse_check_button(mb_middle)&&!instance_exists(o_node_editor)){
	var cx = camera_get_view_x(camera);
	var cy = camera_get_view_y(camera)
	camera_set_view_pos(camera, cx+mouse_prevx-mgx, cy+mouse_prevy-mgy);
}
mouse_prevx = mgx;
mouse_prevy = mgy;

if(keyboard_check(vk_control)){
	if(instance_exists(o_map_creator)){
		with(o_map_creator){
			draw_size = clamp(draw_size-wheel,1,9)	
		}
	}
}
else if(wheel != 0){
	//zoom += wheel/4;
	var mx = mouse_x;
	var my = mouse_y;
	var cx = (mx-camera_get_view_x(camera))/zoom;
	var cy = (my-camera_get_view_y(camera))/zoom;
		
	if(wheel > 0){
		zoom*=sqrt(2);	
	}
	else{
		zoom/=sqrt(2);	
	}
	
	camera_set_view_size(camera,960*zoom,540*zoom);
	camera_set_view_pos(camera,mx-cx*zoom,my-cy*zoom)
}

var destroy_instances = false;
if(mouse_check_button_pressed(mb_left)){
	if(point_in_rectangle(mgx,mgy,w_half-192,0,w_half-192+tile_size,tile_size)){
		state = "map";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half-160,0,w_half-160+tile_size,tile_size)){
		state = "collisions";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half-96,0,w_half-96+tile_size,tile_size)){
		state = "npc";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half-64,0,w_half-64+tile_size,tile_size)){
		state = "encounter";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half-32,0,w_half-32+tile_size,tile_size)){
		state = "encounter_select";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half+32,0,w_half+32+tile_size,tile_size)){
		state = "chest";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half+64,0,w_half+64+tile_size,tile_size)){
		state = "chest_select";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w_half+128,0,w_half+128+tile_size,tile_size)){
		state = "general_info";
		destroy_instances = true;
	}
	if(point_in_rectangle(mgx,mgy,w-tile_size,0,w,tile_size)){
		save_map_file(map_name);
	}
}

if(destroy_instances){
	instance_destroy(o_map_creator);
	instance_destroy(o_spawn_list_creator);
	instance_destroy(o_encounter_maker);
	instance_destroy(o_encounter_selector);
	instance_destroy(o_chest_maker);
	instance_destroy(o_chest_selector);
	instance_destroy(o_general_setup);
	instance_destroy(o_collision_creator);
	instance_destroy(o_npc_maker);
}

if(keyboard_check_pressed(vk_escape)){state = "idle"}
switch(state){
	case "map":
		if(!instance_exists(my_mapper)){
			my_mapper = instance_create_layer(0,0,"Instances",o_map_creator);
		}
	break;
	case "collisions":
		if(!instance_exists(my_spawns)){
			my_spawns = instance_create_layer(0,0,"Instances",o_collision_creator);
		}
	break;
	case "encounter":
		if(!instance_exists(my_encounter)){
			my_encounter = instance_create_layer(0,0,"Instances",o_encounter_maker);
		}
	break;
	case "npc":
		if(!instance_exists(my_npc)){
			my_npc = instance_create_layer(0,0,"Instances",o_npc_maker);
		}
	break;
	case "encounter_select":
		if(!instance_exists(my_encounter)){
			my_encounter = instance_create_layer(0,0,"Instances",o_encounter_selector);
		}
	break;
	case "chest":
		if(!instance_exists(my_chest)){
			my_chest = instance_create_layer(0,0,"Instances",o_chest_maker);
		}
	break;
	case "chest_select":
		if(!instance_exists(my_chest)){
			my_chest = instance_create_layer(0,0,"Instances",o_chest_selector);
		}
	break;
	case "general_info":
		if(!instance_exists(my_general)){
			my_general = instance_create_layer(0,0,"Instances",o_general_setup);
		}
	break;
	
}