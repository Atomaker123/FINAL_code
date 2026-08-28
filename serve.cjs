const express = require('express')
const app = express()
const compression = require('compression')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

const port = process.env.PORT || 3000;

app.use(compression())

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