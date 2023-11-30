extends Control

@onready var bounding_box = $bounding_box
@onready var o_event_name = $VBoxContainer/event_name
@onready var o_event_required = $VBoxContainer/event_required
@onready var o_event_kill = $VBoxContainer/event_kill
@onready var event_vbox = $event_vbox

@export var event_name = ""
@export var event_required = ""
@export var event_kill = ""

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

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
