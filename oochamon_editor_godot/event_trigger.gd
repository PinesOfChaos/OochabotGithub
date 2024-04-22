extends Control

@onready var bounding_box = $bounding_box
@onready var o_event_name = $event_vbox/event_name
@onready var o_event_required = $event_vbox/event_required
@onready var o_event_kill = $event_vbox/event_kill
@onready var event_vbox = $event_vbox

var event_name = ""
var event_required = ""
var event_kill = ""
var bbox_x = 0
var bbox_y = 0
var bbox_w = 1
var bbox_h = 1

# Called when the node enters the scene tree for the first time.
func _ready():
	o_event_name.text = event_name
	o_event_required.text = event_required
	o_event_kill.text = event_kill
	
	bounding_box.pos_x = bbox_x
	bounding_box.pos_y = bbox_y
	bounding_box.scale_x = bbox_w
	bounding_box.scale_y = bbox_h
	
	print([bbox_x, bbox_y, bbox_w, bbox_h])

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		event_vbox.visible = true
	else:
		event_vbox.visible = false

func _on_event_name_text_changed(new_text):
	event_name = new_text

func _on_event_required_text_changed(new_text):
	event_required = new_text

func _on_event_kill_text_changed(new_text):
	event_kill = new_text
