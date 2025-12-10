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
        <el-button style="margin-left:8px" type="danger" @click="resetAll">清空数据</el-button>
        <el-button style="margin-left:8px" @click="mergeBackup">合并备份</el-button>
      </div>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
const dbPath = ref('')
const load = async () => { dbPath.value = await window.electronAPI.getDbPath() }
const backup = async () => { const res = await window.electronAPI.backupDb(); if (res.success) { ElMessage.success('已备份到 '+res.data) } else { ElMessage.error(res.error||'备份失败') } }
const restore = async () => { const res = await window.electronAPI.restoreDb(); if (res.success) { ElMessage.success('已恢复'); load() } else { ElMessage.error(res.error||'恢复失败') } }
const resetAll = async () => { try { await ElMessageBox.confirm('将清空所有业务数据（保留账户与配置），是否继续？','提示',{type:'warning'}) ; const res = await window.electronAPI.clearData('business'); if (res.success) { ElMessage.success('已清空'); load() } else { ElMessage.error(res.error||'清空失败') } } catch(e:any) {} }
const mergeBackup = async () => { const res = await window.electronAPI.mergeDb(); if (res && res.success) { ElMessage.success('合并完成'); load() } else { ElMessage.error(res.error||'合并失败') } }
onMounted(load)
</script>
