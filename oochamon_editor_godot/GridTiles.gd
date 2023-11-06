extends GridContainer

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	var children = get_children(false)
	for i in children.size():
		if children[i].is_pressed():
			Global.TileSelected = children[i].value
			visible = false;
func _draw():
	var rw = get_rect().size.x + Global.TileSize
	var rh = get_rect().size.y + Global.TileSize
	draw_rect(Rect2(-Global.TileSize/2, -Global.TileSize/2, rw, rh),Color(.1, .1, .1))
