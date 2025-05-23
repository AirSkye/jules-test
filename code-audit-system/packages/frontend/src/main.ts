import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router' // Import the router

const app = createApp(App)

app.use(ElementPlus)
app.use(router) // Use the router
app.mount('#app')
