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
@onready var o_item_select = $"npc_tab_container/Basic Info/items/item_select"
@onready var button_back = $button_back

var npc_x = 0
var npc_y = 0
var npc_sprite = 0
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
var refreshed = false
var dragging = false

# Called when the node enters the scene tree for the first time.
func _ready():
	pass
	
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
	


func _on_flag_required_text_submitted(new_text):
	npc_flag_required = new_text

func _on_flag_given_text_submitted(new_text):
	npc_flag_given = new_text

func _on_flag_kill_text_submitted(new_text):
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
