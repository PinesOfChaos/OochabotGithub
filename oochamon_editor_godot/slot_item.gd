extends HBoxContainer

@onready var slot_item = $"."
@onready var o_item_remove = $item_remove
@onready var o_item_id = $item_id
@onready var o_item_price = $item_price

@export var item_id = 0
@export var item_price = 100
@export var refreshed = false

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if(!refreshed):
		refreshed = true
		for item_data in Global.DataItems:
			o_item_id.add_item(item_data.item_name, item_data.item_index)
			o_item_id.set_item_tooltip(item_data.item_index, item_data.item_desc)

func _on_item_remove_pressed():
	slot_item.queue_free()

func _on_item_id_item_selected(index):
	item_id = o_item_id.get_item_id(index)

func _on_item_price_value_changed(value):
	item_price = value
