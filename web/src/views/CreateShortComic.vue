<!-- web/src/views/CreateShortComic.vue -->
<template>
  <v-container>
    <!-- 返回按钮 -->
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center">
          <v-btn variant="text" to="/comics" class="mr-2">
            <v-icon left>mdi-arrow-left</v-icon>
            返回
          </v-btn>
          <span class="text-h5">{{ isEditMode ? '编辑短篇漫画' : '创建短篇漫画' }}</span>
        </div>
      </v-col>
    </v-row>

    <!-- Tab 内容 -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="currentTab" color="primary" align-tabs="center">
            <v-tab :value="1">
              <v-icon start>mdi-cog-outline</v-icon>
              漫画配置
            </v-tab>
            <v-tab :value="2">
              <v-icon start>mdi-script-text</v-icon>
              生成分镜脚本
            </v-tab>
            <v-tab :value="3">
              <v-icon start>mdi-image</v-icon>
              生成漫画图片
            </v-tab>
          </v-tabs>

          <v-divider />

          <v-window v-model="currentTab" class="pa-4">
            <!-- Tab 1: 漫画配置 -->
            <v-window-item :value="1">
              <v-card flat>
                <v-card-text>
                  <v-text-field
                    v-model="formData.title"
                    label="漫画标题"
                    :rules="[v => !!v || '标题为必填项']"
                    class="mb-4"
                  />
                  <v-select
                    v-model="formData.layout"
                    :items="layoutOptions"
                    label="分镜布局"
                    class="mb-4"
                  />
                  <StylePresetSelector
                    v-model:style-prompt="formData.stylePrompt"
                    v-model:style-preset-id="formData.stylePresetId"
                  />
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Tab 2: 生成分镜脚本 -->
            <v-window-item :value="2">
              <v-card flat>
                <v-card-text>
                  <AiProviderSelect type="text" v-model="textProviderId" />
                  <v-textarea
                    v-model="formData.description"
                    label="剧情描述"
                    hint="输入你的故事，AI 将生成分镜脚本"
                    rows="4"
                    class="mb-4"
                  />
                  <div class="mb-4">
                    <v-btn
                      variant="outlined"
                      color="primary"
                      :loading="optimizing"
                      :disabled="textProviderId == null"
                      @click="optimizePrompt"
                      class="mr-2"
                    >
                      <v-icon left>mdi-auto-fix</v-icon>
                      AI 优化提示词
                    </v-btn>
                    <v-btn
                      color="primary"
                      :loading="generatingScript"
                      :disabled="textProviderId == null"
                      @click="generateScript"
                    >
                      生成分镜脚本
                    </v-btn>
                  </div>
                  <!-- 脚本预览 -->
                  <div v-if="parsedScript" class="mt-6">
                    <h3 class="mb-4">分镜脚本预览</h3>
                    <v-row>
                      <v-col
                        v-for="panel in parsedScript.panels"
                        :key="panel.number"
                        cols="12"
                        sm="6"
                        md="3"
                      >
                        <v-card>
                          <v-card-title class="text-subtitle-1">
                            第 {{ panel.number }} 格
                          </v-card-title>
                          <v-card-text>
                            <div class="text-caption text-grey mb-2">场景</div>
                            <div class="text-body-2 mb-3">{{ panel.scene || '(未填写)' }}</div>

                            <div class="text-caption text-grey mb-2">对白</div>
                            <div class="text-body-2 mb-3">{{ panel.dialogue || '(无对白)' }}</div>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Tab 3: 生成漫画图片 -->
            <v-window-item :value="3">
              <v-card flat>
                <v-card-text>
                  <AiProviderSelect type="image" v-model="imageProviderId" />
                  <div class="mb-4">
                    <div class="text-body-1">标题：{{ formData.title }}</div>
                    <div class="text-body-1">布局：{{ getLayoutName(formData.layout) }}</div>
                    <div class="text-body-1">
                      风格：{{ styleDisplayName }}
                    </div>
                  </div>
                  <v-btn
                    color="primary"
                    :loading="generatingImage"
                    :disabled="imageProviderId == null"
                    @click="generateImage"
                  >
                    生成漫画图片
                  </v-btn>
                  <div v-if="imageUrl" class="mt-6">
                    <h3 class="mb-4">生成的漫画图片</h3>
                    <v-card>
                      <v-img :src="imageUrl" max-width="600" class="mx-auto" />
                    </v-card>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>

          <v-divider />
          <v-card-actions class="pa-4">
            <v-btn v-if="currentTab > 1" variant="outlined" @click="currentTab--">
              上一步
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="currentTab < 3"
              color="primary"
              :disabled="currentTab === 1 && !formData.title"
              @click="handleNext"
            >
              下一步
            </v-btn>
            <v-btn
              v-if="currentTab === 3 && imageUrl"
              color="success"
              @click="handleComplete"
            >
              完成
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import StylePresetSelector from '../components/style/StylePresetSelector.vue'
import AiProviderSelect from '../components/business/AiProviderSelect.vue'
import { useStylePresetStore } from '../stores/stylePreset'

const router = useRouter()
const route = useRoute()
const stylePresetStore = useStylePresetStore()

const textProviderId = ref(null)
const imageProviderId = ref(null)

function textProviderPayload() {
  if (textProviderId.value == null) return {}
  return { providerId: textProviderId.value }
}

function imageProviderPayload() {
  if (imageProviderId.value == null) return {}
  return { providerId: imageProviderId.value }
}

const savedComicId = ref(null)
const comicId = computed(() => route.params.id || savedComicId.value)
const isEditMode = computed(() => !!comicId.value)
const currentTab = ref(1)

