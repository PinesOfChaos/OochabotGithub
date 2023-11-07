extends Control

@onready var fd_save = $FileDialogSave
@onready var fd_load = $FileDialogLoad
@onready var fd_path = $FileDialogSetFilePaths
@onready var tileset = TileSet.new()
@onready var grid_ooch = $GridOoch
@onready var grid_tiles = $GridTiles
@onready var val_button = preload("res://ValueButton.gd")
@onready var v_box_menu = $VBoxMenu
@onready var tooltips_paint = $TooltipsPaint
@onready var menu_children = $MenuChildren
@onready var menu_npcs = $MenuChildren/npcs

var map_name = "testmap"
var map_width = 128
var map_height = 128
var map_tiles = [[]]
var mouse_x_prev = 0
var mouse_y_prev = 0
var cam_x = 0
var cam_y = 0

# Called when the node enters the scene tree for the first time.
func _ready():
	load_preferences()
	map_reset()
	
	fd_save.current_dir = Global.WorkingDir
	fd_load.current_dir = Global.WorkingDir
	fd_path.current_dir = Global.DataPath
	if Global.DataPath != "":
		refresh_data()


	#Data variables
	var path
	var dir
	var file_num
	var file_name
	var box_child
	var image
	var err
	
	#Load Oochamon Data
	var ooch_id;
	
	path = "res://oochamon/"
	dir = DirAccess.open(path)
	dir.list_dir_begin()
	
	file_num;
	file_name = dir.get_next()
	while file_name != "":
		if !file_name.begins_with("."):
			file_num = int(file_name.split(".")[0])
			for i in Global.DataOochamon.size():
				ooch_id = Global.DataOochamon[i].ooch_index
				if ooch_id == file_num:
					image = Image.new()
					err = image.load(path + file_name)
					if !err:
						Global.DataOochamon[i].ooch_sprite = load(path + file_name)	
						Global.DataOochamon[i].ooch_texture = Global.DataOochamon[i].ooch_sprite

						
						box_child = val_button.new()
						box_child.value = i
						box_child.set_texture_normal(Global.DataOochamon[i].ooch_sprite)
						box_child.tooltip_text = "[" + ("00" + str(ooch_id)).right(3) + "] " + Global.DataOochamon[i].ooch_name
						grid_ooch.add_child(box_child)
					
		file_name = dir.get_next()
	dir.list_dir_end()
	
	#Load Oochamon Data
	var tile_id;
	
	path = "res://tiles/"
	dir = DirAccess.open(path)
	dir.list_dir_begin()
	
	file_num;
	file_name = dir.get_next()
	while file_name != "":
		if !file_name.begins_with("."):
			file_num = int(file_name.split(".")[0])
			for i in Global.DataTiles.size():
				tile_id = Global.DataTiles[i].tile_index
				if tile_id == file_num:
					image = Image.new()
					err = image.load(path + file_name)
					if !err:
						Global.DataTiles[i].tile_sprite = load(path + file_name)
						
						
						Global.DataTiles[i].tile_texture = ImageTexture.new()
						Global.DataTiles[i].tile_texture.create_from_image(Global.DataTiles[i].tile_sprite)
						box_child = val_button.new()
						box_child.value = i
						box_child.set_texture_normal(Global.DataTiles[i].tile_sprite)
						box_child.tooltip_text = Global.DataTiles[i].tile_emote
						grid_tiles.add_child(box_child)
					
		file_name = dir.get_next()
	dir.list_dir_end()
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	step()	
	step_end()		
				
func _draw():
	if grid_tiles.get_child_count() == 0:
		return
	for i in map_width:
		for j in map_height:
			draw_texture(grid_tiles.get_child(map_tiles[i][j]).get_texture_normal(), Vector2((i * 32) - Global.CamX, (j * 32) - Global.CamY))

func step_begin():
	pass

