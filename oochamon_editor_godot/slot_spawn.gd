extends Control

@onready var button_slot_species = $slot_info/button_slot_species

var species = 0
var lv_min = 1
var lv_max = 1

# Called when the node enters the scene tree for the first time.
func _ready():
	for i in Global.DataOochamon.size():
			button_slot_species.add_icon_item(
				Global.DataOochamon[i].ooch_texture,
				Global.DataOochamon[i].ooch_name,
				i
			)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass


func _on_button_slot_species_item_selected(index):
	species = button_slot_species.get_item_id(index)

func _on_lv_min_value_changed(value):
	lv_min = value

func _on_lv_max_value_changed(value):
	lv_max = value

func _on_button_delete_pressed():
	queue_free()
