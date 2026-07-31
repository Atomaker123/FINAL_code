const fs = require('fs');

// Check custom spritesheet files
const files = [
  'dist/img/textures/quarter_items_custom.json',
  'dist/img/textures/quarter_items_custom.png',
  'dist/img/textures/new_items_custom.json',
  'dist/img/textures/new_items_custom.png'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    const size = fs.statSync(f).size;
    console.log('✅ ' + f + ' (' + size + ' bytes)');
  } else {
    console.log('❌ ' + f + ' MISSING');
  }
}

// Check custom spritesheet JSON content
const jsonPath = 'dist/img/textures/quarter_items_custom.json';
if (fs.existsSync(jsonPath)) {
  const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log('\nCustom low-res sheet frames:', Object.keys(j.frames));
  if (j.meta) console.log('Image reference:', j.meta.image);
}

const hjsonPath = 'dist/img/textures/new_items_custom.json';
if (fs.existsSync(hjsonPath)) {
  const j = JSON.parse(fs.readFileSync(hjsonPath, 'utf8'));
  console.log('Custom high-res sheet frames:', Object.keys(j.frames));
  if (j.meta) console.log('Image reference:', j.meta.image);
}

// Check if l0.txt is correct
const lang = fs.readFileSync('src/data/languages/l0.txt', 'utf8').split(/\r?\n/);
console.log('\nl0.txt line 596:', lang[596]);
console.log('l0.txt line 597:', lang[597]);
console.log('l0.txt total lines:', lang.length);
console.log('l0.txt last 2 lines:', lang[lang.length-2], '|', lang[lang.length-1]);