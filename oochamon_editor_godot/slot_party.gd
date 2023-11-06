extends VBoxContainer

var slot_enabled = false
var slot_species = 0
var slot_level = 1
var slot_ability = 0
var slot_hp = 0
var slot_atk = 0
var slot_def = 0
var slot_spd = 0
var slot_move1 = 0
var slot_move2 = 0
var slot_move3 = 0
var slot_move4 = 0
var refreshed = false


@onready var o_slot_enable = $row_enable/slot_enable
@onready var o_slot_species = $row_general/slot_species
@onready var o_slot_level = $row_general/slot_level
@onready var o_slot_ability = $row_general/slot_ability
@onready var row_general = $row_general
@onready var row_ivs = $row_ivs
@onready var row_moves = $row_moves
@onready var move_1 = $row_moves/move1
@onready var move_2 = $row_moves/move2
@onready var move_3 = $row_moves/move3
@onready var move_4 = $row_moves/move4
@onready var summary = $summary

# Called when the node enters the scene tree for the first time.
func _ready():
	pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	if(!refreshed):
		refreshed = true
		refresh_abilities(slot_species)
		refresh_moves(slot_species)
		refresh_summary(slot_species)
		
		for i in Global.DataOochamon.size():
			o_slot_species.add_icon_item(
				Global.DataOochamon[i].ooch_texture,
				Global.DataOochamon[i].ooch_name,
				i
			)
			print(Global.DataOochamon[i].ooch_texture)

func _on_slot_enable_toggled(button_pressed):
	slot_enabled = button_pressed
	row_general.visible = slot_enabled
	row_ivs.visible = slot_enabled
	row_moves.visible = slot_enabled
	summary.visible = slot_enabled

func _on_slot_species_item_selected(index):
	refresh_abilities(index)
	refresh_moves(index)
	refresh_summary(index)
	slot_species = index

func refresh_abilities(index):
	if index != -1:
		var ooch_data = Global.DataOochamon[index]
		o_slot_ability.clear()
		var ability
		for i in ooch_data.ooch_ability.size():
			ability = ooch_data.ooch_ability[i]
			o_slot_ability.add_item(Global.DataAbilities[ability].ability_name, ability)
			o_slot_ability.set_item_tooltip(i,Global.DataAbilities[ability].ability_desc)
			
func refresh_moves(index):
	print(["move_refresh", index])
	if index != -1:
		var ooch_data = Global.DataOochamon[index]
		var children = row_moves.get_children()
		var child
		
		var move
		var move_id
		var move_lv
		var step = 0
		var tip
		for i in children.size():
			child = children[i]
			child.clear()
			child.add_item("",-1)
			for j in ooch_data.ooch_moves.size():
				move_lv = ooch_data.ooch_moves[j].move_level
				move_id = ooch_data.ooch_moves[j].move_index
				if move_lv <= slot_level:
					move = Global.DataMoves[move_id]
					tip = (move.move_desc + "\n" +
						"Damage: " + str(move.move_power) + "\n" +
						"Accuracy: " + str(move.move_acc) + "\n"
					)
					if(move.move_status != "-1"):
						tip += "(" + str(move.move_chance) + "%) " + move.move_status.capitalize()
					child.add_item(Global.DataMoves[move_id].move_name, move_id)
					child.set_item_tooltip(step + 1, tip)
					step += 1
			#if this is the first, set it to Bash
			if i == 0:
				child.select(1)
			
					

func _on_slot_level_value_changed(value):
	slot_level = value
	refresh_summary(slot_species)
	refresh_moves(slot_species)
	
func _on_slot_ability_item_selected(index):
	slot_ability = index

func refresh_summary(index):
	var hp = floor(Global.DataOochamon[index].ooch_hp * pow(1.05, slot_level) * (slot_hp/10 + 1)) + 10
	var atk = floor(Global.DataOochamon[index].ooch_atk * pow(1.05, slot_level) * (slot_atk/10 + 1))
	var def = floor(Global.DataOochamon[index].ooch_def * pow(1.05, slot_level) * (slot_def/10 + 1))
	var spd = floor(Global.DataOochamon[index].ooch_spd * pow(1.05, slot_level) * (slot_spd/10 + 1))
	summary.text = "Stats:\n"
	summary.text += "HP:	" + str(hp) + "\n"
	summary.text += "ATK:	" + str(atk) + "\n"
	summary.text += "DEF:	" + str(def) + "\n"
	summary.text += "SPD:	" + str(spd) + "\n"

func _on_slot_hp_value_changed(value):
	slot_hp = value 
	refresh_summary(slot_species)

func _on_slot_atk_value_changed(value):
	slot_atk = value 
	refresh_summary(slot_species)
	
func _on_slot_def_value_changed(value):
	slot_def = value 
	refresh_summary(slot_species)
	
func _on_slot_spd_value_changed(value):
	slot_spd = value 
	refresh_summary(slot_species)
