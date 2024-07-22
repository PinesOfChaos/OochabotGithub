extends Control

@onready var o_shop_object = $shop_object
@onready var o_shop_greeting = $shop_vbox/shop_greeting
@onready var o_shop_type = $shop_vbox/shop_type
@onready var shop_vbox = $shop_vbox
@onready var shop_add_item = $shop_vbox/shop_add_item
@onready var o_shop_special_items = $shop_vbox/shop_special_items
@onready var o_shop_image_link = $shop_vbox/shop_image_link

var shop_x = 0
var shop_y = 0
var shop_image = ""
var shop_greeting = "Welcome to my store. Buy whatever you need below!"
var shop_type = "default"
var shop_special_items = []
var dragging = false

# Called when the node enters the scene tree for the first time.
func _ready():
	o_shop_greeting.text = shop_greeting
	o_shop_image_link.text = shop_image
	
	if(shop_type == "default"):
		o_shop_type.select(0)
	if(shop_type == "special"):
		o_shop_type.select(1)
	
	for _info in shop_special_items:
		
		var _load = load("res://slot_item.tscn")
		var _obj = _load.instantiate()
		
		_obj.item_id = _info.special_id
		_obj.item_price = _info.special_price
		
		o_shop_special_items.add_child(_obj)
		_obj.owner = o_shop_special_items

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		shop_vbox.visible = true
		if dragging:
			var mx = floor((get_local_mouse_position().x + Global.CamX)/ Global.TileSize) * Global.TileSize
			var my = floor((get_local_mouse_position().y + Global.CamY)/ Global.TileSize) * Global.TileSize
			
			shop_x = floor(mx/Global.TileSize)
			shop_y = floor(my/Global.TileSize)
			
			o_shop_object.set_position(Vector2(mx - Global.CamX, my - Global.CamY))
			if Input.is_action_just_released("mouse_left"):
				dragging = false
	else:
		shop_vbox.visible = false

func _on_shop_greeting_text_changed(new_text):
	shop_greeting = new_text

func _on_shop_type_item_selected(index):
	match index:
			0:
				shop_type = "default"	
			1:
				shop_type = "special"

func _on_shop_object_button_down():
	if typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_instance_id():
		dragging = true
	else:
		Global.ObjSelected = get_instance_id()
		Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT


func _on_shop_add_item_pressed():
	var scene = load("res://slot_item.tscn")
	var instance = scene.instantiate()
	o_shop_special_items.add_child(instance)


func _on_shop_image_link_text_changed(new_text):
	shop_image = new_text
