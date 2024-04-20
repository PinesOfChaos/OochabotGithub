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
@onready var h_slider_grid_alpha = $VBoxMenu/HBoxMapInfo/HSliderGridAlpha
@onready var timer = $Timer

@onready var o_menu = $"."
@onready var menu_children = $MenuChildren
@onready var menu_events = $MenuChildren/events
@onready var menu_spawnzones = $MenuChildren/spawn_zones
@onready var menu_transitions = $MenuChildren/transitions
@onready var menu_save_points = $MenuChildren/save_points
@onready var menu_shops = $MenuChildren/shops
@onready var menu_npcs = $MenuChildren/npcs

@export var map_name = "testmap"
@export var map_width = 64
@export var map_height = 64
@export var map_tiles = [[]]
@export var map_battleback = ""
var mouse_x_prev = 0
var mouse_y_prev = 0
@export var cam_x = 0
@export var cam_y = 0
var highlightbox_tex = null
@export var grid_alpha = .1
@export var loaded = false

# Called when the node enters the scene tree for the first time.
func _ready():
	if(loaded):
		return
	
	loaded = true
	load_preferences()
	map_reset()
	
	fd_save.current_dir = Global.WorkingDir
	fd_load.current_dir = Global.WorkingDir
	fd_path.current_dir = Global.DataPath
	if Global.DataPath != "":
		refresh_data()
	
	var box_img = Image.load_from_file("res://editor_assets/box_highlight1.png")
	highlightbox_tex = ImageTexture.create_from_image(box_img)

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
	var tx_box = load("res://editor_assets/box_highlight1.png")
	var x1 = 0
	var y1 = 0
	for i in map_width:
		for j in map_height:
			x1 = i * Global.TileSize
			y1 = j * Global.TileSize
			if x1 >= Global.CamX - 64 and x1 < Global.CamX + 2000 and y1 >= Global.CamY - 64 and y1 < Global.CamY + 1200:
				draw_texture(grid_tiles.get_child(map_tiles[i][j]).get_texture_normal(), Vector2((x1) - Global.CamX, (y1) - Global.CamY))
				draw_texture(highlightbox_tex, Vector2((x1) - Global.CamX, (y1) - Global.CamY), Color(1,1,1,grid_alpha))

func refresh_all_children():
	for child in o_menu.get_children(true):
		child.owner = o_menu

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
		
		for child in menu_shops.get_children():
			cx = child.shop_x * Global.TileSize - Global.CamX
			cy = child.shop_y * Global.TileSize - Global.CamY
			child.o_shop_object.set_position(Vector2(cx, cy))
			
		for child in menu_transitions.get_children():
			cx = child.transition_x * Global.TileSize - Global.CamX
			cy = child.transition_y * Global.TileSize - Global.CamY
			child.o_transition_object.set_position(Vector2(cx, cy))
			
		for child in menu_save_points.get_children():
			cx = child.savepoint_x * Global.TileSize - Global.CamX
			cy = child.savepoint_y * Global.TileSize - Global.CamY
			child.o_savepoint_object.set_position(Vector2(cx, cy))
			
		for child in menu_spawnzones.get_children():
			var bbox = child.bounding_box
			var x1 =bbox.pos_x * Global.TileSize
			var y1 = bbox.pos_y * Global.TileSize
			bbox.reset_box(
				x1, 
				y1, 
				x1 + bbox.scale_x * Global.TileSize,
				y1 + bbox.scale_y * Global.TileSize
			)
		for child in menu_events.get_children():
			var bbox = child.bounding_box
			var x1 =bbox.pos_x * Global.TileSize
			var y1 = bbox.pos_y * Global.TileSize
			bbox.reset_box(
				x1, 
				y1, 
				x1 + bbox.scale_x * Global.TileSize,
				y1 + bbox.scale_y * Global.TileSize
			)
		
		queue_redraw()
	
	match Global.CurrentMapMode:
		Global.MapMode.MAP_NONE:
			v_box_menu.visible = true
		Global.MapMode.MAP_OBJ_EDIT:
			if Input.is_action_just_pressed("ui_cancel"):
				Global.CurrentMapMode = Global.MapMode.MAP_NONE
				Global.ObjSelected = -1
			elif Input.is_action_just_pressed("ui_text_delete"):
				instance_from_id(Global.ObjSelected).queue_free()
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
					if(xx < map_width and yy < map_height):
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
	map_tiles = []
	for i in map_width:
		map_tiles.push_back([])
		for j in map_height:
			map_tiles[i].push_back([])
			map_tiles[i][j] = 0

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

func set_node_owners_to_menu():
	for n in o_menu.get_children():
		n.owner = o_menu
		set_node_owners(n)

func set_node_owners(node):
	for n in node.get_children():
		n.owner = o_menu
		if n.get_child_count() > 0:
			set_node_owners(n)

