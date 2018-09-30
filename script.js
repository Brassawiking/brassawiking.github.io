let element = document.querySelector('app-main')
let config = {
  x: 10,
  y: true,
  color: 'red',
  showA: true,
  mouseX: 0,
  mouseY: 0,
  
  hoverClasses: null,
  hoverTitle: '',
  
  n: 1000,
  
  hover (hovering) {
    if (hovering) {
      this.hoverTitle = 'Yoooo, here comes ze title!'
      this.hoverClasses = {
        hoverX: true
      }
    } else {
      this.hoverTitle = ''
      this.hoverClasses = {
        hoverX: false
      }
    }
  },

}
let template = `
  <style>
    .hoverX {
      outline: 3px solid gold;
    }
  </style>
  <div .class="hoverClasses"
       .title="hoverTitle"
       @mouseenter.$true="hover"
       @mouseleave.$false="hover"
       @click.offsetX="mouseX" 
       @click.offsetY="mouseY"
       @mousemove.offsetX="x"
       @mousemove.offsetY="mouseY">
    <h1 .style.color="color">
      Hello! 
      <span .innerHTML="mouseX"></span>
      <span .innerHTML="mouseY"></span>
    </h1>
    <input .value="color" 
           @input.target.value="color" />
    <input .value="x" 
           .checked="showA"
           @change.target.checked="showA"
           type="checkbox" />
    Toggle =>
    <span .innerHTML="x" 
          .show="showA">
    </span>
  </div>
  <p>
    Number of rows: <br/>
    <input type="number" .value="n" @input.target.value="n" />
  </p>
  <div .repeat="n">
    <template>
      <input .value="x" 
             @input.target.value="x" />
      <br/>
    </template>
  </div>
`

let app = init(element, config, template)

setTimeout(_ => {
  app.x = 123
  app.y = false
}, 2000)

let externalButton = document.body.insertBefore(document.createElement('button'), element)
externalButton.innerHTML = 'External increment'
externalButton.addEventListener('click', e => {
  app.x++
})

function init (element, config, template) {
  let data = createData(config)
  element.innerHTML = template
    
  const batch = createBatcher()
  ;[].slice.call(element.querySelectorAll('*'))
     .forEach(x => compile(x, data, batch))
  
  return data
}

function compile (element, data, batch) {
  const child = element
  let jsAttrs = [].filter.call(child.attributes, x => x.name[0] === '.' || x.name[0] === '@')
  
  Object.defineProperties(child, {
    show: {
      get () { return !this.hidden },
      set (value) { this.hidden = !value },
    },
    'class': {
      get () {
        return new Proxy({}, {
          get: (obj, prop) => this.classList.contains(prop),
          set: (obj, prop, value) => this.classList.toggle(prop, value)
        })
      },
      set (value) {
        for (var key in value) {
          this.classList.toggle(key, value[key])
        }
      }
    },
    repeat: {
      set (value) {
        let templates = []
        ;[].slice.call(this.childNodes).forEach(x => {
          if (x.tagName !== 'TEMPLATE') {
            batch(_ => x.remove())
          } else {
            templates.push(x)
          }
        })
        
        // Ensure loop terminates
        for (let i = 0; i < value ; ++i) {
          batch(_ => {
            templates.forEach(t => {
              let node = document.importNode(t.content, true)
              ;[].slice.call(node.children)
                 .forEach(x => x.title = i)
              
              ;[].slice.call(node.querySelectorAll('*'))
                 .forEach(x => compile(x, data, batch))
                 
              this.appendChild(node)
            })
          })
        }
      }
    }
  })
  
  jsAttrs.forEach(jsAttr => {
    let type = jsAttr.name[0]
          
    if (type == '.') {
      let props = jsAttr.name.substr(1).split('.')
      let binding = jsAttr.value
      let obj = child
      let lastProp
      
      for (let i = 0 ; i < props.length; ++i) {
        lastProp = getPropertyName(obj, props[i]) // Does not work well for proxies
        if (i < props.length - 1) {
          obj = obj[lastProp]
        }
      }
              
      // Abort if data binding is a function?
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
        e.$data = data
        e.$self = data[binding]
        e.$null = null
        e.$true = true
        e.$false = false
        e.$string = new Proxy({}, {
          get: (obj, prop) => prop === '$empty' ? '' : prop
        })

        let value = e
        props.forEach(prop => {
          value = value[getPropertyName(value, prop)]
        })
        
        let descriptor = Object.getOwnPropertyDescriptor(data, binding)
        ;(descriptor.value || descriptor.set).call(data, value)
      })
    }
  })
}

function createData (dataConfig) {
  let data = {}
  let notifier = document.createElement('notifier')
  
  Object.keys(dataConfig).forEach(key => {
    let value = dataConfig[key]
    
    if (typeof value === 'function') {
      Object.defineProperty(data, key, {
        value (payload) {
          let result = value.call(this, payload)
          notifier.dispatchEvent(new CustomEvent(key))
          return result
        }
      })
    } else {
      Object.defineProperty(data, key, {
        get () { return value },
        set (newValue) {
          value = newValue
          notifier.dispatchEvent(new CustomEvent(key))
        }
      })
    }
  })
    
  data.__notifier__ = notifier
  return data
}

function createBatcher () {
  const batch = []
  requestAnimationFrame(function process (frameStart) {
    let tasksDone = 0
    let batchLength = batch.length
    
    while (performance.now() - frameStart < 10 && tasksDone < batchLength) {
      batch[tasksDone++]()
    }
    batch.splice(0, tasksDone)
    
    requestAnimationFrame(process)
  })
  return task => batch.push(task)  
}

function getPropertyName (obj, lowerCaseProp) {
  while (obj != Object.prototype) {
    let names = Object.getOwnPropertyNames(obj)
    for (let i = 0 ; i < names.length ; ++i) {
      let name = names[i]
      if (name.toLowerCase() === lowerCaseProp) {
        return name
      }
    }
    obj = Object.getPrototypeOf(obj)
  }
  return lowerCaseProp; // Should be null
}
