import { profile } from '../db.js';
import { box_collector_event } from '../func_play.js';
import { buildBoxData } from '../func_other.js';

/**
 * Handles battle setup interactions (box navigation during team selection)
 * This is called from the message collectors in commands/battle.js
 *
 * @param {Interaction} selected - The interaction to handle
 * @param {String} userId - The ID of the user who clicked
 * @param {Object} userProfile - Profile object for the user
 * @param {Number} pageNum - Current page number
 * @param {Object} box_battle_buttons - Button row for the battle box
 * @param {Number} pages - Total number of pages
 * @returns {Object} - { isReady: boolean, pageNum: number }
 */
export async function battle_setup_handler(selected, userId, userProfile, pageNum, box_battle_buttons, pages) {
    let isReady = false;
    let boxRow;

    // Page buttons
    if (selected.customId == 'box_left' || selected.customId == 'box_right') {
        selected.customId == 'box_left' ? pageNum -= 1 : pageNum += 1;
        pageNum = (pageNum + pages) % pages; // Handle max page overflow

        boxRow = buildBoxData(userProfile, pageNum);
        box_battle_buttons.components[3].setLabel(`${pageNum + 1}`);
        await selected.update({ content: `**Oochabox**`, components: [boxRow[0], boxRow[1], boxRow[2], boxRow[3], box_battle_buttons], files: [] });
    }

    // Box interactions (selecting oochamon, etc)
    else if (selected.customId.includes('box')) {
        isReady = await box_collector_event(userId, selected, pageNum, userProfile, true);
    }

    return { isReady, pageNum };
}
