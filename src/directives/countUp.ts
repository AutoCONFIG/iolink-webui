import type { Directive } from 'vue'

/**
 * v-count-up：数字滚动计数指令（纯展示，不改变任何业务数据）。
 * - 挂载时从 0 平滑滚动到真实值；binding 值变化时从当前显示值滚动到新值。
 * - 仅设置元素 textContent，数据源仍由调用方传入；不会伪造或修改接口返回。
 * - 尊重 prefers-reduced-motion：减少动态偏好下直接显示最终数字。
 * - 仅适用于整数统计（KPI / 汇总），不适用于带单位的文本。
 */
interface CountUpEl extends HTMLElement {
  _raf?: number
  _current?: number
}

const DURATION = 900

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function render(el: CountUpEl, target: number): void {
  const value = Number.isFinite(target) ? target : 0
  if (el._raf !== undefined) cancelAnimationFrame(el._raf)
  el._raf = undefined
  if (prefersReducedMotion()) {
    el.textContent = String(Math.round(value))
    el._current = value
    return
  }
  const from = el._current ?? 0
  if (from === value) { el.textContent = String(Math.round(value)); return }
  const start = performance.now()
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / DURATION)
    // easeOutExpo：快速起步、平稳收尾，适合统计数字
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
    const shown = Math.round(from + (value - from) * eased)
    el.textContent = String(shown)
    if (p < 1) {
      el._raf = requestAnimationFrame(tick)
    } else {
      el._current = value
      el._raf = undefined
    }
  }
  el._raf = requestAnimationFrame(tick)
}

export const countUp: Directive<CountUpEl, number> = {
  // SSR 安全：服务端不做滚动，仅渲染占位属性，避免 renderToString 报错。
  getSSRProps(binding) {
    return { 'data-count-up': String(Number(binding.value) || 0) }
  },
  mounted(el, binding) {
    el._current = 0
    el.textContent = '0'
    render(el, Number(binding.value) || 0)
  },
  updated(el, binding) {
    // 仅当真实数值变化时才滚动，避免父组件重渲染引起整页数字跳动
    if (binding.value !== binding.oldValue) {
      render(el, Number(binding.value) || 0)
    }
  },
  unmounted(el) {
    if (el._raf) cancelAnimationFrame(el._raf)
  },
}
