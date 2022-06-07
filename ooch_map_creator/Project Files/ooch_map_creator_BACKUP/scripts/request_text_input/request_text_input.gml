function request_text_input(title_display,string_or_number,previous_text){
	var inst = instance_create_layer(0,0,"Instances",o_text_input);
	with(inst){
		type = string_or_number;
		title = title_display;
		parent = other.id;
		prev_text = previous_text;
		keyboard_string = previous_text;
	}
	return(inst);
}