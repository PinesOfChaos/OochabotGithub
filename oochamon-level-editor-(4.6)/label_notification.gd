extends Label

var alpha = 0
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	alpha -= .01
	modulate.a = clamp(alpha, 0, 1)

func notify(new_text):
	text = new_text
	alpha = 2
