import { createApp } from 'vue'
import NoteApp from './NoteApp.vue'
import './style.css'

const app = createApp(NoteApp)

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err)
  console.error('Component:', instance)
  console.error('Info:', info)
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  event.preventDefault()
})

app.mount('#app')
