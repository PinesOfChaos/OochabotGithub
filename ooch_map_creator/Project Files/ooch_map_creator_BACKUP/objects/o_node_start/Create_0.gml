image_xscale = 2;
image_yscale = .875;
with instance_create_depth(x+sprite_width-2,y+15,depth-1,o_node_socket_sender){
	parent_node = other.id;
}
