extends Control

@onready var spawn_slots = $spawn_slots
@onready var bounding_box = $bounding_box

var spawn_list = []
var bbox_x = 0
var bbox_y = 0
var bbox_w = 1
var bbox_h = 1

var spawn_data = {
	"x" : 0,
	"y" : 0,
	"width" : 0,
	"height" : 0,
	"spawn_slots" : []
}

# Called when the node enters the scene tree for the first time.
func _ready():
	bounding_box.pos_x = spawn_data.x
	bounding_box.pos_y = spawn_data.y
	bounding_box.scale_x = spawn_data.width
	bounding_box.scale_y = spawn_data.height
	
	var _spawn
	for _info in spawn_data.spawn_slots:
		var _load = load("res://slot_spawn.tscn")
		var _obj = _load.instantiate()

		# add data to the object
		_obj.spawn_slot_data = {
			"ooch_id" : _info.ooch_id,
			"min_level" : _info.min_level,
			"max_level" : _info.max_level,
		}

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
