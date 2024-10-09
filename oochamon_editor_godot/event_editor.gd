extends Control

@onready var v_box_container: VBoxContainer = $VBoxContainer/ScrollContainer/VBoxContainer
@onready var new_buttons: HBoxContainer = $VBoxContainer/ScrollContainer/VBoxContainer/NewButtons
@onready var scroll_container: ScrollContainer = $VBoxContainer/ScrollContainer


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	get_tree().get_root().size_changed.connect(resize) 


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func resize() -> void:
	scroll_container.size.x = get_tree().get_root().get_size().x
	scroll_container.size.y = get_tree().get_root().get_size().y - 60
	scroll_container.queue_sort()
	v_box_container.queue_sort()

func _on_new_dialog_pressed() -> void:
	var _load = load("res://event_box.tscn")
	var _obj = _load.instantiate()
	v_box_container.add_child(_obj)
	_obj.owner = v_box_container
	_obj.event_slot_type = Global.EVENT_DIALOG
	v_box_container.move_child(_obj, v_box_container.get_child_count() - 1)
	v_box_container.move_child(new_buttons, v_box_container.get_child_count())
	v_box_container.queue_sort()
	
