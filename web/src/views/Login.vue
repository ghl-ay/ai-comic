<!-- web/src/views/Login.vue -->
<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-page__bg-decoration">
      <div class="login-page__circle login-page__circle--1"></div>
      <div class="login-page__circle login-page__circle--2"></div>
      <div class="login-page__dots"></div>
    </div>

    <v-container fluid class="fill-height position-relative">
      <v-row align="center" justify="center">
        <v-col cols="12" sm="10" md="8" lg="6" xl="4">
          <div class="login-card">
            <!-- 卡片头部 -->
            <div class="login-card__header">
              <div class="login-card__logo">
                <v-icon size="48" color="primary">mdi-book-open-page-variant</v-icon>
              </div>
              <h1 class="login-card__title">
                <span class="login-card__title-main">AI 漫画创作平台</span>
                <span class="login-card__title-sub">用人工智能释放你的创意潜能</span>
              </h1>
            </div>

            <!-- 标签页 -->
            <v-tabs v-model="tab" grow class="login-card__tabs">
              <v-tab value="login" class="login-card__tab">
                <v-icon left>mdi-login</v-icon>
                登录
              </v-tab>
              <v-tab value="register" class="login-card__tab">
                <v-icon left>mdi-account-plus</v-icon>
                注册
              </v-tab>
            </v-tabs>

            <!-- 表单内容 -->
            <v-card-text class="login-card__content">
              <v-window v-model="tab">
                <!-- 登录表单 -->
                <v-window-item value="login">
                  <v-form @submit.prevent="handleLogin" class="login-form">
                    <div class="login-form__field">
                      <v-text-field
                        v-model="loginForm.username"
                        label="用户名"
                        prepend-inner-icon="mdi-account-outline"
                        variant="outlined"
                        density="comfortable"
                        :rules="[v => !!v || '请输入用户名']"
                        class="login-form__input"
                      />
                    </div>

                    <div class="login-form__field">
                      <v-text-field
                        v-model="loginForm.password"
                        label="密码"
                        prepend-inner-icon="mdi-lock-outline"
                        variant="outlined"
                        density="comfortable"
                        type="password"
                        :rules="[v => !!v || '请输入密码']"
                        class="login-form__input"
                      />
                    </div>

                    <v-alert v-if="authStore.error" type="error" class="mb-4" variant="tonal">
                      {{ authStore.error }}
                    </v-alert>

                    <v-btn
                      type="submit"
                      color="primary"
                      block
                      size="large"
                      :loading="authStore.loading"
                      class="login-form__submit"
                    >
                      <v-icon left>mdi-login</v-icon>
                      登录
                    </v-btn>
                  </v-form>
                </v-window-item>

                <!-- 注册表单 -->
                <v-window-item value="register">
                  <v-form @submit.prevent="handleRegister" class="login-form">
                    <div class="login-form__field">
                      <v-text-field
                        v-model="registerForm.username"
                        label="用户名"
                        prepend-inner-icon="mdi-account-outline"
                        variant="outlined"
                        density="comfortable"
                        :rules="[
                          v => !!v || '请输入用户名',
                          v => v.length >= 3 || '用户名至少 3 个字符'
                        ]"
                        class="login-form__input"
                      />
                    </div>

                    <div class="login-form__field">
                      <v-text-field
                        v-model="registerForm.password"
                        label="密码"
                        prepend-inner-icon="mdi-lock-outline"
                        variant="outlined"
                        density="comfortable"
                        type="password"
                        :rules="[
                          v => !!v || '请输入密码',
                          v => v.length >= 6 || '密码至少 6 位'
                        ]"
                        class="login-form__input"
                      />
                    </div>

                    <div class="login-form__field">
                      <v-text-field
                        v-model="registerForm.confirmPassword"
                        label="确认密码"
                        prepend-inner-icon="mdi-lock-check-outline"
                        variant="outlined"
                        density="comfortable"
                        type="password"
                        :rules="[
                          v => v === registerForm.password || '两次密码不一致'
                        ]"
                        class="login-form__input"
                      />
                    </div>

                    <v-alert v-if="authStore.error" type="error" class="mb-4" variant="tonal">
                      {{ authStore.error }}
                    </v-alert>

                    <v-btn
                      type="submit"
                      color="primary"
                      block
                      size="large"
                      :loading="authStore.loading"
                      class="login-form__submit"
                    >
                      <v-icon left>mdi-account-plus</v-icon>
                      注册
                    </v-btn>
                  </v-form>
                </v-window-item>
              </v-window>
            </v-card-text>

            <!-- 底部信息 -->
            <div class="login-card__footer">
              <p class="login-card__footer-text">
                开始创作你的AI漫画作品
              </p>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
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

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface) 100%);
  position: relative;
  overflow: hidden;
}

