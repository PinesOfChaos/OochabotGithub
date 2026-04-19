extends Control

@onready var fd_save = $FileDialogSave
@onready var fd_load = $FileDialogLoad
@onready var tileset = TileSet.new()
@onready var grid_ooch = $GridOoch
@onready var grid_tiles = $TileSelect
@onready var val_button = preload("res://ValueButton.gd")
@onready var v_box_menu = $VBoxMenu
@onready var tooltips_paint = $TooltipsPaint
@onready var h_slider_grid_alpha = $VBoxMenu/HBoxMapInfo/HSliderGridAlpha
@onready var timer = $Timer
@onready var line_edit_map_name = $VBoxMenu/HBoxFile/LineEditMapName
@onready var line_edit_map_battle_back = $VBoxMenu/HBoxMapInfo/LineEditMapBattleBack

@onready var o_menu = $"."
@onready var menu_children = $MenuChildren
@onready var menu_events = $MenuChildren/events
@onready var menu_spawnzones = $MenuChildren/spawn_zones
@onready var menu_transitions = $MenuChildren/transitions
@onready var menu_save_points = $MenuChildren/save_points
@onready var menu_shops = $MenuChildren/shops
@onready var menu_npcs = $MenuChildren/npcs
@onready var menu_weather: Control = $MenuChildren/weather_zones

@onready var label_notification: Label = $LabelNotification
@onready var label_mouse_position: Label = $LabelMousePosition

@export var map_name = ""
@export var map_battle_bg = ""
@export var map_width = 64
@export var map_height = 64
@export var map_tiles = []
var mouse_x_prev = 0
var mouse_y_prev = 0
@export var cam_x = 0
@export var cam_y = 0
var highlightbox_tex = null
@export var grid_alpha = .1
@export var loaded = false
var do_screen_refresh = true
var file_known = false
var file_last_path = ""
var post_ready_complete = false
var tiles_visible = true

# Called when the node enters the scene tree for the first time.
func _ready():
	line_edit_map_name.text = map_name
	line_edit_map_battle_back.text = map_battle_bg
	
	
	fd_save.current_dir = Global.WorkingDir
	fd_load.current_dir = Global.WorkingDir
	
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
	
	#Map Setup
	#Get tile t00_000
	var tile_id_temp = 0
	for k in Global.DataTiles.size():
		if Global.DataTiles[k].tile_index == "t00_000":
			tile_id_temp = k
			break
	#Set all tile ids to the black square
	for i in 100:
		var arr = []
		arr.resize(100)
		arr.fill(tile_id_temp)
		map_tiles.push_back(arr)
	#print(map_tiles)
	
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if not post_ready_complete:
		post_ready_complete = true
		line_edit_map_name.text = map_name
		line_edit_map_battle_back.text = map_battle_bg
	
	step()	
	step_end()		
			
func _draw():
	if(tiles_visible):
		var x1 = 0
		var y1 = 0
		for i in map_width:
			for j in map_height:
				x1 = i * Global.TileSize
				y1 = j * Global.TileSize
				if x1 >= Global.CamX - 64 and x1 < Global.CamX + 10000 and y1 >= Global.CamY - 64 and y1 < Global.CamY + 10000:
					draw_texture(Global.DataTiles[map_tiles[i][j]].tile_texture, Vector2((x1) - Global.CamX, (y1) - Global.CamY))
					draw_texture(highlightbox_tex, Vector2((x1) - Global.CamX, (y1) - Global.CamY), Color(1,1,1,grid_alpha))

func refresh_all_children():
	for child in o_menu.get_children(true):
		child.owner = o_menu

func step_begin():
	pass

