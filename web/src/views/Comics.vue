<!-- web/src/views/Comics.vue -->
<template>
  <v-container>
    <v-row>
      <v-col>
        <h1>漫画列表</h1>
        <p>欢迎, {{ authStore.user?.username }}</p>
        <v-btn @click="logout" color="error">登出</v-btn>
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
