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

                let coord_to = -1;
                if(j > 0){ coord_to = {x : i,      y : j - 1}}
                if(i > 0){ coord_to = {x : i - 1,  y : j}}
                //point left if not leftmost, point up if not upmost, otherwise point nowhere
                //this should connect all nodes by default

                rooms.push({
                    roomgridx : i,
                    roomgridy : j,
                    x : Math.floor((i * room_space_x) + room_space_x + (Math.random() * 8 * (naturalness + .5)) - 1),
                    y : Math.floor((j * room_space_y) + room_space_y + (Math.random() * 8 * (naturalness + .5)) - 1),
                    width : Math.round((room_size_avg/2) + (Math.random() * 2) - 1),
                    height : Math.round((room_size_avg/2) + Math.random() - .5),
                    coord_to : coord_to
                    
                })
            }
        }

        //Decide on hallways 
        let iterations = room_cols * room_rows * 10;
        
        for(let i = 0; i < iterations; i++){
            let room_at = rooms.find((r) => r.coord_to == -1)
            let in_range = false;

            while(!in_range){
                let dir = Math.floor(Math.random()*4)/2 * Math.PI;
                let xto = Math.round(room_at.roomgridx + Math.cos(dir));
                let yto = Math.round(room_at.roomgridy + Math.sin(dir));

                if(xto >= 0 && yto >= 0 && xto < room_cols && yto < room_rows){
                    let room_to = rooms.find((r) => r.roomgridx == xto && r.roomgridy == yto)

                    in_range = true;

                    room_at.coord_to = {x : xto, y : yto};
                    room_to.coord_to = -1;
                }
            }
        }

        console.log("Adding rooms/halls")

        //Add rooms/halls to the layout
        for(let room of rooms){
            //Add rooms
            let xmin = Math.max(2, Math.floor(room.x - room.width/2));
            let ymin = Math.max(1, Math.floor(room.y - room.height/2));
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
                    
                    let lerp_amnt = 1 - len/maxlen;
                    let val = .5 + lerp_amnt - naturalness;
                    if(val > .5){
                        layout[i][j] = "floor";
                    }
                }
            }

            //Add hallways
            if(room.coord_to != -1){
                
                let room_to = rooms.find((r) => 
                    r.roomgridx == room.coord_to.x && 
                    r.roomgridy == room.coord_to.y);

                let corner = Math.random() > .5 ?
                    {x : room.x,    y : room_to.y} :
                    {x : room_to.x, y : room.y};

                let segments = [{x : room.x, y : room.y}, corner, {x : room_to.x, y : room_to.y}]

                let xat = segments[0].x;
                let yat = segments[0].y;
                let xto = segments[1].x;
                let yto = segments[1].y;
                
                let steps_total = Math.abs(room_to.x - room.x) + Math.abs(room_to.y - room.y);
                let steps_done = 0;
                
                console.log(`${room.roomgridx}, ${room.roomgridy} => ${room_to.roomgridx}, ${room_to.roomgridy}, [${steps_total}]`)
                
                for(let i = 0; i < segments.length - 1; i++){
                    xto = segments[i + 1].x;
                    yto = segments[i + 1].y

                    while(xat != xto || yat != yto){
                        xat += Math.sign(xto - xat);
                        yat += Math.sign(yto - yat);
                        steps_done++;
                    
                        let lx = lerp(segments[0].x, segments[2].x, steps_done/steps_total);
                        let ly = lerp(segments[0].y, segments[2].y, steps_done/steps_total);
                        console.log(steps_done/steps_total);
                        let cx = Math.floor(lerp(xat, lx, naturalness * .8));
                        let cy = Math.floor(lerp(yat, ly, naturalness * .8));
                        
                        layout[cx][cy] = "floor";
                        for(let dir = 0; dir < 2 * Math.PI; dir += Math.PI/4){
                            layout[
                                cx + Math.round(Math.cos(dir))
                            ][
                                cy + Math.round(Math.sin(dir))
                            ] = "floor";
                        }

                        console.log[cx, cy];
                    }

                    
                }
            }
            
        }

        //Add wall edges where it makes sense to
        for(let i = 0; i < width; i++){
            for(let j = 1; j < height; j++){
                if(layout[i][j - 1] == "wall" && layout[i][j] == "floor"){
                    layout[i][j - 1] = "edge";
                }
            }
        }

        //Place walls above edge tiles if needed
        for(let i = 0; i < width; i++){
            for(let j = 0; j < height - 1; j++){
                if(layout[i][j] == "floor" && layout[i][j + 1] == "edge"){
                    layout[i][j] = "wall";
                }
            }
        }

        //Place decor around the map
        for(let i = 0; i < width * height / 20; i++){
            let dx = Math.floor(Math.random() * (width - 1));
            let dy = Math.floor(Math.random() * (height - 1));

            if(layout[dx][dy] == "floor"){
                let placeable = true;

                for(let dir = 0; dir < 2 * Math.PI; dir += Math.PI/4){
                    if(layout[ dx + Math.round(Math.cos(dir)) ][ dy + Math.round(Math.sin(dir)) ] == "decor"){
                        placeable = false;
                    }
                }

                if(placeable){ 
                    console.log(dx, dy)
                    layout[dx][dy] = "decor"; 
                }
            }
        }

        //Place grass patches
        for(let i = 0; i < room_cols * room_rows; i++){
            let grass_done = false;
            while(!grass_done){
                let gx = Math.floor(Math.random() * (width - 1));
                let gy = Math.floor(Math.random() * (height - 1));
                if(layout[gx][gy] != "floor"){ continue; }

                let gw = Math.floor((Math.random() * 2) + 1);
                let gh = Math.floor((Math.random() * 2) + 1);
                for(let j = gx - gw; j < gx + gw; j++){
                    for(let k = gy - gh; k < gy + gh; k++){
                        if(layout[j][k] == "floor"){ layout[j][k] = "grass"; }
                    }
                }
                grass_done = true;
            }
        }

        
        if(true){ //This section is for testing purposes, make false if not testing
            var layout_text = '';
            for(let j = 1; j < height; j++){
                for(let i = 0; i < width; i++){
                    switch(layout[i][j]){
                        case "wall":    layout_text += "[]"; break;
                        case "floor":   layout_text += ".."; break;
                        case "grass":   layout_text += "ww"; break;
                        case "edge":    layout_text += "II"; break;
                        case "decor":   layout_text += "oo"; break;
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