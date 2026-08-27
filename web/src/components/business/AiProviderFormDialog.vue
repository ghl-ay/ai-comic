<!-- web/src/components/business/AiProviderFormDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="680"
    persistent
    scrollable
    @update:model-value="onOpenChange"
  >
    <v-card class="ai-provider-form-dialog">
      <v-card-title class="text-h6 d-flex align-center justify-space-between pb-2">
        <div class="d-flex align-center ga-2">
          <v-icon
            :icon="form.type === 'text' ? 'mdi-message-text-outline' : 'mdi-image-outline'"
            color="primary"
            size="22"
          />
          <span>{{ providerId ? '编辑提供商' : '添加提供商' }}</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4" style="max-height: 70vh;">
        <!-- 类型选择 -->
        <v-select
          v-model="form.type"
          :items="typeOptions"
          label="提供商类型"
          :disabled="!!providerId"
          class="mb-3"
          variant="outlined"
          density="comfortable"
          @update:model-value="onTypeChange"
        />

        <!-- 显示名称 -->
        <v-text-field
          v-model="form.name"
          label="显示名称"
          hint="例如：DeepSeek 主站 / Claude 3.7 / 本地 ComfyUI (SDXL)"
          persistent-hint
          class="mb-3"
          variant="outlined"
          density="comfortable"
        />

        <!-- 协议选择 -->
        <v-select
          v-model="form.protocol"
          :items="protocolOptions"
          label="接口协议"
          class="mb-3"
          variant="outlined"
          density="comfortable"
          @update:model-value="onProtocolChange"
        />

        <!-- Base URL -->
        <v-text-field
          v-model="form.baseUrl"
          label="API Base URL"
          :hint="baseUrlHint"
          persistent-hint
          class="mb-3"
          variant="outlined"
          density="comfortable"
        />

        <!-- API Key (ComfyUI 下为可选 Token) -->
        <v-text-field
          v-model="form.apiKey"
          :label="form.protocol === 'comfyui' ? 'Token / API Key (可选)' : 'API Key'"
          type="password"
          :hint="apiKeyHint"
          persistent-hint
          class="mb-3"
          variant="outlined"
          density="comfortable"
        />

        <!-- 模型名称输入 / 一键获取 -->
        <div class="mb-3">
          <div class="d-flex align-center ga-2 mb-1">
            <v-combobox
              v-model="form.model"
              :items="availableModelNames"
              :label="form.protocol === 'comfyui' ? 'Checkpoint 模型文件' : '模型名称 (Model)'"
              :hint="modelHint"
              persistent-hint
              variant="outlined"
              density="comfortable"
              class="flex-grow-1"
              clearable
              @update:model-value="onModelSelect"
            />
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-cloud-download-outline"
              :loading="fetchingModels"
              density="comfortable"
              style="height: 48px; margin-top: -22px;"
              @click="onFetchModels"
            >
              一键获取模型
            </v-btn>
          </div>

          <!-- 模型拉取成功提示 / 快速选择 Chips -->
          <div v-if="fetchedModels.length > 0" class="mt-2 p-2 rounded bg-surface-variant">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-medium">
                可用模型列表 (共 {{ fetchedModels.length }} 个):
              </span>
              <v-btn
                v-if="form.protocol === 'comfyui' && comfyData.checkpoints?.length"
                size="x-small"
                variant="text"
                color="primary"
                prepend-icon="mdi-auto-fix"
                @click="onAutoMatchWorkflow"
              >
                自动匹配工作流
              </v-btn>
            </div>
            <div class="d-flex flex-wrap ga-1" style="max-height: 100px; overflow-y: auto;">
              <v-chip
                v-for="m in fetchedModels.slice(0, 30)"
                :key="m"
                size="x-small"
                :color="form.model === m ? 'primary' : 'default'"
                :variant="form.model === m ? 'flat' : 'outlined'"
                class="cursor-pointer"
                @click="form.model = m; onModelSelect(m)"
              >
                {{ m }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- ComfyUI 专有配置区域 -->
        <template v-if="form.type === 'image' && form.protocol === 'comfyui'">
          <v-divider class="my-3" />

          <!-- ComfyUI 本地资产状态展示 -->
          <div v-if="comfyData.checkpoints" class="mb-3 p-3 bg-surface-variant rounded">
            <div class="d-flex align-center ga-2 mb-2">
              <v-icon icon="mdi-server" color="primary" size="18" />
              <span class="text-subtitle-2">ComfyUI 本地资产状态</span>
            </div>
            <div class="d-flex flex-wrap ga-2 text-caption">
              <v-chip size="x-small" color="primary" variant="tonal">
                {{ comfyData.checkpoints?.length || 0 }} Checkpoints
              </v-chip>
              <v-chip size="x-small" color="secondary" variant="tonal">
                {{ comfyData.loras?.length || 0 }} LoRAs
              </v-chip>
              <v-chip size="x-small" color="info" variant="tonal">
                {{ comfyData.vaes?.length || 0 }} VAEs
              </v-chip>
              <v-chip size="x-small" color="success" variant="tonal">
                {{ comfyData.controlnets?.length || 0 }} ControlNets
              </v-chip>
            </div>
          </div>

          <!-- 工作流预设选择 -->
          <div class="mb-3">
            <div class="d-flex align-center justify-space-between mb-1">
              <label class="text-subtitle-2">工作流预设 / 匹配模式</label>
              <v-btn
                size="small"
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-robot-outline"
                @click="aiWorkflowDialog = true"
              >
                AI 结合本地模型生成工作流
              </v-btn>
            </div>
            <v-select
              v-model="form.extra.templateId"
              :items="templateOptions"
              label="漫画工作流模板"
              variant="outlined"
              density="comfortable"
              hint="系统将根据选中的模型与工作流模板自动出图"
              persistent-hint
              @update:model-value="onTemplateChange"
            />
          </div>

          <!-- 高级参数 / 工作流 JSON -->
          <v-expansion-panels variant="accordion" class="mb-3">
            <v-expansion-panel title="高级设置 & 工作流 JSON (可选微调)">
              <v-expansion-panel-text>
                <div class="d-flex ga-2 mb-2">
                  <v-text-field
                    v-model.number="form.extra.pollIntervalMs"
                    type="number"
                    label="轮询间隔 (ms)"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                  <v-text-field
                    v-model.number="form.extra.maxPollAttempts"
                    type="number"
                    label="最大轮询次数"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                </div>

                <v-textarea
                  v-model="form.extra.negativePrompt"
                  label="负向提示词 (Negative Prompt)"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  hint="覆盖或附加工作流中的负向提示词"
                  persistent-hint
                  class="mb-2"
                />

                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption font-weight-medium">自定义 ComfyUI Prompt Workflow JSON:</span>
                  <div class="d-flex ga-1">
                    <v-btn
                      size="x-small"
                      variant="text"
                      @click="formatWorkflowJson"
                    >
                      格式化
                    </v-btn>
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="warning"
                      @click="resetWorkflowToTemplate"
                    >
                      重置为模板
                    </v-btn>
                  </div>
                </div>
                <v-textarea
                  v-model="rawWorkflowText"
                  rows="8"
                  variant="outlined"
                  density="compact"
                  class="font-mono text-caption"
                  placeholder="留空则自动按模板和所选 Checkpoint 实时组装"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </template>

        <!-- Grok 专有配置区域 -->
        <template v-if="form.type === 'image' && form.protocol === 'grok'">
          <v-divider class="my-4" />
          <p class="text-caption mb-2">
            Grok / sub2api 可选参数
          </p>
          <v-switch
            v-model="form.extra.preferAsync"
            label="优先异步生图"
            color="primary"
            hide-details
            class="mb-2"
          />
          <div class="d-flex ga-2">
            <v-text-field
              v-model.number="form.extra.pollIntervalMs"
              type="number"
              label="轮询间隔 (ms)"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model.number="form.extra.maxPollAttempts"
              type="number"
              label="最大轮询次数"
              variant="outlined"
              density="compact"
            />
          </div>
        </template>

        <v-divider class="my-3" />

        <!-- 启用与默认开关 -->
        <div class="d-flex ga-4 flex-wrap">
          <v-switch
            v-model="form.enabled"
            label="启用"
            color="primary"
            hide-details
          />
          <v-switch
            v-model="form.isDefault"
            label="设为默认"
            color="primary"
            hide-details
            :disabled="!form.enabled"
          />
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          prepend-icon="mdi-check"
          @click="submit"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- AI 结合本地模型生成工作流弹窗 -->
    <v-dialog
      v-model="aiWorkflowDialog"
      max-width="540"
      persistent
    >
      <v-card class="rounded-lg">
        <v-card-title class="text-h6 d-flex align-center ga-2">
          <v-icon icon="mdi-robot" color="secondary" />
          <span>让 AI 结合本地模型定制工作流</span>
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <p class="text-caption text-medium-emphasis mb-3">
            文本大模型将结合您本地 ComfyUI 安装的 Checkpoint、LoRA 与采样器，自动编写定制的漫画出图工作流 JSON。
          </p>

          <v-textarea
            v-model="aiGenPrompt"
            label="漫画风格 / 剧情需求描述"
            rows="3"
            variant="outlined"
            density="comfortable"
            hint="例如：日系黑白热血漫画分镜，清晰网点线稿，高反差光影；或者：美式复古彩色连环画"
            persistent-hint
            class="mb-3"
          />

          <v-combobox
            v-model="aiGenCheckpoint"
            :items="comfyData.checkpoints || []"
            label="指定本地 Checkpoint"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-select
            v-if="comfyData.loras?.length"
            v-model="aiGenLora"
            :items="comfyData.loras"
            label="指定本地 LoRA (可选)"
            variant="outlined"
            density="comfortable"
            clearable
            class="mb-3"
          />

          <v-select
            v-model="aiGenResolution"
            :items="['1024x1024', '832x1216', '1216x832', '768x1024', '512x768']"
            label="目标出图分辨率"
            variant="outlined"
            density="comfortable"
          />

          <v-alert
            v-if="aiGenResultExplanation"
            type="info"
            variant="tonal"
            class="mt-3 text-caption"
          >
            {{ aiGenResultExplanation }}
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-3">
          <v-spacer />
          <v-btn
            variant="text"
            @click="aiWorkflowDialog = false"
          >
            取消
          </v-btn>
          <v-btn
            color="secondary"
            :loading="generatingAiWorkflow"
            prepend-icon="mdi-auto-fix"
            @click="onGenerateAiWorkflow"
          >
            生成并应用工作流
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import aiProviderApi from '../../api/ai-provider'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  providerId: { type: [Number, String, null], default: null },
  initialType: { type: String, default: 'text' },
  protocols: {
    type: Object,
    default: () => ({ text: ['openai', 'anthropic'], image: ['openai', 'grok', 'comfyui'] }),
  },
  provider: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const typeOptions = [
  { title: '文本', value: 'text' },
  { title: '图片', value: 'image' },
]

const form = reactive(createEmptyForm('text'))
const rawWorkflowText = ref('')
const fetchedModels = ref([])
const fetchingModels = ref(false)
const comfyData = reactive({
  checkpoints: [],
  loras: [],
  vaes: [],
  samplers: [],
  schedulers: [],
  controlnets: [],
  templates: [],
})

// AI 智能生成工作流状态
const aiWorkflowDialog = ref(false)
const aiGenPrompt = ref('')
const aiGenCheckpoint = ref('')
const aiGenLora = ref('')
const aiGenResolution = ref('1024x1024')
const generatingAiWorkflow = ref(false)
const aiGenResultExplanation = ref('')

const templateOptions = [
  { title: 'SDXL / 动漫大模型 漫画工作流 (推荐)', value: 'sdxl_comic' },
  { title: 'SD 1.5 二次元/漫画标准工作流', value: 'sd15_comic' },
  { title: 'SDXL + LoRA 漫画风格强化工作流', value: 'sdxl_lora_comic' },
  { title: 'Flux.1 极速出图工作流', value: 'flux_comic' },
]

const protocolOptions = computed(() => {
  const list = form.type === 'image'
    ? (props.protocols?.image || ['openai', 'grok', 'comfyui'])
    : (props.protocols?.text || ['openai', 'anthropic'])
  return (list || []).map(value => ({ title: protocolLabel(value), value }))
})

const availableModelNames = computed(() => {
  if (fetchedModels.value.length > 0) {
    return fetchedModels.value
  }
  if (form.protocol === 'comfyui' && comfyData.checkpoints?.length > 0) {
    return comfyData.checkpoints
  }
  return []
})

const baseUrlHint = computed(() => {
  if (form.protocol === 'anthropic') return '例如 https://api.anthropic.com'
  if (form.protocol === 'grok') return 'sub2api 实例地址，如 http://127.0.0.1:8000'
  if (form.protocol === 'comfyui') return 'ComfyUI 实例地址，如 http://127.0.0.1:8188'
  if (form.type === 'image') return '例如 https://api.openai.com/v1 或兼容中转'
  return '例如 https://api.openai.com/v1 或 https://api.deepseek.com'
})

const apiKeyHint = computed(() => {
  if (form.protocol === 'comfyui') {
    return '本地运行的 ComfyUI 通常免填；若使用带鉴权的反向代理可填写'
  }
  return props.providerId ? '留空表示不修改原密钥' : '必填'
})

const modelHint = computed(() => {
  if (form.protocol === 'anthropic') return '例如 claude-3-7-sonnet-20250219'
  if (form.protocol === 'grok') return '例如 grok-imagine-image'
  if (form.protocol === 'comfyui') return '例如 animagineXLV31_v31.safetensors 或任意已安装模型'
  if (form.type === 'image') return '例如 gpt-image-2 / dall-e-3 / flux-schnell'
  return '例如 deepseek-chat / gpt-4o'
})

function protocolLabel(protocol) {
  const labels = {
    openai: 'OpenAI 兼容',
    anthropic: 'Anthropic',
    grok: 'Grok（sub2api）',
    comfyui: 'ComfyUI (本地/远程生图工作流)',
  }
  return labels[protocol] || protocol
}

function createEmptyForm(type) {
  return {
    type,
    name: '',
    protocol: type === 'image' ? 'comfyui' : 'openai',
    baseUrl: type === 'image' ? 'http://127.0.0.1:8188' : '',
    model: '',
    apiKey: '',
    enabled: true,
    isDefault: false,
    extra: {
      templateId: 'sdxl_comic',
      workflow: null,
      negativePrompt: '',
      preferAsync: false,
      pollIntervalMs: 1500,
      maxPollAttempts: 120,
    },
  }
}

function resetForm() {
  const empty = createEmptyForm(props.initialType || 'text')
  Object.assign(form, empty)
  form.extra = { ...empty.extra }
  rawWorkflowText.value = ''
  fetchedModels.value = []
  comfyData.checkpoints = []
  comfyData.loras = []
  comfyData.vaes = []
  comfyData.samplers = []
}

function fillFromProvider(item) {
  form.type = item.type
  form.name = item.name
  form.protocol = item.protocol
  form.baseUrl = item.baseUrl || ''
  form.model = item.model || ''
  form.apiKey = ''
  form.enabled = item.enabled
  form.isDefault = item.isDefault
  form.extra = {
    templateId: item.extra?.templateId || 'sdxl_comic',
    workflow: item.extra?.workflow || null,
    negativePrompt: item.extra?.negativePrompt || '',
    preferAsync: !!item.extra?.preferAsync,
    pollIntervalMs: item.extra?.pollIntervalMs ?? 1500,
    maxPollAttempts: item.extra?.maxPollAttempts ?? 120,
  }

  if (item.extra?.workflow) {
    try {
      rawWorkflowText.value = typeof item.extra.workflow === 'string'
        ? item.extra.workflow
        : JSON.stringify(item.extra.workflow, null, 2)
    } catch (_) {
      rawWorkflowText.value = ''
    }
  } else {
    rawWorkflowText.value = ''
  }
}

function onTypeChange(type) {
  const allowed = type === 'image'
    ? (props.protocols?.image || ['openai', 'grok', 'comfyui'])
    : (props.protocols?.text || ['openai', 'anthropic'])

  if (!allowed?.includes(form.protocol)) {
    form.protocol = allowed?.[0] || (type === 'image' ? 'comfyui' : 'openai')
  }
  if (type === 'image' && form.protocol === 'comfyui' && !form.baseUrl) {
    form.baseUrl = 'http://127.0.0.1:8188'
  }
}

function onProtocolChange(protocol) {
  if (protocol === 'comfyui') {
    if (!form.baseUrl) form.baseUrl = 'http://127.0.0.1:8188'
    if (!form.name) form.name = '本地 ComfyUI'
  }
}

async function onFetchModels() {
  if (!form.baseUrl) {
    alert('请先填写 API Base URL')
    return
  }
  fetchingModels.value = true
  try {
    const res = await aiProviderApi.fetchModels({
      protocol: form.protocol,
      baseUrl: form.baseUrl,
      apiKey: form.apiKey,
      type: form.type,
    })

    if (res.models && Array.isArray(res.models)) {
      fetchedModels.value = res.models
      if (!form.model && res.models.length > 0) {
        form.model = res.models[0]
      }
    }

    if (res.comfyData) {
      Object.assign(comfyData, res.comfyData)
      if (res.comfyData.checkpoints?.length > 0) {
        if (!form.model) {
          form.model = res.comfyData.checkpoints[0]
        }
        aiGenCheckpoint.value = form.model
      }
      if (res.comfyData.matchedWorkflow) {
        form.extra.templateId = res.comfyData.matchedWorkflow.templateId
      }
    }
  } catch (err) {
    alert('获取模型失败: ' + (err.response?.data?.error || err.message))
  } finally {
    fetchingModels.value = false
  }
}

function onModelSelect(modelName) {
  if (!modelName) return
  if (form.protocol === 'comfyui') {
    aiGenCheckpoint.value = modelName
    const lower = modelName.toLowerCase()
    if (lower.includes('flux')) {
      form.extra.templateId = 'flux_comic'
    } else if (
      lower.includes('1.5') ||
      lower.includes('sd15') ||
      lower.includes('v15') ||
      lower.includes('anything') ||
      lower.includes('meina')
    ) {
      form.extra.templateId = 'sd15_comic'
    } else {
      form.extra.templateId = 'sdxl_comic'
    }
  }
}

function onAutoMatchWorkflow() {
  if (!form.model) return
  onModelSelect(form.model)
}

function onTemplateChange(templateId) {
  form.extra.templateId = templateId
}

function formatWorkflowJson() {
  if (!rawWorkflowText.value) return
  try {
    const parsed = JSON.parse(rawWorkflowText.value)
    rawWorkflowText.value = JSON.stringify(parsed, null, 2)
  } catch (e) {
    alert('JSON 格式错误: ' + e.message)
  }
}

function resetWorkflowToTemplate() {
  rawWorkflowText.value = ''
  form.extra.workflow = null
}

async function onGenerateAiWorkflow() {
  generatingAiWorkflow.value = true
  aiGenResultExplanation.value = ''
  try {
    const res = await aiProviderApi.generateComfyUIWorkflow({
      styleRequirement: aiGenPrompt.value,
      checkpoint: aiGenCheckpoint.value || form.model,
      lora: aiGenLora.value,
      resolution: aiGenResolution.value,
      availableModels: {
        checkpoints: comfyData.checkpoints || [],
        loras: comfyData.loras || [],
        samplers: comfyData.samplers || [],
      },
    })

    if (res.workflow) {
      form.extra.workflow = res.workflow
      rawWorkflowText.value = JSON.stringify(res.workflow, null, 2)
      aiGenResultExplanation.value = res.explanation || '工作流已成功生成并载入！'
      setTimeout(() => {
        aiWorkflowDialog.value = false
      }, 1200)
    }
  } catch (err) {
    alert('AI 生成工作流失败: ' + (err.response?.data?.error || err.message))
  } finally {
    generatingAiWorkflow.value = false
  }
}

watch(
  () => form.enabled,
  enabled => {
    if (!enabled) form.isDefault = false
  }
)

watch(
  () => props.modelValue,
  open => {
    if (!open) return
    if (props.providerId && props.provider) {
      fillFromProvider(props.provider)
    } else {
      resetForm()
    }
  }
)

function onOpenChange(open) {
  emit('update:modelValue', open)
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  let parsedWorkflow = null
  if (rawWorkflowText.value && rawWorkflowText.value.trim()) {
    try {
      parsedWorkflow = JSON.parse(rawWorkflowText.value.trim())
    } catch (e) {
      alert('工作流 JSON 格式错误: ' + e.message)
      return
    }
  }

  const payload = {
    type: form.type,
    name: form.name,
    protocol: form.protocol,
    baseUrl: form.baseUrl,
    model: form.model,
    apiKey: form.apiKey,
    enabled: form.enabled,
    isDefault: form.enabled ? form.isDefault : false,
    extra: {
      ...form.extra,
      workflow: parsedWorkflow || form.extra.workflow || null,
      pollIntervalMs: Number(form.extra.pollIntervalMs) || 1500,
      maxPollAttempts: Number(form.extra.maxPollAttempts) || 120,
    },
  }
  emit('submit', payload)
}
</script>

<style scoped>
.ai-provider-form-dialog {
  border-radius: 16px !important;
}
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
}
</style>
