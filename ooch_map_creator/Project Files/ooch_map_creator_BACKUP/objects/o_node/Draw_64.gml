var b = 8;

var xx = x+b-camera_get_view_x(view_camera[0]);
var yy = y+b-camera_get_view_y(view_camera[0]);
draw_sprite_ext(sprite_index,image_index,xx-b,yy-b,image_xscale,image_yscale,0,c_white,1);
draw_text(xx,yy,"ID: [" +string(id) +"]");
	
//TEXT
var t = "Text: ";
var c = 1;
while((string_width(t+string_char_at(text,c)) < 160) && (string_height(t+string_char_at(text,c)) < 20) && (c<=string_length(text))){
	t += string_char_at(text,c);
	c++;
}
if(string_width("Text: " + text) >= 160){
	t+="...";
}
else if(string_height("Text: " + text) >= 20){
	t = string_replace(t, "\n", "");
	t+="...";
}
	
draw_text(xx,yy+20,t);
	
//CONTENT
draw_text(xx,yy+40,"Content: " + string(content[0]));
switch(content[0]){
	case "none":
		draw_text(xx,yy+60,"  n/a");
	break;
	case "battle":
		draw_text(xx,yy+60,"");
	break;
	case "item":
		draw_sprite_ext(items_list[content[1]].sprite,0,xx,yy+60,.5,.5,0,c_white,1);
		draw_text(xx + 20,yy+60,"x"+string(content[2]));
	break;
	case "oochamon":
		draw_sprite_ext(ooch_array[content[1]].sprite,0,xx,yy+60,.5,.5,0,c_white,1);
		draw_text(xx + 20,yy+60,"Lv."+string(content[2]));
	break;
	case "currency":
		draw_text(xx,yy+60,"  Oochabux: " + string(content[1]));
	break;
		
}
	
//END ACTION
draw_text(xx,yy+80,"Options: (~ to Continue)");

var len = array_length(end_action[1])
for(var j = 0; j < len; j++){
	draw_text(xx,yy+100+j*20,string(j) + ": " + end_action[1][j][1] + " =>");
	draw_sprite(s_ui_remove_small,0,xx-16,yy+100+j*20)
}
draw_sprite(s_ui_add_small,0,xx-16,yy+100+j*20)

