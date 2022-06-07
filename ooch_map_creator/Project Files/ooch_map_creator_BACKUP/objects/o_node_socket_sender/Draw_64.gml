var xoff = camera_get_view_x(view_camera[0]);
var yoff = camera_get_view_y(view_camera[0]);
var xx = x - xoff;
var yy = y - yoff;


draw_sprite(sprite_index,image_index,xx,yy);
switch(state){
	case "wait":
		if(connected_socket!=noone){
			draw_line(xx, yy, connected_socket.x - xoff, connected_socket.y - yoff);	
		}
	break;
	case "hold":
		draw_line(xx, yy, mouse_x - xoff, mouse_y - yoff);
	break;
	
}
