globalvar tiles,map_array,map_name,map_w,map_h,spawn_list,tile_size,tile_mouse_x,tile_mouse_y,ooch_array,trainer_list,trainer_sprites,chest_list,chest_sprites,items_list;
globalvar spawnx, spawny, collision_array, npc_list;
tiles = array_create(0);
map_array = array_create(0);
ooch_array = array_create(0);
spawn_list = array_create(0);
trainer_list = array_create(0);
trainer_sprites = array_create(0);
chest_list = array_create(0);
chest_sprites = array_create(0);
items_list = array_create(0);
collision_array = array_create(0);
npc_list = array_create(0);
tile_size = 32;

tile_mouse_x = 0;
tile_mouse_y = 0;

spawnx = 2;
spawny = 2;

map_name = "testmap";
map_w = 5;
map_h = 5;

draw_set_font(fnt_default)

#macro FLOOR "f"
#macro BLOCKED "b"
#macro CHEST "c"
#macro TRAINER "t"
#macro SPAWN "s"

#region TILE INFO
	create_tile_type(tile_obsidian,			1,	"<:tObsd:921225027557412975>",	FLOOR);
	create_tile_type(tile_obsidian_blocked,	2,	"<:tObsdB:921225027624501268>", BLOCKED);
	create_tile_type(tile_sand,				3,	"<:tSand:921220712641986572>",	FLOOR);
	create_tile_type(tile_sand_blocked,		4,	"<:tSandB:921220723110977606>", BLOCKED);
	create_tile_type(tile_shroom,			5,	"<:tShrm:921230053499617331>",	FLOOR);
	create_tile_type(tile_shroom_blocked,	7,	"<:tShrmB:921230053503819777>",	BLOCKED);
	create_tile_type(tile_hub,				8,	"<:tHUB:921240940641939507>",	FLOOR);
	create_tile_type(tile_hub_blocked,		9,	"<:tHUBB:921240940641919056>",	BLOCKED);
#endregion

