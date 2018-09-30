let app = document.querySelector('app-main')
let config = {
  x: 10,
  y: true,
  z: 'red',
  showA: false,
  mouseX: 0,
  mouseY: 0,
  
  hoverMain: false,
  hoverTitle: null,
  hoverTitleText: 'Yoooo, here comes ze title!',
}
let template = `
  <style>
    .hover-x {
      outline: 3px solid gold;
    }
  </style>
  <div .class.hover-x="hoverMain"
       .title="hoverTitle"
       @mouseenter.$true="hoverMain"
       @mouseleave.$false="hoverMain"
       @mouseenter.$data.hoverTitleText="hoverTitle"
       @mouseleave.$string.Something-goody="hoverTitle"
       @click.offsetX="mouseX" 
       @click.offsetY="mouseY"
       @mousemove.offsetX="x"
       @mousemove.offsetY="mouseY">
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
          .show="showA">
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
externalButton.innerHTML = 'External increment'
externalButton.addEventListener('click', e => {
  data.x++
})

function init (element, config, template) {
  let data = createData(config)
  element.innerHTML = template
    
  const batch = createBatcher()
  const children = element.querySelectorAll('*')
  for (let i = 0; i < children.length; ++i) {
    const child = children[i]
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
