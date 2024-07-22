extends Control

@onready var spawn_slots = $spawn_slots
@onready var bounding_box = $bounding_box

var spawn_list = []
var bbox_x = 0
var bbox_y = 0
var bbox_w = 1
var bbox_h = 1

# Called when the node enters the scene tree for the first time.
func _ready():
	bounding_box.pos_x = bbox_x
	bounding_box.pos_y = bbox_y
	bounding_box.scale_x = bbox_w
	bounding_box.scale_y = bbox_h
	
	var _spawn
	print(spawn_list)
	for _info in spawn_list:
		var _load = load("res://slot_spawn.tscn")
		var _obj = _load.instantiate()

		# add data to the object
		_obj.species = 	_info.slot_species
		_obj.lv_min = 	_info.slot_lv_min
		_obj.lv_max = 	_info.slot_lv_max

		#assign new object as a child of the relevant menu part
		spawn_slots.add_child(_obj)
		_obj.owner = spawn_slots

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		spawn_slots.visible = true
	else:
		spawn_slots.visible = false


func _on_button_add_slot_pressed():
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	var scene = load("res://slot_spawn.tscn")
	var instance = scene.instantiate()
	spawn_slots.add_child(instance)
