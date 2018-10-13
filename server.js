const connect = require('connect')
const serveStatic = require('serve-static')
const open = require('open')
const port = 8080

connect()
  .use(serveStatic(__dirname))
  .listen(port, _ => {
    console.log(`Server running on ${port}...`)
    open(`http://localhost:${port}`)
  })