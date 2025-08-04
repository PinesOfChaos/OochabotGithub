import { global_data } from "./db.js";

/**
 * This is for setting global variables in case we have a global event or anything
 */

/**
 * Sets a global variable via a string 
 * @param {String} string_submitted string separated by periods "global.PROPERTY_NAME.ACTION(add, set).VALUE(must be a number)"
 * @returns returns true if it completed the action, false if it failed to
 */
export async function set_global_from_string(string_submitted){
    let db_global_data = global_data.get(`${'db_global_data'}`);

    let parts = string_submitted.split('.');
    let name = parts[1];
    let action = parts[2];
    let value = parts[3];

    //Exit if the value is not a number
    let number = parseFloat(value);
    if(Number.isNaN(number)){
        console.log(`INVALID VALUE - set_global_from_string: "${value}"`);
        return undefined;
    }

    //Exit if the name of the property doesn't exist in the db_global_data
    if(!Object.prototype.hasOwnProperty.call(db_global_data, name)){
        console.log(console.log(`INVALID NAME - set_global_from_string: "${name}"`));
        return undefined;
    }

    switch(action){
        case 'add':
            db_global_data[name] += value;
        break;
        case 'set':
            db_global_data[name] = value;
        break;
        default: //Exit if the action was not recognized
            console.log(`INVALID ACTION - set_global_from_string: "${action}"`);
        return false;
    }

    global_data.set('db_global_data', db_global_data);

    return true;
}

/**
 * Returns true/false by comparing a global variable to a string 
 * @param {String} string_submitted string separated by periods "global.PROPERTY_NAME.ACTION(greaterthan, lessthan, equals).VALUE(must be a number)"
 * @returns returns true/false depending on the resulting comparison
 */
export async function get_global_from_string(string_submitted) {
    let db_global_data = global_data.get(`${'db_global_data'}`);

    let parts = string_submitted.split('.');
    let name = parts[1];
    let action = parts[2];
    let value = parts[3];

    //Exit if the value is not a number
    let number = parseFloat(value);
    if(Number.isNaN(number)){
        console.log(`INVALID VALUE - get_global_from_string: "${value}"`);
        return undefined;
    }

    //Exit if the name of the property doesn't exist in the db_global_data
    if(!Object.prototype.hasOwnProperty.call(db_global_data, name)){
        console.log(console.log(`INVALID NAME - get_global_from_string: "${name}"`));
        return undefined;
    }

    switch(action){
        case 'greaterthan':
            return db_global_data[name] > value;
        case 'lessthan':
            return db_global_data[name] < value;
        case 'equals':
            return db_global_data[name] == value;
        default: //Exit if the action was not recognized
            console.log(`INVALID ACTION - get_global_from_string: "${action}"`);
            return undefined;
    }

    
}


/**
 * Resets the global variables
 * @param {Boolean} soft_reset TRUE only sets new values, FALSE resets ALL values 
 */
export async function refresh_global_variables(hard_reset = false) {
    let old_vars = global_data.get(`${'db_global_data'}`);
    let new_vars = global_default_variables();

    if(old_vars == undefined){
        old_vars = {};
    }

    let keys = Object.keys(new_vars);
    for(let key of keys){
        if(hard_reset || !Object.prototype.hasOwnProperty.call(old_vars, key)){ //If this is a hard reset OR the key doesn't already exist, set it
            old_vars[key] = new_vars[key];
        }
        
    }

    global_data.set('db_global_data', old_vars);
}

/**
 * Used to get the default values of the db_global_data
 * @returns Returns a fresh list of default values to be used globally
 */
export function global_default_variables() {
    let new_vars = {
        i_increment : 0,
        max_level : 50,
        shifting_cave_last_update : Date.now()
    }

    return(new_vars);
}