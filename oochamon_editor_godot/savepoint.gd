extends Control

@onready var o_savepoint_object = $savepoint_object
@onready var o_savepoint_initial = $savepoint_initial
var savepoint_initial = false
var dragging = false
var savepoint_x = 0;
var savepoint_y = 0;

var savepoint_data = {
	"is_default" : false,
	"x" : 0,
	"y" : 0,
}

# Called when the node enters the scene tree for the first time.
func _ready():
	o_savepoint_initial.button_pressed = savepoint_data.is_default


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	#Hide the Display if not selected
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		o_savepoint_initial.visible = true
		if dragging:
			var mx = floor((get_local_mouse_position().x + Global.CamX)/ Global.TileSize) * Global.TileSize
			var my = floor((get_local_mouse_position().y + Global.CamY)/ Global.TileSize) * Global.TileSize
			
			savepoint_data.x = floor(mx/Global.TileSize)
			savepoint_data.y = floor(my/Global.TileSize)
			
			o_savepoint_object.set_position(Vector2(mx - Global.CamX, my - Global.CamY))
			if Input.is_action_just_released("mouse_left"):
				dragging = false
	else:
		o_savepoint_initial.visible = false


func _on_savepoint_initial_toggled(button_pressed):
	savepoint_data.is_default = button_pressed
	


func _on_savepoint_object_button_down():
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		dragging = true
	else:
		Global.ObjSelected = get_instance_id()
		Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