# Save map data
func _on_file_dialog_save_file_selected(path):
	var save_file = FileAccess.open(path + ".txt", FileAccess.WRITE)
	
	# set the owner of every single node to the menu
	set_node_owners_to_menu()
	
	if FileAccess.file_exists(path + ".txt"):
		set_working_dir(path)
		save_preferences()
		
		#Save the .TXT file to be loaded into Oochabot
		var save_str = ""
		var temp_str = ""
		
		#General Map Info
		save_str += "#map_info" + "\n"
		save_str += map_name + "\n"
		save_str += map_battleback + "\n"
		
		#Map Tiles
		save_str += "#tiles" + "\n"
		for i in map_width:
			for j in map_height:
				save_str += str(map_tiles[i][j]) + "|"
			save_str += "\n"
		
		#NPCs
		save_str += "#npcs" + "\n"
		for npc in menu_npcs.get_children():
			temp_str = ""
			temp_str += npc.npc_name + "|"
			temp_str += str(npc.npc_x) + "|"
			temp_str += str(npc.npc_y) + "|"
			
			temp_str += str(0) + "|" #NPC Beaten, this is no-longer used
			temp_str += str(npc.npc_sprite) + "|"
			temp_str += npc.npc_sprite_combat + "|"
			
			temp_str += str(npc.npc_coin) + "|"
			temp_str += str(npc.npc_item_id) + "|"
			temp_str += str(npc.npc_item_number) + "|"
			
			temp_str += npc.npc_flag_required + "|"
			temp_str += npc.npc_flag_given + "|"
			temp_str += npc.npc_flag_kill + "|"
			temp_str += str(1 if npc.npc_remove_on_finish else 0) + "|"
			
			temp_str += npc.npc_dialog_pre.replace("\n", "`") + "|"
			temp_str += npc.npc_dialog_post.replace("\n", "`") + "|"
			
			var slots = [npc.slot_1, npc.slot_2, npc.slot_3, npc.slot_4]
			for slot in slots:
				if slot.slot_enabled:
					temp_str += str(slot.slot_species) + "`"
					temp_str += slot.slot_nickname + "`"
					temp_str += str(slot.slot_ability) + "`"
					temp_str += str(slot.slot_level) + "`"
					
					temp_str += str(slot.slot_move1) + "`"
					temp_str += str(slot.slot_move2) + "`"
					temp_str += str(slot.slot_move3) + "`"
					temp_str += str(slot.slot_move4) + "`"
					
					temp_str += str(slot.slot_hp) + "`"
					temp_str += str(slot.slot_atk) + "`"
					temp_str += str(slot.slot_def) + "`"
					temp_str += str(slot.slot_spd) + "`"
				temp_str += "|"
			save_str += temp_str + "\n"
			
		
		#Spawn Zones
		save_str += "#spawn_zones" + "\n"
		var bbox
		for spawn in menu_spawnzones.get_children():	
			bbox = spawn.bounding_box
			save_str += str(bbox.pos_x) + "|"
			save_str += str(bbox.pos_y) + "|"
			save_str += str(bbox.scale_x) + "|"
			save_str += str(bbox.scale_y) + "|"
			for slot in spawn.spawn_slots.get_children():
				if slot.species != -1:
					save_str += str(slot.species) + "`"
					save_str += str(slot.lv_min) + "`"
					save_str += str(slot.lv_max) + "`"
					save_str += "|"
			save_str += "\n"
					
		#Save Points
		save_str += "#savepoints" + "\n"
		for savepoint in menu_save_points.get_children():
			save_str += str(1 if savepoint.savepoint_initial else 0) + "|"
			save_str += str(savepoint.savepoint_x) + "|"
			save_str += str(savepoint.savepoint_y) + "|"
			save_str += "\n"
			
		#Shops
		save_str += "#shops" + "\n"
		for shop in menu_shops.get_children():
			var shop_specials = ""
			for child in shop.o_shop_special_items.get_children():
				shop_specials += str(child.item_id) + "`" + str(child.item_price) + "`"
			
			save_str += str(shop.shop_x) + "|"
			save_str += str(shop.shop_y) + "|"
			save_str += str(shop.shop_type) + "|"
			save_str += shop_specials + "|"
			save_str += shop.shop_image + "|"
			save_str += shop.shop_greeting + "|"
			save_str += "\n"
			
		#Events
		save_str += "#events" + "\n"
		for ev in menu_events.get_children():
			bbox = ev.bounding_box
			save_str += str(bbox.pos_x) + "|"
			save_str += str(bbox.pos_y) + "|"
			save_str += str(bbox.scale_x) + "|"
			save_str += str(bbox.scale_y) + "|"
			save_str += ev.event_name + "|"
			save_str += ev.event_required + "|"
			save_str += ev.event_kill + "|"
			save_str += "\n"
			
		#Transitions
		save_str += "#transitions"
		for transition in menu_transitions.get_children():
			save_str += str(transition.transition_x) + "|"
			save_str += str(transition.transition_y) + "|"
			save_str += transition.transition_map_to + "|"
			save_str += str(transition.transition_xto) + "|"
			save_str += str(transition.transition_yto) + "|"
			save_str += "\n"
		
		#Put the save string into the save file
		save_file.store_string(save_str)

		#Save the .TSCN file to be reloaded into Godot
		fd_save.visible = false
		var packed_scene = PackedScene.new()
		var packed_path = path + ".tscn"
		packed_scene.pack(get_tree().get_current_scene())
		ResourceSaver.save(packed_scene, packed_path)
		
		print("FILE SAVED")
	else:
		print("FILE SAVE FAILED")
	
