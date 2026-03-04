extends VBoxContainer
@onready var v_box_container_options: VBoxContainer = $VBoxContainerOptions
@onready var line_edit_title: LineEdit = $LineEditTitle
@onready var line_edit_desc: LineEdit = $LineEditDesc
@onready var line_edit_image: LineEdit = $LineEditImage
@onready var line_edit_portrait: LineEdit = $LineEditPortrait



var event_data = {
	"title" : "",
	"description" : "",
	"image" : "",
	"dialogue_portrait" : "",
	"options" : []
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	if(event_data.has("text")):
		event_data.description = event_data.text
		event_data.erase("text")
	
	line_edit_title.text = event_data.title
	line_edit_desc.text = event_data.description
	line_edit_image.text = event_data.image
	line_edit_portrait.text = event_data.dialogue_portrait
	
	for option in event_data.options:
		var _load = load("res://slot_event_option.tscn")
		var _obj = _load.instantiate()
		_obj.data = option
		_obj.owner = v_box_container_options
		v_box_container_options.add_child(_obj)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_button_add_option_pressed() -> void:
	var _load = load("res://slot_event_option.tscn")
	var _obj = _load.instantiate()
	v_box_container_options.add_child(_obj)
	_obj.owner = v_box_container_options
	
func save():
	event_data.title = line_edit_title.text
	event_data.description = line_edit_desc.text
	event_data.image = line_edit_image.text
	event_data.dialogue_portrait = line_edit_portrait.text
	
	event_data.options = []
	for child in v_box_container_options.get_children():
		event_data.options.push_back(child.data)
