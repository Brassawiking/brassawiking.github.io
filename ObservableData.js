let data = createData({
  x: 10
})
//data.$$on('x', e => { console.log('x is changed', e.detail) })
data.x[1].b.c.d.e.f.g
// delete data.x


function createData(rawData) {
  const notifier = document.createElement('notifier')
  const proxy = new Proxy(rawData || {}, {
    set (obj, prop, value) {
      // obj[prop] = value
      console.log('set notify')
    },
    get (obj, prop) {
      console.log('main get', prop)
      const p = new Proxy({}, {
        get (obj, prop) {
          console.log('sub get', prop)
          return p
        }
      })
      return p
    }
  })
  
  return proxy
}

console.log('yo', data)