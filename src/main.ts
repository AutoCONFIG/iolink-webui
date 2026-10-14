import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
// 官方暗色主题：通过 <html class="dark"> 生效，作为深色基底，后续在 main.css 中用设计令牌覆盖。
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/main.css'
import App from './App.vue'
import { router } from './router'
import { countUp } from './directives/countUp'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus, { locale: zhCn })
  .directive('countUp', countUp) // 统计数字滚动（纯展示，不改变数据）
  .mount('#app')
