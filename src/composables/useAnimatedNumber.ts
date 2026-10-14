import { onUnmounted, ref, watch } from 'vue'

/**
 * useAnimatedNumber：实时数据数字平滑过渡（纯展示组合式函数）。
 * - 首次取值直接显示真实值；源数值变化时，从当前显示值以 easeOutCubic
 *   在 duration 内平滑过渡到新值，避免实时数据瞬间跳变。
 * - 不修改任何源数据：source 仅作为输入，组件展示的是 display 副本。
 * - 尊重 prefers-reduced-motion：减少动态偏好下直接显示新值。
 * - 使用 requestAnimationFrame 驱动；卸载时自动取消。
 */
export function useAnimatedNumber(source: () => number | null | undefined, duration = 700) {
  const display = ref<number | null>(source() ?? null)
  let raf = 0
  let start = 0
  let from = 0
  let to = 0

  function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function tick(now: number) {
    const p = Math.min(1, (now - start) / duration)
    // easeOutCubic：快速起步、平稳收尾，适合仪表读数
    const eased = 1 - Math.pow(1 - p, 3)
    display.value = from + (to - from) * eased
    if (p < 1) {
      raf = requestAnimationFrame(tick)
    } else {
      display.value = to
      raf = 0
    }
  }

  watch(source, (next) => {
    if (next == null || Number.isNaN(next)) {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      display.value = null
      return
    }
    if (display.value == null || display.value === next || prefersReducedMotion()) {
      display.value = next
      return
    }
    if (raf) cancelAnimationFrame(raf)
    from = display.value
    to = next
    start = performance.now()
    raf = requestAnimationFrame(tick)
  }, { immediate: false })

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  return display
}
