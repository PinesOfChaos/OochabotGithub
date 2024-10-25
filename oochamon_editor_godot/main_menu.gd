extends Control
@onready var fd_path: FileDialog = $FileDialogSetFilePaths

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	load_preferences()
	
	
	if Global.DataPath != "/":
		Global.WorkingDir = Global.DataPath
		fd_path.current_dir = Global.DataPath
		refresh_data()
		
		#Load Event Data
		var path = Global.DataPath.split("Maps")[0] + "global_events.json"
		print(path)
		var f = FileAccess.open(path, FileAccess.READ)
		print(f)
		var _text = f.get_as_text(true)
		Global.DataEvents = JSON.parse_string(_text)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_file_dialog_set_file_paths_dir_selected(dir):
	var data_path = DirAccess.open(dir)
	
	if DirAccess.dir_exists_absolute(dir):
		Global.DataPath = dir
		save_preferences()
		print("DATA FILEPATH SET")
	else:
		print("DATA FILEPATH SET FAILED")

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

#Set the working directory for saving/loading
func set_working_dir(path):
	print(path)
	Global.WorkingDir = path

func _on_button_map_editor_pressed() -> void:
	get_tree().change_scene_to_file("res://level_editor.tscn")

func _on_button_event_editor_pressed() -> void:
	get_tree().change_scene_to_file("res://event_editor.tscn")

#Used to download sprite_textures
func download_texture(url : String, file_name : String):
	var http = HTTPRequest.new()
	add_child(http)
	http.set_download_file(file_name)
	http.request(url)

func refresh_data():
	Global.DataAbilities = []
	Global.DataItems = []
	Global.DataMoves = []
	Global.DataOochamon = []
	Global.DataTiles = []
	
	var ln
	var lnsplit
	var data_location = Global.DataPath.split("Maps")[0] + "/editor_data"
	
	#Abilities
	var f_abilities = FileAccess.open(data_location + "/abilities_data.txt", FileAccess.READ)
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
	
	#Items
	var f_items = FileAccess.open(data_location + "/items_data.txt", FileAccess.READ)
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
	
	#Moves
	var f_moves = FileAccess.open(data_location + "/moves_data.txt", FileAccess.READ)
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
	
	#Oochamon
	var f_oochamon = FileAccess.open(data_location + "/ooch_data.txt", FileAccess.READ)
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
			ooch_element = lnsplit[5].split(","),
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
	var f_tiles = FileAccess.open(data_location + "/tiles_data.txt", FileAccess.READ)
	ln = f_tiles.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		
		var index = lnsplit[1].split(":")[1]
		var emote = lnsplit[1].split(":")[2]
		emote = emote.replace(">","")
		
		download_texture("https://cdn.discordapp.com/emojis/" + emote + ".png","tiles/" + index + ".png")
		
		Global.DataTiles.push_back({
			tile_index = index,
			tile_emote = lnsplit[1],
			tile_emote_detailed = lnsplit[1],
			tile_sprite = -1,
			tile_texture = -1
		})
		ln = f_tiles.get_line()
		
		
	#NPCs
	var f_npcs = FileAccess.open(data_location + "/npc_data.txt", FileAccess.READ)
	ln = f_npcs.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		
		var index = lnsplit[1].split(":")[1]
		var emote = lnsplit[1].split(":")[2]
		emote = emote.replace(">","")
		
		download_texture("https://cdn.discordapp.com/emojis/" + emote + ".png","npcs/" + index + ".png")
		
		Global.DataNPCs.push_back({
			tile_index = index,
			tile_emote = lnsplit[1],
			tile_emote_detailed = lnsplit[1],
			tile_sprite = -1,
			tile_texture = -1
		})
		ln = f_npcs.get_line()
		
	
	#Load Oochamon Data
	var ooch_id;
	
	var path = "res://oochamon/"
	var dir = DirAccess.open(path)
	dir.list_dir_begin()
	
	var file_num;
	var file_name = dir.get_next()
	while file_name != "":
		if !file_name.begins_with("."):
			file_num = int(file_name.split(".")[0])
			for i in Global.DataOochamon.size():
				ooch_id = Global.DataOochamon[i].ooch_index
				if ooch_id == file_num:
					var image = Image.new()
					var err = image.load(path + file_name)
					if !err:
						Global.DataOochamon[i].ooch_sprite = load(path + file_name)	
						Global.DataOochamon[i].ooch_texture = Global.DataOochamon[i].ooch_sprite			
		file_name = dir.get_next()
	dir.list_dir_end()


func _on_button_set_file_paths_pressed() -> void:
	fd_path.visible = true
