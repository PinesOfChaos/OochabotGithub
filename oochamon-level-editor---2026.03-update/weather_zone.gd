extends Control

@onready var bounding_box = $bounding_box
@onready var o_weather_name = $event_vbox/weather_name
@onready var o_event_required = $event_vbox/event_required
@onready var o_event_kill = $event_vbox/event_kill
@onready var event_vbox = $event_vbox

var weather_info = {
	"x" : 0,
	"y" : 0,
	"width" : 1,
	"height" : 1,
	"weather_name" : "",
	"flag_required" : "",
	"flag_kill" : ""
}

# Called when the node enters the scene tree for the first time.
func _ready():
	o_weather_name.text = weather_info.weather_name
	o_event_required.text = weather_info.flag_required
	o_event_kill.text = weather_info.flag_kill
	
	bounding_box.pos_x = weather_info.x
	bounding_box.pos_y = weather_info.y
	bounding_box.scale_x = weather_info.width
	bounding_box.scale_y = weather_info.height

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		event_vbox.visible = true
	else:
		event_vbox.visible = false

func _on_event_name_text_changed(new_text):
	weather_info.weather_name = new_text

func _on_event_required_text_changed(new_text):
	weather_info.flag_required = new_text

func _on_event_kill_text_changed(new_text):
	weather_info.flag_kill = new_text
