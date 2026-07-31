import * as PIXI from 'pixi.js-legacy'
import 'pixi.js-legacy';
import { Slider } from "./classes/slider";
import { Universe } from "./classes/universe";
import { ScaleText } from "./classes/scaleText";
import { pad } from "./helpers/pad";
import { E } from "./helpers/e";
import { map } from "./helpers/map";
import { Tweenable } from "shifty";
import { create } from "domain";
import isMobile from 'ismobilejs';
declare var ldBar: any;
let hasPickedLang = false;
let allHighTextures;
const titles = [
  'The Scale of the Universe 2',
  'סדרי גודל ביקום',
  'De schaal van het Universum',
  'The Scale of the Universe 2',
  '宇宙的刻度',
  'La Escala del Universo 2',
  'Universums Skala',
  'Rozmiar Wszechświata',
  'A Escala do Universo',
  'Die Proportionen des Universums',
  '宇宙的刻度',
  "L'échelle de l'Univers",
  'La Skalo de la Universo',
  'Scala Universului',
  'Розмір Всесвіту',
  'ﻥﻮﻜﻟﺍ ﺱﺎﻴﻘﻣ',
  '우주의 규모',
  'Universumi ulatus',
  'ابعاد جهان 2',
  'Evren Ölçeði 2'
]
const titleEl = document.getElementById("title");
const hoverTitleEl = document.getElementById("hoverTitle");
let hoverTimeout;
window['revealTitle'] = () => {
  if (hoverTimeout) 
    clearTimeout(hoverTimeout);
  hoverTimeout = setTimeout(showTitle, 1000);
}
function showTitle () {
  if (titleEl) titleEl.style.display = 'block';
  if (hoverTitleEl) hoverTitleEl.style.display = 'none';
}
const staticHostingURL = "http://localhost:3000";
let isHQ = true;
let hasHQ = false;
const fadeInApp = new Tweenable();
fadeInApp.setConfig({
  from: { opacity: 0 },
  to: { opacity: 1 },
  easing: "easeOutSine",
  duration: 2500,
  step: state => (frame.style.opacity = state.opacity)
});
if(isMobile(window.navigator).phone) {
  alert('This version of Scale of the Universe 2 is not designed for phones. Please find the app on the iOS app store.')
  document.write('Download the Scale of the Universe iOS app!')
};
const frame = document.getElementById("frame");
const sotuFrame = document.getElementById("sotu");
const langWrapper = document.getElementById("langWrapper");
const startWrapper = document.getElementById("startWrapper");
const loader = new PIXI.Loader();
loader.add("assetsLow", `img/textures/quarter_items-0-main.json`);
  loader.add("assetsCustom", `img/textures/quarter_items_custom.json`);
