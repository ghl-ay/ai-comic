<!-- web/src/views/admin/Users.vue -->
<template>
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title>用户管理</v-card-title>
        <v-card-text>
          <v-table v-if="users.length > 0">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>
                  <v-chip :color="user.is_admin ? 'primary' : 'default'" size="small">
                    {{ user.is_admin ? '管理员' : '普通用户' }}
                  </v-chip>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <v-btn
                    v-if="!user.is_admin"
                    color="primary"
                    size="small"
                    variant="text"
                    @click="setAdmin(user, true)"
                    :loading="user._loading"
                  >
                    设为管理员
                  </v-btn>
                  <v-btn
                    v-else
                    color="error"
                    size="small"
                    variant="text"
                    @click="setAdmin(user, false)"
                    :loading="user._loading"
                  >
                    取消管理员
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
          <v-progress-circular v-else-if="loading" indeterminate />
          <v-empty-state v-else text="暂无用户" />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import adminApi from '../../api/admin'

const users = ref([])
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const res = await adminApi.getUsers()
    users.value = res.users.map(u => ({ ...u, _loading: false }))
  } catch (e) {
    console.error('加载用户列表失败', e)
    alert('加载用户列表失败：' + (e.response?.data?.error || e.message))
  } finally {
    loading.value = false
  }
}

async function setAdmin(user, isAdmin) {
  user._loading = true
  try {
    await adminApi.setUserAdmin(user.id, isAdmin)
    user.is_admin = isAdmin
  } catch (e) {
    console.error('设置管理员失败', e)
    alert('设置失败：' + (e.response?.data?.error || e.message))
  } finally {
    user._loading = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadUsers()
})
</script>
