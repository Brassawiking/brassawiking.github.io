let app = document.querySelector('app-main')
let config = {
  x: 10,
  y: true,
  z: 'red',
  showA: false,
  mouseX: 0,
  mouseY: 0
}
let template = `
  <div @click.offsetX="mouseX" 
       @click.offsetY="mouseY">
    <h1 .style.color="z">
      Hello! 
      <span .innerHTML="mouseX"></span>
      <span .innerHTML="mouseY"></span>
    </h1>
    <input .value="z" 
           @input.target.value="z" />
    <input .value="x" 
           .checked="showA"
           @change.target.checked="showA"
           type="checkbox" />
    <span .innerHTML="x" 
          .hidden="showA">
    </span>
  </div>
`
for (let i = 0; i < 1000 ; ++i) {
  template += '<br/> <input .value="x" @input.target.value="x"/>'
}

let data = init(app, config, template)

setTimeout(_ => {
  data.x = 123
  data.y = false
}, 2000)

let externalButton = document.body.insertBefore(document.createElement('button'), app)
externalButton.innerHTML = 'Increment'
externalButton.addEventListener('click', e => {
  data.x++
})

function init (app, config, template) {
  let data = createData(config)
  app.innerHTML = template
    
  const batch = createBatcher()
  const children = app.querySelectorAll('*')
  for (let i = 0; i < children.length; ++i) {
    const child = children[i]
    let jsAttrs = [].filter.call(child.attributes, x => x.name[0] === '.' || x.name[0] === '@')
    
    jsAttrs.forEach(jsAttr => {
      let type = jsAttr.name[0]
            
      if (type == '.') {
        let props = jsAttr.name.substr(1).split('.')
        let binding = jsAttr.value
        let obj = child
        let lastProp
        
        for (let i = 0 ; i < props.length; ++i) {
          lastProp = getPropertyNames(obj).find(x => x.toLowerCase() === props[i])
          if (i < props.length - 1) {
            obj = obj[lastProp]
          }
        }
                
        obj[lastProp] = data[binding]
        data.__notifier__.addEventListener(binding, child[`__${jsAttr.name}_$notifier__`] = e => {
          batch(_ => obj[lastProp] = data[binding])
        })
      }
      
      if (type === '@') {
        let parts = jsAttr.name.substr(1).split('.')
        let event = parts[0]
        let props = parts.slice(1)
        let binding = jsAttr.value
        
        child.addEventListener(event, child[`__${jsAttr.name}_@{event}__`] = e => {
          let value = e
          props.forEach(prop => {
            value = value[getPropertyNames(value).find(x => x.toLowerCase() === prop)]
          })
          data[binding] = value
        })
      }
    })
  }
  
  return data
}

function createData (dataConfig) {
  let data = {}
  let notifier = document.createElement('notifier')
  
  Object.keys(dataConfig).forEach(key => {
    let value = dataConfig[key]
    
    Object.defineProperty(data, key, {
      get () { return value },
      set (newValue) {
        value = newValue
        notifier.dispatchEvent(new CustomEvent(key))
      }
    })
  })
    
  data.__notifier__ = notifier
  return data
}

function createBatcher () {
  const batch = []
  requestAnimationFrame(function process (frameStart) {
    while (performance.now() - frameStart < 10) {
      if (!batch.length) {
        break
      }
      batch.length && batch.shift()()
    }
    requestAnimationFrame(process)
  })
  return task => batch.push(task)
}

function getPropertyNames (obj) {
  // Courtesy of web-reflections gist  
  let propertyNames = {}
  while (obj != Object.prototype) {
    Object.getOwnPropertyNames(obj).forEach(name => {
      propertyNames[name] = true
    })
    obj = obj.__proto__
  }
  return Object.keys(propertyNames);
}
