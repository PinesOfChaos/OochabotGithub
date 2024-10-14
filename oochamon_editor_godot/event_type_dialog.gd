extends VBoxContainer

@onready var v_box_container_items: VBoxContainer = $VBoxContainerItems
@onready var title: LineEdit = $HBoxContainer/Title
@onready var line_edit_image: LineEdit = $HBoxContainer/LineEditImage
@onready var line_edit_portrait: LineEdit = $HBoxContainer/LineEditPortrait
@onready var text_edit_dialog: TextEdit = $TextEditDialog
@onready var spin_box_money: SpinBox = $HBoxContainer2/SpinBoxMoney



var event_data = {
	"title" : "",
	"description" : "",
	"image" : "",
	"dialogue_portrait" : "",
	"money" : 0,
	"items" : [],
}

# Called when the node enters the scene tree for the first time.
func _ready() -> void: 
	title.text = event_data.title
	text_edit_dialog.text = event_data.description
	line_edit_image.text = event_data.image
	line_edit_portrait.text = event_data.dialogue_portrait
	spin_box_money.value = event_data.money
	
	for item in event_data.items:
		var _load = load("res://slot_item.tscn")
		var _obj = _load.instantiate()
		
		_obj.item_id = item.id
		_obj.item_count = item.count
		
		
		v_box_container_items.add_child(_obj)
		_obj.owner = v_box_container_items
		_obj.o_item_price.visible = false
		_obj.o_item_count.visible = true
		

func save():
	event_data.items = []
	event_data.title = title.text
	event_data.description = text_edit_dialog.text
	event_data.image = line_edit_image.text
	event_data.dialogue_portrait = line_edit_portrait.text
	event_data.money = spin_box_money.value
	
	for child in v_box_container_items.get_children():
		var item = {
			"id" : child.item_id,
			"count" : child.item_count
		}
		event_data.items.push_back(item)
		
# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass


func _on_button_add_item_pressed() -> void:
	var _load = load("res://slot_item.tscn")
	var _obj = _load.instantiate()
	v_box_container_items.add_child(_obj)
	_obj.owner = v_box_container_items
	_obj.o_item_price.visible = false
	_obj.o_item_count.visible = true
