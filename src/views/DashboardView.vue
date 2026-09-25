<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAlarms, getFarms, getPonds, getStats } from '@/api/admin'
import type { Alarm, Farm, Pond, Stats } from '@/types/api'
import { METRICS, formatMetric } from '@/domain/metrics'
import StatusBadge from '@/components/StatusBadge.vue'
import MetricGrid from '@/components/MetricGrid.vue'

const loading = ref(true)
const stats = ref<Stats>({ devicesTotal: 0, online: 0, offline: 0, openAlarms: 0 })
const farms = ref<Farm[]>([])
const ponds = ref<Pond[]>([])
const alarms = ref<Alarm[]>([])
const onlineRate = computed(() => stats.value.devicesTotal ? Math.round(stats.value.online / stats.value.devicesTotal * 100) : 0)
const farmName = (id: number) => farms.value.find((item) => item.id === id)?.name ?? '未分组养殖场'
const pondName = (id: number) => ponds.value.find((item) => item.id === id)?.name ?? `池塘 #${id}`

async function load() {
  loading.value = true
  try {
    const [nextStats, nextFarms, nextPonds, nextAlarms] = await Promise.all([getStats(), getFarms(), getPonds(), getAlarms()])
    stats.value = nextStats; farms.value = nextFarms; ponds.value = nextPonds; alarms.value = nextAlarms
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '总览加载失败') }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <div class="page-intro"><div><h2>水域运行态势</h2><p>从池塘健康出发，快速发现设备离线和水质异常。</p></div><el-button @click="load">刷新数据</el-button></div>
    <section class="kpi-grid">
      <article class="surface kpi-card" style="--glow:#3c8fe8"><div class="kpi-label">监测设备</div><div class="kpi-value">{{ stats.devicesTotal }}</div><div class="kpi-foot">覆盖 <strong>{{ ponds.length }} 口池塘</strong></div></article>
      <article class="surface kpi-card" style="--glow:#0fae9b"><div class="kpi-label">在线设备</div><div class="kpi-value">{{ stats.online }}</div><div class="kpi-foot">在线率 <strong>{{ onlineRate }}%</strong></div></article>
      <article class="surface kpi-card" style="--glow:#e7a83a"><div class="kpi-label">离线设备</div><div class="kpi-value">{{ stats.offline }}</div><div class="kpi-foot">需要检查供电和网络</div></article>
      <article class="surface kpi-card" style="--glow:#e85f5f"><div class="kpi-label">未确认报警</div><div class="kpi-value">{{ stats.openAlarms }}</div><div class="kpi-foot">优先处理 <strong>严重报警</strong></div></article>
    </section>
    <section class="dashboard-grid">
      <article class="surface">
        <div class="surface-head"><div><h3>池塘状态墙</h3><small style="color:#8497a4">按未确认报警的最高级别着色</small></div><router-link to="/ponds"><el-button text type="primary">查看全部</el-button></router-link></div>
        <div class="surface-body pond-grid">
          <div v-for="pond in ponds" :key="pond.id" class="pond-card">
            <div class="pond-card-top"><div><h4>{{ pond.name }}</h4><small>{{ farmName(pond.farmId) }} · {{ pond.areaMu }} 亩</small></div><StatusBadge :status="pond.status" /></div>
            <MetricGrid :reading="pond.latest" compact />
          </div>
        </div>
      </article>
      <article class="surface">
        <div class="surface-head"><div><h3>最新报警</h3><small style="color:#8497a4">最近发生的水质异常</small></div><router-link to="/alarms"><el-button text type="primary">报警中心</el-button></router-link></div>
        <div class="surface-body alarm-feed">
          <div v-for="alarm in alarms.slice(0, 5)" :key="alarm.id" class="alarm-item">
            <span class="alarm-dot" :style="{ '--alarm-color': alarm.level === 'critical' ? '#e85f5f' : '#e7a83a' }" />
            <div><strong>{{ pondName(alarm.pondId) }} · {{ METRICS[alarm.metric].label }}</strong><p>{{ formatMetric(alarm.metric, alarm.currentValue) }}，阈值 {{ formatMetric(alarm.metric, alarm.threshold) }}</p></div>
            <time>{{ new Date(alarm.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</time>
          </div>
          <div v-if="!alarms.length" class="empty-note">当前没有报警</div>
        </div>
      </article>
    </section>
  </div>
</template>
