<!-- web/src/components/style/StylePresetSelector.vue -->
<template>
  <div class="style-preset-selector">
    <v-card flat>
      <v-card-text>
        <v-tabs v-model="activeMode" class="mb-4">
          <v-tab value="preset">预设风格</v-tab>
          <v-tab value="custom">自定义</v-tab>
          <v-tab v-if="showAi" value="ai">AI生成</v-tab>
        </v-tabs>

        <v-window v-model="activeMode">
          <v-window-item value="preset">
            <StylePresetGrid
              v-if="categories.length > 0"
              :categories="categories"
              :selected-preset-id="selectedPresetId"
              @select="handlePresetSelect"
            />
            <v-alert
              v-else-if="loadError"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              加载风格预设失败
              <template v-slot:append>
                <v-btn
                  variant="text"
                  size="small"
                  color="error"
                  @click="retryLoad"
                >
                  重试
                </v-btn>
              </template>
            </v-alert>
            <v-alert
              v-else-if="!loading"
              type="info"
              variant="tonal"
            >
              暂无风格预设
            </v-alert>
            <div v-else class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </div>
            
            <div v-if="modelValue" class="mt-4 pa-3 bg-grey-lighten-4 rounded">
              <div class="text-caption text-grey mb-1">当前风格:</div>
              <div class="text-body-2">{{ modelValue }}</div>
            </div>
          </v-window-item>

          <v-window-item value="custom">
            <v-textarea
              v-model="customPrompt"
              label="风格描述"
              placeholder="请输入风格描述，如：日系黑白漫画风格，精细线稿，网点纸阴影"
              rows="4"
              outlined
              counter
              @update:model-value="handleCustomInput"
            />
            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              描述画面风格、线条特点、色彩倾向等关键词
            </v-alert>
          </v-window-item>

          <v-window-item v-if="showAi" value="ai">
            <v-btn
              color="primary"
              prepend-icon="mdi-robot"
              :loading="aiGenerating"
              @click="handleAiGenerate"
              block
            >
              AI 一键生成风格描述
            </v-btn>
            <v-alert type="info" variant="tonal" density="compact" class="mt-3">
              AI 将根据漫画内容智能生成合适的风格描述
            </v-alert>
          </v-window-item>
        </v-window>

        <div v-if="showActions" class="d-flex justify-end mt-4 pt-2">
          <v-btn
            variant="text"
            @click="$emit('cancel')"
            class="mr-2"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            @click="handleConfirm"
          >
            确定
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStylePresetStore } from '@/stores/stylePreset';
import StylePresetGrid from './StylePresetGrid.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  showAi: {
    type: Boolean,
    default: false
  },
  showActions: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const stylePresetStore = useStylePresetStore();

const activeMode = ref('preset');
const customPrompt = ref('');
const selectedPresetId = ref(null);
const aiGenerating = ref(false);
const loadError = ref(false);

const loading = computed(() => stylePresetStore.loading);
const categories = computed(() => stylePresetStore.categories);

watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    selectedPresetId.value = null;
    customPrompt.value = '';
    return;
  }
  
  const preset = stylePresetStore.getPresetByPrompt(newValue);
  if (preset) {
    selectedPresetId.value = preset.id;
    customPrompt.value = newValue;
  } else {
    customPrompt.value = newValue;
    selectedPresetId.value = null;
  }
}, { immediate: true });

onMounted(async () => {
  if (!stylePresetStore.loaded) {
    await loadPresets();
  }
});

async function loadPresets() {
  loadError.value = false;
  try {
    await stylePresetStore.fetchPresets();
  } catch (error) {
    console.error('Failed to load style presets:', error);
    loadError.value = true;
  }
}

async function retryLoad() {
  await loadPresets();
}

function handlePresetSelect(preset) {
  selectedPresetId.value = preset.id;
  customPrompt.value = preset.stylePrompt;
  emit('update:modelValue', preset.stylePrompt);
}

function handleCustomInput(value) {
  selectedPresetId.value = null;
  emit('update:modelValue', value);
}

async function handleAiGenerate() {
  aiGenerating.value = true;
  try {
    // TODO: 调用 AI 生成接口
    emit('update:modelValue', 'AI 生成的风格描述...');
  } catch (error) {
    console.error('AI generation failed:', error);
  } finally {
    aiGenerating.value = false;
  }
}

function handleConfirm() {
  emit('confirm', props.modelValue);
}
</script>

<style scoped>
.style-preset-selector {
  width: 100%;
}
</style>
