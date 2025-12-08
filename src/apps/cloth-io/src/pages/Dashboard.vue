<template>
  <div>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="metric-title">入库记录数</div>
          <div class="metric-value">{{ stats.inCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="metric-title">出库记录数</div>
          <div class="metric-value">{{ stats.outCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="metric-title">本月金额合计</div>
          <div class="metric-value">{{ stats.monthAmount.toFixed(2) }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><div class="card-header">最近7天入库金额</div></template>
          <div ref="inChartRef" style="height:320px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><div class="card-header">最近7天出库金额</div></template>
          <div ref="outChartRef" style="height:320px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { query } from '@/api/db'
import * as echarts from 'echarts'

const stats = ref({ inCount: 0, outCount: 0, monthAmount: 0 })
const inChartRef = ref<HTMLElement | null>(null)
const outChartRef = ref<HTMLElement | null>(null)

const loadStats = async () => {
  const inC = await query('SELECT COUNT(*) AS c FROM stock_in_records')
  const outC = await query('SELECT COUNT(*) AS c FROM stock_out_records')
  const monthIn = await query("SELECT COALESCE(SUM(total_amount),0) AS amt FROM stock_in_records WHERE strftime('%Y-%m', ship_date)=strftime('%Y-%m','now')")
  const monthOut = await query("SELECT COALESCE(SUM(total_amount),0) AS amt FROM stock_out_records WHERE strftime('%Y-%m', ship_date)=strftime('%Y-%m','now')")
  stats.value.inCount = inC[0]?.c || 0
  stats.value.outCount = outC[0]?.c || 0
  stats.value.monthAmount = (monthIn[0]?.amt || 0) + (monthOut[0]?.amt || 0)
}

const last7From = async (table: 'stock_in_records'|'stock_out_records') => {
  const rows = await query(`SELECT ship_date AS d, COALESCE(SUM(total_amount),0) AS amt FROM ${table} WHERE ship_date >= date('now','-6 day') GROUP BY d ORDER BY d`)
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
  const inData = await last7From('stock_in_records')
  const outData = await last7From('stock_out_records')
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
