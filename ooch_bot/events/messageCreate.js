import dotenv from 'dotenv';
dotenv.config();

import wait from 'wait';
import { toUpper } from 'lodash-es';

import { Events, MessageFlags } from 'discord.js';
import { profile } from '../db.js';
import { move, setup_playspace_str } from '../func_play.js';
import { PlayerState } from '../types.js';
import { quit_oochamon } from '../func_other.js';
import { inactivityTrackers } from '../index.js';

export default {
  name: Events.MessageCreate,
  async execute(message) {
        if (message.author.id == '397879158962782219') {
            if (message.type == 'THREAD_CREATED') {
                await wait(10000)
                return message.delete();
            } else {
                return;
            }
        }    

        // Funi game logic for controlling the game
        if (profile.has(message.author.id)) {
            let player_state = profile.get(`${message.author.id}`, 'player_state');
            
            // Reset inactivity timer
            if (player_state != PlayerState.NotPlaying) {
                if (message.channel.id == profile.get(`${message.author.id}`, 'play_thread_id')) {

                    if (inactivityTrackers[message.author.id]) {
                        clearTimeout(inactivityTrackers[message.author.id]);
                    }

                    const inactivityTimer = setTimeout(async () => {
                        await quit_oochamon(message.channel, message.author.id)
                    }, 30 * 60 * 1000);

                    inactivityTrackers[message.author.id] = inactivityTimer;
                }
            }

            let speedMatch;

            switch (player_state) {
                case PlayerState.Playspace: 
                    speedMatch = message.content.toLowerCase().match(/^([1-4])$/);

                    if (message.channel.id == profile.get(`${message.author.id}`, 'play_thread_id')) {
                        let str_upper = toUpper(message.content)
                        if(['SB_ROSWIER', 'HEXNON'].includes(str_upper)){ //Passwords for certain events
                            let loc_data = profile.get(`${message.author.id}`, 'location_data');
                            switch(str_upper){
                                case 'SB_ROSWIER':
                                    if(loc_data.area == 'training_facility' && loc_data.x == 18 && loc_data.y == 58){
                                        profile.push(message.author.id, 'pass_roswier', 'flags');
                                    }
                                break;
                                case 'HEXNON':
                                    if(loc_data.area == 'access_tunnel' && loc_data.x == 43 && loc_data.y == 51){
                                        profile.push(message.author.id, 'hexnon', 'flags');
                                    }
                                break;
                            }
                        }
                        if (message.content == 'b') {
                            await move(message.channel, message.author.id, '', 1, 1);
                            player_state = profile.get(`${message.author.id}`, 'player_state');
                            await message.delete().catch(() => {});
                        } else if (speedMatch && profile.get(`${message.author.id}`, 'settings.discord_move_buttons') === true) {
                            const speedMultiplier = parseInt(speedMatch[1]) - 1;
                            profile.set(message.author.id, (speedMultiplier % 4) + 1, 'move_speed');
                            let playspace_str = await setup_playspace_str(message.author.id);

                            let playspace_msg = await message.channel.messages.fetch(profile.get(`${message.author.id}`, 'display_msg_id')).catch(() => {});
                            await playspace_msg.edit({ components: playspace_str.components, flags: playspace_str.flags }).catch(() => {});
                            
                            await message.delete().catch(() => {});
                        } else {
                            // Do movement stuff
                            let moveMsg = message.content.toLowerCase().replace(/\s+/g, ''); // Remove spaces
                            let splitMoves = moveMsg.split(','); // Split by comma first
                            let moveCount = 0;
                        
                            let currentDirection = null;
                            let totalDistance = 0;
                        
                            for (let msg of splitMoves) {
                                if (moveCount >= 3) break; // Stop processing after 3 moves
                                let moveSequence = msg.match(/([wasd])(\d{1,2})?/g); // Match 'w', 'a', 's', 'd' followed optionally by a number
                        
                                if (!moveSequence) continue; // Skip invalid input
                        
                                for (let moveSeq of moveSequence) {
                                    if (moveCount >= 3) break; // Stop further moves if limit reached
                                    let direction = moveSeq[0]; // First character (direction)
                                    let dist = moveSeq.length > 1 ? parseInt(moveSeq.slice(1)) : 1; // Get distance if provided, otherwise default to 1
                        
                                    if (isNaN(dist)) dist = 1; // Safety check for NaN values
                                    if (dist > 4) dist = 4;
                        
                                    if (currentDirection === null) {
                                        currentDirection = direction;
                                        totalDistance = dist;
                                    } else if (currentDirection === direction) {
                                        totalDistance += dist; // Aggregate distance if the direction is the same
                                    } else {
                                        // Move in the previous direction with the total distance
                                        await move(message.channel, message.author.id, currentDirection, totalDistance);
                                        moveCount++;

                                        if (moveCount >= 3) break; // Stop further moves if limit reached                    
                        
                                        // Start a new aggregation for the current direction
                                        currentDirection = direction;
                                        totalDistance = dist;
                                    }
                                }
                            }
                    
                            // Call move for the last accumulated direction
                            if (currentDirection !== null && moveCount < 3) {
                                await move(message.channel, message.author.id, currentDirection, totalDistance);
                            }
                        
                            await message.delete().catch(() => {});
                        }
                    }
                break;
                default: 
                    if (message.channel.id == profile.get(`${message.author.id}`, 'play_thread_id')) {
                        await message.delete().catch(() => {});
                    }
                break;
            }
        }
    }
}