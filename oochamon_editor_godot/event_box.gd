extends VBoxContainer
@onready var label: Label = $BoxContainer/Label
@onready var box_info: VBoxContainer = $"."
@onready var box_container: HBoxContainer = $BoxContainer

var event_slot_type = 0
var event_data = {}
var child_node = null

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	print(event_slot_type == Global.EVENT_DIALOG)
	print([event_slot_type, Global.EVENT_DIALOG])
	var spawn_child = ""
	if event_slot_type == Global.EVENT_DIALOG:
		label.text = "Dialog"
		spawn_child = "res://event_type_dialog.tscn"
	elif event_slot_type == Global.EVENT_BATTLE:
		label.text = "Battle"
		spawn_child = "res://event_type_battle.tscn"
	elif event_slot_type == Global.EVENT_FLAG:
		label.text = "Flag"
		spawn_child = "res://event_type_flag.tscn"
	elif event_slot_type == Global.EVENT_OOCHPICK:
		label.text = "Select Oochamon"
		spawn_child = "res://event_type_selectooch.tscn"
	elif event_slot_type == Global.EVENT_TRANSITION:
		label.text = "Transition"
		spawn_child = "res://event_type_transition.tscn"
	elif event_slot_type == Global.EVENT_OBJECTIVE:
		label.text = "Objective"
		spawn_child = "res://event_type_objective.tscn"
	elif event_slot_type == Global.EVENT_OPTIONS:
		label.text = "Options"
		spawn_child = "res://event_type_options.tscn"
	elif event_slot_type == Global.EVENT_WAIT:
		label.text = "Wait"
		spawn_child = "res://event_type_wait.tscn"
	elif event_slot_type == Global.EVENT_ADD_ALLY:
		label.text = "Add Ally"
		spawn_child = "res://event_type_wait.tscn"
	elif event_slot_type == Global.EVENT_REMOVE_ALLY:
		label.text = "Remove Ally"
		spawn_child = "res://event_type_remove_ally.tscn"
	elif event_slot_type == Global.EVENT_BATTLEGROUP_START:
		label.text = "Battle Group Start"
		spawn_child = "res://event_type_battle_group_start.tscn"
	elif event_slot_type == Global.EVENT_BATTLEGROUP_END:
		label.text = "Battle Group End"
		spawn_child = "res://event_type_battle_group_end.tscn"
	
	if(spawn_child != ""):
		if typeof(event_data) == TYPE_STRING:
			event_data = {"text" : event_data}
			
		if event_data.has("text") and event_data.text.left(3) == "ev_":
			get_tree().get_nodes_in_group("root")[0].check_button_repeatable.set_pressed_no_signal(false)
			queue_free()
		else:
			var _load = load(spawn_child)
			child_node = _load.instantiate()
			child_node.event_data.merge(event_data, true)
			child_node.owner = box_info
			box_info.add_child(child_node)
	
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

func save():
	child_node.save()
	event_data = child_node.event_data
