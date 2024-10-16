extends Control

@onready var o_npc_tab_container = $npc_tab_container
@onready var o_npc_object = $npc_object
@onready var o_npc_sprite = $"npc_tab_container/Basic Info/general_info/npc_sprite"
@onready var o_npc_sprite_combat = $"npc_tab_container/Basic Info/general_info/npc_sprite_combat"
@onready var o_npc_sprite_dialog = $"npc_tab_container/Basic Info/general_info/npc_sprite_dialog"
@onready var o_npc_name = $"npc_tab_container/Basic Info/general_info/npc_name"
@onready var line_edit_objective: LineEdit = $"npc_tab_container/Basic Info/LineEditObjective"

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

@onready var o_aggro_range = $"npc_tab_container/Basic Info/addt_settings/aggro_range"
@onready var o_wild_encounter = $"npc_tab_container/Basic Info/addt_settings/wild_encounter"

var npc_data = {
	"x" : 0,
	"y" : 0,
	"sprite" : 2,
	"sprite_name" : "c00_000",
	"sprite_combat" : "",
	"sprite_dialog" : "",
	"name" : "",
	"pre_combat_dialogue" : "",
	"post_combat_dialogue" : "",
	"flag_required" : "",
	"flag_kill" : "",
	"flag_given" : "",
	"remove_on_finish" : false,
	"item_id" : -1,
	"item_number" : 0,
	"coin" : 0,
	"team" : [],
	"aggro_range" : 3,
	"objective" : "",
	"is_wild" : false
}

var npc_x = 0
var npc_y = 0
var npc_sprite = 2
var npc_sprite_combat = ""
var npc_sprite_dialog = ""
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
var npc_sprite_name = "c00_000"

var npc_aggro_range = 3
var npc_is_wild = false

# Called when the node enters the scene tree for the first time.
func _ready():
	
	o_item_select.add_item("No Item", -1)
	o_item_select.set_item_id(-1, -1)
	for item_data in Global.DataItems:
		o_item_select.add_item(item_data.item_name, item_data.item_index)
		o_item_select.set_item_tooltip(item_data.item_index, item_data.item_desc)
	
	var tile_data
	var tile_string
	for i in Global.DataNPCs.size():
		tile_data = Global.DataNPCs[i]
		tile_string = "res://npcs/" + tile_data.tile_index + ".png"
		o_npc_sprite.add_icon_item(load(tile_string),tile_data.tile_index,i)
		if npc_data.sprite_name == tile_data.tile_index:
			o_npc_sprite.select(i)
			o_npc_object.texture_normal = load(tile_string)
			
	
	print(["NPC SPRITE AND ITEM ID", npc_sprite, npc_item_id])
	
	
	
	o_npc_name.text = npc_data.name
	
	o_npc_sprite_combat.text = npc_data.sprite_combat
	o_npc_sprite_dialog.text = npc_data.sprite_dialog
	
	o_coin_count.value = npc_data.coin
	o_item_select.select(o_item_select.get_item_index(npc_data.item_id))
	o_item_count.value = npc_data.item_number
	
	o_flag_required.text = npc_data.flag_required
	o_flag_given.text = npc_data.flag_given
	o_flag_kill.text = npc_data.flag_kill
	o_check_remove_finish.button_pressed = npc_data.remove_on_finish
	
	o_text_pre_combat.text = npc_data.pre_combat_dialogue
	o_text_post_combat.text = npc_data.post_combat_dialogue
	
	o_aggro_range.value = npc_data.aggro_range
	o_wild_encounter.button_pressed = npc_data.is_wild
	line_edit_objective.text = npc_data.objective
	
	npc_slots = [slot_1, slot_2, slot_3, slot_4]
	for i in npc_data.team.size():
		var _data = npc_data.team[i]
		var _slot = npc_slots[i]
		
		_slot.slot_data = _data
		_slot.slot_data.slot_enabled = true
		
		_slot.re_ready()
	
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	#Hide the Display if not selected
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		o_npc_tab_container.visible = true
		if dragging:
			var mx = floor((get_local_mouse_position().x + Global.CamX)/ Global.TileSize) * Global.TileSize
			var my = floor((get_local_mouse_position().y + Global.CamY)/ Global.TileSize) * Global.TileSize
			
			npc_data.x = floor(mx/Global.TileSize)
			npc_data.y = floor(my/Global.TileSize)
			
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
	npc_data.flag_required = new_text

func _on_flag_given_text_changed(new_text):
	npc_data.flag_given = new_text

func _on_flag_kill_text_changed(new_text):
	npc_data.flag_kill = new_text

func _on_check_remove_finish_toggled(button_pressed):
	npc_data.remove_on_finish = button_pressed

func _on_item_select_item_selected(index):
	npc_data.item_id = o_item_select.get_item_id(index)

func _on_item_count_value_changed(value):
	npc_data.item_number = value

func _on_coin_count_value_changed(value):
	npc_data.coin = value

func _on_text_pre_combat_text_changed():
	npc_data.dialog_pre = o_text_pre_combat.text

func _on_text_post_combat_text_changed():
	npc_data.dialog_post = o_text_post_combat.text

func _on_npc_sprite_item_selected(index):
	npc_data.sprite = o_npc_sprite.get_item_id(index)
	npc_data.sprite_name = o_npc_sprite.get_item_text(index)
	var tile_string = "res://npcs/" + npc_data.sprite_name + ".png"
	o_npc_object.texture_normal = load(tile_string)
	
func _on_npc_object_button_down():
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		dragging = true
	else:
		Global.ObjSelected = get_instance_id()
		Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT


func _on_npc_sprite_combat_text_changed(new_text):
	npc_data.sprite_combat = new_text


func _on_npc_name_text_changed(new_text):
	npc_data.name = new_text


func _on_npc_sprite_dialog_text_changed(new_text):
	npc_data.sprite_dialog = new_text


func _on_aggro_range_value_changed(value):
	npc_data.aggro_range = value


func _on_wild_encounter_toggled(toggled_on):
	npc_data.is_wild = toggled_on

func _on_line_edit_objective_text_changed(new_text: String) -> void:
	npc_data.objective = new_text
