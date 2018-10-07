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
  
  user: {
    firstName: 'Johan',
    lastName: 'Ludvigsson'
  },
  updateUser () {
    this.user = {
      firstName: 'Lisa',
      lastName: 'Simpson'
    }
    
    this.user.firstName = 'Homer'
  },
  
  rows: [null],
  rowCount: 1,
  setRows (n) {
    this.rows = new Array(Number(n))
    this.rowCount = this.rows.length
  },
  items: [
    'Apple',
    'Banana',
    'Clementine'
  ],
  
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
  
  massToggle () {
    this.setRows(1000)
    //setTimeout(_ => {
      this.setRows(1)
    //}, 100)
  }
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
    <span .innerHTML="user.firstName"></span>
    <span .innerHTML="user.lastName"></span>
    <input .value="user.firstName"
           @input.target.value="user.firstName" />
           
    <button @click="updateUser">Update</button>
  </p>
  <p>
    Number of rows: (<span .innerHTML="rowCount"></span>)<br/>
    <input .value="rowCount" 
           @input.target.value="setRows"
           type="number" />
  </p>
  <table .repeat="items">
    <template>
      <tr>
        <td>
          <span .innerHTML="items.1"></span>
          <span .innerHTML="x"></span>
        </td>
      </tr>
    </template>
  </table>
  
  <button @click="massToggle">Mass toggle</button>
  
  <div .repeat="rows">
    <template>
      <input .value="x" 
             @input.target.value="x"/>
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
        let token = { canceled: false }
        let templates = []
        if (this.__repeatToken__) {
          this.__repeatToken__.canceled = true
        }
        this.__repeatToken__ = token
        
        ;[].slice.call(this.childNodes).forEach(x => {
          if (x.tagName !== 'TEMPLATE') {
            batch(_ => {
              if (token.canceled) {
                return
              }
              x.remove()
            })
          } else {
            templates.push(x)
          }
        })
        
        
        // Ensure loop terminates
        for (let i = 0; i < value.length ; ++i) {
          batch(_ => {
            if (token.canceled) {
              return
            }
            templates.forEach(t => {
              let node = document.importNode(t.content, true)              
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
        lastProp = getPropertyName(obj, props[i]) // Does not work well for proxies (non-emumerable properties)
        if (i < props.length - 1) {
          obj = obj[lastProp]
        }
      }
              
      // Abort if data binding is a function?
      obj[lastProp] = getValue(data, binding)
      let bindingDependencies = binding.split('.')
      for (let i = 0; i < bindingDependencies.length; ++i) {
        let bindingDependency = bindingDependencies.slice(0, i+1).join('.')
        let updateRequest
        data.__notifier__.addEventListener(bindingDependency, child[`__${bindingDependency}_$notifier__`] = e => {
          cancelAnimationFrame(updateRequest)
          updateRequest = requestAnimationFrame(_ => {
            batch(_ => obj[lastProp] = getValue(data, binding))
          })
        })
      }
    }
    
    if (type === '@') {
      let parts = jsAttr.name.substr(1).split('.')
      let event = parts[0]
      let eventProps = parts.slice(1)
      let binding = jsAttr.value
      
      child.addEventListener(event, child[`__${binding}_@{event}__`] = e => {
        e.$data = data
        e.$self = data[binding]
        e.$null = null
        e.$true = true
        e.$false = false
        e.$string = new Proxy({}, {
          get: (obj, prop) => prop === '$empty' ? '' : prop
        })

        let value = e
        eventProps.forEach(prop => {
          value = value[getPropertyName(value, prop)]
        })
        
        let bindingObj = data
        let bindingProps = binding.split('.')
        let lastBindingProp = bindingProps[bindingProps.length -1]
        for (let i = 0 ; i < bindingProps.length - 1 ; ++i) {
          bindingObj = bindingObj[bindingProps[i]]
        }
        
        let descriptor = Object.getOwnPropertyDescriptor(bindingObj, lastBindingProp)
        ;(descriptor.value || descriptor.set).call(bindingObj, value)
      })
    }
  })
}

function createData (dataConfig) {
  let data = {}
  let notifier = document.createElement('notifier')
  
  Object.keys(dataConfig).forEach(key => {
    createProperty(data, key, dataConfig[key], notifier)
  })
    
  data.__notifier__ = notifier
  return data
}

function createProperty (obj, prop, rawValue, notifier, parentPropPath) {
  let propPath = (parentPropPath ? parentPropPath + '.' : '') + prop
  let value = rawValue
    
  if (typeof rawValue === 'object' && rawValue != null && !Array.isArray(rawValue)) {
    value = {}
    Object.keys(rawValue).forEach(key => {
      createProperty(value, key, rawValue[key], notifier, propPath)
    })    
  } 
  
  if (typeof rawValue === 'function') {
    Object.defineProperty(obj, prop, { value })
  } else {
    Object.defineProperty(obj, prop, {
      get () { return value },
      set (newValue) {
        if (typeof newValue === 'object' && rawValue != null && !Array.isArray(newValue)) {
          value = {}
          Object.keys(newValue).forEach(key => {
            createProperty(value, key, newValue[key], notifier, propPath)
          })    
        } else {
          value = newValue
        }
        notifier.dispatchEvent(new CustomEvent(propPath))
      }
    })
  }
}

function createBatcher () {
  let frames
  let startTime
  let totalTasksDone
  const batch = []
  const process = function(frameStart) {
    let tasksDone = 0
    let batchLength = batch.length
    
    while (performance.now() - frameStart < 30 && tasksDone < batchLength) {
      batch[tasksDone++]()
    }
    batch.splice(0, tasksDone)
    
    frames++
    totalTasksDone += tasksDone
    
    if (batch.length) {
      requestAnimationFrame(process)
    } else {
      let totalTime = performance.now() - startTime
      console.log(`DONE: ${totalTasksDone} tasks, ${Math.round(totalTime)}ms, ${frames} frames, ${Math.round(totalTasksDone/frames)} task/frame`)
    } 
  }
  return task => {
    if (!batch.length) {
      frames = 0
      totalTasksDone = 0
      startTime = performance.now()
      requestAnimationFrame(process)
    }
    batch.push(task)
  }  
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
  return lowerCaseProp; // Should be null?
}

function getValue (obj, propertyPath) {
  let result = obj
  propertyPath.split('.').forEach(x => {
    result = result[x]
  })
  return result
}