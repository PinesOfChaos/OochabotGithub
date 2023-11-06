extends Control

@onready var npc_object = $npc_object
@onready var npc_sprite = $"TabContainer/Basic Info/general_info/npc_sprite"
@onready var npc_sprite_combat = $"TabContainer/Basic Info/general_info/npc_sprite_combat"
@onready var npc_name = $"TabContainer/Basic Info/general_info/npc_name"
@onready var flag_required = $"TabContainer/Basic Info/flag_required"
@onready var flag_given = $"TabContainer/Basic Info/flag_given"
@onready var flag_kill = $"TabContainer/Basic Info/flag_kill"
@onready var check_remove_finish = $"TabContainer/Basic Info/remove_on_finish/check_remove_finish"

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass
