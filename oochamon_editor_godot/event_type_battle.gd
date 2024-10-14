extends VBoxContainer
var event_data = {
	"name" : "",
	"sprite" : 2,
	"sprite_name" : "",
	"sprite_special" : "",
	"party" : []
}

@onready var line_edit_name: LineEdit = $HBoxContainer/LineEditName
@onready var option_button_sprite: OptionButton = $HBoxContainer/OptionButtonSprite
@onready var line_edit_sprite_special: LineEdit = $HBoxContainer/LineEditSpriteSpecial
@onready var tab_container: TabContainer = $TabContainer

@onready var slot_0: VBoxContainer = $TabContainer/Slot0
@onready var slot_1: VBoxContainer = $TabContainer/Slot1
@onready var slot_2: VBoxContainer = $TabContainer/Slot2
@onready var slot_3: VBoxContainer = $TabContainer/Slot3

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	var slots = [slot_0, slot_1, slot_2, slot_3]
	line_edit_name.text = event_data.name
	line_edit_sprite_special.text = event_data.sprite_special
	
	var tile_data
	var tile_string
	for i in Global.DataNPCs.size():
		tile_data = Global.DataNPCs[i]
		tile_string = "res://npcs/" + tile_data.tile_index + ".png"
		option_button_sprite.add_icon_item(load(tile_string),tile_data.tile_index,i)
		if event_data.sprite_name == tile_data.tile_index:
			option_button_sprite.select(i)
	
	#create slots
	for i in event_data.party.size():
		var _data = event_data.party[i]
		var _slot = slots[i]
		
		_slot.slot_data = _data
		_slot.slot_data.slot_enabled = true
		
		_slot.re_ready()


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_option_button_sprite_item_selected(index: int) -> void:
	event_data.sprite = option_button_sprite.get_item_id(index)
	event_data.sprite_name = option_button_sprite.get_item_text(index)

func save():
	event_data.name = line_edit_name.text
	event_data.sprite_special = line_edit_sprite_special.text
	
	event_data.party = []
	var slots = [slot_0, slot_1, slot_2, slot_3]
	for slot in slots:	
		if slot.slot_data.slot_enabled:
			event_data.party.push_back(slot.slot_data)
		
