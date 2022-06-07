function save_map_file(name){ 
	//MAKE ALL IDS ACTUALLY START FROM 0
	refresh_ids();
	
	//MAP NAME
	var mapstr = name;
	mapstr+="|";
	
	//COPY THE SPAWN LIST
	var entry;
	for(var i = 0; i < array_length(spawn_list); i++){
		entry = spawn_list[i];
		mapstr+=(entry.id)
		if(i != array_length(spawn_list)-1){
			mapstr += ","
		}
	}
	mapstr+="|";
	
	//COPY THE TRAINER INFO
	var trainer, entry;
	for(var i = 0; i < array_length(trainer_list); i++){
		trainer = trainer_list[i];
		mapstr += string(trainer.id) + ",";
		mapstr += string(trainer.emote) + ",";
		mapstr += string(trainer.name) + ",";
		mapstr += string(trainer.class) + ",";
		for(var j = 0; j < array_length(trainer.party); j++){
			entry = trainer.party[j];
			mapstr += entry.id;
			if(j != array_length(trainer.party)-1){
				mapstr += ";"
			}
		}
		mapstr += ",0,"//ACTIVE SLOT, ALWAYS 0
		mapstr += string(trainer.facing);
		if(i != array_length(trainer_list)-1){
			mapstr += "#"
		}
	}
	mapstr+="|";
	
	//COPY TRAINER POSITIONS
	var trainer;
	for(var i = 0; i < array_length(trainer_list); i++){
		trainer = trainer_list[i];
		mapstr += string(trainer.id) + ",";
		mapstr += string(trainer.x) + ",";
		mapstr += string(trainer.y);
		if(i != array_length(trainer_list)-1){
			mapstr += " ";
		}
	}
	mapstr+="|";
	
	//COPY THE CHEST INFO
	var chest,item;
	for(var i = 0; i < array_length(chest_list); i++){
		chest = chest_list[i];
		mapstr += string(chest.id) + ",";
		mapstr += string(chest.emote) + ",";
		for(var j = 0; j < array_length(chest.contents); j++){
			item = chest.contents[j];
			mapstr += string(item.id);
			if(j != array_length(chest.contents)-1){
				mapstr += ";"
			}
		}
		if(i != array_length(chest_list)-1){
			mapstr += "#"
		}
	}
	mapstr+="|";
	
	//COPY THE CHEST POSITION INFO
	var chest;
	for(var i = 0; i < array_length(trainer_list); i++){
		chest = trainer_list[i];
		mapstr += string(chest.id) + ",";
		mapstr += string(chest.x) + ",";
		mapstr += string(chest.y);
		if(i != array_length(trainer_list)-1){
			mapstr += " ";
		}
	}
	mapstr+="|";
	
	//COPY THE TILE INFO
	var tile_info,collision_info;
	for(var i = 0; i < map_w; i++){
		for(var j = 0; j < map_h; j++){
			tile_info = map_array[i][j];
			collision_info = collision_array[i][j]
			
			mapstr += string(collision_info)+string(tile_info[1])
			
			if(j == map_h-1){
				mapstr += " "
			}
			else{
				mapstr += ","
			}
		}
	}
	mapstr = string_delete(mapstr,string_length(mapstr),1);
	var file_and_path = get_save_filename("map_data_file|*.txt", name);
	if(file_and_path!=""){
		var file = file_text_open_write(file_and_path)
		file_text_write_string(file, mapstr);
		file_text_close(file);
		notify("Map Saved")
	}
	
	mapstr+="|";
	
	//COPY THE NPC INFO
}