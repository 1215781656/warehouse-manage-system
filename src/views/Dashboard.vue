<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-title">物料总数</div>
          <div class="metric-value">{{ stats.materials }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-title">库存总量</div>
          <div class="metric-value">{{ stats.stock }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-title">库存金额</div>
          <div class="metric-value">{{ stats.amount.toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="metric-title">待审核单据</div>
          <div class="metric-value">{{ stats.pending }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><div class="card-header">最近7天入库</div></template>
          <div ref="inChartRef" style="height:320px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><div class="card-header">最近7天出库</div></template>
          <div ref="outChartRef" style="height:320px"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-card style="margin-top:16px" shadow="never">
      <template #header>
        <div class="card-header">快捷操作</div>
      </template>
      <el-button type="primary" @click="router.push('/stock/in')">新增入库</el-button>
      <el-button type="warning" style="margin-left:8px" @click="router.push('/stock/out')">新增出库</el-button>
      <el-button style="margin-left:8px" @click="router.push('/stock/query')">库存查询</el-button>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { query } from '@/api/db'
import * as echarts from 'echarts'
const router = useRouter()

const stats = ref({ materials: 0, stock: 0, amount: 0, pending: 0 })
const inChartRef = ref<HTMLElement | null>(null)
const outChartRef = ref<HTMLElement | null>(null)

const loadStats = async () => {
  const m = await query('SELECT COUNT(*) AS c FROM materials')
  const i = await query('SELECT COALESCE(SUM(current_stock),0) AS s, COALESCE(SUM(current_amount),0) AS a FROM inventory')
  const pIn = await query("SELECT COUNT(*) AS c FROM stock_in WHERE status='pending'")
  const pOut = await query("SELECT COUNT(*) AS c FROM stock_out WHERE status='pending'")
  stats.value.materials = m[0]?.c || 0
  stats.value.stock = i[0]?.s || 0
  stats.value.amount = i[0]?.a || 0
  stats.value.pending = (pIn[0]?.c || 0) + (pOut[0]?.c || 0)
}

const last7 = async (table: 'stock_in'|'stock_out', detailTable: 'stock_in_items'|'stock_out_items') => {
  const rows = await query(`SELECT strftime('%Y-%m-%d', ${table}.created_at) AS d, COALESCE(SUM(${detailTable}.total_amount),0) AS amt FROM ${detailTable} JOIN ${table} ON ${detailTable}.${table}_id = ${table}.id WHERE ${table}.created_at >= datetime('now','-7 day') AND ${table}.status='approved' GROUP BY d ORDER BY d`)
  const days: string[] = []
  for (let i=6;i>=0;i--) {
    const d = new Date(Date.now()-i*24*3600*1000)
    const s = d.toISOString().slice(0,10)
    days.push(s)
  }
  const map = new Map(rows.map((r:any)=>[r.d,r.amt]))
  return { days, series: days.map(d=>Number(map.get(d)||0)) }
}

const renderCharts = async () => {
  const inData = await last7('stock_in','stock_in_items')
  const outData = await last7('stock_out','stock_out_items')
  if (inChartRef.value) {
    const chart = echarts.init(inChartRef.value)
    chart.setOption({ xAxis:{ type:'category', data: inData.days }, yAxis:{ type:'value' }, series:[{ type:'bar', data: inData.series, itemStyle:{ color:'#3282b8' } }] })
  }
  if (outChartRef.value) {
    const chart = echarts.init(outChartRef.value)
    chart.setOption({ xAxis:{ type:'category', data: outData.days }, yAxis:{ type:'value' }, series:[{ type:'bar', data: outData.series, itemStyle:{ color:'#ff6b35' } }] })
  }
}

onMounted(async ()=>{ await loadStats(); await renderCharts() })
</script>
<style scoped>
.metric-title { color:#b8b8b8; font-size:13px; }
.metric-value { font-size:22px; font-weight:700; margin-top:8px; }
.card-header { font-weight:600; }
</style>

