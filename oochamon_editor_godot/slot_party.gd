extends VBoxContainer

@export var slot_enabled = false
@export var slot_species = 0
@export var slot_level = 1
@export var slot_ability = 0
@export var slot_hp = 0
@export var slot_atk = 0
@export var slot_def = 0
@export var slot_spd = 0
@export var slot_move1 = 0
@export var slot_move2 = 0
@export var slot_move3 = 0
@export var slot_move4 = 0
@export var slot_nickname = ""
var refreshed = false


@onready var o_slot_enable = $row_enable/slot_enable
@onready var o_slot_species = $row_general/slot_species
@onready var o_slot_level = $row_general/slot_level
@onready var o_slot_ability = $row_general/slot_ability
@onready var row_general = $row_general
@onready var row_element = $row_element
@onready var row_ivs = $row_ivs
@onready var row_moves = $row_moves
@onready var o_move_1 = $row_moves/move1
@onready var o_move_2 = $row_moves/move2
@onready var o_move_3 = $row_moves/move3
@onready var o_move_4 = $row_moves/move4
@onready var summary = $summary
@onready var element_texture = $row_element/element_texture
@onready var element_lable = $row_element/element_lable
@onready var o_slot_hp = $row_ivs/slot_hp
@onready var o_slot_atk = $row_ivs/slot_atk
@onready var o_slot_def = $row_ivs/slot_def
@onready var o_slot_spd = $row_ivs/slot_spd


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

func _on_slot_enable_toggled(button_pressed):
	slot_enabled = button_pressed
	row_general.visible = slot_enabled
	row_ivs.visible = slot_enabled
	row_moves.visible = slot_enabled
	row_element.visible = slot_enabled
	summary.visible = slot_enabled

func _on_slot_species_item_selected(index):
	var id = o_slot_species.get_item_id(index)
	refresh_abilities(id)
	refresh_moves(id)
	refresh_summary(id)
	slot_species = id

func refresh_abilities(index):
	if index != -1:
		var ooch_data = Global.DataOochamon[index]
		var element = Global.element_info(ooch_data.ooch_element)
		element_lable.text = element[0]
		element_texture.texture = element[1]
		#element_texture.Container Sizing
		
		o_slot_ability.clear()
		var ability
		for i in ooch_data.ooch_ability.size():
			ability = ooch_data.ooch_ability[i]
			o_slot_ability.add_item(Global.DataAbilities[ability].ability_name, ability)
			o_slot_ability.set_item_tooltip(i,Global.DataAbilities[ability].ability_desc)
			if i == 0:
				slot_ability = ability
			
func refresh_moves(index):
	print(["move_refresh", index])
	if index != -1:
		var ooch_data = Global.DataOochamon[index]
		var children = row_moves.get_children()
		var child
		
		var move
		var move_id
		var move_lv
		var element
		var element_texture
		var step = 0
		var tip
		for i in children.size():
			child = children[i]
			child.clear()
			child.add_item("",-1)
			child.set_item_id(0, -1)
			for j in ooch_data.ooch_moves.size():
				move_lv = ooch_data.ooch_moves[j].move_level
				move_id = ooch_data.ooch_moves[j].move_index
				
				if move_lv <= slot_level:
					move = Global.DataMoves[move_id]
					element_texture = Global.element_info(Global.DataMoves[move_id].move_element)[1]
					tip = (move.move_desc + "\n" +
						"Damage: " + str(move.move_power) + "\n" +
						"Accuracy: " + str(move.move_acc) + "\n"
					)
					if(move.move_status != "-1"):
						tip += "(" + str(move.move_chance) + "%) " + move.move_status.capitalize()
					child.add_icon_item(element_texture, Global.DataMoves[move_id].move_name, move_id)
					child.set_item_tooltip(step + 1, tip)
					step += 1
					
					if(i == 1):
						slot_move1 = move_id
			#if this is the first, set it to Bash
			if i == 0:
				child.select(1)
				
			
					

func _on_slot_level_value_changed(value):
	slot_level = value
	refresh_summary(slot_species)
	refresh_moves(slot_species)
	
func _on_slot_ability_item_selected(index):
	slot_ability = o_slot_ability.get_item_id(index)

func refresh_summary(index):
	slot_hp = o_slot_hp.value
	slot_atk = o_slot_atk.value
	slot_def = o_slot_def.value
	slot_spd = o_slot_spd.value
	
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

func _on_move_1_item_selected(index):
	slot_move1 = o_move_1.get_item_id(index)

func _on_move_2_item_selected(index):
	slot_move2 = o_move_2.get_item_id(index)

func _on_move_3_item_selected(index):
	slot_move3 = o_move_3.get_item_id(index)

func _on_move_4_item_selected(index):
	slot_move4 = o_move_4.get_item_id(index)
