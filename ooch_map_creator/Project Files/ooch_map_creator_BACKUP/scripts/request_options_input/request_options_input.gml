function request_options_input(title_display,options_array,previous_option){
	var inst = instance_create_layer(0,0,"Instances",o_options_input);
	with(inst){
		title = title_display;
		options = options_array;
		parent = other.id;
		prev_text = previous_option;
		keyboard_string = "";
	}
	return(inst);
}