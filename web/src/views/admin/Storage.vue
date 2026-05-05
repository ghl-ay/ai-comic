<!-- web/src/views/admin/Storage.vue -->
<template>
  <v-row>
    <v-col cols="12" md="8">
      <v-card>
        <v-card-title>图片存储配置</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveConfig">
            <v-select
              v-model="defaultProvider"
              :items="providerOptions"
              label="存储提供商"
              hint="选择默认的图片存储方式"
              persistent-hint
              @update:modelValue="onProviderChange"
            />

            <v-divider class="my-4" />

            <!-- 腾讯云 COS 配置 -->
            <template v-if="defaultProvider === 'tencent-cos'">
              <div class="text-subtitle-1 mb-2">腾讯云 COS 配置</div>
              <v-text-field
                v-model="tencentCos.secretId"
                label="Secret ID"
                type="password"
              />
              <v-text-field
                v-model="tencentCos.secretKey"
                label="Secret Key"
                type="password"
              />
              <v-text-field
                v-model="tencentCos.bucket"
                label="Bucket 名称"
              />
              <v-text-field
                v-model="tencentCos.region"
                label="Region"
                hint="如 ap-guangzhou"
              />
              <v-text-field
                v-model="tencentCos.publicBaseUrl"
                label="公开访问地址（可选）"
              />
            </template>

            <!-- 咸鱼云配置 -->
            <template v-if="defaultProvider === 'xyy-cloud'">
              <div class="text-subtitle-1 mb-2">咸鱼云存储配置</div>
              <v-text-field
                v-model="xyyCloud.username"
                label="用户名"
              />
              <v-text-field
                v-model="xyyCloud.password"
                label="密码"
                type="password"
              />
              <v-text-field
                v-model="xyyCloud.apiBaseUrl"
                label="API 地址"
                hint="默认: https://your-api-server.example.com"
              />
              <v-text-field
                v-model="xyyCloud.publicBaseUrl"
                label="访问域名"
                hint="默认: https://your-image-server.example.com"
              />
            </template>

            <!-- Direct 模式提示 -->
            <template v-if="defaultProvider === 'direct'">
              <v-alert type="info" variant="tonal">
                本地存储模式：图片保存在服务器本地，通过带 token 的 URL 访问。
              </v-alert>
            </template>

            <v-btn
              color="primary"
              type="submit"
              :loading="saving"
              class="mt-4"
            >
              保存配置
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import configsApi from '../../api/configs'

const saving = ref(false)
const defaultProvider = ref('direct')

const providerOptions = [
  { title: '本地存储', value: 'direct' },
  { title: '腾讯云 COS', value: 'tencent-cos' },
  { title: '咸鱼云存储', value: 'xyy-cloud' },
]

const tencentCos = ref({
  secretId: '',
  secretKey: '',
  bucket: '',
  region: '',
  publicBaseUrl: '',
})

const xyyCloud = ref({
  username: '',
  password: '',
  apiBaseUrl: 'https://your-api-server.example.com',
  publicBaseUrl: 'https://your-image-server.example.com',
})

async function loadConfig() {
  try {
    // 加载默认提供商
    const defaultRes = await configsApi.get('storage', 'default')
    if (defaultRes.config) {
      defaultProvider.value = defaultRes.config.provider || 'direct'
    }

    // 加载对应提供商的配置
    await loadProviderConfig(defaultProvider.value)
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function loadProviderConfig(provider) {
  if (provider === 'tencent-cos') {
    const res = await configsApi.get('storage', 'tencent-cos')
    if (res.config) {
      tencentCos.value = { ...tencentCos.value, ...res.config }
    }
  } else if (provider === 'xyy-cloud') {
    const res = await configsApi.get('storage', 'xyy-cloud')
    if (res.config) {
      xyyCloud.value = { ...xyyCloud.value, ...res.config }
    }
  }
}

async function onProviderChange(newProvider) {
  await loadProviderConfig(newProvider)
}

async function saveConfig() {
  saving.value = true
  try {
    // 保存默认提供商
    await configsApi.set('storage', 'default', { provider: defaultProvider.value })

    // 保存提供商配置
    if (defaultProvider.value === 'tencent-cos') {
      await configsApi.set('storage', 'tencent-cos', tencentCos.value)
    } else if (defaultProvider.value === 'xyy-cloud') {
      await configsApi.set('storage', 'xyy-cloud', xyyCloud.value)
    }

    alert('存储配置已保存')
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
