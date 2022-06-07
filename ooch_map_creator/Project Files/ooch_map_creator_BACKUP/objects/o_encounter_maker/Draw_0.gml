draw_sprite(trainer_data.sprite,0,trainer_data.x*tile_size,trainer_data.y*tile_size);
draw_sprite(tile_highlight,0,trainer_data.x*tile_size,trainer_data.y*tile_size);
draw_sprite_ext(s_facing_arrow,string_to_dir_sprite(trainer_data.facing),trainer_data.x*tile_size,trainer_data.y*tile_size,1,1,0,c_white,dsin(current_time/8)/4+.5);