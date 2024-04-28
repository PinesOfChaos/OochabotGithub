extends Control

@onready var o_npc_tab_container = $npc_tab_container
@onready var o_npc_object = $npc_object
@onready var o_npc_sprite = $"npc_tab_container/Basic Info/general_info/npc_sprite"
@onready var o_npc_sprite_combat = $"npc_tab_container/Basic Info/general_info/npc_sprite_combat"
@onready var o_npc_name = $"npc_tab_container/Basic Info/general_info/npc_name"

@onready var o_flag_required = $"npc_tab_container/Basic Info/flag_required"
@onready var o_flag_given = $"npc_tab_container/Basic Info/flag_given"
@onready var o_flag_kill = $"npc_tab_container/Basic Info/flag_kill"
@onready var o_check_remove_finish = $"npc_tab_container/Basic Info/remove_on_finish/check_remove_finish"
@onready var o_text_pre_combat = $"npc_tab_container/Basic Info/text_pre_combat"
@onready var o_text_post_combat = $"npc_tab_container/Basic Info/text_post_combat"

@onready var o_coin_count = $"npc_tab_container/Basic Info/coin/coin_count"
@onready var o_item_select = $"npc_tab_container/Basic Info/items/item_select"
@onready var o_item_count = $"npc_tab_container/Basic Info/items/item_count"

@onready var button_back = $button_back
@onready var slot_1 = $"npc_tab_container/Slot 1"
@onready var slot_2 = $"npc_tab_container/Slot 2"
@onready var slot_3 = $"npc_tab_container/Slot 3"
@onready var slot_4 = $"npc_tab_container/Slot 4"

var npc_x = 0
var npc_y = 0
var npc_sprite = 2
var npc_sprite_combat = ""
var npc_name = ""
var npc_flag_required = ""
var npc_flag_given = ""
var npc_flag_kill = ""
var npc_remove_on_finish = false
var npc_item_id = -1
var npc_item_number = 0
var npc_coin = 0
var npc_dialog_pre = ""
var npc_dialog_post = ""
var npc_slots = []
var npc_slots_data = []
var refreshed = false
var dragging = false

# Called when the node enters the scene tree for the first time.
func _ready():
	
	o_item_select.add_item("No Item", -1)
	o_item_select.set_item_id(-1, -1)
	for item_data in Global.DataItems:
		o_item_select.add_item(item_data.item_name, item_data.item_index)
		o_item_select.set_item_tooltip(item_data.item_index, item_data.item_desc)
	
	var tile_data
	var tile_string
	for i in Global.DataTiles.size():
		tile_data = Global.DataTiles[i]
		tile_string = "res://tiles/" + ("00" + str(i)).right(3) + ".png"
		if tile_data.tile_use == "npc":
			o_npc_sprite.add_icon_item(load(tile_string),"",i)
	
	print(["NPC SPRITE AND ITEM ID", npc_sprite, npc_item_id])
	
	npc_slots = [slot_1, slot_2, slot_3, slot_4]
	
	o_npc_name.text = npc_name
	
	o_npc_sprite.select(o_npc_sprite.get_item_index(npc_sprite))
	var txt = "res://tiles/" + ("00" + str(npc_sprite)).right(3) + ".png"
	o_npc_object.texture_normal = load(txt)
	
	o_npc_sprite_combat.text = npc_sprite_combat
	
	o_coin_count.value = npc_coin
	o_item_select.select(o_item_select.get_item_index(npc_item_id))
	o_item_count.value = npc_item_number
	
	o_flag_required.text = npc_flag_required
	o_flag_given.text = npc_flag_given
	o_flag_kill.text = npc_flag_kill
	o_check_remove_finish.button_pressed = npc_remove_on_finish
	
	o_text_pre_combat.text = npc_dialog_pre
	o_text_post_combat.text = npc_dialog_post
	
	for i in npc_slots_data.size():
		var _data_str = npc_slots_data[i]
		
		if not (_data_str == ""):
			var _data = _data_str.split("`")
			var _slot = npc_slots[i]
			
			_slot.slot_enabled = true
			
			_slot.slot_species = int(_data[0])
			_slot.slot_nickname = _data[1]
			_slot.slot_ability = int(_data[2])
			_slot.slot_level = int(_data[3])
			
			_slot.slot_move1 = int(_data[4])
			_slot.slot_move2 = int(_data[5])
			_slot.slot_move3 = int(_data[6])
			_slot.slot_move4 = int(_data[7])
			
			_slot.slot_hp = int(_data[8])
			_slot.slot_atk = int(_data[9])
			_slot.slot_def = int(_data[10])
			_slot.slot_spd = int(_data[11])
			
			print("IVs Submitted")
			print([
				[_slot.slot_hp, int(_data[8])],
				[_slot.slot_atk, int(_data[9])],
				[_slot.slot_def, int(_data[10])],
				[_slot.slot_spd, int(_data[11])],
			])
			
			_slot.re_ready()
	
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	#Hide the Display if not selected
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		o_npc_tab_container.visible = true
		if dragging:
			var mx = floor((get_local_mouse_position().x + Global.CamX)/ Global.TileSize) * Global.TileSize
			var my = floor((get_local_mouse_position().y + Global.CamY)/ Global.TileSize) * Global.TileSize
			
			npc_x = floor(mx/Global.TileSize)
			npc_y = floor(my/Global.TileSize)
			
			o_npc_object.set_position(Vector2(mx - Global.CamX, my - Global.CamY))
			if Input.is_action_just_released("mouse_left"):
				print([npc_x, npc_y])
				dragging = false
	else:
		o_npc_tab_container.visible = false
	
	#Do Initial Refresh
	if !refreshed:
		refreshed = true
		dragging = true
		
		
	


func _on_flag_required_text_changed(new_text):
	npc_flag_required = new_text

func _on_flag_given_text_changed(new_text):
	npc_flag_given = new_text

func _on_flag_kill_text_changed(new_text):
	npc_flag_kill = new_text

func _on_check_remove_finish_toggled(button_pressed):
	npc_remove_on_finish = button_pressed

func _on_item_select_item_selected(index):
	npc_item_id = o_item_select.get_item_id(index)

func _on_item_count_value_changed(value):
	npc_item_number = value

func _on_coin_count_value_changed(value):
	npc_coin = value

func _on_text_pre_combat_text_changed():
	npc_dialog_pre = o_text_pre_combat.text

func _on_text_post_combat_text_changed():
	npc_dialog_post = o_text_post_combat.text

func _on_npc_sprite_item_selected(index):
	npc_sprite = o_npc_sprite.get_item_id(index)
	var tile_string = "res://tiles/" + ("00" + str(npc_sprite)).right(3) + ".png"
	o_npc_object.texture_normal = load(tile_string)
	
func _on_npc_object_button_down():
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		dragging = true
	else:
		Global.ObjSelected = get_instance_id()
		Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT


func _on_npc_sprite_combat_text_changed(new_text):
	npc_sprite_combat = new_text


func _on_npc_name_text_changed(new_text):
	npc_name = new_text
