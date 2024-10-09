extends Control

@onready var o_transition_object = $transition_object
@onready var o_transition_map_to = $transition_vbox_container/transition_map_to
@onready var o_transition_xto = $transition_vbox_container/HBoxContainer/transition_x
@onready var o_transition_yto = $transition_vbox_container/HBoxContainer/transition_y
@onready var transition_vbox_container = $transition_vbox_container

var transition_map_to = ""
var transition_xto = 0
var transition_yto = 0
var transition_x = 0
var transition_y = 0
var transition_data = {
	"x" : 0,
	"y" : 0,
	"connect_map" : "",
	"connect_x" : "",
	"connect_y" : ""
}
var dragging = false

# Called when the node enters the scene tree for the first time.
func _ready():
	o_transition_xto.text = str(transition_data.connect_x)
	o_transition_yto.text = str(transition_data.connect_y)
	o_transition_map_to.text = transition_data.connect_map

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
		
	
	#Hide the Display if not selected
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		transition_vbox_container.visible = true
		if dragging:
			var mx = floor((get_local_mouse_position().x + Global.CamX)/ Global.TileSize) * Global.TileSize
			var my = floor((get_local_mouse_position().y + Global.CamY)/ Global.TileSize) * Global.TileSize
			
			transition_data.x = floor(mx/Global.TileSize)
			transition_data.y = floor(my/Global.TileSize)
			
			o_transition_object.set_position(Vector2(mx - Global.CamX, my - Global.CamY))
			if Input.is_action_just_released("mouse_left"):
				dragging = false
	else:
		transition_vbox_container.visible = false


func _on_transition_map_to_text_changed(new_text):
	transition_data.connect_map = new_text
	
func _on_transition_x_text_changed(new_text):
	transition_data.connect_x = new_text

func _on_transition_y_text_changed(new_text):
	transition_data.connect_y = new_text

func _on_transition_object_button_down():
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		dragging = true
	else:
		Global.ObjSelected = get_instance_id()
		Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
