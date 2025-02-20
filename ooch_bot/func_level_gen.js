const _ = require('lodash');
const { OochType } = require("./types");

let functions = {
    genmap_theme : function(theme){
        switch(theme){
            default: //Fungal Cave
                return({
                    tile_floor : ["t01_000"],
                    tile_wall : ["t01_006"],
                    tile_edge : ["t01_003"],
                    tile_decor : ["t01_001"],
                    tile_grass : ["t01_002"],

                    type_primary : [OochType.Fungal],
                    type_secondary : [OochType.Stone, OochType.Ooze],

                    map_naturalness : .7
                })
            break;
        }
    },

    genmap_new : function(name, width, height, theme, level_min, level_max, spawn_x, spawn_y){
        let layout = functions.genmap_layout(width, height, Math.ceil(width / 16), Math.ceil(height / 16), 3, 5, theme.map_naturalness);

        
        let tiles = []
        for(let i = 0; i < width; i++){
            tiles[i] = [];
            for(let j = 0; j < height; j++){
                switch(layout[i][j]){
                    case "wall":    tiles[i][j] = theme.tile_wall; break;
                    case "floor":   tiles[i][j] = theme.tile_floor; break;
                    case "grass":   tiles[i][j] = theme.tile_grass; break;
                    case "edge":    tiles[i][j] = theme.tile_edge; break;
                    case "decor":   tiles[i][j] = theme.tile_decor; break;
                }
            }
        }

        let map_data = {
            map_events : [],
            map_npcs : [],
            map_savepoints : [],
            map_shops : [],
            map_spawn_zones : [],
            map_transitions : [],

            map_tiles : tiles,

            map_info : {
                map_battleback : "battle_bg_hub",
                map_name : name
            }
        }

        return(map_data);
    },

    genmap_layout : function(width, height, room_cols, room_rows, room_size_avg, naturalness){

        const lerp = (x, y, a) => x * (1 - a) + y * a;

        //Empty layout
        let layout = []
        for(let i = 0; i < width; i++){
            layout[i] = [];
            for(let j = 0; j < height; j++){
                layout[i][j] = "wall"
            }
        }

        //Decide on rooms
        let rooms = [];
        let room_space_x = width / (room_cols + 1);
        let room_space_y = height / (room_rows + 1);
        for(let i = 0; i < room_cols; i++){
            for(let j = 0; j < room_rows; j++){
                rooms.push({
                    roomgridx : i,
                    roomgridy : j,
                    x : Math.floor((i * room_space_x) + room_space_x + (Math.random() * 2) - 1),
                    y : Math.floor((j * room_space_y) + room_space_y + (Math.random() * 2) - 1),
                    width : Math.round((room_size_avg/2) + (Math.random() * 2) - 1),
                    height : Math.round((room_size_avg/2) + Math.random() - .5),
                    direction : i > 0 ? Math.PI : j > 0 ? Math.PI * 1.5 : -1 
                    //point left if not leftmost, point up if not upmost, otherwise point nowhere
                    //this should connect all nodes by default
                })
            }
        }

        //Decide on hallways
        let hall_x = 0;
        let hall_y = 0;
        for(let i = 0; i < 100; i++){
            let room_at = rooms.find((r) => r.roomgridx == hall_x && r.roomgridy == hall_y);

            let in_range = false;
            while(!in_range){
                let dir = Math.floor(Math.random()*4)/2 * Math.PI;
                let xto = Math.round(room_at.roomgridx + Math.cos(dir));
                let yto = Math.round(room_at.roomgridy + Math.sin(dir));
                if(xto >= 0 && yto >= 0 && xto < room_cols && yto < room_rows){
                    in_range = true;
                    hall_x = xto;
                    hall_y = yto;
                    room_at.direction = dir;

                    let room_to = rooms.find((r) => r.roomgridx == hall_x && r.roomgridy == hall_y);
                    room_to.direction = -1;
                }
            }
        }


        console.log("Adding rooms/halls")

        //Add rooms/halls to the layout
        for(let room of rooms){

            let xmin = Math.max(3, Math.floor(room.x - room.width/2));
            let ymin = Math.max(2, Math.floor(room.y - room.height/2));
            let xmax = Math.min(width - 4, Math.ceil(room.x + room.width/2));
            let ymax = Math.min(height - 3, Math.ceil(room.y + room.height/2));
            let maxlen = Math.sqrt(
                            Math.pow(room.width, 2) + 
                            Math.pow(room.height, 2));
            for(let i = xmin; i < xmax; i++){
                for(let j = ymin; j < ymax; j++){
                    let len = Math.sqrt(
                                    Math.pow(Math.abs(i - room.x), 2) + 
                                    Math.pow(Math.abs(j - room.y), 2));
                    console.log(len, maxlen)
                    let lerp_amnt = len/maxlen;
                    console.log(lerp_amnt)
                    let val = .35 + (lerp_amnt * (1 - naturalness));
                    if(val > .5){
                        layout[i][j] = "floor";
                    }
                }
            }

            /*
            if(room.direction != -1){
                console.log(room)
                let room_to_x = Math.round(room.roomgridx + Math.cos(room.direction));
                let room_to_y = Math.round(room.roomgridx + Math.sin(room.direction));
                let room_to = rooms.find((r) => r.roomgridx == room_to_x && r.roomgridy == room_to_y);

                let corner = _.sample([
                    {x : Math.floor(room.x),    y : Math.floor(room_to.y)},
                    {x : Math.floor(room_to.x), y : Math.floor(room.y)},
                ]);

                let segments = [[corner.x, corner.y], [room_to.x, room_to.y]]

                let xcur = Math.floor(room.x);
                let ycur = Math.floor(room.y);
                
                let steps_total = Math.abs(room_to.x - room.x) + Math.abs(room_to.y - room.y);
                let steps_done = 0;

                let xstep = Math.sign(corner.x - xcur);
                let ystep = Math.sign(corner.y - ycur);
                
                console.log(["hall start", room.x, room.y, corner.x, corner.y, room_to.x, room_to.y]);

                while(segments.length > 0){

                    let segment_cur = segments[0];
                    if(segment_cur[0] == xcur && segment_cur[1] == ycur){
                        let next_segment = segments.shift();
                        if(next_segment != undefined){
                            xstep = Math.sign(next_segment[0] - xcur);
                            ystep = Math.sign(next_segment[1] - ycur);
                            console.log(["cur, next, segments", segment_cur, next_segment, segments])
                            console.log(["x, y, stepx, stepy", xcur, ycur, xstep, ystep])
                            console.log(segments.length);
                        }
                        else{
                            break;
                        }
                    }
                    else{
                        xcur += xstep;
                        ycur += ystep;
                        steps_done++;
                        let line_x = lerp(room.x, room_to.x, steps_done/steps_total);
                        let line_y = lerp(room.y, room_to.y, steps_done/steps_total);
                        let cx = Math.floor(lerp(xcur, line_x, naturalness/2));
                        let cy = Math.floor(lerp(ycur, line_y, naturalness/2));

                        //Put floors down along the hallway
                        layout[cx][cy] = ["floor"]
                        for(let d = 0; d < Math.PI * 2; d += Math.PI/4){
                            let cx2 = Math.floor(cx + Math.cos(d));
                            let cy2 = Math.floor(cy + Math.sin(d));
                            layout[ cx2 ][ cy2 ] = "floor";
                        }
                    }

                    
                }
            }
            */

        }

        //Add wall edges where it makes sense to
        for(let i = 0; i < width; i++){
            for(let j = 1; j < height; j++){
                if(layout[i][j - 1] == "wall" && layout[i][j] == "floor"){
                    layout[i][j - 1] = "edge";
                }
            }
        }

        
        if(true){ //This section is for testing purposes, make false if not testing
            var layout_text = '';
            for(let j = 1; j < height; j++){
                for(let i = 0; i < width; i++){
                    switch(layout[i][j]){
                        case "wall":    layout_text += "[]"; break;

                        case "floor":   layout_text += ".."; break;

                        case "grass":   layout_text += "  "; break;

                        case "edge":    layout_text += "||"; break;

                        case "decor":   layout_text += "  "; break;
                    }
                }
                layout_text += "\n"
            }
            console.log("Layout Generated");
            console.log(layout_text);
        }
        return layout;
    }

    
}

module.exports = functions;