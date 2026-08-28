const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('1. Building React Atom app with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

const outDir = path.join(__dirname, 'dist');
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

console.log('2. Copying Atomaker website files to root...');
const websiteDir = path.join(__dirname, 'Atomaker-website-main');
fs.cpSync(websiteDir, outDir, { recursive: true });

// Ensure index.html in root is homepage.html
const homepagePath = path.join(outDir, 'homepage.html');
const indexPath = path.join(outDir, 'index.html');
if (fs.existsSync(homepagePath)) {
  fs.copyFileSync(homepagePath, indexPath);
}

console.log('3. Copying Scale of the Universe to /sotu/ ...');
const sotuSrc = path.join(__dirname, 'sotu-app');
const sotuDest = path.join(outDir, 'sotu');
if (fs.existsSync(sotuSrc)) {
  fs.cpSync(sotuSrc, sotuDest, { recursive: true });
}

console.log('4. Copying Build Your Own Atom to /atom/ ...');
const atomSrc = path.join(__dirname, 'dist-atom');
const atomDest = path.join(outDir, 'atom');
if (fs.existsSync(atomSrc)) {
  fs.cpSync(atomSrc, atomDest, { recursive: true });
}

console.log('✓ Unified website built successfully into dist/');
