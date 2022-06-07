function string_split(text, delimiter){
	var slot = 0;
	var splits = []; 
	var str2 = ""; 
	var i, str_current;
	for (i = 1; i < (string_length(text)+1); i++) {
	    str_current = string_copy(text, i, 1);
	    if (str_current == delimiter) {
	        splits[slot] = str2; //add this split to the array of all splits
	        slot++;
	        str2 = "";
	    } else {
	        str2 = str2 + str_current;
	        splits[slot] = str2;
	    }
	}
	return(splits);
}