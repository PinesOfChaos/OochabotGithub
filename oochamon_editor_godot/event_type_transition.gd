extends VBoxContainer
@onready var line_edit_map: LineEdit = $HBoxContainer/LineEditMap
@onready var spin_box_x: SpinBox = $HBoxContainer/SpinBoxX
@onready var spin_box_y: SpinBox = $HBoxContainer/SpinBoxY

var event_data = {
	"map_to" : "",
	"xto" : 0,
	"yto" : 0
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_map.text = event_data.map_to
	spin_box_x.value = event_data.xto
	spin_box_y.value = event_data.yto

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func save():
	event_data.map_to = line_edit_map.text
	event_data.xto = spin_box_x.value
	event_data.yto = spin_box_y.value