func step():
	#Update tile position of the mouse
	if Input.is_action_pressed("show_coord"):
		var tx = floor((get_local_mouse_position().x + Global.CamX)/Global.TileSize)
		var ty = floor((get_local_mouse_position().y + Global.CamY)/Global.TileSize)
		label_mouse_position.text = str(tx) + ", " + str(ty)
		label_mouse_position.modulate.a = .4
		label_mouse_position.position = get_local_mouse_position() + Vector2(32, 16)
	else:
		label_mouse_position.text = ''
	
	
	#Update the Z-Index of objects
	if typeof(Global.ObjSelected) == TYPE_INT:
		if(Global.ObjSelected != Global.ObjSelectedPrev):
			if((Global.ObjSelectedPrev != -1) and (instance_from_id(Global.ObjSelectedPrev) != null)):
				instance_from_id(Global.ObjSelectedPrev).z_index = 0
			Global.ObjSelectedPrev = Global.ObjSelected
		elif(Global.ObjSelected != -1):
			instance_from_id(Global.ObjSelected).z_index = 10
		
	
	#Redraw the map if the camera is moved
	if Input.is_action_pressed("mouse_middle") or do_screen_refresh:
		do_screen_refresh = false
		Global.CamX -= get_local_mouse_position().x - mouse_x_prev
		Global.CamY -= get_local_mouse_position().y - mouse_y_prev
		
		var cx
		var cy
		for child in menu_npcs.get_children():
			cx = child.npc_data.x * Global.TileSize - Global.CamX
			cy = child.npc_data.y * Global.TileSize - Global.CamY
			child.o_npc_object.set_position(Vector2(cx, cy))
		
		for child in menu_shops.get_children():
			cx = child.shop_data.x * Global.TileSize - Global.CamX
			cy = child.shop_data.y * Global.TileSize - Global.CamY
			child.o_shop_object.set_position(Vector2(cx, cy))
			
		for child in menu_transitions.get_children():
			cx = child.transition_data.x * Global.TileSize - Global.CamX
			cy = child.transition_data.y * Global.TileSize - Global.CamY
			child.o_transition_object.set_position(Vector2(cx, cy))
			
		for child in menu_save_points.get_children():
			cx = child.savepoint_data.x * Global.TileSize - Global.CamX
			cy = child.savepoint_data.y * Global.TileSize - Global.CamY
			child.o_savepoint_object.set_position(Vector2(cx, cy))
			
		for child in menu_spawnzones.get_children():
			var bbox = child.bounding_box
			var x1 = bbox.pos_x * Global.TileSize
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
		for child in menu_weather.get_children():
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
			if Input.is_action_just_pressed("quick_paint"):
				_on_button_map_brush_pressed()
			if Input.is_action_just_pressed("quick_event"):
				_on_button_new_event_pressed()
			if Input.is_action_just_pressed("quick_spawn"):
				_on_button_new_spawn_region_pressed()
			if Input.is_action_just_pressed("quick_transition"):
				_on_button_new_transition_button_down()
			if Input.is_action_just_pressed("quick_savepoint"):
				_on_button_new_save_point_button_down()
			if Input.is_action_just_pressed("quick_shop"):
				_on_button_new_shop_button_down()
			if Input.is_action_just_pressed("quick_npc"):
				_on_button_new_npc_button_down()
				
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
			if typeof(Global.TileSelected) == TYPE_STRING:
				Global.TileSelected = 0
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
	
	if(Input.is_action_just_pressed("quicksave")):
		print("quicksaving")
		if(file_known) and not (file_last_path == ""):
			_on_file_dialog_save_file_selected(file_last_path)
		else:
			_on_button_save_pressed()
	
