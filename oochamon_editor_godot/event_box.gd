extends VBoxContainer
@onready var label: Label = $BoxContainer/Label
@onready var box_info: VBoxContainer = $"."
@onready var box_container: HBoxContainer = $BoxContainer

var event_slot_type = 0
var event_data = {}
var child_node = null

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	
	var spawn_child = ""
	
	match(event_slot_type):
		Global.EVENT_DIALOG:
			label.text = "Dialog"
			spawn_child = "res://event_type_dialog.tscn"
		Global.EVENT_BATTLE:
			label.text = "Battle"
		Global.EVENT_FLAG:
			label.text = "Flag"
		Global.EVENT_OOCHPICK:
			label.text = "Select Oochamon"
		Global.EVENT_TRANSITION:
			label.text = "Transition"
	
	if(spawn_child != ""):
		var _load = load(spawn_child)
		var _obj = _load.instantiate()
		box_info.add_child(_obj)
		_obj.owner = box_info
		_obj.event_data.merge(event_data, true)
	
	box_container.queue_sort()
	queue_sort()
	

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_button_delete_pressed() -> void:
	queue_free()

func _on_button_up_pressed() -> void:
	var parent = get_parent()
	if(get_index() > 0):
		parent.move_child(self, self.get_index() - 1)
		parent.queue_sort()

func _on_button_down_pressed() -> void:
	var parent = get_parent()
	if(get_index() < parent.get_child_count() - 2):
		parent.move_child(self, self.get_index() + 1)
		parent.queue_sort()