const globalResolution = 1;
const loadingSpin:any = document.getElementById("loadingSpin");
loader.load(async (loader, resources) => {
  if (loadingSpin) {
    try { loadingSpin.style.visibility = 'hidden'; } catch(e){}
    try { loadingSpin.remove(); } catch(e){}
  }
  if (langWrapper) {
    try { langWrapper.style.visibility = 'visible'; } catch(e){}
  }
  let app;
  try {
    app = new PIXI.Application({
      width: frame.offsetWidth,
      height: frame.offsetHeight,
      antialias: true,
      transparent: true,
      powerPreference: "high-performance",
      resolution: globalResolution,
      sharedTicker:true,
      resizeTo: sotuFrame
    });
  } catch (err) {
    console.log(err)
    app = new PIXI.Application({
      width: frame.offsetWidth,
      height: frame.offsetHeight,
      backgroundColor: 0xffffff,
      antialias: true,
      forceCanvas: true,
      transparent: true,
      resolution: globalResolution
    });
  }
  const w: number = app.renderer.width;
  const h: number = app.renderer.height;
  let slider = new Slider(app, w, h, globalResolution, onChange, onHandleClicked);
  slider.init();
  let universe = new Universe(0, slider, app);
  let scaleText = new ScaleText((w * 0.9) / globalResolution, (slider.topY - 40), "0");
  const highLoader = new PIXI.Loader();
  const highJSONCount = 5;
  for (let i = 0; i <= highJSONCount; i++) {
    highLoader.add(`main${i}`, `img/textures/new_items_${i}.json`);
  }
  // === CUSTOM ITEM TEXTURES ===
  highLoader.add("mainCustom", `img/textures/new_items_custom.json`);
  highLoader.load(async (highLoader, highResources) => {
    const hqToggle:any = document.querySelector('#hqToggle');
    isHQ = true
    hasHQ = true;
    allHighTextures = {}
    for (let key of Object.keys(highResources)) {
      if (!key.includes('_image'))
        allHighTextures = { ...allHighTextures, ...highResources[key].textures };
    }
    if (hqToggle && hqToggle.classList) hqToggle.classList.add('hd-click')
    if (hasPickedLang) {
      universe.hydrateHighTextures(allHighTextures);
    }
  })
  let buttons = document.getElementById('buttons');
  const spaceBg = document.getElementById('spaceBgImage')
  const earthBg = document.getElementById('earthBgImage')
  function onChange(x: number, percent: number) {
    let scaleExp = percent * 62 - 35; 
    scaleText.setColor(scaleExp);
    if(scaleExp > 5 && scaleExp < 7) {
      let opacity = map(scaleExp, 5, 7, 0.1, 100);
      let opacityNorm = opacity / 100;
      if (buttons) buttons.style.filter = `invert(${opacity}%)`;
      spaceBg.style.opacity = `${opacityNorm}`;
    } else {
      if (buttons && buttons.style && buttons.style.filter)
        delete buttons.style.filter;
    }
    universe.update(scaleExp);
    scaleText.setText(`${Math.round(scaleExp * 10) / 10}`);
  }
  function onHandleClicked() {
    universe.onHandleClicked();
  } 
  window["setLang"] = async (btnClass, langIdx) => {
    const textData = (
      await (await fetch(`data/languages/l${langIdx}.txt`)).text()
    ).split("\n").map(x => x.replace(/\r?\n|\r/g, ''));
    const hqToggle:any = document.querySelector('#hqToggle');
    if (hqToggle) {
      hqToggle.onclick = function (ev) {
        ev.preventDefault();
        isHQ = !isHQ;
        if (!isHQ) {
          highLoader.reset();
          universe.clearHighQualityTextures()
          if (hqToggle.classList) hqToggle.classList.remove('hd-click')
        } else {
          if (hqToggle.classList) hqToggle.classList.add('hd-click')
          for (let i = 0; i <= 5; i++) {
            highLoader.add(`main${i}`, `img/textures/new_items_${i}.json`);
          }
          highLoader.add("mainCustom", `img/textures/new_items_custom.json`);
        }
        universe.setQuality(isHQ)
      }
    }
    const btns:any = document.querySelectorAll('button.box');
    if (btns && btns.length) {
      for (const button of btns) {
        if (button.classList[1] !== btnClass) {
          button.style.visibility = 'hidden';
        }
      }
    }
    if (startWrapper) startWrapper.style.display = 'block';
    slider.setPercent(map(0.1, -35, 27, 0, 1));
    app.stage.addChild(
      universe.container,
      slider.container,
      scaleText.container,
      universe.displayContainer
    );
    sotuFrame.appendChild(app.view);
    if (langWrapper) {
      langWrapper.style.visibility = "hidden";
      langWrapper.remove();
    }
    if (titleEl) {
      titleEl.innerHTML = textData[619];
      titleEl.style.opacity = '1';
    }
    const moveSliderTextEl = document.getElementById('moveSliderText');
    const clickObjectTextEl = document.getElementById('clickObjectText');
    if (moveSliderTextEl) moveSliderTextEl.innerHTML = textData[620];
    if (clickObjectTextEl) clickObjectTextEl.innerHTML = textData[621];
        // === CUSTOM ITEM TEXTURES ===
    // Merge custom low textures into the main textures object
    if (resources.assetsCustom && resources.assetsCustom.textures) {
      resources.assetsLow.textures = {
        ...resources.assetsLow.textures,
        ...resources.assetsCustom.textures
      };
    }
    await universe.createItems(resources, textData);
    slider.setPercent(map(0, -35, 27, 0, 1));
    universe.prevZoom = 0;
    hasPickedLang = true;
    if (hasHQ) {
      universe.hydrateHighTextures(allHighTextures);
    }
  };
  if (window["setLang"]) {
    window["setLang"]('a', 0);
  }
});