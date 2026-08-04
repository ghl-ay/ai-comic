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
                <th>登录方式</th>
                <th>OIDC 绑定</th>
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
                <td>
                  <v-chip size="small" variant="tonal">
                    {{ user.auth_provider || 'local' }}
                  </v-chip>
                </td>
                <td>
                  <template v-if="user.oidc_bound">
                    <div class="text-caption">
                      <div>已绑定</div>
                      <div class="text-medium-emphasis text-truncate" style="max-width: 180px" :title="user.oidc_issuer">
                        {{ shortIssuer(user.oidc_issuer) }}
                      </div>
                      <div class="text-medium-emphasis">sub: {{ user.oidc_sub }}</div>
                    </div>
                  </template>
                  <span v-else class="text-medium-emphasis">未绑定</span>
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
                  <v-btn
                    v-if="user.oidc_bound"
                    color="warning"
                    size="small"
                    variant="text"
                    :loading="user._unbindLoading"
                    @click="unbindOidc(user)"
                  >
                    解绑 OIDC
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
    users.value = res.users.map(user => ({
      ...user,
      _loading: false,
      _unbindLoading: false,
    }))
  } catch (error) {
    console.error('加载用户列表失败', error)
    alert('加载用户列表失败：' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

async function setAdmin(user, isAdmin) {
  user._loading = true
  try {
    await adminApi.setUserAdmin(user.id, isAdmin)
    user.is_admin = isAdmin
  } catch (error) {
    console.error('设置管理员失败', error)
    alert('设置失败：' + (error.response?.data?.error || error.message))
  } finally {
    user._loading = false
  }
}

async function unbindOidc(user) {
  const confirmed = window.confirm(
    `确认解除用户「${user.username}」的 OIDC 绑定？\n解除后仍可用本地密码登录；该第三方身份再次登录需重新绑定或新建。`
  )
  if (!confirmed) return

  user._unbindLoading = true
  try {
    await adminApi.unbindUserOidc(user.id)
    user.oidc_bound = false
    user.oidc_sub = null
    user.oidc_issuer = null
    user.display_name = null
    user.auth_provider = 'local'
  } catch (error) {
    console.error('解绑失败', error)
    alert('解绑失败：' + (error.response?.data?.error || error.message))
  } finally {
    user._unbindLoading = false
  }
}

function shortIssuer(issuer) {
  if (!issuer) return '-'
  try {
    const url = new URL(issuer)
    return url.host
  } catch {
    return issuer.length > 32 ? issuer.slice(0, 32) + '…' : issuer
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
