extends VBoxContainer
@onready var line_edit_objective_text: LineEdit = $LineEditObjectiveText

var event_data = {
	"text" : ""
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_objective_text.text = event_data.text


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func save():
	event_data.text = line_edit_objective_text.text
