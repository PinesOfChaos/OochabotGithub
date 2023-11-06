extends Node
enum MapMode {
	MAP_NONE,
	MAP_PAINT,
	MAP_PAINT_BRUSH_SELECT,
	MAP_PAINT_BRUSH_SELECT_WAIT,
	MAP_NPC_EDIT
}

var DataAbilities = []
var DataItems = []
var DataMoves = []
var DataOochamon = []
var DataTiles = []
var DataPath = "/"
var WorkingDir = "/"
var OochSelected = -1
var TileSelected = -1
var TileSize = 32
var ObjSelected = -1
var CurrentMapMode = MapMode.MAP_NPC_EDIT
