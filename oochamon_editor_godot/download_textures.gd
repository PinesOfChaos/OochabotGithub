extends Node


# Called when the node enters the scene tree for the first time.
func download_texture(url : String, file_name : String):
	var http = HTTPRequest.new()
	add_child(http)
	http.set_download_file(file_name)
	http.request(url)


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _ready():
	download_texture("https://opengameart.org/sites/default/files/player_19.png", "tiles/my_new_texture.png")
