extends VBoxContainer
@onready var spin_box: SpinBox = $SpinBox

var event_data = {
	"duration" : 1,
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	print(event_data)
	spin_box.value = event_data.duration

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func save():
	event_data.duration = spin_box.value
