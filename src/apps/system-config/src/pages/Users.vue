<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center">
          <span style="font-weight:600">用户管理</span>
          <div style="flex:1" />
          <el-button type="primary" size="small" @click="openAdd">新增用户</el-button>
        </div>
      </template>
      <div class="select-row" style="padding-left:12px">
        <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选所有数据</el-checkbox>
        <span style="margin-left:12px">已选：{{ selectionCount }} 条</span>
      </div>
      <el-table ref="tableRef" :data="paged" stripe v-loading="loading" :row-key="rowKey" :reserve-selection="true" @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" :selectable="rowSelectable" />
        <el-table-column prop="username" label="用户名" width="160"/>
        <el-table-column prop="name" label="姓名" width="160"/>
        <el-table-column prop="role" label="角色" width="120"/>
        <el-table-column prop="email" label="邮箱" min-width="180"/>
        <el-table-column prop="is_active" label="启用" width="100">
          <template #default="{row}"><el-switch v-model="row.is_active" :active-value="1" :inactive-value="0" @change="toggleActive(row)"/></template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template #default="{row}">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" @click="openPassword(row)">修改密码</el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <el-pagination background layout="total, sizes, prev, pager, next, jumper" :total="total" :page-sizes="pageSizes" :page-size="pageSize" :current-page="currentPage" @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </el-card>

    <el-dialog v-model="visible" :title="editing ? '编辑用户' : '新增用户'" width="520px">
      <el-form :model="form" ref="formRef" label-width="90px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="editing"/></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name"/></el-form-item>
        <el-form-item label="角色"><el-select v-model="form.role" style="width:100%"><el-option label="管理员" value="admin"/><el-option label="经理" value="manager"/><el-option label="员工" value="user"/></el-select></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email"/></el-form-item>
        <el-form-item v-if="!editing" label="初始密码"><el-input v-model="form.password" type="password"/></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pwdVisible" title="修改密码" width="480px">
      <el-form :model="pwd" ref="pwdRef" label-width="90px">
        <el-form-item label="旧密码"><el-input v-model="pwd.old" type="password"/></el-form-item>
        <el-form-item label="新密码"><el-input v-model="pwd.new" type="password"/></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible=false">取消</el-button>
        <el-button type="primary" @click="savePassword">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { query, execute } from '@/api/db'

const userStore = useUserStore()
const loading = ref(false)
const rows = ref<any[]>([])
const tableRef = ref<any>(null)
const selectAll = ref(false)
const selectedKeys = ref<Set<any>>(new Set())
const suppressSelectionEvent = ref(false)
const rowKey = (row:any)=> row.id
const onSelectionChange = (sel:any[]) => { if (suppressSelectionEvent.value) return; const pageRows = paged.value; const pageKeys = new Set(pageRows.map(r=>rowKey(r))); const newSel = new Set(sel.map(r=>rowKey(r))); for (const k of Array.from(pageKeys)) selectedKeys.value.delete(k); for (const k of Array.from(newSel)) selectedKeys.value.add(k); if (selectAll.value && newSel.size < pageRows.length) selectAll.value=false }
const toggleSelectAll = async () => { if (selectAll.value) { selectedKeys.value = new Set(rows.value.map(r=>rowKey(r))); suppressSelectionEvent.value = true; paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, true)); suppressSelectionEvent.value=false } else { selectedKeys.value.clear(); paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, false)) } await nextTick(); restoreSelection() }
const rowSelectable = () => !selectAll.value
const selectionCount = computed(()=> selectedKeys.value.size)
const pageSize = ref(10)
const pageSizes = ref([10,20,50,100])
const currentPage = ref(1)
const total = computed(()=> rows.value.length)
const paged = computed(()=> rows.value.slice((currentPage.value-1)*pageSize.value, (currentPage.value-1)*pageSize.value + pageSize.value))
const handlePageChange = async (p:number)=>{ suppressSelectionEvent.value = true; currentPage.value = p; await nextTick(); restoreSelection(); suppressSelectionEvent.value=false }
const handleSizeChange = async (s:number)=>{ suppressSelectionEvent.value = true; pageSize.value = s; currentPage.value = 1; await nextTick(); restoreSelection(); suppressSelectionEvent.value=false }
const restoreSelection = () => { suppressSelectionEvent.value = true; paged.value.forEach(r=> tableRef.value?.toggleRowSelection(r, selectedKeys.value.has(rowKey(r)) || selectAll.value)); suppressSelectionEvent.value = false }

const formRef = ref()
const visible = ref(false)
const editing = ref(false)
const form = ref<any>({ username:'', name:'', role:'user', email:'', password:'' })

const pwdVisible = ref(false)
const pwdRef = ref()
const pwd = ref<any>({ id:0, old:'', new:'' })

const load = async () => {
  loading.value = true
  try {
    rows.value = await userStore.getUserList()
  } finally { loading.value=false; await nextTick(); restoreSelection() }
}

const openAdd = () => { editing.value=false; form.value={ username:'', name:'', role:'user', email:'', password:'' }; visible.value=true }
const openEdit = (row:any) => { editing.value=true; form.value={ ...row }; visible.value=true }

const save = async () => {
  if (!editing.value) {
    const ok = await userStore.createUser({ username: form.value.username, password_hash: form.value.password, name: form.value.name, role: form.value.role, email: form.value.email })
    if (ok) { ElMessage.success('创建成功'); visible.value=false; load() }
  } else {
    const ok = await userStore.updateUser(form.value.id, { name: form.value.name, role: form.value.role, email: form.value.email, is_active: form.value.is_active })
    if (ok) { ElMessage.success('更新成功'); visible.value=false; load() }
  }
}

const openPassword = (row:any) => { pwdVisible.value=true; pwd.value={ id:row.id, old:'', new:'' } }
const savePassword = async () => {
  const res = await window.electronAPI.userSetPassword(pwd.value.id, pwd.value.old, pwd.value.new)
  if (res.success) { ElMessage.success('修改成功'); pwdVisible.value=false } else { ElMessage.error(res.error||'修改失败') }
}

const toggleActive = async (row:any) => {
  try {
    await execute('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.is_active, row.id])
  } catch (e:any) { ElMessage.error(e.message) }
}

const resetAll = async () => {
  try {
    await ElMessageBox.confirm('此操作将清空所有业务数据并重置默认管理员账号，是否继续？', '提示', { type: 'warning' })
    const res = await window.electronAPI.resetDb()
    if (res && res.success) { ElMessage.success('已清空'); load() } else { ElMessage.error(res.error || '清空失败') }
  } catch (e:any) {}
}

 

onMounted(load)
</script>
