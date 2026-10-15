<script setup lang="ts">
/**
 * 全局液态玻璃 SVG 滤镜定义（移植自 rdev/liquid-glass-react 的 GlassFilter，MIT）。
 *
 * 包含三组滤镜，供不同表面通过 CSS `filter: url(#id)` 引用：
 *  - lg-glass-strong   standard 贴图 / scale 70  胶囊按钮、小尺寸强折射元素
 *  - lg-glass          standard 贴图 / scale 42  卡片、侧栏、顶栏等常规表面
 *  - lg-glass-prominent prominent 贴图 / scale 56 登录卡等大尺寸主面板
 *
 * 滤镜只负责「边缘折射 + RGB 边缘色差」；模糊与饱和度由元素自身的
 * backdrop-filter 控制。SVG defs 不占位、不响应事件。
 */
import { computed } from 'vue'
import { displacementMaps } from '@/glass/displacement-maps'

// 每组滤镜的参数（对应 React 版 displacementScale / aberrationIntensity）
const variants = computed(() => {
  const defs = [
    { id: 'lg-glass-strong', map: displacementMaps.standard, scale: 70, aberration: 2 },
    { id: 'lg-glass', map: displacementMaps.standard, scale: 42, aberration: 2 },
    { id: 'lg-glass-prominent', map: displacementMaps.prominent, scale: 56, aberration: 2 },
  ]
  // 非 shader 模式下 RGB 三通道位移（与官方 GlassFilter 一致）：
  //   R = -scale；G = -scale * (1 + aberration*0.05)；B = -scale * (1 + aberration*0.1)
  return defs.map((d) => ({
    ...d,
    redScale: -d.scale,
    greenScale: -d.scale * (1 + d.aberration * 0.05),
    blueScale: -d.scale * (1 + d.aberration * 0.1),
    blur: Math.max(0.1, 0.5 - d.aberration * 0.1),
    edgeStop: Math.max(30, 80 - d.aberration * 2),
    funcTable: `0 ${d.aberration * 0.05} 1`,
  }))
})
</script>

<template>
  <!--
    注意：SVG 容器必须有非 0 的实际尺寸，feImage 引用的位移贴图才会被
    加载并参与滤镜渲染（0×0 时 Chromium 会跳过 feImage，折射完全失效）。
    用 100vw/100vh 固定定位的空层承载 defs，不占位、不响应事件。
  -->
  <svg
    aria-hidden="true"
    focusable="false"
    class="glass-filters"
    style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; overflow: hidden; pointer-events: none;"
  >
    <defs>
      <template v-for="v in variants" :key="v.id">
        <radialGradient :id="`${v.id}-edge-mask`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="black" stopOpacity="0" />
          <stop :offset="`${v.edgeStop}%`" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </radialGradient>
        <filter
          :id="v.id"
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="DISPLACEMENT_MAP"
            :href="v.map"
            preserveAspectRatio="xMidYMid slice"
          />
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
            <feFuncA type="discrete" :tableValues="v.funcTable" />
          </feComponentTransfer>
          <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
          <!-- 红通道（位移基准） -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="DISPLACEMENT_MAP"
            :scale="v.redScale"
            xChannelSelector="R"
            yChannelSelector="B"
            result="RED_DISPLACED"
          />
          <feColorMatrix
            in="RED_DISPLACED"
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="RED_CHANNEL"
          />
          <!-- 绿通道（额外偏移 0.05） -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="DISPLACEMENT_MAP"
            :scale="v.greenScale"
            xChannelSelector="R"
            yChannelSelector="B"
            result="GREEN_DISPLACED"
          />
          <feColorMatrix
            in="GREEN_DISPLACED"
            type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="GREEN_CHANNEL"
          />
          <!-- 蓝通道（额外偏移 0.1） -->
          <feDisplacementMap
            in="SourceGraphic"
            in2="DISPLACEMENT_MAP"
            :scale="v.blueScale"
            xChannelSelector="R"
            yChannelSelector="B"
            result="BLUE_DISPLACED"
          />
          <feColorMatrix
            in="BLUE_DISPLACED"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
            result="BLUE_CHANNEL"
          />
          <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
          <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
          <feGaussianBlur
            in="RGB_COMBINED"
            :stdDeviation="v.blur"
            result="ABERRATED_BLURRED"
          />
          <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
          <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
          <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
        </filter>
      </template>
    </defs>
  </svg>
</template>
