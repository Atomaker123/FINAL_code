const express = require('express')
const app = express()
const compression = require('compression')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

const port = process.env.PORT || 3000;

app.use(compression())

// Serve the Atomaker website at the root
app.use(express.static(path.join(__dirname, 'Atomaker-website-main'), { index: 'homepage.html' }))

// Serve the Scale of the Universe app at /sotu/
app.use('/sotu', express.static(path.join(__dirname, 'dist')))
app.get('/sotu', (req, res) => res.redirect('/sotu/'))

// Serve the Build Your Own Atom React app at /atom/
app.use('/atom', express.static(path.join(__dirname, 'dist-atom')))
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