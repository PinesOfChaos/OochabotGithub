const db = require("./db")
const wait = require('wait');
const _ = require('lodash');

/**
 * This is for setting global variables in case we have a global event or anything
 */


let functions = {
    /**
     * Sets a global variable via a string 
     * @param {String} string_submitted string separated by periods "global.PROPERTY_NAME.ACTION(add, set).VALUE(must be a number)"
     * @returns returns true if it completed the action, false if it failed to
     */
    set_global_from_string : async function(string_submitted){
        let global_data = db.global_data.get('global_data');

        let parts = string_submitted.split('.');
        let name = parts[1];
        let action = parts[2];
        let value = parts[3];

        //Exit if the value is not a number
        let number = parseFloat(value);
        if(number === NaN){
            console.log(`INVALID VALUE - set_global_from_string: "${value}"`);
            return undefined;
        }

        //Exit if the name of the property doesn't exist in the global_data
        if(!global_data.hasOwnProperty(name)){
            console.log(console.log(`INVALID NAME - set_global_from_string: "${name}"`));
            return undefined;
        }

        switch(action){
            case 'add':
                global_data[name] += value;
            break;
            case 'set':
                global_data[name] = value;
            break;
            default: //Exit if the action was not recognized
                console.log(`INVALID ACTION - set_global_from_string: "${action}"`);
                return false;
            break;
        }

        db.global_data.set('global_data', global_data);

        return true;
    },

    /**
     * Returns true/false by comparing a global variable to a string 
     * @param {String} string_submitted string separated by periods "global.PROPERTY_NAME.ACTION(greaterthan, lessthan, equals).VALUE(must be a number)"
     * @returns returns true/false depending on the resulting comparison
     */
    get_global_from_string: async function(string_submitted) {
        let global_data = db.global_data.get('global_data');

        let parts = string_submitted.split('.');
        let name = parts[1];
        let action = parts[2];
        let value = parts[3];

        //Exit if the value is not a number
        let number = parseFloat(value);
        if(number === NaN){
            console.log(`INVALID VALUE - get_global_from_string: "${value}"`);
            return undefined;
        }

        //Exit if the name of the property doesn't exist in the global_data
        if(!global_data.hasOwnProperty(name)){
            console.log(console.log(`INVALID NAME - get_global_from_string: "${name}"`));
            return undefined;
        }

        switch(action){
            case 'greaterthan':
                return global_data[name] > value;
            break;
            case 'lessthan':
                return global_data[name] < value;
            break;
            case 'equals':
                return global_data[name] == value;
            break;
            default: //Exit if the action was not recognized
                console.log(`INVALID ACTION - get_global_from_string: "${action}"`);
                return undefined;
            break;
        }

        
    },


    /**
     * Resets the global variables
     * @param {Boolean} soft_reset TRUE only sets new values, FALSE resets ALL values 
     */
    refresh_global_variables: async function(hard_reset = false){
        let old_vars = db.global_data.get('global_data');
        let new_vars = functions.global_default_variables();

        if(old_vars == undefined){
            old_vars = {};
        }

        let keys = Object.keys(new_vars);
        for(let key of keys){
            if(hard_reset || !old_vars.hasOwnProperty(key)){ //If this is a hard reset OR the key doesn't already exist, set it
                old_vars[key] = new_vars[key];
            }
            
        }

        db.global_data.set('global_data', old_vars);
    },

    /**
     * Used to get the default values of the global_data
     * @returns Returns a fresh list of default values to be used globally
     */
    global_default_variables: function() {
        let new_vars = {
            i_increment : 0,
            max_level : 50
        }

        return(new_vars);
    }
}

module.exports = functions;