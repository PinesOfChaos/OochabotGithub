var w = display_get_gui_width();
var h = display_get_gui_height();
var mgx = device_mouse_x_to_gui(0);
var mgy = device_mouse_y_to_gui(0);

text = keyboard_string;
if(type = "number"){
	text = string_digits(text);
}

highlight = -1;
for(var i = 0; i < array_length(options); i++){
	if(point_in_rectangle(mgx,mgy,x-160,y+20+(i*20),x+160,y+20+((i+1)*20))){
		highlight = i;	
	}
}
if(mouse_check_button_pressed(mb_left)&&highlight!=-1){
	var selected = options[highlight]
	with(parent){
		text_recieve = selected;
		local_pause = false;
	}
	instance_destroy();
}
else if(keyboard_check_pressed(vk_escape)){
	with(parent){
		text_recieve = other.prev_text;
		local_pause = false;
	}
	instance_destroy();
}