// 解析脚本 JSON
const parsedScript = computed(() => {
  if (!formData.value.script) return null
  try {
    return typeof formData.value.script === 'string' 
      ? JSON.parse(formData.value.script) 
      : formData.value.script
  } catch {
    return null
  }
})
const optimizing = ref(false)
const generatingScript = ref(false)
const generatingImage = ref(false)
const imageUrl = ref(null)
const saving = ref(false)

const formData = ref({
  title: '',
  layout: '4',
  stylePrompt: '',
  stylePresetId: null,
  description: '',
  script: ''
})

const styleDisplayName = computed(() => {
  if (formData.value.stylePresetId != null) {
    const preset = stylePresetStore.getPresetById(formData.value.stylePresetId)
    if (preset) return preset.name
  }
  if (formData.value.stylePrompt?.trim()) return '自定义描述'
  return '尚未选择'
})

const layoutOptions = [
  { title: '4 格', value: '4' },
  { title: '6 格', value: '6' },
  { title: '8 格', value: '8' }
]

function getLayoutName(value) {
  return layoutOptions.find(i => i.value === value)?.title || value
}

async function handleNext() {
  if (currentTab.value === 1) {
    if (isEditMode.value) {
      await updateComicConfig()
    } else {
      await saveComic()
    }
  } else if (currentTab.value === 2 && comicId.value) {
    // 从 Tab 2 切换到 Tab 3 时，保存剧情描述和脚本
    try {
      await axios.put(`/api/short-comic/${comicId.value}`, {
        description: formData.value.description,
        script: formData.value.script
      })
    } catch (e) {
      console.error('保存失败:', e)
    }
  }
  currentTab.value++
}

async function saveComic() {
  try {
    const res = await axios.post('/api/short-comic', {
      title: formData.value.title,
      layout: formData.value.layout,
      stylePrompt: formData.value.stylePrompt,
      stylePresetId: formData.value.stylePresetId,
      description: formData.value.description
    })
    // 保存 ID 并更新 URL 为编辑模式，不触发页面刷新
    savedComicId.value = res.data.data.id
    window.history.replaceState(null, '', `/short-comic/${res.data.data.id}/edit`)
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  }
}

async function updateComicConfig() {
  if (!comicId.value) return
  saving.value = true
  try {
    await axios.put(`/api/short-comic/${comicId.value}`, {
      title: formData.value.title,
      layout: formData.value.layout,
      stylePrompt: formData.value.stylePrompt,
      stylePresetId: formData.value.stylePresetId,
      description: formData.value.description
    })
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

async function optimizePrompt() {
  if (!formData.value.description) return
  optimizing.value = true
  try {
    const res = await axios.post('/api/short-comic/optimize-prompt', {
      description: formData.value.description,
      ...textProviderPayload(),
    })
    formData.value.description = res.data.data.optimizedPrompt
    
    // 自动保存优化后的描述到数据库
    if (comicId.value) {
      await axios.put(`/api/short-comic/${comicId.value}`, {
        description: formData.value.description
      })
    }
  } catch (e) {
    alert('优化失败：' + (e.response?.data?.error || e.message))
  } finally {
    optimizing.value = false
  }
}

async function generateScript() {
  if (!formData.value.description) {
    alert('请先输入剧情描述')
    return
  }
  generatingScript.value = true
  try {
    const res = await axios.post('/api/short-comic/generate-script', {
      prompt: formData.value.description,
      layout: formData.value.layout,
      ...textProviderPayload(),
    })
    formData.value.script = res.data.data.script
    
    // 自动保存剧情描述和脚本到数据库
    if (comicId.value) {
      await axios.put(`/api/short-comic/${comicId.value}`, {
        description: formData.value.description,
        script: formData.value.script
      })
    }
  } catch (e) {
    alert('生成失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingScript.value = false
  }
}

async function generateImage() {
  if (!comicId.value) {
    alert('请先保存漫画')
    return
  }

  generatingImage.value = true
  try {
    const res = await axios.post('/api/short-comic/generate-image', {
      comicId: comicId.value,
      script: formData.value.script,
      stylePrompt: formData.value.stylePrompt,
      layout: formData.value.layout,
      ...imageProviderPayload(),
    })
    imageUrl.value = res.data.data.imageUrl
  } catch (e) {
    alert('生成失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingImage.value = false
  }
}

async function handleComplete() {
  // 保存最新数据
  if (comicId.value) {
    try {
      await axios.put(`/api/short-comic/${comicId.value}`, {
        title: formData.value.title,
        layout: formData.value.layout,
        stylePrompt: formData.value.stylePrompt,
        stylePresetId: formData.value.stylePresetId,
        description: formData.value.description,
        script: formData.value.script
      })
    } catch (e) {
      console.error('保存失败:', e)
    }
  }
  router.push('/comics')
}

onMounted(async () => {
  if (isEditMode.value) {
    try {
      const res = await axios.get(`/api/short-comic/${comicId.value}`)
      const data = res.data.data
      formData.value = {
        title: data.title || '',
        layout: String(data.layout_type || '4'),
        stylePrompt: data.style_prompt || '',
        stylePresetId: data.style_preset_id ?? null,
        description: data.chapter_prompt || '',
        script: data.script_content || ''
      }
      if (data.page_image) {
        imageUrl.value = `/images/comics/${data.page_image}`
      }
      if (data.script_content) currentTab.value = 2
      if (data.page_image) currentTab.value = 3
    } catch (e) {
      alert('加载失败：' + (e.response?.data?.error || e.message))
      router.push('/comics')
    }
  }
})
</script>