func map_reset():
	map_tiles = []
	for i in map_width:
		map_tiles.push_back([])
		for j in map_height:
			map_tiles[i].push_back([])
			map_tiles[i][j] = 0


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
#region SAVE
func _on_file_dialog_save_file_selected(path):
	var save_json = FileAccess.open(path, FileAccess.WRITE)
	
	# set the owner of every single node to the menu
	set_node_owners_to_menu()
	
	if FileAccess.file_exists(path):
		label_notification.notify("File Saved")
		Global.WorkingDir = path.left(path.rfindn("/"))+"/"
		print(path.left(path.rfindn("/")))
		
		var config = ConfigFile.new()
		config.set_value("Preferences", "DataPath", Global.DataPath)
		config.set_value("Preferences", "WorkingDir", Global.WorkingDir)
		config.save("user://oochabot_config.cfg")
		
		file_known = true
		file_last_path = path
		
		#Save the .TXT file to be loaded into Oochabot
		var save_data = {
			"map_info" : {
				"map_name" : line_edit_map_name.text,
				"map_battleback" : line_edit_map_battle_back.text,
				"map_generated" : false,
			},
			"map_tiles" : [],
			"map_npcs" : [],
			"map_spawn_zones" : [],
			"map_savepoints" : [],
			"map_shops" : [],
			"map_events" : [],
			"map_transitions" : [],
			"map_weather" : []
		}
		
		#Map Tiles
		for i in map_width:
			#print(i)
			save_data.map_tiles.push_back([])
			#save_data.map_tiles[i] = []
			
			for j in map_height:
				var tile_info = Global.DataTiles[map_tiles[i][j]]
				var tile_name = tile_info.tile_index
				save_data.map_tiles[i].push_back(tile_name)
				#save_data.map_tiles[i][j].push_back(tile_name)
		
		#NPCs
		for npc in menu_npcs.get_children():
			var npc_data = npc.npc_data
			npc_data.team = []
			var slots = [npc.slot_1, npc.slot_2, npc.slot_3, npc.slot_4]
			for slot in slots:
				slot.slot_data.moveset = slot.slot_data.moveset.filter(func(number):return number != 9999)
				
				if slot.slot_data.slot_enabled:
					npc_data.team.push_back(slot.slot_data)
			
			npc_data.items = []
			for child in npc.items_list.get_children():
				var item = {
					"id" : child.item_id,
					"count" : child.item_count
				}
				npc_data.items.push_back(item)		
			
			save_data.map_npcs.push_back(npc_data)
			
		#Spawn Zones
		var bbox
		for spawn in menu_spawnzones.get_children():	
			bbox = spawn.bounding_box
			
			var spawn_data = {
				"x" : bbox.pos_x,
				"y" : bbox.pos_y,
				"width" : bbox.scale_x,
				"height" : bbox.scale_y,
				"spawn_slots" : []
			}
			
			for slot in spawn.spawn_slots.get_children():
				if slot.species != -1:
					spawn_data.spawn_slots.push_back(slot.spawn_slot_data)
			save_data.map_spawn_zones.push_back(spawn_data)
			
					
		#Save Points
		for savepoint in menu_save_points.get_children():
			save_data.map_savepoints.push_back(savepoint.savepoint_data)
			
			
		#Shops
		for shop in menu_shops.get_children():
			var shop_data = shop.shop_data.duplicate()
			shop_data.special_items = []
			for child in shop.o_shop_special_items.get_children():
				shop_data.special_items.push_back({
					"id" : child.item_id,
					"price" : child.item_price
				})
			
			save_data.map_shops.push_back(shop_data)
			
		#Events
		for ev in menu_events.get_children():
			var ev_data = ev.event_info
			bbox = ev.bounding_box
			
			ev_data.x = bbox.pos_x
			ev_data.y = bbox.pos_y
			ev_data.width = bbox.scale_x
			ev_data.height = bbox.scale_y
				
			save_data.map_events.push_back(ev_data)
			
		#Weather
		for ev in menu_weather.get_children():
			var ev_data = ev.weather_info
			bbox = ev.bounding_box
			
			ev_data.x = bbox.pos_x
			ev_data.y = bbox.pos_y
			ev_data.width = bbox.scale_x
			ev_data.height = bbox.scale_y
				
			save_data.map_weather.push_back(ev_data)
		
		#Transitions
		for transition in menu_transitions.get_children():
			var transition_data = transition.transition_data 
			
			save_data.map_transitions.push_back(transition_data)
			
		
		#Put the save string into the save file
		save_json.store_line(JSON.stringify(save_data,"\t"))
		
		print("FILE SAVED")
	else:
		print("FILE SAVE FAILED")
		
