// web/src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import vuetify from './plugins/vuetify'
import App from './App.vue'

// 导入全局样式
import './assets/styles/variables.css'
import './assets/styles/transitions.css'

// 导入指令
import { vScrollAnimate } from './composables/useScrollAnimation'

const app = createApp(App)

// 注册全局指令
app.directive('scroll-animate', vScrollAnimate)

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
