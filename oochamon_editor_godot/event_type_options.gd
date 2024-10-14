extends VBoxContainer
@onready var v_box_container_options: VBoxContainer = $VBoxContainerOptions
@onready var line_edit_text: LineEdit = $HBoxContainer/LineEditText


var event_data = {
	"text" : "",
	"options" : []
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_text.text = event_data.text
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
	event_data.text = line_edit_text.text
	event_data.options = []
	for child in v_box_container_options.get_children():
		event_data.options.push_back(child.data)
