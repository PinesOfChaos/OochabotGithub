trainer_data = {
	sprite:			tile_player,
	id:				array_length(trainer_list),
	emote:			"<:tile_player:921492132966060042>",
	name:			"",
	class:			"",
	party:			[],
	slot_active:	0,
	x:				0,
	y:				0,
	facing:			"down",
	dialogue_start:	"I didn't get any BATTLE START dialogue, go bother a dev.",
	dialogue_end:	"I didn't get any BATTLE END dialogue, go bother a dev."
}

local_pause = false;

state = "place";
initial_entries = true;
text_recieve = -1;
my_input = noone;

depth = -4;