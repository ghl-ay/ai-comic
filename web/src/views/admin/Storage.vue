<!-- web/src/views/admin/Storage.vue -->
<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title>图片存储配置</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveConfig">
            <v-radio-group
              v-model="form.accessMode"
              label="访问模式"
              hint="选择图片存储和访问方式"
              persistent-hint
            >
              <v-radio label="直接访问（本地存储）" value="direct" />
              <v-radio label="OSS 云存储" value="oss" />
            </v-radio-group>

            <template v-if="form.accessMode === 'oss'">
              <v-divider class="my-4" />
              <div class="text-subtitle-1 mb-2">OSS 配置</div>

              <v-text-field
                v-model="form.ossSecretId"
                label="Secret ID"
                type="password"
                hint="云存储访问密钥 ID"
              />
              <v-text-field
                v-model="form.ossSecretKey"
                label="Secret Key"
                type="password"
                hint="云存储访问密钥"
              />
              <v-text-field
                v-model="form.ossBucket"
                label="Bucket 名称"
                hint="存储桶名称"
              />
              <v-text-field
                v-model="form.ossRegion"
                label="Region"
                hint="存储桶所在区域，如 ap-shanghai"
              />
              <v-text-field
                v-model="form.ossPublicBaseUrl"
                label="公开访问地址（可选）"
                hint="自定义 CDN 或公开访问域名"
              />
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
import storageConfigApi from '../../api/storage-config'

const saving = ref(false)

const form = ref({
  accessMode: 'direct',
  ossSecretId: '',
  ossSecretKey: '',
  ossBucket: '',
  ossRegion: '',
  ossPublicBaseUrl: '',
})

async function loadConfig() {
  try {
    const res = await storageConfigApi.getConfig()
    if (res.config) {
      form.value.accessMode = res.config.accessMode || 'direct'
      form.value.ossSecretId = res.config.ossSecretId || ''
      form.value.ossSecretKey = res.config.ossSecretKey || ''
      form.value.ossBucket = res.config.ossBucket || ''
      form.value.ossRegion = res.config.ossRegion || ''
      form.value.ossPublicBaseUrl = res.config.ossPublicBaseUrl || ''
    }
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function saveConfig() {
  saving.value = true
  try {
    await storageConfigApi.saveConfig(form.value)
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
