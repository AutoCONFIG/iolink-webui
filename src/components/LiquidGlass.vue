<script setup lang="ts">
/**
 * LiquidGlass —— rdev/liquid-glass-react 的 Vue 3 移植版（MIT）。
 *
 * 还原 Apple Liquid Glass 材质：
 *  - SVG feDisplacementMap 边缘折射 + RGB 边缘色差（实例专属滤镜）
 *  - backdrop-filter 模糊 + 高饱和
 *  - 边缘双层跟随高光（screen / overlay）
 *  - 鼠标靠近时的弹性拉伸与磁吸位移、按压缩放
 *  - 可点击元素的顶部径向高光
 *
 * Props 与 React 版保持一致；另增加 interactive（弹性开关）、clickable（可点击态）。
 */
import { computed, ref, useId } from 'vue'
import { displacementMaps, type GlassMode } from '@/glass/displacement-maps'

const props = withDefaults(
  defineProps<{
    displacementScale?: number
    blurAmount?: number
    saturation?: number
    aberrationIntensity?: number
    elasticity?: number
    cornerRadius?: number
    padding?: string
    overLight?: boolean
    mode?: GlassMode
    /** 鼠标靠近时是否弹性拉伸/磁吸 */
    interactive?: boolean
    /** 是否可点击（cursor + 顶部高光 + 按压态） */
    clickable?: boolean
  }>(),
  {
    displacementScale: 70,
    blurAmount: 0.0625,
    saturation: 140,
    aberrationIntensity: 2,
    elasticity: 0.15,
    cornerRadius: 999,
    padding: '12px 26px',
    overLight: false,
    mode: 'standard',
    interactive: true,
    clickable: false,
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const filterId = `lg-instance-${uid}`

const glassRef = ref<HTMLElement | null>(null)
const hovered = ref(false)
const active = ref(false)
const globalMousePos = ref({ x: 0, y: 0 })
const mouseOffset = ref({ x: 0, y: 0 })

const mapUrl = computed(() => displacementMaps[props.mode])

// 三通道位移（与官方 GlassFilter 一致；非 shader 模式为负向）
const redScale = computed(() => -props.displacementScale)
const greenScale = computed(
  () => -props.displacementScale * (1 + props.aberrationIntensity * 0.05),
)
const blueScale = computed(
  () => -props.displacementScale * (1 + props.aberrationIntensity * 0.1),
)
const aberrationBlur = computed(() =>
  Math.max(0.1, 0.5 - props.aberrationIntensity * 0.1),
)
const edgeStop = computed(() => Math.max(30, 80 - props.aberrationIntensity * 2))
const funcTable = computed(() => `0 ${props.aberrationIntensity * 0.05} 1`)

function handleMove(e: MouseEvent) {
  const el = glassRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  mouseOffset.value = {
    x: ((e.clientX - centerX) / rect.width) * 100,
    y: ((e.clientY - centerY) / rect.height) * 100,
  }
  globalMousePos.value = { x: e.clientX, y: e.clientY }
}

function edgeDistance(): number {
  const el = glassRef.value
  if (!el) return Infinity
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = globalMousePos.value.x - cx
  const dy = globalMousePos.value.y - cy
  const ex = Math.max(0, Math.abs(dx) - rect.width / 2)
  const ey = Math.max(0, Math.abs(dy) - rect.height / 2)
  return Math.sqrt(ex * ex + ey * ey)
}

function fadeInFactor(): number {
  if (!props.interactive) return 0
  const d = edgeDistance()
  const zone = 200
  return d > zone ? 0 : 1 - d / zone
}

const transform = computed(() => {
  if (!props.interactive) return active.value && props.clickable ? 'scale(0.96)' : 'scale(1)'
  const el = glassRef.value
  let directional = 'scale(1)'
  let tx = 0
  let ty = 0
  if (el && globalMousePos.value.x && globalMousePos.value.y) {
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = globalMousePos.value.x - cx
    const dy = globalMousePos.value.y - cy
    const fade = fadeInFactor()
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (fade > 0 && dist > 0) {
      const nx = dx / dist
      const ny = dy / dist
      const stretch = Math.min(dist / 300, 1) * props.elasticity * fade
      const sx = 1 + Math.abs(nx) * stretch * 0.3 - Math.abs(ny) * stretch * 0.15
      const sy = 1 + Math.abs(ny) * stretch * 0.3 - Math.abs(nx) * stretch * 0.15
      directional = `scaleX(${Math.max(0.8, sx)}) scaleY(${Math.max(0.8, sy)})`
      tx = dx * props.elasticity * 0.1 * fade
      ty = dy * props.elasticity * 0.1 * fade
    }
  }
  const pressed = active.value && props.clickable ? 'scale(0.96)' : directional
  return `translate(${tx}px, ${ty}px) ${pressed}`
})

const warpStyle = computed(() => ({
  // 浅色主题下不启用 SVG 位移折射：白玻璃的边界位移会沿高对比边缘产生明显的
  // 红/黄色差描边。玻璃质感改由「背景模糊 + 高饱和透色 + 边缘跟随高光 + 弹性形变」
  // 共同呈现（与 rdev/liquid-glass-react 的浅色外观一致，去掉其色差副作用）。
  filter: undefined,
  backdropFilter: `blur(${(props.overLight ? 18 : 10) + props.blurAmount * 32}px) saturate(${props.saturation}%)`,
}))

const bodyStyle = computed(() => ({
  borderRadius: `${props.cornerRadius}px`,
  padding: props.padding,
  boxShadow: props.overLight
    ? '0px 16px 70px rgba(20, 45, 75, 0.22)'
    : '0px 10px 30px rgba(20, 45, 75, 0.14)',
}))

function edgeGradient(strong: number, weak: number) {
  const x = mouseOffset.value.x
  const y = mouseOffset.value.y
  return {
    background: `linear-gradient(
      ${135 + x * 1.2}deg,
      rgba(255,255,255,0) 0%,
      rgba(255,255,255,${weak + Math.abs(x) * 0.008}) ${Math.max(10, 33 + y * 0.3)}%,
      rgba(255,255,255,${strong + Math.abs(x) * 0.012}) ${Math.min(90, 66 + y * 0.4)}%,
      rgba(255,255,255,0) 100%)`,
  }
}
const edgeScreen = computed(() => edgeGradient(0.4, 0.12))
const edgeOverlay = computed(() => edgeGradient(0.6, 0.32))

const edgeBase = {
  borderRadius: `${props.cornerRadius}px`,
  padding: '1.5px',
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  maskComposite: 'exclude',
  boxShadow:
    '0 0 0 0.5px rgba(255,255,255,0.95) inset, 0 1px 3px rgba(255,255,255,0.6) inset, 0 1px 4px rgba(20,45,75,0.1)',
}
</script>

<template>
  <div
    class="liquid-glass"
    :class="{ 'is-active': active, 'is-clickable': clickable }"
    :style="{ transform }"
    @mousemove="handleMove"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @mousedown="clickable && (active = true)"
    @mouseup="active = false"
    @click="(e) => clickable && emit('click', e)"
  >
    <!-- 实例专属折射滤镜（SVG 需非 0 尺寸，feImage 才会加载） -->
    <svg aria-hidden="true" focusable="false" style="position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none;">
      <defs>
        <radialGradient :id="`${filterId}-edge-mask`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="black" stopOpacity="0" />
          <stop :offset="`${edgeStop}%`" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </radialGradient>
        <filter :id="filterId" x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feImage x="0" y="0" width="100%" height="100%" result="DISPLACEMENT_MAP" :href="mapUrl" preserveAspectRatio="xMidYMid slice" />
          <feColorMatrix
            in="DISPLACEMENT_MAP"
            type="matrix"
            values="0.3 0.3 0.3 0 0
                    0.3 0.3 0.3 0 0
                    0.3 0.3 0.3 0 0
                    0 0 0 1 0"
            result="EDGE_INTENSITY"
          />
          <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
            <feFuncA type="discrete" :tableValues="funcTable" />
          </feComponentTransfer>
          <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
          <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" :scale="redScale" xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED" />
          <feColorMatrix in="RED_DISPLACED" type="matrix" values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0" result="RED_CHANNEL" />
          <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" :scale="greenScale" xChannelSelector="R" yChannelSelector="B" result="GREEN_DISPLACED" />
          <feColorMatrix in="GREEN_DISPLACED" type="matrix" values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0" result="GREEN_CHANNEL" />
          <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" :scale="blueScale" xChannelSelector="R" yChannelSelector="B" result="BLUE_DISPLACED" />
          <feColorMatrix in="BLUE_DISPLACED" type="matrix" values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0" result="BLUE_CHANNEL" />
          <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
          <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
          <feGaussianBlur in="RGB_COMBINED" :stdDeviation="aberrationBlur" result="ABERRATED_BLURRED" />
          <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
          <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
          <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
        </filter>
      </defs>
    </svg>

    <!-- overLight 下的两层阴影 -->
    <div v-if="overLight" class="lg-shadow" :style="{ borderRadius: `${cornerRadius}px`, opacity: 0.2 }" />
    <div v-if="overLight" class="lg-shadow lg-shadow--overlay" :style="{ borderRadius: `${cornerRadius}px` }" />

    <!-- 玻璃主体 -->
    <div ref="glassRef" class="lg-body" :style="bodyStyle">
      <span class="lg-warp" :style="warpStyle" />
      <div class="lg-content"><slot /></div>
    </div>

    <!-- 边缘双层跟随高光 -->
    <span class="lg-edge" :style="[edgeBase, edgeScreen, { borderRadius: `${cornerRadius}px`, mixBlendMode: 'screen' }]" />
    <span class="lg-edge" :style="[edgeBase, edgeOverlay, { borderRadius: `${cornerRadius}px`, mixBlendMode: 'overlay' }]" />

    <!-- 可点击元素的顶部径向高光 -->
    <template v-if="clickable">
      <span
        class="lg-toplight"
        :style="{ borderRadius: `${cornerRadius}px`, opacity: hovered || active ? 0.5 : 0, mixBlendMode: 'overlay' }"
      />
      <span
        class="lg-toplight lg-toplight--active"
        :style="{ borderRadius: `${cornerRadius}px`, opacity: active ? 0.5 : 0 }"
      />
      <span
        class="lg-toplight lg-toplight--hover"
        :style="{ borderRadius: `${cornerRadius}px`, opacity: hovered ? 0.4 : active ? 0.8 : 0 }"
      />
    </template>
  </div>
</template>

<style scoped>
.liquid-glass {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  transition: transform 0.2s ease-out;
}
.liquid-glass.is-clickable {
  cursor: pointer;
}
.lg-body {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 24px;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  width: 100%;
}
.lg-warp {
  position: absolute;
  inset: 0;
  display: block;
}
.lg-content {
  position: relative;
  z-index: 1;
  color: inherit;
  font-weight: 500;
  font-size: 15px;
  line-height: 1.2;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}
.lg-edge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.2;
}
.lg-shadow {
  position: absolute;
  inset: 0;
  background: #000;
  pointer-events: none;
}
.lg-shadow--overlay {
  mix-blend-mode: overlay;
  opacity: 1;
}
.lg-toplight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 0.2s ease-out;
  background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%);
  mix-blend-mode: overlay;
}
.lg-toplight--active {
  background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 80%);
}
.lg-toplight--hover {
  background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
}
</style>
