extends VBoxContainer

@onready var line_edit_title: LineEdit = $HBoxContainer/LineEditTitle
@onready var line_edit_desc: LineEdit = $HBoxContainer2/LineEditDesc
@onready var line_edit_image: LineEdit = $HBoxContainer3/LineEditImage
@onready var line_edit_portrait: LineEdit = $HBoxContainer4/LineEditPortrait

@onready var slot_0: VBoxContainer = $TabContainer/Slot0
@onready var slot_1: VBoxContainer = $TabContainer/Slot1
@onready var slot_2: VBoxContainer = $TabContainer/Slot2
@onready var slot_3: VBoxContainer = $TabContainer/Slot3
@onready var slot_4: VBoxContainer = $TabContainer/Slot4

var event_data = {
	"title" : "",
	"description" : "",
	"image" : "",
	"dialogue_portrait" : "",
	"options" : []
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	var slots = [slot_0, slot_1, slot_2, slot_3, slot_4]
	
	if(event_data.has("text")):
		event_data.description = event_data.text
		event_data.erase("text")
	
	line_edit_title.text = event_data.title
	line_edit_desc.text = event_data.description
	line_edit_image.text = event_data.image
	line_edit_portrait.text = event_data.dialogue_portrait
	
	
	for i in event_data.options.size():
		var _data = event_data.options[i]
		var _slot = slots[i]
		
		_slot.slot_data = _data
		_slot.slot_data.slot_enabled = true
		
		_slot.re_ready()


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
	
func save():
	var slots = [slot_0, slot_1, slot_2, slot_3, slot_4]
	event_data.title = line_edit_title.text
	event_data.description = line_edit_desc.text
	event_data.image = line_edit_image.text
	event_data.dialogue_portrait = line_edit_portrait.text
	event_data.options = []
	for slot in slots:	
		if slot.slot_data.slot_enabled:
			event_data.options.push_back(slot.slot_data)
