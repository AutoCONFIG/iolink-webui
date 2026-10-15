import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
// 官方浅色主题为默认基底（Liquid Glass 浅色版）；设计令牌在 main.css 中覆盖。
import './styles/main.css'
import App from './App.vue'
import { router } from './router'
import { countUp } from './directives/countUp'

// Firefox 下 backdrop-filter 与 SVG filter url 同时作用有渲染缺陷，
// 标记类后由 main.css 去掉折射（保留模糊玻璃）。
if (navigator.userAgent.toLowerCase().includes('firefox')) {
  document.documentElement.classList.add('is-firefox')
}

createApp(App)
  .use(createPinia())
  .use(router)
  .use(ElementPlus, { locale: zhCn })
  .directive('countUp', countUp) // 统计数字滚动（纯展示，不改变数据）
  .mount('#app')