# Load map data
func _on_file_dialog_load_file_selected(path):
	var load_file = FileAccess.open(path, FileAccess.READ)
	if FileAccess.file_exists(path):
		set_working_dir(path)
		save_preferences()
		
		print(path)
		get_tree().change_scene_to_file(path)
		
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
	map_width = 64
	map_height = 64
	map_reset()
	for child in menu_npcs.get_children():
		child.queue_free()
	for child in menu_shops.get_children():
		child.queue_free()
	for child in menu_events.get_children():
		child.queue_free()
	for child in menu_transitions.get_children():
		child.queue_free()
	for child in menu_save_points.get_children():
		child.queue_free()
	for child in menu_spawnzones.get_children():
		child.queue_free()
	queue_redraw()

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
	instance.owner = o_menu
	refresh_all_children()
	
func _on_button_new_transition_button_down():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://transition.tscn")
	var instance = scene.instantiate()
	menu_transitions.add_child(instance)
	Global.ObjSelected = menu_transitions.get_child(menu_transitions.get_child_count() - 1).get_instance_id()
	instance.dragging = true
	refresh_all_children()
	
func _on_button_new_save_point_button_down():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://savepoint.tscn")
	var instance = scene.instantiate()
	menu_save_points.add_child(instance)
	Global.ObjSelected = menu_save_points.get_child(menu_save_points.get_child_count() - 1).get_instance_id()
	instance.dragging = true
	refresh_all_children()

func _on_button_new_shop_button_down():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://shop.tscn")
	var instance = scene.instantiate()
	menu_shops.add_child(instance)
	Global.ObjSelected = menu_shops.get_child(menu_shops.get_child_count() - 1).get_instance_id()
	instance.dragging = true
	refresh_all_children()
	
func _on_button_new_spawn_region_pressed():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://spawn_zone.tscn")
	var instance = scene.instantiate()
	menu_spawnzones.add_child(instance)
	Global.ObjSelected = menu_spawnzones.get_child(menu_spawnzones.get_child_count() - 1).get_instance_id()
	var x1 = Global.get_camera_center().x
	var y1 = Global.get_camera_center().y
	instance.bounding_box.set_position(Vector2(x1, y1))
	refresh_all_children()
	
func _on_button_new_event_pressed():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://event_trigger.tscn")
	var instance = scene.instantiate()
	menu_events.add_child(instance)
	Global.ObjSelected = menu_events.get_child(menu_events.get_child_count() - 1).get_instance_id()
	var x1 = Global.get_camera_center().x
	var y1 = Global.get_camera_center().y
	instance.bounding_box.set_position(Vector2(x1, y1))
	refresh_all_children()
	
func _on_button_visible_event_toggled(button_pressed):
	menu_events.visible = button_pressed

func _on_button_visible_spawnzone_toggled(button_pressed):
	menu_spawnzones.visible = button_pressed

func _on_button_visible_transition_toggled(button_pressed):
	menu_transitions.visible = button_pressed

func _on_button_visible_save_point_toggled(button_pressed):
	menu_save_points.visible = button_pressed

func _on_button_visible_shop_toggled(button_pressed):
	menu_shops.visible = button_pressed

func _on_button_visible_npc_toggled(button_pressed):
	menu_npcs.visible = button_pressed

func _on_h_slider_grid_alpha_value_changed(value):
	grid_alpha = value/100
	queue_redraw()

func _on_spin_box_map_w_value_changed(value):
	var prev_w = map_width
	var prev_h = map_height
	map_width = value
	resize_map(prev_w, prev_h)
	
func _on_spin_box_map_h_value_changed(value):
	var prev_w = map_width
	var prev_h = map_height
	map_height = value
	resize_map(prev_w, prev_h)

func resize_map(prev_w, prev_h):
	var new_map_tiles = []
	for i in map_width:
		new_map_tiles.push_back([])
		for j in map_height:
			new_map_tiles[i].push_back([])
			if i >= prev_w or j >= prev_h:
				new_map_tiles[i][j] = 0
			else:
				new_map_tiles[i][j] = map_tiles[i][j]
				
	map_tiles = new_map_tiles
	
	queue_redraw()
	
func _on_line_edit_map_name_text_changed(new_text):
	map_name = new_text

func _on_timer_timeout():
	timer.start(300)
	print("Autosave")
	pass # Replace with function body.
