extends VBoxContainer

var event_data = {
	"title" : "",
	"description" : "Select your appearance.",
	"image" : "",
	"dialogue_portrait" : "",
	"options" : []
}
@onready var line_edit_title: LineEdit = $HBoxContainer/LineEditTitle
@onready var line_edit_desc: LineEdit = $HBoxContainer2/LineEditDescription
@onready var line_edit_image: LineEdit = $HBoxContainer3/LineEditImage
@onready var line_edit_portrait: LineEdit = $HBoxContainer4/LineEditPortrait
@onready var v_box_container_options: VBoxContainer = $VBoxContainerOptions

const SLOT_ITEM = preload("uid://bqcv8gwyak7r0")

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_title.text = event_data.title
	line_edit_desc.text = event_data.description
	line_edit_image.text = event_data.image
	line_edit_portrait.text = event_data.dialogue_portrait

	for i in event_data.options.size():
		var s = SLOT_ITEM.instantiate()
		s.item_id = event_data.options[i]
		v_box_container_options.add_child(s)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func save():
	event_data.title = line_edit_title.text
	event_data.description = line_edit_desc.text
	event_data.image = line_edit_image.text
	event_data.dialogue_portrait = line_edit_portrait.text
	event_data.options = []
	for slot in v_box_container_options.get_children():	
		if slot.slot_data.slot_enabled:
			event_data.options.push_back(slot.item_id)
