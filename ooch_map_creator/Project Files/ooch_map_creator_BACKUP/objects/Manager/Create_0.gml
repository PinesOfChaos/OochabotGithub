camera  = view_camera[0];
camera_set_view_mat(camera, matrix_build_lookat(0,0,-1000,0,0,0,0,1,0));
camera_set_proj_mat(camera, matrix_build_projection_ortho(960,540,0,2000))
camera_apply(camera);
camera_set_view_pos(camera,-480,-270)

mouse_prevx = 0;
mouse_prevy = 0;

zoom = 1;

state = "general_info";
my_mapper = noone;
my_spawns = noone;
my_encounter = noone;
my_chest = noone;
my_general = noone;
my_npc = noone;

local_pause = false;

for(var i = 0; i < map_w; i++){
	for(var j = 0; j < map_h; j++){
		map_array[i][j] = tiles[7]; //use hub blocked tile by default
		collision_array[i][j] = FLOOR;
	}
}

notification = "";
notification_fade = 0;