func step():
	if Input.is_action_pressed("mouse_middle"):
			Global.CamX -= get_local_mouse_position().x - mouse_x_prev
			Global.CamY -= get_local_mouse_position().y - mouse_y_prev
			
			var cx
			var cy
			for child in menu_npcs.get_children():
				cx = child.npc_x * Global.TileSize - Global.CamX
				cy = child.npc_y * Global.TileSize - Global.CamY
				child.o_npc_object.set_position(Vector2(cx, cy))
			
			queue_redraw()
	
	match Global.CurrentMapMode:
		Global.MapMode.MAP_NONE:
			v_box_menu.visible = true
		Global.MapMode.MAP_OBJ_EDIT:
			if Input.is_action_just_pressed("ui_cancel"):
				Global.CurrentMapMode = Global.MapMode.MAP_NONE
				Global.ObjSelected = -1
			else:
				v_box_menu.visible = false
		Global.MapMode.MAP_PAINT_BRUSH_SELECT:
			v_box_menu.visible = false
			if Global.TileSelected != -1:
				Global.CurrentMapMode = Global.MapMode.MAP_PAINT_BRUSH_SELECT_WAIT
			elif Input.is_action_just_pressed("ui_cancel"):
				Global.CurrentMapMode = Global.MapMode.MAP_NONE
				grid_tiles.visible = false
		Global.MapMode.MAP_PAINT_BRUSH_SELECT_WAIT:
			if !Input.is_action_pressed("mouse_left"):
				Global.CurrentMapMode = Global.MapMode.MAP_PAINT
		Global.MapMode.MAP_PAINT:
			tooltips_paint.visible = true
			var xx = floor((get_local_mouse_position().x + Global.CamX)/Global.TileSize)
			var yy = floor((get_local_mouse_position().y + Global.CamY)/Global.TileSize)
			if Input.is_action_pressed("mouse_left"):
				if Input.is_action_pressed("vk_control"):
					var from = map_tiles[xx][yy]
					var list = [[xx, yy]]
					var cx
					var cy
					while list.size() > 0:
						#Left Side
						cx = list[0][0] - 1
						cy = list[0][1]
						if cx >= 0 and map_tiles[cx][cy] == from and map_tiles[cx][cy] != Global.TileSelected:
							map_tiles[cx][cy] = Global.TileSelected
							list.push_back([cx, cy])
						
						#Right Side
						cx = list[0][0] + 1
						cy = list[0][1]
						if cx < map_width and map_tiles[cx][cy] == from and map_tiles[cx][cy] != Global.TileSelected:
							map_tiles[cx][cy] = Global.TileSelected
							list.push_back([cx, cy])
						
						#Top Side
						cx = list[0][0]
						cy = list[0][1] - 1
						if cy >= 0 and map_tiles[cx][cy] == from and map_tiles[cx][cy] != Global.TileSelected:
							map_tiles[cx][cy] = Global.TileSelected
							list.push_back([cx, cy])
						
						#Right Side
						cx = list[0][0]
						cy = list[0][1] + 1
						if cy < map_height and map_tiles[cx][cy] == from and map_tiles[cx][cy] != Global.TileSelected:
							map_tiles[cx][cy] = Global.TileSelected
							list.push_back([cx, cy])
						
						list.remove_at(0)
				else:
					map_tiles[xx][yy] = Global.TileSelected
				queue_redraw()
			elif Input.is_action_pressed("mouse_right"):
				if Input.is_action_pressed("vk_control"):
					Global.TileSelected = map_tiles[xx][yy]
				else:
					map_tiles[xx][yy] = 0
				queue_redraw()		
			elif Input.is_action_just_pressed("ui_cancel"):
				Global.TileSelected = -1
				Global.CurrentMapMode = Global.MapMode.MAP_PAINT_BRUSH_SELECT
				grid_tiles.visible = true
				tooltips_paint.visible = false

func step_end():
	mouse_x_prev = get_local_mouse_position().x
	mouse_y_prev = get_local_mouse_position().y
	
func map_reset():
	map_tiles.clear()
	var subarr = []
	subarr.resize(map_height)
	subarr.fill(0)
	map_tiles.resize(map_width)
	for i in map_height:
		map_tiles[i] = subarr.duplicate()
		

#Load  default filepaths and values
func load_preferences():
	var config = ConfigFile.new()
	var err = config.load("user://oochabot_config.cfg")
	if err != OK:
		return
	else:
		Global.DataPath = config.get_value("Preferences", "DataPath", "/")
		Global.WorkingDir = config.get_value("Preferences", "WorkingDir", "/")
		
#Save default filepaths and values
func save_preferences():
	var config = ConfigFile.new()
	config.set_value("Preferences", "DataPath", Global.DataPath)
	config.set_value("Preferences", "WorkingDir", Global.WorkingDir)
	
	config.save("user://oochabot_config.cfg")

#Used to download sprite_textures
func download_texture(url : String, file_name : String):
	var http = HTTPRequest.new()
	add_child(http)
	http.set_download_file(file_name)
	http.request(url)

#Set the working directory for saving/loading
func set_working_dir(path):
	Global.WorkingDir = path
	fd_save.current_dir = Global.WorkingDir
	fd_load.current_dir = Global.WorkingDir

# Save map data
func _on_file_dialog_save_file_selected(path):
	var save_file = FileAccess.open(path, FileAccess.WRITE)
	if FileAccess.file_exists(path):
		set_working_dir(path)
		save_preferences()
		print("FILE SAVED")
	else:
		print("FILE SAVE FAILED")
	
# Load map data
func _on_file_dialog_load_file_selected(path):
	var load_file = FileAccess.open(path, FileAccess.READ)
	if FileAccess.file_exists(path):
		set_working_dir(path)
		save_preferences()
		print("FILE LOADED")
	else:
		print("FILE LOAD FAILED")

func _on_file_dialog_set_file_paths_dir_selected(dir):
	var data_path = DirAccess.open(dir)
	
	if DirAccess.dir_exists_absolute(dir):
		Global.DataPath = dir
		save_preferences()
		print("DATA FILEPATH SET")
	else:
		print("DATA FILEPATH SET FAILED")

# Open the Save File Dialog
func _on_button_save_pressed():
	fd_save.visible = true

# Open the Load File Dialog
func _on_button_load_pressed():
	fd_load.visible = true

