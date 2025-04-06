extends Control

@onready var o_button_slot_species = $slot_info/button_slot_species
@onready var o_lv_min = $slot_info/lv_min
@onready var o_lv_max = $slot_info/lv_max

var species = 0
var lv_min = 1
var lv_max = 1
var spawn_slot_data = {
	"ooch_id" : 0,
	"min_level" : 1,
	"max_level" : 1
}

func index_js2gd(index):
	if(index < 0):
		index = 10_000 + abs(index)
	index = int(index)
	return index

# Called when the node enters the scene tree for the first time.
func _ready():
	for key in Global.DataOochamon:
		var ooch = Global.DataOochamon[key]
		var ooch_index = index_js2gd(ooch.ooch_index)
		o_button_slot_species.add_icon_item(
			ooch.ooch_texture,
			ooch.ooch_name,
			ooch_index
		)
		
	
	o_lv_min.value = spawn_slot_data.min_level
	o_lv_max.value = spawn_slot_data.max_level
	o_button_slot_species.select(o_button_slot_species.get_item_index(index_js2gd(spawn_slot_data.ooch_id)))

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass

func _on_button_slot_species_item_selected(index):
	var key = index_js2gd(o_button_slot_species.get_item_id(index))
	var mon_data = Global.DataOochamon[key]
	spawn_slot_data.ooch_id = mon_data.id

func _on_lv_min_value_changed(value):
	spawn_slot_data.min_level = value

func _on_lv_max_value_changed(value):
	spawn_slot_data.max_level = value

func _on_button_delete_pressed():
	queue_free()
