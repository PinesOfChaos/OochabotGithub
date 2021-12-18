const Enmap = require("enmap");

module.exports = {
  maps: new Enmap({ name: "maps" }),
  shop: new Enmap({ name: "shop" }),
  profile: new Enmap({ name: "profile" }),
  monster_data: new Enmap({ name: "monster_data" }),
  move_data: new Enmap({ name: "move_data"})
};