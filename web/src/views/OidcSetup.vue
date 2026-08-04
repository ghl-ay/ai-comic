<!-- web/src/views/OidcSetup.vue — OIDC 首次：绑定已有账号 或 新建账号 -->
<template>
  <div class="oidc-setup">
    <div class="oidc-setup__glow" aria-hidden="true" />

    <v-container class="fill-height">
      <v-row align="center" justify="center">
        <v-col cols="12" sm="10" md="8" lg="5">
          <div class="oidc-card">
            <header class="oidc-card__header">
              <div class="oidc-card__badge">
                <v-icon size="28" color="primary">mdi-link-variant</v-icon>
              </div>
              <h1 class="oidc-card__title">完成账号关联</h1>
              <p class="oidc-card__lead">
                一人一账号。请绑定已有本站账号，或新建一个账号（需设置本地密码）。
              </p>
              <div v-if="pendingHint" class="oidc-card__hint">
                <v-icon size="16" class="mr-1">mdi-account-circle-outline</v-icon>
                第三方身份建议名：
                <strong>{{ pendingHint }}</strong>
              </div>
            </header>

            <v-tabs v-model="tab" grow class="oidc-card__tabs">
              <v-tab value="bind">绑定已有账号</v-tab>
              <v-tab value="register">新建账号</v-tab>
            </v-tabs>

            <div class="oidc-card__body">
              <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                {{ error }}
              </v-alert>
              <v-alert v-if="expired" type="warning" variant="tonal" class="mb-4">
                第三方登录会话已过期，请返回登录页重新授权。
                <div class="mt-2">
                  <v-btn size="small" color="primary" variant="text" to="/login">
                    返回登录
                  </v-btn>
                </div>
              </v-alert>

              <v-window v-model="tab">
                <v-window-item value="bind">
                  <v-form @submit.prevent="handleBind">
                    <v-text-field
                      v-model="bindForm.username"
                      label="本站用户名"
                      prepend-inner-icon="mdi-account-outline"
                      variant="outlined"
                      density="comfortable"
                      class="mb-2"
                      :disabled="expired"
                    />
                    <v-text-field
                      v-model="bindForm.password"
                      label="本站密码"
                      type="password"
                      prepend-inner-icon="mdi-lock-outline"
                      variant="outlined"
                      density="comfortable"
                      class="mb-4"
                      :disabled="expired"
                    />
                    <v-btn
                      type="submit"
                      color="primary"
                      block
                      size="large"
                      class="oidc-card__submit"
                      :loading="loading"
                      :disabled="expired"
                    >
                      验证并绑定
                    </v-btn>
                  </v-form>
                </v-window-item>

                <v-window-item value="register">
                  <v-form @submit.prevent="handleRegister">
                    <v-text-field
                      v-model="registerForm.username"
                      label="用户名"
                      prepend-inner-icon="mdi-account-outline"
                      variant="outlined"
                      density="comfortable"
                      class="mb-2"
                      hint="3–50 个字符"
                      :disabled="expired"
                    />
                    <v-text-field
                      v-model="registerForm.password"
                      label="密码"
                      type="password"
                      prepend-inner-icon="mdi-lock-outline"
                      variant="outlined"
                      density="comfortable"
                      class="mb-2"
                      hint="至少 6 位"
                      :disabled="expired"
                    />
                    <v-text-field
                      v-model="registerForm.confirmPassword"
                      label="确认密码"
                      type="password"
                      prepend-inner-icon="mdi-lock-check-outline"
                      variant="outlined"
                      density="comfortable"
                      class="mb-4"
                      :disabled="expired"
                    />
                    <v-btn
                      type="submit"
                      color="primary"
                      block
                      size="large"
                      class="oidc-card__submit"
                      :loading="loading"
                      :disabled="expired"
                    >
                      创建并绑定
                    </v-btn>
                  </v-form>
                </v-window-item>
              </v-window>
            </div>

            <footer class="oidc-card__footer">
              <router-link to="/login" class="oidc-card__back">← 返回登录</router-link>
            </footer>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import authApi from '../api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const tab = ref('bind')
