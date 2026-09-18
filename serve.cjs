const express = require('express')
const app = express()
const compression = require('compression')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Serve buildyourownatom HTML for any subpath (e.g. /buildyourownatom.html/carbon, /buildyourownatom/carbon)
app.use((req, res, next) => {
  if (req.path.startsWith('/buildyourownatom.html/') || req.path.startsWith('/buildyourownatom/')) {
    return res.sendFile(path.join(__dirname, 'dist', 'buildyourownatom.html'));
  }
  if (req.path.startsWith('/atom/')) {
    // If asking for a static asset file inside /atom/assets/ or similar, try static first
    const filePath = path.join(__dirname, 'dist', req.path);
    if (require('fs').existsSync(filePath) && require('fs').statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    return res.sendFile(path.join(__dirname, 'dist', 'atom', 'index.html'));
  }
  next();
})

// Serve the unified website from dist/
app.use(express.static(path.join(__dirname, 'dist')))
app.get('/sotu', (req, res) => res.redirect('/sotu/'))
app.get('/atom', (req, res) => res.redirect('/atom/'))


const server = app.listen(port, () => {
  console.log(`\n==================================================`)
  console.log(`Atomaker Website Server running at http://localhost:${port}`)
  console.log(`- Homepage:              http://localhost:${port}/homepage.html`)
  console.log(`- Scale of the Universe: http://localhost:${port}/scaleoftheuniverse.html`)
  console.log(`- Build Your Own Atom:   http://localhost:${port}/buildyourownatom.html`)
  console.log(`==================================================\n`)
})

setInterval(() => {}, 1000 * 60 * 60)