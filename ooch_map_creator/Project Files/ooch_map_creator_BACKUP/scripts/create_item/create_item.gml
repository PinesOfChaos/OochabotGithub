// Script assets have changed for v2.3.0 see
// https://help.yoyogames.com/hc/en-us/articles/360005277377 for more information
function create_item(id,name,sprite){
	var obj = {
		id : id,
		name : name,
		sprite : sprite,
	}
	array_push(items_list,obj);
}