extends HBoxContainer
@onready var line_edit_text: LineEdit = $LineEditText
@onready var line_edit_event_to: LineEdit = $LineEditEventTo
@onready var line_edit_flag: LineEdit = $LineEditFlag
@onready var spin_box_price: SpinBox = $SpinBoxPrice

var data = {
	"text" : "",
	"event" : "",
	"flag" : "",
	"price" : 0
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_text.text = data.text
	line_edit_event_to.text = data.event
	line_edit_flag.text = data.flag
	spin_box_price.value = data.price
	
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_button_delete_pressed() -> void:
	queue_free()

func _on_line_edit_text_text_changed(new_text: String) -> void:
	data.text = new_text

func _on_line_edit_event_to_text_changed(new_text: String) -> void:
	data.event = new_text

func _on_line_edit_flag_text_changed(new_text: String) -> void:
	data.flag = new_text

func _on_spin_box_price_value_changed(value: float) -> void:
	data.price = value