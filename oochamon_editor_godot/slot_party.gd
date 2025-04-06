extends VBoxContainer


@onready var o_slot_enable = $row_enable/slot_enable

@onready var o_slot_species = $row_general/slot_species
@onready var o_slot_level = $row_general/slot_level
@onready var o_slot_nickname = $row_element/nickname

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

var slot_data = {
	"slot_enabled" : false,
	"id" : 0,
	"nickname" : "",
	"level" : 5,
	"ability" : -1,
	"item" : -1,
	"hp_iv" : 0,
	"atk_iv" : 0,
	"def_iv" : 0,
	"spd_iv" : 0,
	"moveset" : [9999, 9999, 9999, 9999]
}

func index_js2gd(index):
	if(index < 0):
		index = 10_000 + abs(index)
	index = int(index)
	return index

# Called when the node enters the scene tree for the first time.
func _ready():
	
	for key in Global.DataOochamon:
		var ooch = Global.DataOochamon[key]
		var ooch_index = ooch.ooch_index
		ooch_index = index_js2gd(ooch_index)
		print([ooch_index, ooch.ooch_name, ooch.ooch_texture])
		o_slot_species.add_icon_item(
			ooch.ooch_texture,
			ooch.ooch_name,
			ooch_index
		)
	
	refresh_abilities(slot_data.id)
	refresh_moves(slot_data.id)
	refresh_summary(slot_data.id)
	
	while slot_data.moveset.size() < 4:
		slot_data.moveset.push_back(9999)

#Called just after the ready function does its thing
func re_ready():
	if(slot_data.slot_enabled):
		o_slot_enable.button_pressed = true
		_on_slot_enable_toggled(true)
	
	var slot_id = index_js2gd(slot_data.id)
	o_slot_species.select(o_slot_species.get_item_index(slot_id))
	o_slot_level.update_on_text_changed = false
	o_slot_level.value = slot_data.level
	o_slot_level.update_on_text_changed = true
	
	refresh_abilities(slot_data.id)
	refresh_moves(slot_data.id, false)
	
	o_slot_ability.select(o_slot_ability.get_item_index(slot_data.ability))
	o_slot_nickname.text = slot_data.nickname

	o_move_1.select(o_move_1.get_item_index(slot_data.moveset[0]))
	o_move_2.select(o_move_2.get_item_index(slot_data.moveset[1]))
	o_move_3.select(o_move_3.get_item_index(slot_data.moveset[2]))
	o_move_4.select(o_move_4.get_item_index(slot_data.moveset[3]))
	
	o_slot_hp.value = slot_data.hp_iv
	o_slot_atk.value = slot_data.atk_iv
	o_slot_def.value = slot_data.def_iv
	o_slot_spd.value = slot_data.spd_iv
	
	refresh_summary(slot_data.id)

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass

func _on_slot_enable_toggled(button_pressed):
	slot_data.slot_enabled = button_pressed
	row_general.visible = button_pressed
	row_ivs.visible = button_pressed
	row_moves.visible = button_pressed
	row_element.visible = button_pressed
	summary.visible = button_pressed

func _on_slot_species_item_selected(index):
	var id = o_slot_species.get_item_id(index)
	var ooch_data  = Global.DataOochamon[str(id)]
	refresh_abilities(ooch_data.ooch_index)
	refresh_moves(ooch_data.ooch_index)
	refresh_summary(ooch_data.ooch_index)
	slot_data.id = ooch_data.ooch_index

func refresh_abilities(index):
	index = index_js2gd(index)
	var ooch_data = Global.DataOochamon[str(index)]

	#clear previously set elements
	for child in element_lable.get_children():
		child.queue_free()
	
	#add fresh elements
	for element in ooch_data.ooch_element:
		var el = Global.element_info(element)
		var obj_text = Label.new()
		obj_text.text = el[0]
		element_lable.add_child(obj_text)
		var obj_texture = TextureRect.new()
		obj_texture.texture = el[1]
		element_lable.add_child(obj_texture)			
		
	#clear abilities
	o_slot_ability.clear()
	var ability
	var already_set = false
	
	#add abilities
	for i in ooch_data.ooch_ability.size():
		ability = ooch_data.ooch_ability[i]
		o_slot_ability.add_item(Global.DataAbilities[ability].ability_name, ability)
		o_slot_ability.set_item_tooltip(i,Global.DataAbilities[ability].ability_desc)
		if slot_data.ability == ability:
			o_slot_ability.select(i)
		elif i == 0 and slot_data.ability == -1:
			slot_data.ability = ability
			already_set = true
			
	o_slot_ability.add_item("Random", 9999)
	
	#set the default ability to be randomized by default
	if(!already_set):
		var rand_id = o_slot_ability.item_count
		o_slot_ability.select(o_slot_ability.item_count - 1)
			
			
