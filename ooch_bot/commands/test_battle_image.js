const db = require("../db.js");
const { SlashCommandBuilder } = require('discord.js');
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');

function flipDrawImage(ctx, image, x = 0, y = 0, horizontal = false, vertical = false){
    ctx.save();  // save the current canvas state
    ctx.setTransform(
        horizontal ? -1 : 1, 0, // set the direction of x axis
        0, vertical ? -1 : 1,   // set the direction of y axis
        x + (horizontal ? image.width : 0), // set the x origin
        y + (vertical ? image.height : 0)   // set the y origin
    );
    ctx.drawImage(image,0,0);
    ctx.restore(); // restore the state as it was when this function was called
}

const fillTextScaled = (text, font, fontSize, cutoff, canvas, fontMod = '') => {
	const context = canvas.getContext('2d');
	do {
		// Assign the font to the context and decrement it so it can be measured again
		context.font = `${fontMod} ${fontSize -= 1}px ${font}`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (context.measureText(text).width > cutoff);

	// Return the result to use in the actual canvas
	return context.font;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test_battle_image')
        .setDescription('Test battle image'),
	async execute(interaction) {
        if (interaction.user.id != 145342159724347393 && interaction.user.id != 122568101995872256) return interaction.reply({ content: 'You can\'t use this!', ephemeral: true });

        await interaction.deferReply();
        let canvas = new Canvas(480, 270);

        // render to files using a background thread
        async function render() {
            let pngData = await canvas.png;
            interaction.editReply({ content: null, files: [pngData] });
        }

        FontLibrary.use("main", ["./fonts/LEMONMILK-Light.otf"]);
        FontLibrary.use("main_med", ["./fonts/LEMONMILK-Medium.otf"]);
        FontLibrary.use("main_reg", ["./fonts/LEMONMILK-Regular.otf"]);
        let ctx = canvas.getContext("2d");
        const background = await loadImage('./art/BattleArt/battle_bg_stone_tunnel.png');
        
        // This uses the canvas dimensions to stretch the image onto the entire canvas
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        const plrSprite = await loadImage('./art/NPCs/c_000.png')
        const oochPlr = await loadImage(`./art/ResizedArt/chantern.png`);
        const enemySprite = await loadImage('./art/NPCs/c_001.png')
        const oochEnemy = await loadImage(`./art/ResizedArt/chantern.png`);
        const prismIcon = await loadImage(`./art/ArtFiles/item_prism.png`);

        ctx.fillStyle = 'black';
        ctx.font = `italic bold 20px main_med`;
        // Player
        fillTextScaled('PinesOfChaos', 'main_med', 120, 150, canvas, 'italic bold');
        ctx.fillText('PinesOfChaos', 10, 130);
        ctx.fillStyle = 'white';

        // Player Prisms
        ctx.drawImage(prismIcon, 10, 135);
        ctx.drawImage(prismIcon, 40, 135);
        ctx.drawImage(prismIcon, 70, 135);
        ctx.drawImage(prismIcon, 100, 135);

        // Player Oochamon and Player
        flipDrawImage(ctx, plrSprite, 27, 210, true); // horizontal mirror
        flipDrawImage(ctx, oochPlr, 65, 180, true); // horizontal mirror
        ctx.font = `10px main_med`;
        ctx.fillText('Lv. 50 Chantern', 75, 255)
        ctx.fillText(`HP: 80/100`, 75, 265);

        ctx.font = `italic bold 20px main_med`;
        // Enemy
        ctx.textAlign = 'right';
        ctx.fillStyle = 'black';
        ctx.fillText('Captain', 450, 175);
        ctx.fillStyle = 'white';

        // Enemy prisms
        ctx.drawImage(prismIcon, 330, 120);
        ctx.drawImage(prismIcon, 360, 120);
        ctx.drawImage(prismIcon, 390, 120);
        ctx.drawImage(prismIcon, 420, 120);

        // Enemy Oochamon
        ctx.drawImage(enemySprite, 421, 75);
        ctx.drawImage(oochEnemy, 350, 15);
        ctx.font = `10px main_med`;
        ctx.fillText('Lv. 2 Chantern', 410, 90)
        ctx.textAlign = 'left';

        render();
    },
};
