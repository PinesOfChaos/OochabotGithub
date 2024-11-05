extends Control

@onready var v_box_container: VBoxContainer = $VBoxContainer/ScrollContainer/VBoxContainer
@onready var new_buttons: HBoxContainer = $VBoxContainer/ScrollContainer/VBoxContainer/NewButtons
@onready var scroll_container: ScrollContainer = $VBoxContainer/ScrollContainer
@onready var line_edit_event_name: LineEdit = $VBoxContainer/HBoxContainer/LineEditEventName
@onready var button_load: OptionButton = $VBoxContainer/HBoxContainer/ButtonLoad
@onready var check_button_repeatable: CheckButton = $VBoxContainer/HBoxContainer/CheckButtonRepeatable


var event_name = ""
var event_data = {}
var event_repeatable = false

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	
	get_tree().get_root().size_changed.connect(resize)
	refresh_events_list()
	
	if Global.DataEvents.has(event_name):
		event_data = Global.DataEvents[event_name]
		for part in event_data:
			new_node(part[0], part[1])
			print(part[0])
			print(part[1])
	else: #set a default event name, leave everything else alone
		event_name = "ev_"
	
	check_button_repeatable.toggle_mode = event_repeatable
	line_edit_event_name.text = event_name
	
	resize()
			
func refresh_events_list():
	button_load.clear()
	button_load.add_item("--Load--")
	var keys = Global.DataEvents.keys()
	for i in keys.size():
		var key = keys[i]
		button_load.add_item(key)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	if Input.is_action_just_pressed("quicksave"):
		_on_button_save_pressed()

func resize() -> void:
	scroll_container.size.x = get_tree().get_root().get_size().x
	scroll_container.size.y = get_tree().get_root().get_size().y - 60
	scroll_container.queue_sort()
	v_box_container.queue_sort()

func new_node(global_event_type, event_data = {}):
	var _load = load("res://event_box.tscn")
	var _obj = _load.instantiate()
	
	_obj.event_slot_type = global_event_type
	_obj.event_data = event_data
	_obj.owner = v_box_container
	v_box_container.add_child(_obj)
	
	v_box_container.move_child(_obj, v_box_container.get_child_count() - 1)
	v_box_container.move_child(new_buttons, v_box_container.get_child_count())
	v_box_container.queue_sort()
	return(_obj)

func _on_new_dialog_pressed() -> void:
	new_node(Global.EVENT_DIALOG)
	
func _on_new_battle_pressed() -> void:
	new_node(Global.EVENT_BATTLE)

func _on_new_flag_pressed() -> void:
	new_node(Global.EVENT_FLAG)

func _on_new_ooch_select_pressed() -> void:
	new_node(Global.EVENT_OOCHPICK)

func _on_new_transition_pressed() -> void:
	new_node(Global.EVENT_TRANSITION)

func _on_new_objective_pressed() -> void:
	new_node(Global.EVENT_OBJECTIVE)

func _on_new_option_pressed() -> void:
	new_node(Global.EVENT_OPTIONS)


func _on_button_save_pressed() -> void:
	var data = []
	var event_name = line_edit_event_name.text
	for child in v_box_container.get_children():
		if child != new_buttons:
			var child_data = []
			child.save()
			child_data.push_back(child.event_slot_type)
			child_data.push_back(child.event_data)
			data.push_back(child_data)
			
	Global.DataEvents[event_name] = data
	
	var path = Global.WorkingDir.split('/Maps')[0] + "/global_events.json"
	var save_json = FileAccess.open(path, FileAccess.WRITE)
	save_json.store_line(JSON.stringify(Global.DataEvents,"\t"))
	refresh_events_list()
	print(Global.DataEvents)
	
func _on_check_button_repeatable_toggled(toggled_on: bool) -> void:
	pass # Replace with function body.

func _on_button_load_item_selected(index: int) -> void:
	var _main = get_parent()
	var _menu = load("res://event_editor.tscn")
	var _inst = _menu.instantiate()
	_inst.event_name = button_load.get_item_text(index)
	_main.add_child(_inst)
	queue_free()


func _on_button_main_menu_pressed() -> void:
	_on_button_save_pressed()
	get_tree().change_scene_to_file("res://main_menu.tscn")
	queue_free()

func _on_button_new_pressed() -> void:
	_on_button_save_pressed()
	get_tree().change_scene_to_file("res://event_editor.tscn")
	queue_free()
