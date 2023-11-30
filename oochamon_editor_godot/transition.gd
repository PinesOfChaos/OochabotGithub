extends Control

@onready var o_transition_object = $transition_object
@onready var o_transition_map_to = $VBoxContainer/transition_map_to
@onready var o_transition_xto = $VBoxContainer/HBoxContainer/transition_x
@onready var o_transition_yto = $VBoxContainer/HBoxContainer/transition_y
@onready var transition_vbox_container = $transition_vbox_container

@export var transition_map_to = ""
@export var transition_xto = 0
@export var transition_yto = 0
@export var transition_x = 0
@export var transition_y = 0
var dragging = false

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	#Hide the Display if not selected
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		transition_vbox_container.visible = true
		if dragging:
			var mx = floor((get_local_mouse_position().x + Global.CamX)/ Global.TileSize) * Global.TileSize
			var my = floor((get_local_mouse_position().y + Global.CamY)/ Global.TileSize) * Global.TileSize
			
			transition_x = floor(mx/Global.TileSize)
			transition_y = floor(my/Global.TileSize)
			
			o_transition_object.set_position(Vector2(mx - Global.CamX, my - Global.CamY))
			if Input.is_action_just_released("mouse_left"):
				dragging = false
	else:
		transition_vbox_container.visible = false


func _on_transition_map_to_text_changed(new_text):
	transition_map_to = new_text
	
func _on_transition_x_text_changed(new_text):
	transition_xto = new_text

func _on_transition_y_text_changed(new_text):
	transition_yto = new_text

func _on_transition_object_button_down():
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		dragging = true
	else:
		Global.ObjSelected = get_instance_id()
		Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT





