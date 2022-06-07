var dw = ((array_length(items_list)-1) mod 10)*tile_size+x+tile_size;
var dh = ((array_length(items_list)-1) div 10)*tile_size+y+tile_size;

draw_set_alpha(.8);
draw_rectangle_color(x-tile_size*5,y,dw,dh,c_black,c_black,c_black,c_black,false);
draw_set_alpha(1);

for(var i = 0; i < array_length(items_list); i++){
	var entry = items_list[i];
	draw_sprite(entry.sprite, 0, (i mod 10)*tile_size+x-tile_size*5, (i div 10)*tile_size+y);	
}

if(hover != -1){
	draw_sprite(tile_highlight, 0, (hover mod 10)*tile_size+x-tile_size*5, (hover div 10)*tile_size+y)
}