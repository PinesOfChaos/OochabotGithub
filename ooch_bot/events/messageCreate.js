import dotenv from 'dotenv';
dotenv.config();

import wait from 'wait';
import { toUpper } from 'lodash-es';

import { Events } from 'discord.js';
import { profile } from '../db.js';
import { move, setup_playspace_str } from '../func_play.js';
import { PlayerState } from '../types.js';
import { quit_oochamon } from '../func_other.js';
import { inactivityTrackers } from '../index.js';

const moveQueues = new Map(); // userId -> { channel, moves: [{dir, dist}] }
const moveTimers = new Map(); // userId -> timer

async function flushMoveQueue(userId) {
    const entry = moveQueues.get(userId);
    moveQueues.delete(userId);
    moveTimers.delete(userId);
    if (!entry) return;

    const consolidated = [];
    for (const { dir, dist } of entry.moves) {
        const last = consolidated[consolidated.length - 1];
        if (last && last.dir === dir) {
            last.dist += dist;
        } else {
            consolidated.push({ dir, dist });
        }
    }

    for (const { dir, dist } of consolidated) {
        await move(entry.channel, userId, dir, dist);
        if (profile.get(userId, 'player_state') !== PlayerState.Playspace) break;
    }
}

function enqueueMoves(channel, userId, moves) {
    const existing = moveQueues.get(userId) || { channel, moves: [] };
    existing.moves.push(...moves);
    moveQueues.set(userId, existing);
    if (moveTimers.has(userId)) clearTimeout(moveTimers.get(userId));
    moveTimers.set(userId, setTimeout(() => flushMoveQueue(userId), 250));
}

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
                            // Parse moves into array, then enqueue for debounced execution
                            let moveMsg = message.content.toLowerCase().replace(/\s+/g, '');
                            let splitMoves = moveMsg.split(',');
                            let parsedMoves = [];
                            let currentDirection = null;
                            let totalDistance = 0;

                            for (let msg of splitMoves) {
                                if (parsedMoves.length >= 3) break;
                                let moveSequence = msg.match(/([wasd])(\d{1,2})?/g);
                                if (!moveSequence) continue;

                                for (let moveSeq of moveSequence) {
                                    if (parsedMoves.length >= 3) break;
                                    let direction = moveSeq[0];
                                    let dist = moveSeq.length > 1 ? parseInt(moveSeq.slice(1)) : 1;
                                    if (isNaN(dist)) dist = 1;
                                    if (dist > 4) dist = 4;

                                    if (currentDirection === null) {
                                        currentDirection = direction;
                                        totalDistance = dist;
                                    } else if (currentDirection === direction) {
                                        totalDistance += dist;
                                    } else {
                                        parsedMoves.push({ dir: currentDirection, dist: totalDistance });
                                        currentDirection = direction;
                                        totalDistance = dist;
                                    }
                                }
                            }
                            if (currentDirection !== null && parsedMoves.length < 3) {
                                parsedMoves.push({ dir: currentDirection, dist: totalDistance });
                            }

                            if (parsedMoves.length > 0) enqueueMoves(message.channel, message.author.id, parsedMoves);
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