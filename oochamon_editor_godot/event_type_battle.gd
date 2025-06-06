extends VBoxContainer
var event_data = {
	"name" : "",
	"sprite" : 2,
	"sprite_id" : "",
	"sprite_combat" : "", #previously sprite_special
	"team" : [], #previously party
	"coin" : 0,
	"is_catchable" : false,
	"battle_ai" : Global.BATTLE_AI_BASIC,
	"user_type" : 2 #npc trainer by default
}

@onready var line_edit_name: LineEdit = $HBoxContainer/LineEditName
@onready var option_button_sprite: OptionButton = $HBoxContainer/OptionButtonSprite
@onready var line_edit_sprite_special: LineEdit = $HBoxContainer/LineEditSpriteSpecial
@onready var tab_container: TabContainer = $TabContainer
@onready var check_button_catchable: CheckButton = $HBoxContainer2/CheckButtonCatchable
@onready var option_button_battle_ai: OptionButton = $HBoxContainer2/OptionButtonBattleAI
@onready var option_button_user_type: OptionButton = $HBoxContainer2/OptionButtonUserType

@onready var slot_0: VBoxContainer = $TabContainer/Slot0
@onready var slot_1: VBoxContainer = $TabContainer/Slot1
@onready var slot_2: VBoxContainer = $TabContainer/Slot2
@onready var slot_3: VBoxContainer = $TabContainer/Slot3

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	if(event_data.has("party")):
		event_data.team = event_data.party
		event_data.erase("party")
	
	if(event_data.has("sprite_special")):
		event_data.sprite_combat = event_data.sprite_special
		event_data.erase("sprite_special")
	
	var slots = [slot_0, slot_1, slot_2, slot_3]
	line_edit_name.text = event_data.name
	line_edit_sprite_special.text = event_data.sprite_combat
	
	check_button_catchable.button_pressed = event_data.is_catchable
	option_button_battle_ai.selected = event_data.battle_ai
	
	
	var tile_data
	var tile_string
	for i in Global.DataNPCs.size():
		tile_data = Global.DataNPCs[i]
		tile_string = "res://npcs/" + tile_data.tile_index + ".png"
		option_button_sprite.add_icon_item(load(tile_string),tile_data.tile_index,i)
		if event_data.sprite_id == tile_data.tile_index:
			option_button_sprite.select(i)
	
	#create slots
	for i in event_data.team.size():
		var _data = event_data.team[i]
		var _slot = slots[i]
		
		_slot.slot_data = _data
		_slot.slot_data.slot_enabled = true
		
		_slot.re_ready()


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_option_button_sprite_item_selected(index: int) -> void:
	event_data.sprite = option_button_sprite.get_item_id(index)
	event_data.sprite_id = option_button_sprite.get_item_text(index)

func save():
	event_data.name = line_edit_name.text
	event_data.sprite_combat = line_edit_sprite_special.text
	
	event_data.team = []
	var slots = [slot_0, slot_1, slot_2, slot_3]
	for slot in slots:	
		if slot.slot_data.slot_enabled:
			event_data.team.push_back(slot.slot_data)

func _on_option_button_battle_ai_item_selected(index: int) -> void:
	event_data.battle_ai = index


func _on_check_button_catchable_toggled(toggled_on: bool) -> void:
	event_data.is_catchable = toggled_on


func _on_option_button_user_type_item_selected(index: int) -> void:
	event_data.user_type = index
