//literally only ever used in the node editor loading
function node_find_id_match(array, id_to_pair){
	for(var i = 0; i < array_length(array); i++){
		if(array[i][0] == id_to_pair){
			return(array[i][1]);	
		}
	}
	return(noone);
}