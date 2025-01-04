const Enmap = require("enmap");

module.exports = {
  maps: new Enmap({ name: "maps" }),
  shop: new Enmap({ name: "shop" }),
  profile: new Enmap({ name: "profile" }),
  monster_data: new Enmap({ name: "monster_data" }),
  move_data: new Enmap({ name: "move_data"}),
  player_positions: new Enmap({ name: "player_positions"}),
  item_data: new Enmap({ name: "item_data" }),
  ability_data: new Enmap({ name: "ability_data" }),
  status_data: new Enmap({ name: "status_data" }),
  tile_data: new Enmap({ name: "tile_data" }),
  events_data: new Enmap({ name: "events_data" }),
  global_data: new Enmap({ name: "global_data" }),
  battle_data: new Enmap({ name: "battle_data" }),
};