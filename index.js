import { init } from './framework.js'

const PAGES = document.querySelector('.pages').children.length
const COLORS = [
  '#ff8383',
  '#ffdb8b',
  '#fffa90',
  '#81ff76',
  '#7a76ff'
]
const TITLES = [
  'Brassawiking',
  'Brassawiking | Art',
  'Brassawiking | Ludum Dare',
  'Brassawiking | Projects',
  'Brassawiking | About'
]

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = canvas.height = 16
ctx.lineWidth = 2
ctx.strokeStyle = '#333'

let app = init(
  document.documentElement, 
  {
    favicon: '',
    documentTitle: TITLES[0],
    bg: COLORS[0],
    pageOffset: '',
    pageIndex: 0,

    step (value) {
      this.pageIndex = ((this.pageIndex + value % PAGES) + PAGES) % PAGES
      this.pageOffset = `translateX(${-this.pageIndex * 100}vw)`
      this.documentTitle = TITLES[this.pageIndex]
      this.bg = COLORS[this.pageIndex]
      
      ctx.fillStyle = this.bg
      ctx.fillRect(0, 0, 16, 16)
      ctx.strokeRect(0, 0, 16, 16)
      this.favicon = canvas.toDataURL("image/x-icon")
    }
  }
)

app.step(0)
