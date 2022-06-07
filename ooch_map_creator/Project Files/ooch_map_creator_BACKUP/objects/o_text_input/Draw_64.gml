draw_set_color(c_black);
draw_set_alpha(.75);
draw_rectangle(x-160,y,x+160,y+128,false);

draw_set_color(c_white);
draw_set_alpha(1);
draw_rectangle(x-160,y,x+160,y+128,true);
draw_rectangle(x-160,y+20,x+160,y+128,true);

draw_text(x-160,y,title + " [" + type + "]");
draw_text_ext(x-160,y+20,text+((dsin(current_time/2)>0)?"":"_"),20,320);