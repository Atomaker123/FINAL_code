import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundlePath = path.join(__dirname, 'sotu-app', 'js', 'bundle.js');
let code = fs.readFileSync(bundlePath, 'utf8');

const targetStr = 'function getGraphics(visualLocation, textDatum, extraText, units, sizeData) {';
const startIdx = code.indexOf(targetStr);
if (startIdx === -1) {
  console.error('Could not find target function');
  process.exit(1);
}

const endMarker = 'exports.getGraphics = getGraphics;';
const endIdx = code.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('Could not find end marker');
  process.exit(1);
}

const newFn = `function getGraphics(visualLocation, textDatum, extraText, units, sizeData) {
    const isMobile = window.innerWidth <= 768;
    // On mobile, use generous width and comfortable, large readable typography
    const w = isMobile ? Math.min(360, window.innerWidth - 20) : 450;
    const h = 500;
    const x = isMobile ? 0 : visualLocation.descriptionX;
    const y = isMobile ? 0 : visualLocation.descriptionY;
    const margin = isMobile ? 16 : 20;
    const baseStyle = {
        fontFamily: 'Roboto',
        align: 'left',
        fill: 0x000000,
        wordWrapWidth: w - (margin * 2),
        wordWrap: true
    };
    const titleStyle = Object.assign({ fontSize: isMobile ? 28 : 40, fontWeight: 'bold' }, baseStyle);
    const scaleStyle = Object.assign(Object.assign({}, baseStyle), { fontSize: isMobile ? 22 : 32, fill: 0x333333 });
    const unitFriendlyStyle = Object.assign(Object.assign({}, baseStyle), { fontSize: isMobile ? 24 : 32, wordWrapWidth: w - (margin * 2), fill: 0x333333, wordWrap: false, fontWeight: 'bold' });
    const exponentStyle = Object.assign(Object.assign({}, baseStyle), { fontSize: (isMobile ? 22 : scaleStyle.fontSize) - (isMobile ? 6 : 8), fill: 0x333333 });
    const descriptionStyle = Object.assign(Object.assign({}, baseStyle), { fontSize: isMobile ? 21 : 32, lineHeight: isMobile ? 26 : 38 });
    const friendly = powToUnit_1.powToUnit(sizeData, units, extraText);
    const splitDescription = descriptionSplitter_1.descriptionSplitter(textDatum.description).replace(/",/g, '');
    const titleText = new PIXI.Text(textDatum.title.replace(/\\r?\\n|\\r/g, ''), titleStyle);
    const scaleText = new PIXI.Text(sizeData.coeff + " x 10", scaleStyle);
    const exponentText = new PIXI.Text("" + sizeData.exponent, exponentStyle);
    const meterText = new PIXI.Text(textDatum.metersPlural, scaleStyle);
    const unitFriendlyText = new PIXI.Text(friendly, unitFriendlyStyle);
    const descriptionText = new PIXI.Text('    ' + splitDescription, descriptionStyle);
    
    titleText.x = x + margin;
    titleText.y = y + margin;
    titleText.roundPixels = true;
    
    unitFriendlyText.x = x + margin;
    unitFriendlyText.y = y + titleText.height + (isMobile ? 8 : 25);
    unitFriendlyText.roundPixels = true;

    scaleText.x = x + margin;
    scaleText.y = unitFriendlyText.y + unitFriendlyText.height + (isMobile ? 6 : 5);
    scaleText.roundPixels = true;

    exponentText.x = x + margin + 2.5 + scaleText.width;
    exponentText.y = scaleText.y - (isMobile ? 6 : 7);
    exponentText.roundPixels = true;

    meterText.x = exponentText.x + exponentText.width + 5;
    meterText.y = scaleText.y;
    meterText.roundPixels = true;

    descriptionText.x = x + margin;
    descriptionText.y = scaleText.y + scaleText.height + (isMobile ? 12 : 10);
    descriptionText.roundPixels = true;

    const descriptionContainer = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    const totalTextHeight = descriptionText.y + descriptionText.height - y + margin;
    graphics.beginFill(0x000000, .25);
    graphics.drawRoundedRect(x + 5, y + 5, w, totalTextHeight, 15);
    graphics.endFill();
    graphics.lineStyle(2, 0x999999, 1);
    graphics.beginFill(0xFFFFFF, 0.98);
    let widthToUse = w;
    if (unitFriendlyText.width + (margin * 2) >= widthToUse) {
        widthToUse = unitFriendlyText.width + (margin * 2);
    }
    graphics.drawRoundedRect(x, y, widthToUse, totalTextHeight, 15);
    graphics.endFill();
    descriptionContainer.x -= widthToUse / 2;
    descriptionContainer.y -= isMobile ? (totalTextHeight / 2) : (h / 2);
    descriptionContainer.addChild(graphics);
    descriptionContainer.addChild(titleText, descriptionText, scaleText, exponentText, meterText, unitFriendlyText);
    return descriptionContainer;
}
exports.getGraphics = getGraphics;`;

const updatedCode = code.slice(0, startIdx) + newFn + code.slice(endIdx + endMarker.length);
fs.writeFileSync(bundlePath, updatedCode, 'utf8');
console.log('Successfully updated sotu-app/js/bundle.js');
