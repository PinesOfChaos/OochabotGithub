text = keyboard_string;
if(type = "number"){
	text = string_digits(text);
}
if(keyboard_check_pressed(vk_enter)){
	if(keyboard_check(vk_shift)){
		keyboard_string += "\n"
	}
	else{
		var t = (type == "number")?real(text):text;
		with(parent){
			text_recieve = t;
			local_pause = false;
		}
		instance_destroy();
	}
}
else if(keyboard_check_pressed(vk_escape)){
	with(parent){
		text_recieve = other.prev_text;
		local_pause = false;
	}
	instance_destroy();
}