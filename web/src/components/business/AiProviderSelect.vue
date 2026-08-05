<!-- web/src/components/business/AiProviderSelect.vue -->
<template>
  <div class="ai-provider-select">
    <div v-if="loading" class="ai-provider-select__hint">
      加载提供商…
    </div>
    <div v-else-if="isEmpty" class="ai-provider-select__empty">
      <v-icon size="18" class="mr-1">mdi-alert-circle-outline</v-icon>
      {{ emptyMessage }}
    </div>
    <v-select
      v-else-if="showSelector"
      :model-value="selectedProviderId"
      :items="selectItems"
      item-title="title"
      item-value="value"
      density="compact"
      variant="outlined"
      hide-details
      :label="label"
      :disabled="disabled"
      class="ai-provider-select__field"
      @update:model-value="onSelect"
    />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useAiProviderOptions } from '../../composables/useAiProviderOptions'

const props = defineProps({
  /** text | image */
  type: {
    type: String,
    required: true,
    validator: value => value === 'text' || value === 'image',
  },
  /** v-model：选中的 providerId */
  modelValue: {
    type: [Number, String, null],
    default: null,
  },
  emptyMessage: {
    type: String,
    default: '没有供应商可选',
  },
  label: {
    type: String,
    default: 'AI 提供商',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  /** 是否在挂载时自动加载 */
  autoLoad: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const {
  options,
  selectedProviderId,
  loading,
  isEmpty,
  showSelector,
  load,
  ensureLoaded,
  providerPayload,
} = useAiProviderOptions(props.type, { autoLoad: props.autoLoad })

const selectItems = computed(() =>
  options.value.map(item => ({
    title: `${item.name} · ${item.model}`,
    value: item.id,
  }))
)

// 内部加载完成后同步到 v-model
watch(
  selectedProviderId,
  value => {
    if (value !== props.modelValue) {
      emit('update:modelValue', value)
    }
  },
  { immediate: true }
)

// 外部 v-model 变化时写回（用户切换）
watch(
  () => props.modelValue,
  value => {
    if (value !== selectedProviderId.value) {
      selectedProviderId.value = value
    }
  }
)

function onSelect(value) {
  selectedProviderId.value = value
  emit('update:modelValue', value)
}

defineExpose({
  options,
  selectedProviderId,
  loading,
  isEmpty,
  showSelector,
  load,
  ensureLoaded,
  providerPayload,
})
</script>

<style scoped>
.ai-provider-select {
  margin: 8px 0 12px;
}

.ai-provider-select__empty {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed rgba(239, 68, 68, 0.45);
  background: rgba(239, 68, 68, 0.06);
  color: #b91c1c;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.ai-provider-select__hint {
  font-size: 0.8rem;
  opacity: 0.65;
}

.ai-provider-select__field {
  max-width: 360px;
}
</style>
