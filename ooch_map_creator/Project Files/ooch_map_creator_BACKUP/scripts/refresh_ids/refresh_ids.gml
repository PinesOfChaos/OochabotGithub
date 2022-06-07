function refresh_ids(){
	for(var i = 0; i < array_length(chest_list); i++){
		chest_list[i].id = i;	
	}
	for(var i = 0; i < array_length(trainer_list); i++){
		trainer_list[i].id = i;	
	}
	for(var i = 0; i < array_length(npc_list); i++){
		npc_list[i].id = i;	
	}
}