#endregion 

# Load map data
#region LOAD
func _on_file_dialog_load_file_selected(path):
	
	if(FileAccess.file_exists(path)):
		
		var f = FileAccess.open(path, FileAccess.READ)
		Global.WorkingDir = path.left(path.rfindn("/"))+"/"
		var _text = f.get_as_text(true)
		var _json = JSON.parse_string(_text)
		
		#Modernize the map data
		_json.merge({
			"map_tiles" : [],
			"map_npcs" : [],
			"map_spawn_zones" : [],
			"map_savepoints" : [],
			"map_shops" : [],
			"map_events" : [],
			"map_transitions" : [],
			"map_weather" : []
		})
		
		var _main = get_parent()
		var _menu = load("res://menu.tscn")
		var _inst = _menu.instantiate()
		
		#Map General Info
		_inst.map_name = _json.map_info.map_name
		_inst.map_battle_bg = _json.map_info.map_battleback
		
		_main.add_child(_inst)
		_inst.owner = _main
		_inst.file_known = true
		_inst.file_last_path = path
		_inst.label_notification.notify("File Loaded")
		
		
		var _events = _inst.menu_events
		var _spawnzones = _inst.menu_spawnzones
		var _transitions = _inst.menu_transitions
		var _save_points = _inst.menu_save_points
		var _shops = _inst.menu_shops
		var _npcs = _inst.menu_npcs
		var _weather = _inst.menu_weather
		
		
		
		
		#Tiles
		var _tiles = _json.map_tiles
		for i in _tiles.size():
			for j in _tiles[i].size():
				for k in Global.DataTiles.size():
					if(Global.DataTiles[k].tile_index == _tiles[i][j]):
						_inst.map_tiles[i][j] = k
		
		
		#NPCs
		for _info in _json.map_npcs:
			var _load = load("res://npc.tscn")
			var _obj = _load.instantiate()
			
			for mon in _info.team:
				while mon.moveset.size() < 4:
					mon.moveset.push_back(9999)
			
			_obj.npc_data = _info
			
			_npcs.add_child(_obj)
			_obj.owner = _npcs
			
		#spawn_zones
		for _info in _json.map_spawn_zones:
			var _load = load("res://spawn_zone.tscn")
			var _obj = _load.instantiate()

			# add data to the object
			_obj.spawn_data = _info
			
			#assign new object as a child of the relevant menu part
			_spawnzones.add_child(_obj)
			_obj.owner = _spawnzones
		
		for _info in _json.map_savepoints:
			# create a new object
			var _load = load("res://savepoint.tscn")
			var _obj = _load.instantiate()

			# add data to the object
			_obj.savepoint_data = _info
			
			#assign new object as a child of the relevant menu part
			_save_points.add_child(_obj)
			_obj.owner = _save_points
		
		for _info in _json.map_shops:
			# create a new object
			var _load = load("res://shop.tscn")
			var _obj = _load.instantiate()

			# add data to the object
			_obj.shop_data = _info
			
			#assign new object as a child of the relevant menu part
			_shops.add_child(_obj)
			_obj.owner = _shops		
							
		for _info in _json.map_events:
			var _load = load("res://event_trigger.tscn")
			var _obj = _load.instantiate()
		
			# add data to the object
			_obj.event_info = _info
			
			#assign new object as a child of the relevant menu part
			_events.add_child(_obj)
			_obj.owner = _events
					
		for _info in _json.map_weather:
			var _load = load("res://weather_zone.tscn")
			var _obj = _load.instantiate()
		
			# add data to the object
			_obj.weather_info = _info
			
			#assign new object as a child of the relevant menu part
			_weather.add_child(_obj)
			_obj.owner = _weather
					
		for _info in _json.map_transitions:
			var _load = load("res://transition.tscn")
			var _obj = _load.instantiate()
		
			# add data to the object
			_obj.transition_data = _info
			
			#assign new object as a child of the relevant menu part
			_transitions.add_child(_obj)
			_obj.owner = _transitions
		
		_inst.do_screen_refresh = true
		self.queue_free()
		print("FILE LOADED")
		return
		
