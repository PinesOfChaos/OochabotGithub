draw_set_color(c_black);
draw_set_alpha(.75);
draw_rectangle(x-160,y,x+160,y+128,false);

draw_set_color(c_white);
draw_set_alpha(1);
draw_rectangle(x-160,y,x+160,y+128,true);
draw_rectangle(x-160,y+20,x+160,y+128,true);

draw_text(x-160,y,title + " [" + type + "]");

for(var i = 0; i < array_length(options); i++){
	draw_text(x-160,y+20+i*20,options[i]);
}

if(highlight!=-1){
	draw_rectangle(x-160,y+20+(highlight*20),x+160,y+20+((highlight+1)*20),true)
}