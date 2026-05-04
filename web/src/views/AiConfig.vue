<!-- web/src/views/AiConfig.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn to="/comics" variant="text" class="mr-2">
            <v-icon left>mdi-arrow-left</v-icon>
            返回
          </v-btn>
          <h1>AI 配置</h1>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- 文本模型配置 -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>文本模型</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="saveTextConfig">
              <v-text-field
                v-model="textForm.provider"
                label="供应商名称"
                hint="如: openai, deepseek"
              />
              <v-text-field
                v-model="textForm.baseUrl"
                label="API 地址"
                hint="如: https://api.openai.com"
              />
              <v-text-field
                v-model="textForm.model"
                label="模型名称"
                hint="如: gpt-4o, deepseek-chat"
              />
              <v-text-field
                v-model="textForm.apiKey"
                label="API Key"
                type="password"
                hint="您的 API 密钥将安全存储"
              />
              <v-btn
                color="primary"
                type="submit"
                :loading="textSaving"
              >
                保存文本模型配置
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 图片模型配置 -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>图片模型</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="saveImageConfig">
              <v-text-field
                v-model="imageForm.provider"
                label="供应商名称"
                hint="如: openai"
              />
              <v-text-field
                v-model="imageForm.baseUrl"
                label="API 地址"
                hint="如: https://api.openai.com"
              />
              <v-text-field
                v-model="imageForm.model"
                label="模型名称"
                hint="如: dall-e-3"
              />
              <v-text-field
                v-model="imageForm.apiKey"
                label="API Key"
                type="password"
                hint="您的 API 密钥将安全存储"
              />
              <v-btn
                color="primary"
                type="submit"
                :loading="imageSaving"
              >
                保存图片模型配置
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import aiConfigApi from '../api/ai-config'

const textSaving = ref(false)
const imageSaving = ref(false)

const textForm = ref({
  provider: '',
  baseUrl: '',
  model: '',
  apiKey: '',
})

const imageForm = ref({
  provider: '',
  baseUrl: '',
  model: '',
  apiKey: '',
})

async function loadConfigs() {
  try {
    const res = await aiConfigApi.getConfigs()
    const textConfig = res.configs.find(c => c.type === 'text')
    const imageConfig = res.configs.find(c => c.type === 'image')

    if (textConfig) {
      textForm.value.provider = textConfig.provider || ''
      textForm.value.baseUrl = textConfig.baseUrl || ''
      textForm.value.model = textConfig.model || ''
    }

    if (imageConfig) {
      imageForm.value.provider = imageConfig.provider || ''
      imageForm.value.baseUrl = imageConfig.baseUrl || ''
      imageForm.value.model = imageConfig.model || ''
    }
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

async function saveTextConfig() {
  textSaving.value = true
  try {
    await aiConfigApi.saveTextConfig(textForm.value)
    alert('文本模型配置已保存')
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    textSaving.value = false
  }
}

async function saveImageConfig() {
  imageSaving.value = true
  try {
    await aiConfigApi.saveImageConfig(imageForm.value)
    alert('图片模型配置已保存')
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    imageSaving.value = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>