#endregion

# Open the Save File Dialog
func _on_button_save_pressed():
	fd_save.visible = true

# Open the Load File Dialog
func _on_button_load_pressed():
	fd_load.visible = true
	
# Clear the map
func _on_button_new_pressed():
	map_width = 64
	map_height = 64
	file_known = false
	file_last_path = ""
	
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

func _on_button_new_chest_button_down() -> void:
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://npc.tscn")
	var instance = scene.instantiate()
	instance.npc_data = {
		"name" : "Chest",
		"sprite_id" : "c00_013",
		"pre_combat_dialogue" : "You opened the chest...",
		"remove_on_finish" : true
	}
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
	instance.spawn_data.x = floor(Global.CamX/Global.TileSize) + 20
	instance.spawn_data.y = floor(Global.CamY/Global.TileSize) + 10
	menu_spawnzones.add_child(instance)
	Global.ObjSelected = menu_spawnzones.get_child(menu_spawnzones.get_child_count() - 1).get_instance_id()
	
	refresh_all_children()
	do_screen_refresh = true
	
func _on_button_new_event_pressed():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://event_trigger.tscn")
	var instance = scene.instantiate()
	instance.event_info.x = floor(Global.CamX/Global.TileSize) + 20
	instance.event_info.y = floor(Global.CamY/Global.TileSize) + 10
	menu_events.add_child(instance)
	Global.ObjSelected = menu_events.get_child(menu_events.get_child_count() - 1).get_instance_id()

	refresh_all_children()
	do_screen_refresh = true
	
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

func _on_timer_timeout():
	if(file_known) and not(file_last_path == ""):
		print("Autosave: " + file_last_path)
		_on_file_dialog_save_file_selected(file_last_path)
	else:
		print("Save the file to enable autosave")

func _on_button_visible_tile_toggled(toggled_on: bool) -> void:
	tiles_visible = toggled_on
	queue_redraw()


func _on_button_main_menu_pressed() -> void:
	if(file_known) and not(file_last_path == ""):
		print("File Saved as: " + file_last_path)
		_on_file_dialog_save_file_selected(file_last_path)
	else:
		print("Save the file to enable autosave")
		
	get_tree().change_scene_to_file("res://main_menu.tscn")
	queue_free()
	


func _on_line_edit_map_name_text_changed(new_text: String) -> void:
	map_name = new_text


func _on_line_edit_map_battle_back_text_changed(new_text: String) -> void:
	map_battle_bg = new_text


func _on_button_visible_weather_toggled(toggled_on: bool) -> void:
	menu_weather.visible = toggled_on


func _on_button_new_weather_pressed() -> void:
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://weather_zone.tscn")
	var instance = scene.instantiate()
	instance.weather_info.x = floor(Global.CamX/Global.TileSize) + 20
	instance.weather_info.y = floor(Global.CamY/Global.TileSize) + 10
	menu_weather.add_child(instance)
	Global.ObjSelected = menu_weather.get_child(menu_weather.get_child_count() - 1).get_instance_id()

	refresh_all_children()
	do_screen_refresh = true


func _on_button_new_sign_button_down() -> void:
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://npc.tscn")
	var instance = scene.instantiate()
	instance.npc_data = {
		"name" : "Sign",
		"sprite_id" : "c00_020",
		"pre_combat_dialogue" : "↖↗↘↙←→↑↓",
		"flag_given" : "read_a_sign"
	}
	menu_npcs.add_child(instance)
	Global.ObjSelected = menu_npcs.get_child(menu_npcs.get_child_count() - 1).get_instance_id()
	instance.owner = o_menu
	refresh_all_children()
