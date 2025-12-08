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
      <el-table :data="rows" stripe v-loading="loading">
        <el-table-column prop="username" label="用户名" width="160"/>
        <el-table-column prop="name" label="姓名" width="160"/>
        <el-table-column prop="role" label="角色" width="120"/>
        <el-table-column prop="email" label="邮箱" min-width="180"/>
        <el-table-column prop="is_active" label="启用" width="100">
          <template #default="{row}"><el-switch v-model="row.is_active" @change="toggleActive(row)"/></template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{row}">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" @click="openPassword(row)">修改密码</el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { query, execute } from '@/api/db'

const userStore = useUserStore()
const loading = ref(false)
const rows = ref<any[]>([])

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
  } finally { loading.value=false }
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
    await execute('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.is_active ? 1 : 0, row.id])
    ElMessage.success('状态已更新')
  } catch (e:any) { ElMessage.error(e.message) }
}

onMounted(load)
</script>
