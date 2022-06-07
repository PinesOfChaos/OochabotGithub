//Draw Map
for(var i = 0; i < map_w; i++){
	for(var j = 0; j < map_h; j++){
		if(map_array[i][j] != -1){
			draw_sprite(map_array[i][j][0],0,i*tile_size,j*tile_size);
		}
	}
}

//Draw Trainers
var obj;
for(var i = 0; i < array_length(trainer_list); i++){
	obj = trainer_list[i];
	draw_sprite(obj.sprite,0,obj.x*tile_size,obj.y*tile_size);
	draw_sprite_ext(s_facing_arrow,string_to_dir_sprite(obj.facing),obj.x*tile_size,obj.y*tile_size,1,1,0,c_white,dsin(current_time/4)/2+.5);
}

//Draw NPCs
var obj;
for(var i = 0; i < array_length(npc_list); i++){
	obj = npc_list[i];
	draw_sprite(obj.sprite,0,obj.x*tile_size,obj.y*tile_size);
}

//Draw Chests
var chest;
for(var i = 0; i < array_length(chest_list); i++){
	chest = chest_list[i];
	draw_sprite(chest.sprite,0,chest.x*tile_size,chest.y*tile_size);
}

//Draw Spawn Point
draw_sprite_ext(s_spawn_point,0,spawnx*tile_size,spawny*tile_size,1,1,0,c_white,dsin(current_time/4)/4+.5);