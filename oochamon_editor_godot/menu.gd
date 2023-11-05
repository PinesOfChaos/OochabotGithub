extends Control

@onready var fd_save = $FileDialogSave
@onready var fd_load = $FileDialogLoad
@onready var fd_path = $FileDialogSetFilePaths

# Called when the node enters the scene tree for the first time.
func _ready():
	load_preferences()
	
	fd_save.current_dir = Global.WorkingDir
	fd_load.current_dir = Global.WorkingDir
	fd_path.current_dir = Global.DataPath
	
func load_preferences():
	var config = ConfigFile.new()
	var err = config.load("user://oochabot_config.cfg")
	if err != OK:
		return
	else:
		Global.DataPath = config.get_value("Preferences", "DataPath", "/")
		Global.WorkingDir = config.get_value("Preferences", "WorkingDir", "/")
		print(Global.DataPath)
		print(Global.WorkingDir)
		
func save_preferences():
	var config = ConfigFile.new()
	config.set_value("Preferences", "DataPath", Global.DataPath)
	config.set_value("Preferences", "WorkingDir", Global.WorkingDir)
	
	config.save("user://oochabot_config.cfg")
	print(Global.DataPath)
	print(Global.WorkingDir)
	
# Called when the node enters the scene tree for the first time.
func download_texture(url : String, file_name : String):
	var http = HTTPRequest.new()
	add_child(http)
	http.set_download_file(file_name)
	http.request(url)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass

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
		
		Global.DataOochamon.push_back({
			ooch_index = int(lnsplit[0]),
			ooch_emote = lnsplit[1],
			ooch_link_image = lnsplit[2],
			ooch_name = int(lnsplit[3]),
			ooch_desc = int(lnsplit[4]),
			ooch_element = lnsplit[5],
			ooch_hp = int(lnsplit[6]),
			ooch_atk = int(lnsplit[7]),
			ooch_def = int(lnsplit[8]),
			ooch_spd = int(lnsplit[9]),
			ooch_moves = moves_arr,
			ooch_ability = abi_arr,
			ooch_evo_to = int(lnsplit[12]),
			ooch_evo_lv = int(lnsplit[13]),
		})
		ln = f_oochamon.get_line()
	#print(Global.DataTiles)
	
	#Tiles
	var f_tiles = FileAccess.open(Global.DataPath + "/tiles_data.txt", FileAccess.READ)
	ln = f_tiles.get_line()
	while ln != "":
		lnsplit = ln.split("|")
		Global.DataTiles.push_back({
			tile_index = int(lnsplit[0]),
			tile_use = lnsplit[1],
			tile_emote = lnsplit[2],
			tile_emote_detailed = lnsplit[2],
		})
		ln = f_tiles.get_line()
	#print(Global.DataTiles)
