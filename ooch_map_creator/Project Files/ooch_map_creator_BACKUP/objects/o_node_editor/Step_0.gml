if(local_pause){exit;}

switch(state){
	case "load":
		if(node_string != ""){
			var info = string_split(node_string,"~");
			var offset = 0;
			var group_size = 6;
			var nodes_to_make = array_length(info) div group_size;
			var id_pairs = [];
			
			for(var i = 0; i < nodes_to_make; i++){
				id_pairs[i][0] = info[i*group_size];
				id_pairs[i][1] = instance_create_depth(info[i*group_size+1],info[i*group_size+2],-1000,o_node);
			}
			
			for(var i = 0; i < array_length(id_pairs); i++){
				offset = i*group_size;
				
				//0+offset is unused, this is the old id
				x =					real(info[1+offset]);
				y =					real(info[2+offset]);
				var txt =			info[3+offset]; //text
				var cnt =			info[4+offset]; //content
				var opt =			info[5+offset]; //options
				
				var cnt_arr = string_split(cnt,"#");
				var temp_opt_arr = string_split(opt,"#");
				var opt_arr = [];
				for(var j = 0; j < array_length(temp_opt_arr); j+=2){
					opt_arr[j/2][0] = temp_opt_arr[j];	//id to connect to
					opt_arr[j/2][1] = temp_opt_arr[j+1];//string
				}
				show_debug_message("Temp" + string(temp_opt_arr))
				show_debug_message("Done" + string(opt_arr))
				
				with(id_pairs[i][1]){
					if(i == 0){
						is_first = true;
						show_debug_message("FIRST!")
					}
					temp_id = id_pairs[i][0]
					text = txt;
					content = cnt_arr;
					
					end_action = ["options",[]];
					
					for(var j = 0; j < array_length(opt_arr); j++){ //create sockets for each option
						show_debug_message("option_socket_created")
						var opt_connect = node_find_id_match(id_pairs, opt_arr[j][0]) //old string id => real id
						var sock = instance_create_depth(x + 203, y + 118 + j *20,depth-1,o_node_socket_sender);
						with(sock){
							show_debug_message(["Socket Made @", x, y])
							parent_node = other.id;
							socket_parent_find = opt_connect;
						}		
						
						var arr = [];
						
						arr[0] = 0;
						arr[1] = opt_arr[j][1];
						arr[2] = sock;
					
						array_push(end_action[1], arr)
						
						
					}
					
					show_debug_message(end_action)
				}
			}
			//show_debug_message(info);
		}
		state = "ready";
	break;
	case "ready":
		var do_exit = false;
		with(o_node){
			if(state == "active"){do_exit = true;}
		}
		if(do_exit){exit;}

		if(keyboard_check_pressed(ord("1"))){ //Create a new node
			with(o_node){
				state = "await";
			}
			with instance_create_depth(last_node_x+64,last_node_y+64,-1000,o_node){
				state = "active";
			}
			local_pause = true;
		}
		if(keyboard_check_pressed(ord("2"))){
			var str = "";
			var id_find = -1;
			var nodes_check = [];
			with(o_node_start){
				id_find = id;	
			}
			with(o_node_socket_sender){
				if(parent_node == id_find){
					with(connected_socket){
						array_push(nodes_check, parent_node);	
					}
				}
			}
			var node_current;
			var delim1 = "~"
			while (array_length(nodes_check) > 0){
				node_current = nodes_check[0];
				with(node_current){
					str += string(id) + delim1;
					str += string(x) + delim1;
					str += string(y) + delim1;
					str += text + delim1;
					str += content[0];
					switch(content[0]){ //NONE, BATTLE, ITEM, OOCHAMON, CURRENCY
						case "none":
				
						break;
						case "battle":
							str += "#";
							//str += string(content[1])
						break;
						case "item":
							str += "#";
							str += string(content[1]) + "#"
							str += string(content[2])
						break;
						case "oochamon":
							str += "#";
							str += string(content[1]) + "#"
							str += string(content[2])
						break;
						case "currency":
							str += "#";
							str += string(content[1])
						break;
					} 
					str+= delim1;
					for(var i = 0; i < array_length(end_action[1]); i++){
						with(end_action[1][i][end_info.socket]){
							with(connected_socket){
								array_push(nodes_check, parent_node);
								str += string(parent_node);
							}
						}
						str += "#" + end_action[1][i][end_info.str];
				
						str += "#";
					}
					str+= delim1;
			
				}
				array_delete(nodes_check,0,1);
			}
			show_debug_message(str);
			with(o_npc_maker){
				text_recieve = str;
				local_pause = false;
			}
			with(o_node){
				instance_destroy();	
			}
			with(o_node_start){
				instance_destroy();	
			}
			instance_destroy();
		}
	break;
}
