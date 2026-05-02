<!-- web/src/views/Login.vue -->
<template>
  <v-container fluid class="fill-height bg-grey-lighten-4">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>AI 漫画创作</v-toolbar-title>
          </v-toolbar>

          <v-tabs v-model="tab" grow>
            <v-tab value="login">登录</v-tab>
            <v-tab value="register">注册</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="tab">
              <!-- 登录表单 -->
              <v-window-item value="login">
                <v-form @submit.prevent="handleLogin">
                  <v-text-field
                    v-model="loginForm.username"
                    label="用户名"
                    prepend-icon="mdi-account"
                    :rules="[v => !!v || '请输入用户名']"
                  />
                  <v-text-field
                    v-model="loginForm.password"
                    label="密码"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[v => !!v || '请输入密码']"
                  />
                  <v-alert v-if="authStore.error" type="error" class="mb-4">
                    {{ authStore.error }}
                  </v-alert>
                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    :loading="authStore.loading"
                  >
                    登录
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- 注册表单 -->
              <v-window-item value="register">
                <v-form @submit.prevent="handleRegister">
                  <v-text-field
                    v-model="registerForm.username"
                    label="用户名"
                    prepend-icon="mdi-account"
                    :rules="[
                      v => !!v || '请输入用户名',
                      v => v.length >= 3 || '用户名至少 3 个字符'
                    ]"
                  />
                  <v-text-field
                    v-model="registerForm.password"
                    label="密码"
                    prepend-icon="mdi-lock"
                    type="password"
                    :rules="[
                      v => !!v || '请输入密码',
                      v => v.length >= 6 || '密码至少 6 位'
                    ]"
                  />
                  <v-text-field
                    v-model="registerForm.confirmPassword"
                    label="确认密码"
                    prepend-icon="mdi-lock-check"
                    type="password"
                    :rules="[
                      v => v === registerForm.password || '两次密码不一致'
                    ]"
                  />
                  <v-alert v-if="authStore.error" type="error" class="mb-4">
                    {{ authStore.error }}
                  </v-alert>
                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    :loading="authStore.loading"
                  >
                    注册
                  </v-btn>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const tab = ref('login')
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', confirmPassword: '' })

async function handleLogin() {
  const success = await authStore.login(
    loginForm.value.username,
    loginForm.value.password
  )
  if (success) {
    router.push('/comics')
  }
}

async function handleRegister() {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    return
  }
  const success = await authStore.register(
    registerForm.value.username,
    registerForm.value.password
  )
  if (success) {
    router.push('/comics')
  }
}
</script>
