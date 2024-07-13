extends Node
enum MapMode {
	MAP_NONE,
	MAP_PAINT,
	MAP_PAINT_BRUSH_SELECT,
	MAP_PAINT_BRUSH_SELECT_WAIT,
	MAP_OBJ_EDIT
}

var DataAbilities = []
var DataItems = []
var DataMoves = []
var DataOochamon = []
var DataTiles = []
var DataNPCs = []
var ElementIcons = {
	icon_flame = preload("res://elements/icon_flame.png"),
	icon_fungal = preload("res://elements/icon_fungal.png"),
	icon_magic = preload("res://elements/icon_magic.png"),
	icon_neutral = preload("res://elements/icon_neutral.png"),
	icon_ooze = preload("res://elements/icon_ooze.png"),
	icon_stone = preload("res://elements/icon_stone.png"),
	icon_tech = preload("res://elements/icon_tech.png"),
	icon_void = preload("res://elements/icon_void.png"),
}
var DataPath = "/"
var WorkingDir = "/"
var LastFileName = "/"
var OochSelected = -1
var TileSelected = -1
var TileSize = 32
var ObjSelected = load("")
var CurrentMapMode = MapMode.MAP_NONE

var CamX = 0
var CamY = 0



func get_camera_center():
	var view_size = get_viewport().size
	var xx =  floor((Global.CamX/2 + view_size.x/4)/Global.TileSize) * Global.TileSize
	var yy =  floor((Global.CamY/2 + view_size.y/4)/Global.TileSize) * Global.TileSize
	return(Vector2(xx,yy))

func element_info(element):
	var texture
	var string

	match(element):
		"flame":
			string = "Flame"
			texture = Global.ElementIcons.icon_flame
		"fungal":
			string = "Fungal"
			texture = Global.ElementIcons.icon_fungal
		"magic":
			string = "Magic"
			texture = Global.ElementIcons.icon_magic
		"neutral":
			string = "Neutral"
			texture = Global.ElementIcons.icon_neutral
		"ooze":
			string = "Ooze"
			texture = Global.ElementIcons.icon_ooze
		"stone":
			string = "Stone"
			texture = Global.ElementIcons.icon_stone
		"tech":
			string = "Tech"
			texture = Global.ElementIcons.icon_tech
		"void":
			string = "Void"
			texture = Global.ElementIcons.icon_void
	
	return([string, texture])
	