.login-page__bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.login-page__circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  opacity: 0.1;
}

.login-page__circle--1 {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -200px;
  animation: float 8s ease-in-out infinite;
}

.login-page__circle--2 {
  width: 400px;
  height: 400px;
  bottom: -150px;
  left: -150px;
  animation: float 10s ease-in-out infinite 2s;
}

.login-page__dots {
  position: absolute;
  top: 20%;
  left: 10%;
  width: 200px;
  height: 200px;
  background-image: radial-gradient(var(--color-primary) 2px, transparent 2px);
  background-size: 20px 20px;
  opacity: 0.2;
}

.login-card {
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  max-width: 480px;
  margin: 0 auto;
  border: 1px solid var(--color-outline);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.login-card__header {
  padding: 40px 40px 24px;
  text-align: center;
  background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface) 100%);
}

.login-card__logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: var(--color-surface);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
}

.login-card__title {
  margin: 0;
}

.login-card__title-main {
  display: block;
  font-family: var(--font-family-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-on-surface);
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-card__title-sub {
  display: block;
  font-size: 0.9375rem;
  color: var(--color-on-surface-variant);
  font-weight: 400;
}

.login-card__tabs {
  border-bottom: 1px solid var(--color-outline);
}

.login-card__tab {
  font-weight: 600;
  text-transform: none;
  letter-spacing: normal;
}

.login-card__content {
  padding: 24px 40px;
}

.login-form__field {
  margin-bottom: 16px;
}

.login-form__input {
  border-radius: var(--border-radius-lg);
}

.login-form__submit {
  margin-top: 8px;
  font-weight: 600;
  text-transform: none;
  border-radius: var(--border-radius-lg);
  height: 48px;
  font-size: 1rem;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.3s ease;
}

.login-form__submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.login-card__footer {
  padding: 16px 40px 24px;
  text-align: center;
  border-top: 1px solid var(--color-outline);
  background: var(--color-surface-variant);
}

.login-card__footer-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-on-surface-variant);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

/* 响应式调整 */
@media (max-width: 600px) {
  .login-card__header {
    padding: 24px 24px 20px;
  }

  .login-card__logo {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
  }

  .login-card__title-main {
    font-size: 1.5rem;
  }

  .login-card__content {
    padding: 20px 24px;
  }

  .login-card__footer {
    padding: 12px 24px 20px;
  }

  .login-page__circle--1 {
    width: 400px;
    height: 400px;
    top: -150px;
    right: -150px;
  }

  .login-page__circle--2 {
    width: 300px;
    height: 300px;
    bottom: -100px;
    left: -100px;
  }

  .login-page__dots {
    display: none;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .login-page {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
}

[data-theme="dark"] .login-card {
  background: var(--color-surface-variant);
  border-color: var(--color-outline);
}

[data-theme="dark"] .login-card__header {
  background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface-variant) 100%);
}

[data-theme="dark"] .login-card__logo {
  background: var(--color-surface);
}

[data-theme="dark"] .login-card__footer {
  background: var(--color-surface);
}

[data-theme="dark"] .login-form__submit {
  box-shadow: 0 4px 12px rgba(129, 140, 248, 0.3);
}

[data-theme="dark"] .login-form__submit:hover {
  box-shadow: 0 6px 16px rgba(129, 140, 248, 0.4);
}
</style>
