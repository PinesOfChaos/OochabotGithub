extends Control

@onready var bounding_box = $"."
@onready var box_button = $box_button
@onready var anchor_top_left = $anchorTopLeft
@onready var anchor_top_right = $anchorTopRight
@onready var anchor_bot_left = $anchorBotLeft
@onready var anchor_bot_right = $anchorBotRight
@onready var drawn_rect = $box_button/drawn_rect

var origin_x = 0
var origin_y = 0
var pos_x = 0
var pos_y = 0
var scale_x = 1
var scale_y = 1
var dragging_scale = false
var refreshed = false

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if !refreshed:
		refreshed = true
		reset_box(get_position().x, get_position().y, get_position().x, get_position().y)
	if dragging_scale and typeof(Global.ObjSelected) == typeof(get_instance_id()) and Global.ObjSelected == get_parent().get_instance_id():
		var mpos = get_local_mouse_position()
		mpos.x = floor((mpos.x + Global.CamX)/Global.TileSize) * Global.TileSize
		mpos.y = floor((mpos.y + Global.CamY)/Global.TileSize) * Global.TileSize
		reset_box(origin_x, origin_y, mpos.x, mpos.y)
		if Input.is_action_just_released("mouse_left"):
			dragging_scale = false

func _on_anchor_top_left_button_down():
	Global.ObjSelected = get_parent().get_instance_id()
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	
	origin_x = (pos_x + (scale_x)) * Global.TileSize
	origin_y = (pos_y + (scale_y)) * Global.TileSize
	dragging_scale = true

func _on_anchor_top_right_button_down():
	Global.ObjSelected = get_parent().get_instance_id()
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	
	origin_x = (pos_x) * Global.TileSize
	origin_y = (pos_y + (scale_y)) * Global.TileSize
	dragging_scale = true

func _on_anchor_bot_left_button_down():
	Global.ObjSelected = get_parent().get_instance_id()
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	
	origin_x = (pos_x + (scale_x)) * Global.TileSize
	origin_y = (pos_y) * Global.TileSize
	dragging_scale = true

func _on_anchor_bot_right_button_down():
	Global.ObjSelected = get_parent().get_instance_id()
	Global.CurrentMapMode = Global.MapMode.MAP_OBJ_EDIT
	
	origin_x = (pos_x) * Global.TileSize
	origin_y = (pos_y) * Global.TileSize
	dragging_scale = true
	
func reset_box(xstart, ystart, xend, yend):
	pos_x = floor(min(xstart, xend)/Global.TileSize)
	pos_y = floor(min(ystart, yend)/Global.TileSize)
	scale_x = floor(abs(xstart - xend)/Global.TileSize)
	scale_y = floor(abs(ystart - yend)/Global.TileSize)
	
	var sx = (scale_x + 1) * Global.TileSize
	var sy = (scale_y + 1) * Global.TileSize
	var x1 = pos_x * Global.TileSize - Global.CamX
	var y1 = pos_y * Global.TileSize - Global.CamY
	var x2 = x1 + sx
	var y2 = y1 + sy
	
	anchor_top_left.set_position(	Vector2(x1, y1))
	anchor_top_right.set_position(	Vector2(x2, y1))
	anchor_bot_left.set_position(	Vector2(x1, y2))
	anchor_bot_right.set_position(	Vector2(x2, y2))
	
	box_button.set_position(Vector2(x1, y1))
	box_button.set_size(Vector2(sx, sy))

	drawn_rect.set_size(Vector2(sx, sy))
