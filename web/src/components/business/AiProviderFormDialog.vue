<!-- web/src/components/business/AiProviderFormDialog.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="560" persistent @update:model-value="onOpenChange">
    <v-card class="ai-provider-form-dialog">
      <v-card-title class="text-h6">
        {{ providerId ? '编辑提供商' : '添加提供商' }}
      </v-card-title>
      <v-card-text>
        <v-select
          v-model="form.type"
          :items="typeOptions"
          label="类型"
          :disabled="!!providerId"
          class="mb-2"
          @update:model-value="onTypeChange"
        />
        <v-text-field
          v-model="form.name"
          label="显示名称"
          hint="如：DeepSeek 主站 / Claude 中转"
          persistent-hint
          class="mb-2"
        />
        <v-select
          v-model="form.protocol"
          :items="protocolOptions"
          label="协议"
          class="mb-2"
        />
        <v-text-field
          v-model="form.baseUrl"
          label="API Base URL"
          :hint="baseUrlHint"
          persistent-hint
          class="mb-2"
        />
        <v-text-field
          v-model="form.model"
          label="模型名称"
          :hint="modelHint"
          persistent-hint
          class="mb-2"
        />
        <v-text-field
          v-model="form.apiKey"
          label="API Key"
          type="password"
          :hint="providerId ? '留空表示不修改原密钥' : '必填'"
          persistent-hint
          class="mb-2"
        />
        <div class="d-flex ga-4 flex-wrap">
          <v-switch v-model="form.enabled" label="启用" color="primary" hide-details />
          <v-switch
            v-model="form.isDefault"
            label="设为默认"
            color="primary"
            hide-details
            :disabled="!form.enabled"
          />
        </div>
        <template v-if="form.type === 'image' && form.protocol === 'grok'">
          <v-divider class="my-4" />
          <p class="text-caption mb-2">Grok / sub2api 可选参数</p>
          <v-switch
            v-model="form.extra.preferAsync"
            label="优先异步生图"
            color="primary"
            hide-details
            class="mb-2"
          />
          <v-text-field
            v-model.number="form.extra.pollIntervalMs"
            type="number"
            label="轮询间隔 (ms)"
            class="mb-2"
          />
          <v-text-field
            v-model.number="form.extra.maxPollAttempts"
            type="number"
            label="最大轮询次数"
          />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn color="primary" :loading="saving" @click="submit">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** null = 创建，有值 = 编辑 */
  providerId: { type: [Number, String, null], default: null },
  /** 创建时的默认类型（当前 tab） */
  initialType: { type: String, default: 'text' },
  /** { text: string[], image: string[] } */
  protocols: {
    type: Object,
    default: () => ({ text: ['openai', 'anthropic'], image: ['openai', 'grok'] }),
  },
  /** 编辑时回填的提供商对象 */
  provider: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const typeOptions = [
  { title: '文本', value: 'text' },
  { title: '图片', value: 'image' },
]

const form = reactive(createEmptyForm('text'))

const protocolOptions = computed(() => {
  const list = form.type === 'image' ? props.protocols.image : props.protocols.text
  return (list || []).map(value => ({ title: protocolLabel(value), value }))
})

const baseUrlHint = computed(() => {
  if (form.protocol === 'anthropic') return '如 https://api.anthropic.com'
  if (form.protocol === 'grok') return 'sub2api 实例地址'
  if (form.type === 'image') return '如 https://api.openai.com/v1 或 grsai 节点'
  return '如 https://api.openai.com/v1 或 https://api.deepseek.com'
})

const modelHint = computed(() => {
  if (form.protocol === 'anthropic') return '如 claude-sonnet-4-20250514'
  if (form.protocol === 'grok') return '如 grok-imagine-image'
  if (form.type === 'image') return '如 gpt-image-2 / dall-e-3'
  return '如 gpt-4o / deepseek-chat'
})

function protocolLabel(protocol) {
  const labels = {
    openai: 'OpenAI 兼容',
    anthropic: 'Anthropic',
    grok: 'Grok（sub2api）',
  }
  return labels[protocol] || protocol
}

function createEmptyForm(type) {
  return {
    type,
    name: '',
    protocol: 'openai',
    baseUrl: '',
    model: '',
    apiKey: '',
    enabled: true,
    isDefault: false,
    extra: {
      preferAsync: false,
      pollIntervalMs: 2000,
      maxPollAttempts: 300,
    },
  }
}

function resetForm() {
  const empty = createEmptyForm(props.initialType || 'text')
  Object.assign(form, empty)
  form.extra = { ...empty.extra }
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
    preferAsync: !!item.extra?.preferAsync,
    pollIntervalMs: item.extra?.pollIntervalMs ?? 2000,
    maxPollAttempts: item.extra?.maxPollAttempts ?? 300,
  }
}

function onTypeChange(type) {
  const allowed = type === 'image' ? props.protocols.image : props.protocols.text
  if (!allowed?.includes(form.protocol)) {
    form.protocol = allowed?.[0] || 'openai'
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
  const payload = {
    type: form.type,
    name: form.name,
    protocol: form.protocol,
    baseUrl: form.baseUrl,
    model: form.model,
    apiKey: form.apiKey,
    enabled: form.enabled,
    isDefault: form.enabled ? form.isDefault : false,
    extra:
      form.type === 'image' && form.protocol === 'grok'
        ? {
            preferAsync: !!form.extra.preferAsync,
            pollIntervalMs: Number(form.extra.pollIntervalMs) || 2000,
            maxPollAttempts: Number(form.extra.maxPollAttempts) || 300,
          }
        : {},
  }
  emit('submit', payload)
}
</script>

<style scoped>
.ai-provider-form-dialog {
  border-radius: 16px !important;
}
</style>