func refresh_moves(index, overwrite = true):
	index = index_js2gd(index)
	while(slot_data.moveset.size() < 4):
		slot_data.moveset.push_back(9999)
	
	
	index = index_js2gd(index)
	var ooch_data = Global.DataOochamon[str(index)]
	var children = row_moves.get_children()
	var child
	
	var move
	var move_id
	var move_lv
	var element
	var element_texture
	
	var tip
	for i in children.size():
		var step = 0
		child = children[i]
		child.clear()
		child.add_item("",9999)
		child.set_item_id(0, 9999)
		for j in ooch_data.ooch_moves.size():
			move_lv = ooch_data.ooch_moves[j].move_level
			move_id = ooch_data.ooch_moves[j].move_index
			
			if move_lv > slot_data.level and slot_data.moveset[i] == move_id:
				child.select(0)
				slot_data.moveset[i] = 9999
			
			if move_lv <= slot_data.level:
				move = Global.DataMoves[move_id]
				element_texture = Global.element_info(move.move_element)[1]
				tip = (move.move_desc + "\n" +
					"Damage: " + str(move.move_power) + "\n" +
					"Accuracy: " + str(move.move_acc) + "\n\n"
				)
				
				#Status Effects
				for effect in move.move_status:
					var target_text = ""
					match int(effect.target):
						0: target_text = " Self "
						1: target_text = " Enemy "
						2: target_text = " All "
						3: target_text = " " #none
						_: print("n/a")
							
					tip += str(effect.chance) + "% " + target_text + Global.status_to_string(effect.status) 
				
				#Tags
				if move.move_tags.size() > 0:
					tip += "\n\nTags: " + str(move.move_tags)
					
				child.add_icon_item(element_texture, move.move_name, move_id)
				child.set_item_tooltip(step + 1, tip)
				step += 1
				
				if(slot_data.moveset[i] == move_id):
					child.select(j + 1)
					overwrite = false

		#if this is the first, set it to the first move the mon can learn
		if (i == 0) and (overwrite):
			child.select(1)
			slot_data.moveset[0] = child.get_item_id(1)
		
	while(slot_data.moveset.size() < 4):
		slot_data.moveset.push_back(9999)	

func _on_slot_level_value_changed(value):
	slot_data.level = value
	refresh_summary(slot_data.id)
	refresh_moves(slot_data.id)
	
func _on_slot_ability_item_selected(index):
	slot_data.ability = o_slot_ability.get_item_id(index)
	print(slot_data.ability)

func refresh_summary(index):
	index = index_js2gd(index)
	var ooch = Global.DataOochamon[str(index)]
	var hp = floor(ooch.ooch_hp * pow(1.05, slot_data.level) * (slot_data.hp_iv/10 + 1)) + 10
	var atk = floor(ooch.ooch_atk * pow(1.05, slot_data.level) * (slot_data.atk_iv/10 + 1))
	var def = floor(ooch.ooch_def * pow(1.05, slot_data.level) * (slot_data.def_iv/10 + 1))
	var spd = floor(ooch.ooch_spd * pow(1.05, slot_data.level) * (slot_data.spd_iv/10 + 1))
	summary.text = "Stats:\n"
	summary.text += "HP:	" + str(hp) + "\n"
	summary.text += "ATK:	" + str(atk) + "\n"
	summary.text += "DEF:	" + str(def) + "\n"
	summary.text += "SPD:	" + str(spd) + "\n"

func _on_slot_hp_value_changed(value):
	slot_data.hp_iv = value 
	refresh_summary(slot_data.id)

func _on_slot_atk_value_changed(value):
	slot_data.atk_iv = value 
	refresh_summary(slot_data.id)
	
func _on_slot_def_value_changed(value):
	slot_data.def_iv = value 
	refresh_summary(slot_data.id)
	
func _on_slot_spd_value_changed(value):
	slot_data.spd_iv = value 
	refresh_summary(slot_data.id)

func _on_move_1_item_selected(index):
	print(slot_data.moveset)
	print(o_move_1.get_item_id(index))
	fill_empty_moves()
	slot_data.moveset[0] = o_move_1.get_item_id(index)

func _on_move_2_item_selected(index):
	print(slot_data.moveset)
	print(o_move_2.get_item_id(index))
	fill_empty_moves()
	slot_data.moveset[1] = o_move_2.get_item_id(index)

func _on_move_3_item_selected(index):
	print(slot_data.moveset)
	print(o_move_3.get_item_id(index))
	fill_empty_moves()
	slot_data.moveset[2] = o_move_3.get_item_id(index)

func _on_move_4_item_selected(index):
	print(slot_data.moveset)
	print(o_move_4.get_item_id(index))
	fill_empty_moves()
	slot_data.moveset[3] = o_move_4.get_item_id(index)
	

func _on_nickname_text_changed(new_text: String) -> void:
	slot_data.nickname = new_text

func fill_empty_moves() -> void:
	while(slot_data.moveset.size() < 4):
		slot_data.moveset.push_back(9999)

func _on_slot_randomize_ivs_pressed() -> void:
	var _hp = randi_range(0, 10)
	var _atk = randi_range(0, 10)
	var _def = randi_range(0, 10)
	var _spd = randi_range(0, 10)
	
	o_slot_hp.value = _hp
	o_slot_atk.value = _atk
	o_slot_def.value = _def
	o_slot_spd.value = _spd