const loading = ref(false)
const error = ref('')
const expired = ref(false)
const pending = ref(null)

const bindForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', confirmPassword: '' })

const pendingHint = computed(() => {
  if (!pending.value) return ''
  return pending.value.preferredUsername || pending.value.name || ''
})

const returnTo = computed(() => {
  const value = route.query.returnTo
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/comics'
})

async function loadPending() {
  try {
    const res = await authApi.getOidcPending()
    pending.value = res.pending
    if (pending.value?.preferredUsername) {
      registerForm.value.username = pending.value.preferredUsername
    }
  } catch (err) {
    expired.value = true
    error.value = err.response?.data?.error || '无法读取第三方登录会话'
  }
}

async function handleBind() {
  error.value = ''
  if (!bindForm.value.username || !bindForm.value.password) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    const res = await authApi.oidcBind(bindForm.value.username, bindForm.value.password)
    authStore.user = res.user
    authStore.checked = true
    router.replace(returnTo.value)
  } catch (err) {
    error.value = err.response?.data?.error || '绑定失败'
    if (err.response?.status === 401 && String(error.value).includes('过期')) {
      expired.value = true
    }
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''
  const { username, password, confirmPassword } = registerForm.value
  if (!username || !password) {
    error.value = '用户名和密码不能为空'
    return
  }
  if (username.length < 3 || username.length > 50) {
    error.value = '用户名长度需在 3-50 之间'
    return
  }
  if (password.length < 6) {
    error.value = '密码长度至少 6 位'
    return
  }
  if (password !== confirmPassword) {
    error.value = '两次密码不一致'
    return
  }
  loading.value = true
  try {
    const res = await authApi.oidcRegister(username, password)
    authStore.user = res.user
    authStore.checked = true
    router.replace(returnTo.value)
  } catch (err) {
    error.value = err.response?.data?.error || '注册失败'
    if (err.response?.status === 401 && String(error.value).includes('过期')) {
      expired.value = true
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPending()
})
</script>

<style scoped>
.oidc-setup {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 60% at 10% 20%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 55%),
    radial-gradient(ellipse 70% 50% at 90% 80%, color-mix(in srgb, var(--color-secondary) 14%, transparent), transparent 50%),
    var(--color-background);
}

.oidc-setup__glow {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--color-outline) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.12;
  pointer-events: none;
  mask-image: linear-gradient(180deg, #000 0%, transparent 90%);
}

.oidc-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: calc(var(--border-radius-xl, 16px) + 4px);
  box-shadow: var(--shadow-xl, 0 20px 40px rgba(0, 0, 0, 0.08));
  overflow: hidden;
}

.oidc-card__header {
  padding: 32px 32px 20px;
  text-align: center;
}

.oidc-card__badge {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

.oidc-card__title {
  margin: 0 0 8px;
  font-family: var(--font-family-display, inherit);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-on-surface);
}

.oidc-card__lead {
  margin: 0 auto;
  max-width: 34em;
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--color-on-surface-variant);
}

.oidc-card__hint {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--color-on-surface-variant);
  background: var(--color-surface-variant, #f5f5f5);
}

.oidc-card__tabs {
  border-bottom: 1px solid var(--color-outline);
}

.oidc-card__body {
  padding: 24px 32px 8px;
}

.oidc-card__submit {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.01em;
  height: 48px;
  border-radius: var(--border-radius-lg, 12px);
}

.oidc-card__footer {
  padding: 16px 32px 24px;
  text-align: center;
}

.oidc-card__back {
  font-size: 0.875rem;
  color: var(--color-primary);
  text-decoration: none;
}

.oidc-card__back:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .oidc-card__header,
  .oidc-card__body,
  .oidc-card__footer {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
