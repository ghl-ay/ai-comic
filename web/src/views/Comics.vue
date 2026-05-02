<!-- web/src/views/Comics.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>漫画列表</h1>
          <div>
            <v-btn
              color="primary"
              variant="text"
              to="/characters"
              class="mr-2"
            >
              <v-icon left>mdi-account-group</v-icon>
              角色库
            </v-btn>
            <v-btn color="error" variant="text" @click="logout">
              <v-icon left>mdi-logout</v-icon>
              登出
            </v-btn>
          </div>
        </div>
        <p>欢迎, {{ authStore.user?.username }}</p>
        <v-card class="mt-4">
          <v-card-text class="text-center py-8">
            <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
            <p class="text-grey mt-4">漫画功能开发中...</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>
