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
	Global.DataOochamon = {}
	Global.DataTiles = []
	Global.DataNPCs = []
	
	var ln
	var lnsplit
	var data_location = Global.DataPath.split("Maps")[0] + "/editor_data"
	
	#Abilities
	var _f_abilities = FileAccess.open(data_location + "/abilities_data.json", FileAccess.READ)
	var _text_abilities = _f_abilities.get_as_text()
	var _data_abilities = JSON.parse_string(_text_abilities)
	
	for ability in _data_abilities:
		Global.DataAbilities.push_back({
			ability_index = ability.id,
			ability_name = ability.name,
			ability_desc = ability.description	
		})
	
	#Items
	var _f_items = FileAccess.open(data_location + "/items_data.json", FileAccess.READ)
	var _text_items = _f_items.get_as_text()
	var _data_items = JSON.parse_string(_text_items)
	
	for item in _data_items:
		Global.DataItems.push_back({
			item_index = item.id,
			item_name = item.name,
			item_emote = item.emote,
			item_inv = item.category,
			item_type = item.type,
			item_power = item.potency,
			item_desc = item.description,
		})
	
	#Moves
	var _f_moves = FileAccess.open(data_location + "/moves_data.json", FileAccess.READ)
	var _text_moves = _f_moves.get_as_text()
	var _data_moves = JSON.parse_string(_text_moves)
	
	for move in _data_moves:
		Global.DataMoves.push_back({
			move_index = move.id,
			move_name = move.name,
			move_element = move.type,
			move_power = move.damage,
			move_acc = move.accuracy,
			move_status = move.effect,
			move_desc = move.description,
			move_tags = move.tags
		})
	
	#Oochamon
	var _f_oochamon = FileAccess.open(data_location + "/ooch_data.json", FileAccess.READ)
	var _text_oochamon = _f_oochamon.get_as_text()
	var _data_oochamon = JSON.parse_string(_text_oochamon)
	
	for i in _data_oochamon.size():
		var _mon = _data_oochamon[i]
		
		#Create move list
		var moves_arr = []
		for _move in _mon.move_list:
			moves_arr.push_back({
				move_level = _move[0],
				move_index = _move[1]
			})
		
		var mon_id =  _mon.id
		if(mon_id < 0):
			mon_id = 10_000 + abs(_mon.id)
		
		#Download related image
		var emoji_id = _mon.emote.split(":")[2].replace(">","")
		var link = "https://cdn.discordapp.com/emojis/" + emoji_id + ".png?size=32&quality=lossless"
		var png_short = str(int(mon_id))
		var png_name = "oochamon/" + ("00" + str(int(mon_id))).right(3) + ".png"
		if(png_short.length() > 4):
			png_name = "oochamon/" + png_short + ".png"
		download_texture(link, png_name)
		#print(png_name)
		
		var key = str(int(mon_id))
		print([mon_id, _mon.id])
		Global.DataOochamon[key] =  {
			ooch_index = _mon.id,
			ooch_emote = _mon.emote,
			ooch_link_image = link,
			ooch_name = _mon.name,
			ooch_desc = _mon.oochive_entry,
			ooch_element = _mon.type,
			ooch_hp = _mon.hp,
			ooch_atk = _mon.atk,
			ooch_def = _mon.def,
			ooch_spd = _mon.spd,
			ooch_moves = moves_arr,
			ooch_ability = _mon.abilities,
			ooch_evo_to = _mon.evo_id,
			ooch_evo_lv = _mon.evo_lvl,
			ooch_sprite = -1,
			ooch_texture = -1
		}
		
		print(Global.DataOochamon[key].ooch_index)
	
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
			for key in Global.DataOochamon:
				ooch_id = Global.DataOochamon[key].ooch_index
				if(ooch_id < 0):
					ooch_id = 10_000 + abs(ooch_id)
				
				if ooch_id == file_num:
					var image = Image.new()
					var err = image.load(path + file_name)
					if !err:
						Global.DataOochamon[key].ooch_sprite = load(path + file_name)	
						Global.DataOochamon[key].ooch_texture = Global.DataOochamon[key].ooch_sprite			
		file_name = dir.get_next()
	dir.list_dir_end()


func _on_button_set_file_paths_pressed() -> void:
	fd_path.visible = true
