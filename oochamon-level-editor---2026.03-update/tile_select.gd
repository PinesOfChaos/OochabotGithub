extends TabContainer
const val_button = preload("res://value_button.tscn")


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	
	var path = "res://tiles/"
	var dir = DirAccess.open(path)
	dir.list_dir_begin()
	var file_name = dir.get_next()
	var image = Image.load_from_file("res://tiles/t00_000.png")
	var default_texture = ImageTexture.create_from_image(image)
	
	#setup tabs and fill with blank tiles
	for tile in Global.DataTiles:
		var tile_emote = tile.tile_index
		var tab_num = int(tile_emote.split("_")[0])
		if tab_num > get_child_count() - 1:
			
			var grid = GridContainer.new()
			add_child(grid)
			grid.owner = self
			grid.columns = 10

			set_tab_title(get_child_count() - 1, "")
			
			
			for i in 100:
				var button = val_button.instantiate()
				button.set_texture_normal(default_texture)
				button.tooltip_text = "Empty"
				button.value = "t00_000"
				grid.add_child(button)
				button.owner = grid
	
	#assign sprite ids to tabs
	for i in Global.DataTiles.size():
		var tile = Global.DataTiles[i]
		var tile_id = tile.tile_index
		var tile_emote = tile.tile_index
		var tile_tab = int(tile_emote.split("_")[0]) #what tab to put the tile on
		var tile_ind = int(tile_emote.split("_")[1]) #what index to put the tile on in the tab
		
		var tab_to = get_child(tile_tab)
		var button_to = tab_to.get_child(tile_ind)
		
		tile.tile_sprite = Image.load_from_file(path + tile_id + ".png")
		tile.tile_texture = ImageTexture.create_from_image(tile.tile_sprite)
		
		button_to.value = i
		button_to.set_texture_normal(tile.tile_texture)
		button_to.tooltip_text = tile.tile_emote
	
		if tile_ind == 0:
			set_tab_icon(tile_tab, tile.tile_texture)
			
	queue_redraw()
	

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	for tab in get_children():
		for button in tab.get_children():
			if button.is_pressed():
				Global.TileSelected = button.value
				visible = false;
	
