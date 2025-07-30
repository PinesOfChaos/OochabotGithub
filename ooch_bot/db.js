import Enmap from "enmap";
import process from 'node:process';
process.setMaxListeners(20);

export const maps = new Enmap({ name: "maps" });
export const profile = new Enmap({ name: "profile" });
export const monster_data = new Enmap({ name: "monster_data" });
export const move_data = new Enmap({ name: "move_data" });
export const player_positions = new Enmap({ name: "player_positions" });
export const item_data = new Enmap({ name: "item_data" });
export const ability_data = new Enmap({ name: "ability_data" });
export const status_data = new Enmap({ name: "status_data" });
export const stance_data = new Enmap({ name: "stance_data" });
export const tile_data = new Enmap({ name: "tile_data" });
export const events_data = new Enmap({ name: "events_data" });
export const global_data = new Enmap({ name: "global_data" });
export const battle_data = new Enmap({ name: "battle_data" });

