import { init } from './framework.js'

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
    firstName: 'Max',
    lastName: 'Anderson'
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

let element = document.querySelector('app-main')
element.innerHTML = `
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

let app = init(element, config)

setTimeout(_ => {
  app.x = 123
  app.y = false
}, 2000)

let externalButton = document.body.insertBefore(document.createElement('button'), element)
externalButton.innerHTML = 'External increment'
externalButton.addEventListener('click', e => {
  app.x++
})