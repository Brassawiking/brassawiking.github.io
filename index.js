import { init } from './_framework.js'

const PAGES = document.querySelector('.pages').children.length
const COLORS = [
  '#ff8383',
  '#ffdb8b',
  '#fffa90',
  '#81ff76',
  '#7a76ff'
]

let app = init(
  document.documentElement, 
  {
    bg: COLORS[0],
    pageOffset: '',
    pageIndex: 0,

    step (value) {
      this.pageIndex = ((this.pageIndex + value % PAGES) + PAGES) % PAGES
      this.pageOffset = `translateX(${-this.pageIndex*100}vw)`
      this.bg = COLORS[this.pageIndex]
    }
  }
)

