<!-- web/src/views/admin/OidcConfig.vue — 通用 OIDC IdP 配置 -->
<template>
  <v-row>
    <v-col cols="12" lg="8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-shield-key-outline</v-icon>
          OIDC 登录配置
        </v-card-title>
        <v-card-subtitle>
          填写符合标准 OpenID Connect Discovery 的 IdP 信息。密钥仅存服务端，读取时脱敏。
        </v-card-subtitle>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            开发环境推荐回调地址：
            <code>http://localhost:3000/api/auth/oidc/callback</code>
            （须与 IdP 控制台登记值完全一致）
          </v-alert>

          <v-form @submit.prevent="save">
            <v-switch
              v-model="form.enabled"
              label="启用 OIDC 登录"
              color="primary"
              hide-details
              class="mb-4"
            />

            <v-text-field
              v-model="form.displayName"
              label="登录按钮文案"
              hint="显示在登录页的按钮文字，如「咸鱼云登录」"
              persistent-hint
              class="mb-3"
            />

            <v-text-field
              v-model="form.issuer"
              label="Issuer"
              hint="OIDC issuer，如 https://disk.example.com:344（将自动 Discovery）"
              persistent-hint
              class="mb-3"
            />

            <v-text-field
              v-model="form.clientId"
              label="Client ID"
              class="mb-3"
            />

            <v-text-field
              v-model="form.clientSecret"
              label="Client Secret"
              type="password"
              :hint="form.hasClientSecret ? '已配置密钥；留空保存表示不修改' : 'confidential client 密钥'"
              persistent-hint
              class="mb-3"
            />

            <v-text-field
              v-model="form.redirectUri"
              label="Redirect URI"
              hint="必须与 IdP 登记的回调地址字节级一致"
              persistent-hint
              class="mb-3"
            />

            <v-text-field
              v-model="scopesText"
              label="Scopes（空格分隔）"
              hint="默认 openid profile"
              persistent-hint
              class="mb-3"
            />

            <v-text-field
              v-model.number="form.stateTtlSec"
              label="State / Pending 有效期（秒）"
              type="number"
              class="mb-3"
            />

            <v-select
              v-model="form.tokenAuthMethod"
              :items="tokenAuthOptions"
              label="Token 端点客户端认证方式"
              hint="换 token 报 invalid_client 时可在 basic / post 之间切换后重试"
              persistent-hint
              class="mb-4"
            />

            <v-alert v-if="message" :type="messageType" variant="tonal" class="mb-3">
              {{ message }}
            </v-alert>

            <div class="d-flex flex-wrap ga-2">
              <v-btn color="primary" type="submit" :loading="saving">
                保存配置
              </v-btn>
              <v-btn variant="outlined" :loading="testing" @click="testConnection">
                测试 Discovery
              </v-btn>
            </div>
          </v-form>

          <v-card v-if="testResult" variant="outlined" class="mt-4">
            <v-card-title class="text-subtitle-1">Discovery 结果</v-card-title>
            <v-card-text>
              <pre class="oidc-pre">{{ testResult }}</pre>
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" lg="4">
      <v-card variant="tonal">
        <v-card-title class="text-subtitle-1">配置清单</v-card-title>
        <v-card-text class="text-body-2">
          <ol class="pl-4">
            <li class="mb-2">在 IdP 注册 confidential client</li>
            <li class="mb-2">回调 URI 与上方 Redirect URI 一致</li>
            <li class="mb-2">填入 Issuer / Client ID / Secret</li>
            <li class="mb-2">「测试 Discovery」确认 endpoints 可达</li>
            <li>开启开关并保存；登录页出现按钮</li>
          </ol>
          <p class="mt-2 mb-0 text-medium-emphasis">
            首次第三方登录未绑定时，用户须绑定已有账号或新建账号（强制本地密码）。
          </p>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import configsApi from '../../api/configs'
import adminApi from '../../api/admin'

const saving = ref(false)
const testing = ref(false)
const message = ref('')
const messageType = ref('success')
const testResult = ref('')
const scopesText = ref('openid profile')

const tokenAuthOptions = [
  { title: 'client_secret_basic（推荐）', value: 'client_secret_basic' },
  { title: 'client_secret_post', value: 'client_secret_post' },
]

const form = ref({
  enabled: false,
  displayName: '第三方登录',
  issuer: '',
  clientId: '',
  clientSecret: '',
  hasClientSecret: false,
  redirectUri: 'http://localhost:3000/api/auth/oidc/callback',
  scopes: ['openid', 'profile'],
  stateTtlSec: 600,
  tokenAuthMethod: 'client_secret_basic',
})

async function load() {
  try {
    const res = await configsApi.get('auth', 'oidc')
    const config = res.config || {}
    form.value = {
      enabled: Boolean(config.enabled),
      displayName: config.displayName || '第三方登录',
      issuer: config.issuer || '',
      clientId: config.clientId || '',
      clientSecret: '',
      hasClientSecret: Boolean(config.hasClientSecret),
      redirectUri: config.redirectUri || 'http://localhost:3000/api/auth/oidc/callback',
      scopes: config.scopes || ['openid', 'profile'],
      stateTtlSec: config.stateTtlSec || 600,
      tokenAuthMethod: config.tokenAuthMethod || 'client_secret_basic',
    }
    scopesText.value = (form.value.scopes || []).join(' ')
  } catch (err) {
    message.value = err.response?.data?.error || '加载配置失败'
    messageType.value = 'error'
  }
}

async function save() {
  message.value = ''
  saving.value = true
  try {
    const payload = {
      enabled: form.value.enabled,
      displayName: form.value.displayName,
      issuer: form.value.issuer.trim(),
      clientId: form.value.clientId.trim(),
      clientSecret: form.value.clientSecret,
      redirectUri: form.value.redirectUri.trim(),
      scopes: scopesText.value.split(/\s+/).filter(Boolean),
      stateTtlSec: Number(form.value.stateTtlSec) || 600,
      tokenAuthMethod: form.value.tokenAuthMethod || 'client_secret_basic',
    }
    const res = await configsApi.set('auth', 'oidc', payload)
    const config = res.config || {}
    form.value.hasClientSecret = Boolean(config.hasClientSecret)
    form.value.clientSecret = ''
    message.value = '已保存'
    messageType.value = 'success'
  } catch (err) {
    message.value = err.response?.data?.error || '保存失败'
    messageType.value = 'error'
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  message.value = ''
  testResult.value = ''
  testing.value = true
  try {
    const res = await adminApi.testOidc({
      issuer: form.value.issuer.trim(),
    })
    testResult.value = JSON.stringify(res, null, 2)
    message.value = 'Discovery 成功'
    messageType.value = 'success'
  } catch (err) {
    message.value = err.response?.data?.error || 'Discovery 失败'
    messageType.value = 'error'
    if (err.response?.data) {
      testResult.value = JSON.stringify(err.response.data, null, 2)
    }
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.oidc-pre {
  margin: 0;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
