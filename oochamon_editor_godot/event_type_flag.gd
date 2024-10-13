extends VBoxContainer
@onready var line_edit: LineEdit = $LineEdit

var event_data = {
	"text" : "",
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	print(event_data)
	line_edit.text = event_data.text

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func save():
	event_data.text = line_edit.text
