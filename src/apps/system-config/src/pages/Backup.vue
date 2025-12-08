<template>
  <div>
    <el-card shadow="never">
      <template #header><span style="font-weight:600">数据备份与恢复</span></template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="数据库路径">{{ dbPath }}</el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:12px">
        <el-button type="primary" @click="backup">备份数据库到文件</el-button>
        <el-button style="margin-left:8px" type="warning" @click="restore">从文件恢复数据库</el-button>
      </div>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
const dbPath = ref('')
const load = async () => { dbPath.value = await window.electronAPI.getDbPath() }
const backup = async () => { const res = await window.electronAPI.backupDb(); if (res.success) { ElMessage.success('已备份到 '+res.data) } else { ElMessage.error(res.error||'备份失败') } }
const restore = async () => { const res = await window.electronAPI.restoreDb(); if (res.success) { ElMessage.success('已恢复'); load() } else { ElMessage.error(res.error||'恢复失败') } }
onMounted(load)
</script>
