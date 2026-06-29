extends HBoxContainer
@onready var line_edit_text: LineEdit = $LineEditText
@onready var line_edit_event_to: LineEdit = $LineEditEventTo
@onready var line_edit_flag: LineEdit = $LineEditFlag
@onready var spin_box_price: SpinBox = $SpinBoxPrice
@onready var option_button_style: OptionButton = $OptionButton
@onready var line_edit_emote: LineEdit = $LineEditEmote

var data = {
	"text" : "",
	"emote" : "",
	"event" : "",
	"flag" : "",
	"price" : 0,
	"style": 0
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	line_edit_text.text = data.text
	line_edit_emote.text = data.emote
	line_edit_event_to.text = data.event
	line_edit_flag.text = data.flag
	spin_box_price.value = data.price
	option_button_style.select(data.style)
	
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

func _on_option_button_item_selected(index: int) -> void:
	data.style = option_button_style.get_item_id(index)

func _on_line_edit_emote_text_changed(new_text: String) -> void:
	data.emote = line_edit_emote.text
