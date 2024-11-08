extends VBoxContainer
@onready var line_edit_map: LineEdit = $HBoxContainer/LineEditMap
@onready var spin_box_x: SpinBox = $HBoxContainer/SpinBoxX
@onready var spin_box_y: SpinBox = $HBoxContainer/SpinBoxY
@onready var check_box: CheckBox = $HBoxContainer/CheckBox

var event_data = {
	"map_to" : "",
	"x_to" : 0,
	"y_to" : 0,
	"default_tp" : true
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_map.text = event_data.map_to
	spin_box_x.value = event_data.x_to
	spin_box_y.value = event_data.y_to
	check_box.toggle_mode = event_data.default_tp

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func save():
	event_data.map_to = line_edit_map.text
	event_data.x_to = spin_box_x.value
	event_data.y_to = spin_box_y.value
	event_data.default_tp = check_box.toggle_mode
