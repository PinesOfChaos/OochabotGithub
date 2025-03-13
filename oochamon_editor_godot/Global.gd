extends Node
enum MapMode {
	MAP_NONE,
	MAP_PAINT,
	MAP_PAINT_BRUSH_SELECT,
	MAP_PAINT_BRUSH_SELECT_WAIT,
	MAP_OBJ_EDIT,
	MAP_TYPING
}

#used for events, see "types" in javascript files
var EVENT_DIALOG = 		0
var EVENT_BATTLE = 		1
var EVENT_FLAG = 		2
var EVENT_OOCHPICK = 	3
var EVENT_TRANSITION = 	4
var EVENT_OBJECTIVE = 	5
var EVENT_OPTIONS = 	6
var EVENT_FINISH = 		7 #This should be unused
var EVENT_WAIT = 		8

var DataEvents = {}
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
	icon_cloth = preload("res://elements/icon_cloth.png"),
	icon_crystal = preload("res://elements/icon_crystal.png"),
	icon_martial = preload("res://elements/icon_martial.png"),
	icon_sound = preload("res://elements/icon_sound.png")
}
var DataPath = "/"
var WorkingDir = "/"
var LastFileName = "/"
var OochSelected = -1
var TileSelected = -1
var TileSize = 32
var ObjSelected = -1
var ObjSelectedPrev = ObjSelected
var CurrentMapMode = MapMode.MAP_NONE

var CamX = 0
var CamY = 0

func get_camera_center():
	var view_size = get_viewport().size
	var xx =  floor((Global.CamX/2 + view_size.x/4)/Global.TileSize) * Global.TileSize
	var yy =  floor((Global.CamY/2 + view_size.y/4)/Global.TileSize) * Global.TileSize
	return(Vector2(xx,yy))


func status_to_string(status_id):
	match(status_id):
		0: return("Burn")
		1: return("Infect")
		2: return("Blind")
		3: return("Digitize")
		4: return("Snare")
		5: return("Vanish")
		6: return("Doom")
		7: return("Double")
		8: return("Focus")
		_: return(str(status_id)) #Default string to return

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
		"crystal":
			string = "Crystal"
			texture = Global.ElementIcons.icon_crystal
		"sound":
			string = "Sound"
			texture = Global.ElementIcons.icon_sound
		"cloth":
			string = "Cloth"
			texture = Global.ElementIcons.icon_cloth
		"martial":
			string = "Martial"
			texture = Global.ElementIcons.icon_martial
		
	
	return([string, texture])
	
