const Enmap = require("enmap");

module.exports = {
  maps: new Enmap({ name: "maps" }),
  shop: new Enmap({ name: "shop" }),
  profile: new Enmap({ name: "profile" }),
  creature_stats: new Enmap({ name: "creature_stats" }),
};