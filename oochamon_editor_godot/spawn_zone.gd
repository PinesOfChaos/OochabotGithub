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
	for i in spawn_list.size()/3:
		
		var _load = load("res://slot_spawn.tscn")
		var _obj = _load.instantiate()

		# add data to the object
		_obj.species = 	int(spawn_list[(i * 3)])
		_obj.lv_min = 	int(spawn_list[(i * 3) + 1])
		_obj.lv_max = 	int(spawn_list[(i * 3) + 2])

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