#region OOCHAMON CREATION
	//Sporbee
	create_monster("0", sporbee, "Sporbee", "https://cdn.discordapp.com/attachments/921949708971294750/921950169560387644/sporbee.png",
	"An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.", "fungal", 8, 12, 8, 12, //total 40
	[ [1,1],[3,2],[8,5],[13,6],[17,10],[27,13],[-1,18] ], [ "Miniscule", "Icky" ],  1, 16)

	//Stingrowth
	create_monster("1", stingrowth, "Stingrowth", "https://cdn.discordapp.com/attachments/921949708971294750/921950181845532722/stingrowth.png",
	"A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.", "fungal", 15, 20, 11, 14, //total 60
	[ [1,1],[5,2],[9,5],[16,6],[20,10],[33,13],[-1,18] ], [ "Burdened", "Icky" ],  2, 32)

	//Queenect
	create_monster("2", queenect, "Queenect", "https://cdn.discordapp.com/attachments/921949708971294750/921950201080610906/queenect.png",
	"A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.", "fungal", 25, 25, 16, 14, //total 80
	[ [1,1],[6,2],[12,5],[20,6],[25,10],[36,13],[-1,18] ], [ "Burdened", "Broodmother" ],  -1, -1)

	// Roocky
	create_monster("3", roock, "Roocky", "https://cdn.discordapp.com/attachments/921949708971294750/921950312300957776/roock.png",
	"A ancient, crumbling pillar. The shadows beneath it are oddly comforting.", "stone", 12, 8, 12, 8, //total 40
	[ [1,1],[3,3],[8,7],[13,7],[17,11],[27,14],[-1,20] ], [ "Tough", "Shadow" ], 4, 16)

	//Graknight
	create_monster("4", graknight, "Graknight", "https://cdn.discordapp.com/attachments/921949708971294750/921950330516807731/graknight.png",
	"The stones have continued deteriorating revealing a gremlin-like form, it weilds fragments of its former body as a spear.", "stone", 18, 15, 15, 12, //total 60
	[ [1,1],[5,3],[9,7],[16,7],[20,11],[33,14],[-1,20] ], [ "Withering", "Shadow" ], 5, 32)

	//Diamount
	create_monster("5", diamount, "Diamount", "https://cdn.discordapp.com/attachments/921949708971294750/921950340826407022/diamount.png",
	"Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.", "stone", 22, 18, 22, 18, //total 80
	[ [1,1],[6,3],[12,7],[20,7],[25,11],[36,14],[-1,20] ], [ "Withering", "Darkbright"], -1, -1)

	//Puppyre
	create_monster("6", puppyre, "Puppyre", "https://cdn.discordapp.com/attachments/921949708971294750/921950375316172841/puppyre.png",
	"A very good boy, empowered by the spiraling patterns on its body.", "flame", 10, 12, 8, 10, //total 40
	[ [1,1],[3,4],[8,8],[12,12],[17,23],[27,15],[-1,21] ], [ "Gentle", "Warm" ], 7, 16)

	//Dogglow
	create_monster("7", dogglow, "Dogglow", "https://cdn.discordapp.com/attachments/921949708971294750/921950394492518432/dogglow.png",
	"The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.", "flame", 13, 18, 14, 15, //total 60
	[ [1,1],[5,4],[9,8],[16,12],[20,23],[33,15],[-1,21] ], [ "Gentle", "Radiant" ], 8, 32)

	//Hounuke
	create_monster("8", hounuke, "Hounuke", "https://cdn.discordapp.com/attachments/921949708971294750/921950404923760700/hounuke.png",
	"Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.", "flame", 16, 26, 18, 20, //total 80
	[ [1,1],[6,4],[12,8],[20,12],[25,23],[36,15],[-1,21] ], [ "Conflicted", "Radiant" ], -1, -1)

	//Glither
	create_monster("9", glither, "Glither", "https://cdn.discordapp.com/attachments/921949708971294750/921950503754141786/glither.png",
	"Its diamond-hard skin protects it from the most brutal of sandstorms.", "stone", 15, 9, 14, 12, //total 50
	[ [1,1],[3,3],[8,5],[13,7],[21,9],[27,16],[34,39],[-1,17] ], [ "Tough", "Reactive" ], 10, 18)

	//Sparafura
	create_monster("10", sparafuna, "Sparafura", "https://cdn.discordapp.com/attachments/921949708971294750/921950515410112553/sparafuna.png",
	"These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.", "stone", 18, 25, 16, 11, //total 70
	[ [1,1],[4,3],[12,5],[18,7],[25,9],[31,16],[40,39],[-1,17] ], [ "Burrower", "Reactive" ], -1, -1)
        
	//Constone
	create_monster("11", constone, "Constone", "https://cdn.discordapp.com/attachments/921949708971294750/921950553695715388/constone.png",
	"Found on salt flats, these strange beings move about on a single wheel rather than legs.", "stone", 10, 10, 10, 20, //total 50
	[ [1,0],[4,3],[7,24],[18,11],[26,35],[-1,26] ], [ "Inertia", "Dense" ], 12, 25)

	//Amephyst
	create_monster("12", amephyst, "Amephyst", "https://cdn.discordapp.com/attachments/921949708971294750/921950566777757736/amephyst.png",
	"The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.", "stone", 15, 20, 15, 30, //total 80
	[ [1,1],[5,3],[8,24],[21,11],[30,35],[33,17],[-1,26] ], [ "Inertia", "Dense" ], -1, -1)

	//Widew
	create_monster("13", widew, "Widew", "https://cdn.discordapp.com/attachments/921949708971294750/921950600042790942/widew.png",
	"The growth on its back forms a symbyotic relationship with the host, maximizing the amount of nutrients each can absorb.", "fungal", 14, 10, 9, 12, //total 35
	[ [1,0],[3,2],[7,9],[11,28],[-1,16] ], [ "Moist", "Miniscule" ], 14, 12)

	//Tarotula
	create_monster("14", tarotula, "Tarotula", "https://cdn.discordapp.com/attachments/921949708971294750/921950611686191124/tarotula.png",
	"The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.", "fungal", 21, 17, 12, 15, //total 65
	[ [1,0],[4,2],[8,9],[13,28],[18,6],[24,10],[32,13],[-1,16] ], [ "Moist", "Alert" ], -1, -1)

	//Moldot
	create_monster("15", moldot, "Moldot", "https://cdn.discordapp.com/attachments/921949708971294750/921950639355994172/moldot.png",
	"Novice explorers are often shocked by just how much of this creature is buried beneath the surface.", "fungal", 5, 5, 25, 5, //total 40
	[ [1,1],[5,2],[12,6],[17,23],[24,19],[40,13],[-1,39] ], [ "Gentle", "Burrower" ], 16, 30)

	//Moldire
	create_monster("16", moldire, "Moldire", "https://cdn.discordapp.com/attachments/921949708971294750/921950651049734144/moldire.png",
	"Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.", "fungal", 25, 25, 30, 5, //total 85
	[ [1,1],[7,2],[14,6],[20,23],[32,19],[40,34],[50,13],[-1,39] ], [ "Gentle", "Reactive" ], -1, -1)

	//Charlite
	create_monster("17", charlite, "Charlite", "https://cdn.discordapp.com/attachments/921949708971294750/921950791105908766/charlite.png",
	"Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.", "flame", 5, 15, 5, 10, //total 35
	[ [1,0],[4,4],[10,7],[16,25],[22,8],[27,20],[37,12],[-1,21] ], [ "Fleeting", "Warm" ], 18, 15)

	//Darcoal
	create_monster("18", darcoal, "Darcoal", "https://cdn.discordapp.com/attachments/921949708971294750/921950803445579776/darcoal.png",
	"This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.", "flame", 15, 35, 13, 12, //total 75
	[ [1,0],[6,4],[12,7],[18,25],[24,8],[30,20],[40,12],[-1,21] ], [ "Efficient", "Warm" ], -1, -1)

	//Torchoir
	create_monster("19", tochoir, "Torchoir", "https://cdn.discordapp.com/attachments/921949708971294750/921950825977364510/tochoir.png",
	"A sentient torch that hums a haunting tune. Its song fills people with dread.", "flame", 12, 13, 11, 9, //total 45
	[ [1,1],[3,4],[7,9],[12,24],[17,12],[21,23],[27,30],[-1,26] ], [ "Boisterous", "Haunted" ], 20, 28)

	//Chantern
	create_monster("20", chantern, "Chantern", "https://cdn.discordapp.com/attachments/921949708971294750/921950839004880896/chantern.png",
	"It can mimic the human voice nearly perfectly, though it only speaks in random phrases.", "flame", 21, 20, 24, 15, //total 80
	[ [1,1],[5,4],[8,9],[13,24],[19,12],[25,23],[32,30],[-1,26] ], [ "Boisterous", "Haunted" ], -1, -1)

	//Eluslug
	create_monster("21", eluslug, "Eluslug", "https://cdn.discordapp.com/attachments/921949708971294750/921950857396912138/eluslug.png",
	"Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.", "tech", 11, 12, 12, 14, //total 50
	[ [1,1],[10,22],[-1,38] ], [ "Leech", "Icky" ], -1, -1)

	//Jellime
	create_monster("22", jellime, "Jelime", "https://cdn.discordapp.com/attachments/921949708971294750/921987464854401044/jellime.png",
	"A jellyfish-like creature, its probing tendrils ensnare whatever they touch.", "ooze", 14, 10, 16, 10, //total 50
	[ [1,1],[3,29],[7,24],[11,23],[18,9],[25,29],[-1,38] ], [ "Ensnare", "Icky" ], 23, 26)

	//Meduslime
	create_monster("23", meduslime, "Meduslime", "https://cdn.discordapp.com/attachments/921949708971294750/921987499214127104/meduslime.png",
	"With a strangely developed nervous system, this creature is capable of exploting any weaknesses it finds.", "ooze", 16, 25, 19, 15, //total 75
	[ [1,1],[7,29],[14,24],[17,23],[22,9],[30,29],[-1,38] ], [ "Ensnare", "Icky" ], -1, -1)

	//Tisparc
	create_monster("24", tisparc, "Tisparc", "https://cdn.discordapp.com/attachments/921949708971294750/921987527676674058/tisparc.png",
	"The hat-like crystal on its head grants it a magical energy which it cannot quite control.", "magic", 8, 15, 7, 10, //total 45
	[ [1,1],[5,24],[9,25],[14,26],[21,16],[26,27],[35,17],[-1,12] ], [ "Uncontrolled", "Apprentice" ], 25, 18)

	//Wizzap
	create_monster("25", wizzap, "Wizzap", "https://cdn.discordapp.com/attachments/921949708971294750/921987540641280062/wizzap.png",
	"It has mastered control of its crystal and uses it to produce highly dangerous magic arcs.", "magic", 13, 23, 12, 12, //total 65
	[ [1,1],[8,24],[13,25],[22,26],[27,16],[30,27],[44,17],[-1,12] ], [ "Focused", "Patient" ], -1, -1)

	//Blipoint
	create_monster("26", blipoint, "Blipoint", "https://cdn.discordapp.com/attachments/921949708971294750/921987566956347392/blipoint.png",
	"An eye peeks through a rift in space-time.", "magic", 10, 7, 6, 7, //total 30
	[ [1,1],[5,30],[15,5],[25,9],[35,31],[-1,19] ], [ "Fleeting", "Reactive" ], 27, 20)        

	//Rerune
	create_monster("27", rerune, "Rerune", "https://cdn.discordapp.com/attachments/921949708971294750/921987598103248927/rerune.png",
	"What seems to be part of a face begins to emerge from the rift, unable to fully reveal itself.", "magic", 10, 15, 15, 15, //total 55
	[ [1,1],[10,30],[20,5],[30,9],[40,31],[-1,19] ], [ "Fleeting", "Reactive" ], 28, 40)   

	//Temporath
	create_monster("28", temporath, "Temporath", "https://cdn.discordapp.com/attachments/921949708971294750/921987610262536192/temporath.png",
	"It was not meant to exist here and now, so it experiences episodes of uncontrollable rage.", "magic", 20, 20, 20, 20, //total 80
	[ [1,1],[15,30],[25,5],[35,9],[45,31],[-1,19] ], [ "Uncontrolled", "Withering" ], -1, -1)

	//Nucleorb
	create_monster("29", nucleorb, "Nucleorb", "https://cdn.discordapp.com/attachments/921949708971294750/922300388202397726/nucleorb.png",
	"The nucleus of a cell grown to a massive size, for a cell that is. This rarity is relatively helpless on its own.", "ooze", 7, 13, 9, 11, //total 40
	[ [1,1],[5,29],[11,33],[18,34],[24,19],[-1,10] ], [ "Miniscule", "Gentle" ], 30, 12)

	//Amebite
	create_monster("30", amebite, "Amebite", "https://cdn.discordapp.com/attachments/921949708971294750/922300401720655923/amebite.png",
	"A ravenous macrocell that eats anything in its path, they grow and reproduce quickly enough to overrun entire ecosystems.", "ooze", 11, 18, 12, 14, //total 55
	[ [1,1],[7,29],[18,33],[23,34],[35,19],[-1,10] ], [ "Tough", "Ravenous" ], 31, 28)

	//Amalgrime
	create_monster("31", amalgrime, "Amalgrime", "https://cdn.discordapp.com/attachments/921949708971294750/922300413590519848/amalgrime.png",
	"When an ecosystem is overrun by Amebite they eventually converge on a single point. The result is a massive, yet oddly gentle being.", "ooze", 25, 20, 20, 20, //total 85
	[ [1,1],[12,29],[24,33],[29,34],[41,19],[-1,10] ], [ "Immense", "Gentle" ], -1, -1)

	//Drilline
	create_monster("32", drilline, "Drilline", "https://cdn.discordapp.com/attachments/921949708971294750/922300426114715658/drilline.png",
	"Despite a simplified system, these robots are prone to going rogue. How they sustain themselves in the wild remains a mystery.", "tech", 11, 14, 15, 5, //total 45
	[ [1,1],[4,3],[7,37],[12,39],[20,36],[29,35],[-1,11] ], [ "Armored", "Inertia" ], 33, 21)

	//Erwrek
	create_monster("33", erwrek, "Erwrek", "https://cdn.discordapp.com/attachments/921949708971294750/922300437690982431/erwrek.png",
	"It consumes whatever it can to replace its broken parts, when choices are slim it will even make use of organic material.", "tech", 15, 19, 25, 16, //total 75
	[ [1,1],[9,3],[12,37],[17,39],[27,36],[35,35],[-1,11] ], [ "Armored", "Leech" ], -1, -1)

	//i_
	create_monster("34", i_, "i", "https://cdn.discordapp.com/attachments/921949708971294750/922300450206801950/i.png",
	"ERROR: entry not found", "void", 1, 1, 1, 1, //total 30
	[ [1,40] ], [ "0000", "0000" ], -1, -1)
#endregion

#region TRAINER SPRITES
	create_trainer_sprite(tile_player,"<:tile_player:921492132966060042>");
#endregion

#region TRAINER SPRITES
	create_chest_sprite(tile_chest,"<:tile_chest:921486599223664640>");
#endregion

#region ITEMS

	create_item(0,	"Potion",			item_potion);
	create_item(1,	"Hi-Potion",		item_potion_hi);
	create_item(2,	"Max-Potion",		item_potion_magic);
	create_item(3,	"Prism",			item_prism);
	create_item(4,	"Greater Prism",	item_prism_greater);
	create_item(5,	"Grand Prism",		item_prism_grand);
	create_item(6,	"Perfect Prism",	item_prism_perfect);
	create_item(7,	"Attack Crystal",	item_attack_crystal);
   
#endregion