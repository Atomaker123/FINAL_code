import 'pixi.js-legacy';
import * as PIXI from 'pixi.js-legacy';
import { descriptionSplitter } from '../helpers/descriptionSplitter'
import { powToUnit } from '../helpers/powToUnit'
export function getGraphics (visualLocation, textDatum, extraText, units: string[], sizeData) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const w = isMobile ? Math.min(340, window.innerWidth - 32) : 450;
    const h = 500;
    const margin = isMobile ? 16 : 20;
    const x = isMobile ? -w / 2 : visualLocation.descriptionX;
    const y = isMobile ? Math.max(20, Math.floor(window.innerHeight / 2 - 260)) : visualLocation.descriptionY;
    const baseStyle = {
      fontFamily: 'Roboto',
      align: 'left', 
      fill: 0x000000, 
      wordWrapWidth: w - (margin * 2),
      wordWrap: true
    }
    const titleStyle = { 
      fontSize: isMobile ? 22 : 40, 
      fontWeight: 'bold',
      ...baseStyle
    };
    const scaleStyle = { 
      ...baseStyle,
      fontSize: isMobile ? 14 : 32, 
      fill: 0x555555,
    };
    const unitFriendlyStyle = { 
      ...baseStyle,
      fontSize: isMobile ? 16 : 32, 
      wordWrapWidth: w - (margin * 2),
      fill: 0x222222,
      wordWrap: true,
      fontWeight: 'bold',
    };
    const exponentStyle = { 
      ...baseStyle,
      fontSize: isMobile ? 11 : scaleStyle.fontSize - 8, 
      fill: 0x555555
    };
    const descriptionStyle = { 
      ...baseStyle,
      fontSize: isMobile ? 14.5 : 32,
      lineHeight: isMobile ? 20 : 38
    };
    const friendly = powToUnit(sizeData, units, extraText)
    const splitDescription = descriptionSplitter(textDatum.description).replace(/",/g, '');
    const titleText = new PIXI.Text(textDatum.title.replace(/\r?\n|\r/g, ''), titleStyle);
    const scaleText = new PIXI.Text(`${sizeData.coeff} x 10`, scaleStyle);
    const exponentText = new PIXI.Text(`${sizeData.exponent}`, exponentStyle);
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
    exponentText.y = scaleText.y - (isMobile ? 4 : 7);
    exponentText.roundPixels = true;

    meterText.x = exponentText.x + exponentText.width + 5;
    meterText.y = scaleText.y;
    meterText.roundPixels = true;

    descriptionText.x = x + margin;
    descriptionText.y = scaleText.y + scaleText.height + (isMobile ? 10 : 10);
    descriptionText.roundPixels = true;

    const descriptionContainer = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    const totalTextHeight = descriptionText.y + descriptionText.height - y + margin;
    graphics.beginFill(0x000000, .3);
    graphics.drawRoundedRect(x + 3, y + 3, w, totalTextHeight, 14);
    graphics.endFill();
    graphics.lineStyle(1.5, 0xaaaaaa, 0.95);
    graphics.beginFill(0xFFFFFF, 0.98);
    let widthToUse = w;
    if (!isMobile && unitFriendlyText.width + (margin * 2) >= widthToUse) {
      widthToUse = unitFriendlyText.width + (margin * 2);
    }
    graphics.drawRoundedRect(x, y, widthToUse, totalTextHeight, 14);
    graphics.endFill();
    if (!isMobile) {
      descriptionContainer.x -= widthToUse / 2;
      descriptionContainer.y -= h / 2;
    }
    descriptionContainer.addChild(graphics);
    descriptionContainer.addChild(titleText, 
                                  descriptionText, 
                                  scaleText, 
                                  exponentText, 
                                  meterText, 
                                  unitFriendlyText);
    return descriptionContainer;
}