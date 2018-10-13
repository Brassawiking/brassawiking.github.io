export const init = function (element, config) {
  let data = createData(config)
    
  const batch = createBatcher()
  ;[].slice.call(element.querySelectorAll('*'))
     .forEach(x => compile(x, data, batch))
  
  return data
}

function compile (element, data, batch) {
  const child = element
  let jsAttrs = [].filter.call(child.attributes, x => x.name[0] === '.' || x.name[0] === '@')
  
  Object.defineProperties(child, {
    $document: {
      get () { return document },
    },
    $window: {
      get () { return window },
    },
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
        e.$number = new Proxy({}, {
          get: (obj, prop) => Number(prop)
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
  let lowestTasksDone
  let highestTasksDone
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
    lowestTasksDone = Math.min(tasksDone, lowestTasksDone)
    highestTasksDone = Math.max(tasksDone, highestTasksDone)
    
    
    if (batch.length) {
      requestAnimationFrame(process)
    } else {
      let totalTime = performance.now() - startTime
      let taskAverage = Math.round(totalTasksDone/frames)
      
      false && console.log(
        'BATCH DONE: ' +
        `${totalTasksDone}tasks, ` +
        `${Math.round(totalTime)}ms, ` +
        `${frames} frame(s), ` +
        `${taskAverage} (${lowestTasksDone}/${highestTasksDone}) task/frame`
      )
    } 
  }
  return task => {
    if (!batch.length) {
      frames = 0
      lowestTasksDone = Infinity
      highestTasksDone = 0
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