# Open the Filepath Setter
func _on_button_set_filepaths_pressed():
	fd_path.visible = true
	
# Clear the map
func _on_button_new_pressed():
	pass # Replace with function body.

func _on_button_refresh_data_pressed():
	refresh_data()

func refresh_data():
	Global.DataAbilities = []
	Global.DataItems = []
	Global.DataMoves = []
	Global.DataOochamon = []
	Global.DataTiles = []
	var ln
	var lnsplit
	
	#Abilities
	var f_abilities = FileAccess.open(Global.DataPath + "/abilities_data.txt", FileAccess.READ)
	if FileAccess.get_open_error():
		return
	
	ln = f_abilities.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		Global.DataAbilities.push_back({
			ability_index = int(lnsplit[0]),
			ability_name = lnsplit[1],
			ability_desc = lnsplit[2],
		})
		ln = f_abilities.get_line()
	#print(Global.DataAbilities)
	
	#Items
	var f_items = FileAccess.open(Global.DataPath + "/items_data.txt", FileAccess.READ)
	ln = f_items.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		Global.DataItems.push_back({
			item_index = int(lnsplit[0]),
			item_name = lnsplit[1],
			item_emote = lnsplit[2],
			item_inv = lnsplit[3],
			item_type = lnsplit[4],
			item_power = float(lnsplit[5]),
			item_desc = lnsplit[6],
		})
		ln = f_items.get_line()
	#print(Global.DataItems)
	
	#Moves
	var f_moves = FileAccess.open(Global.DataPath + "/moves_data.txt", FileAccess.READ)
	ln = f_moves.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		Global.DataMoves.push_back({
			move_index = int(lnsplit[0]),
			move_name = lnsplit[1],
			move_element = lnsplit[2],
			move_power = int(lnsplit[3]),
			move_acc = int(lnsplit[4]),
			move_status = lnsplit[5],
			move_chance = int(lnsplit[6]),
			move_desc = lnsplit[7],
		})
		ln = f_moves.get_line()
	#print(Global.DataMoves)
	
	#Oochamon
	var f_oochamon = FileAccess.open(Global.DataPath + "/ooch_data.txt", FileAccess.READ)
	ln = f_oochamon.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		var moves_list = lnsplit[10].split(",")
		var len = moves_list.size()
		var moves_arr = []
		var mv_lv
		var mv_id
		for i in moves_list.size()/2:
			mv_lv = int(moves_list[(i * 2)])
			mv_id = int(moves_list[(i * 2) + 1])
			moves_arr.push_back({
				move_level = mv_lv,
				move_index = mv_id
			})
			
		var abi_list = lnsplit[11].split(",")
		var abi_arr = []
		
		for i in abi_list.size():
			abi_arr.push_back(int(abi_list[i]))
		
		var index = lnsplit[0]
		var emote = lnsplit[1].split(":")[2]
		emote = emote.replace(">","")
		download_texture("https://cdn.discordapp.com/emojis/" + emote + ".png","oochamon/" + ("00" + index).right(3) + ".png")
		
		Global.DataOochamon.push_back({
			ooch_index = int(lnsplit[0]),
			ooch_emote = lnsplit[1],
			ooch_link_image = lnsplit[2],
			ooch_name = lnsplit[3],
			ooch_desc = lnsplit[4],
			ooch_element = lnsplit[5],
			ooch_hp = int(lnsplit[6]),
			ooch_atk = int(lnsplit[7]),
			ooch_def = int(lnsplit[8]),
			ooch_spd = int(lnsplit[9]),
			ooch_moves = moves_arr,
			ooch_ability = abi_arr,
			ooch_evo_to = int(lnsplit[12]),
			ooch_evo_lv = int(lnsplit[13]),
			ooch_sprite = -1,
			ooch_texture = -1
		})
		ln = f_oochamon.get_line()
	#print(Global.DataTiles)
	
	#Tiles
	var f_tiles = FileAccess.open(Global.DataPath + "/tiles_data.txt", FileAccess.READ)
	ln = f_tiles.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		
		var index = lnsplit[0]
		var emote = lnsplit[2].split(":")[2]
		emote = emote.replace(">","")
		download_texture("https://cdn.discordapp.com/emojis/" + emote + ".png","tiles/" + ("00" + index).right(3) + ".png")
		
		Global.DataTiles.push_back({
			tile_index = int(lnsplit[0]),
			tile_use = lnsplit[1],
			tile_emote = lnsplit[2],
			tile_emote_detailed = lnsplit[2],
			tile_sprite = -1,
			tile_texture = -1
		})
		ln = f_tiles.get_line()
	
func _on_button_map_brush_pressed():
	Global.TileSelected = -1
	Global.CurrentMapMode = Global.MapMode.MAP_PAINT_BRUSH_SELECT
	grid_tiles.visible = true

func _on_button_new_npc_button_down():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://npc.tscn")
	var instance = scene.instantiate()
	menu_npcs.add_child(instance)
	Global.ObjSelected = menu_npcs.get_child(menu_npcs.get_child_count() - 1).get_instance_id()
	instance.dragging = true
