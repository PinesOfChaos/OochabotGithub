extends Control

@onready var spawn_slots = $spawn_slots
@onready var bounding_box = $bounding_box

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.


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
