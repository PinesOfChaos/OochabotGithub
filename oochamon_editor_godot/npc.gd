extends Control

@onready var o_npc_tab_container = $npc_tab_container
@onready var o_npc_object = $npc_object
@onready var o_npc_sprite = $"npc_tab_container/Basic Info/general_info/npc_sprite"
@onready var o_npc_sprite_combat = $"npc_tab_container/Basic Info/general_info/npc_sprite_combat"
@onready var o_npc_sprite_dialog = $"npc_tab_container/Basic Info/general_info/npc_sprite_dialog"
@onready var o_npc_name = $"npc_tab_container/Basic Info/general_info/npc_name"

@onready var o_flag_required = $"npc_tab_container/Basic Info/flag_required"
@onready var o_flag_given = $"npc_tab_container/Basic Info/flag_given"
@onready var o_flag_kill = $"npc_tab_container/Basic Info/flag_kill"
@onready var o_check_remove_finish = $"npc_tab_container/Basic Info/remove_on_finish/check_remove_finish"
@onready var o_text_pre_combat = $"npc_tab_container/Basic Info/text_pre_combat"
@onready var o_text_post_combat = $"npc_tab_container/Basic Info/text_post_combat"

@onready var o_coin_count = $"npc_tab_container/Basic Info/coin/coin_count"
@onready var items_list: VBoxContainer = $"npc_tab_container/Basic Info/items/items_list"


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
	"sprite_id" : "c00_000",
	"sprite_combat" : "",
	"sprite_dialog" : "",
	"name" : "CHANGE THIS YA DINGUS",
	"pre_combat_dialogue" : "",
	"post_combat_dialogue" : "",
	"flag_required" : "",
	"flag_kill" : "",
	"flag_given" : "",
	"remove_on_finish" : false,
	"items" : [],
	"coin" : 0,
	"team" : [],
	"aggro_range" : 3,
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
var npc_item_count = 0
var npc_coin = 0
var npc_slots = []
var npc_slots_data = []
var refreshed = false
var dragging = false
var npc_sprite_id = "c00_000"

var npc_aggro_range = 3
var npc_is_wild = false

# Called when the node enters the scene tree for the first time.
func _ready():
	
	var tile_data
	var tile_string
	for i in Global.DataNPCs.size():
		tile_data = Global.DataNPCs[i]
		tile_string = "res://npcs/" + tile_data.tile_index + ".png"
		o_npc_sprite.add_icon_item(load(tile_string),tile_data.tile_index,i)
		if npc_data.sprite_id == tile_data.tile_index:
			o_npc_sprite.select(i)
			o_npc_object.texture_normal = load(tile_string)
			
	
	#print(["NPC SPRITE AND ITEM ID", npc_sprite, npc_item_id])
	
	
	
	o_npc_name.text = npc_data.name
	
	o_npc_sprite_combat.text = npc_data.sprite_combat
	o_npc_sprite_dialog.text = npc_data.sprite_dialog
	
	o_coin_count.value = npc_data.coin
	
	for _info in npc_data.items:
		var _load = load("res://slot_item.tscn")
		var _obj = _load.instantiate()
		
		_obj.item_id = _info.id
		_obj.item_count = _info.count
		
		
		items_list.add_child(_obj)
		_obj.owner = items_list
		_obj.o_item_price.visible = false
		_obj.o_item_count.visible = true
	
	o_flag_required.text = npc_data.flag_required
	o_flag_given.text = npc_data.flag_given
	o_flag_kill.text = npc_data.flag_kill
	o_check_remove_finish.button_pressed = npc_data.remove_on_finish
	
	o_text_pre_combat.text = npc_data.pre_combat_dialogue
	o_text_post_combat.text = npc_data.post_combat_dialogue
	
	o_aggro_range.value = npc_data.aggro_range
	o_wild_encounter.button_pressed = npc_data.is_wild
	
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
				#print([npc_x, npc_y])
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

func _on_coin_count_value_changed(value):
	npc_data.coin = value

func _on_text_pre_combat_text_changed():
	npc_data.pre_combat_dialogue = o_text_pre_combat.text

func _on_text_post_combat_text_changed():
	npc_data.post_combat_dialogue = o_text_post_combat.text

func _on_npc_sprite_item_selected(index):
	npc_data.sprite = o_npc_sprite.get_item_id(index)
	npc_data.sprite_id = o_npc_sprite.get_item_text(index)
	var tile_string = "res://npcs/" + npc_data.sprite_id + ".png"
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

func _on_button_new_item_pressed() -> void:
	var _load = load("res://slot_item.tscn")
	var _obj = _load.instantiate()
	items_list.add_child(_obj)
	_obj.owner = items_list
	_obj.o_item_price.visible = false
	_obj.o_item_count.visible = true
