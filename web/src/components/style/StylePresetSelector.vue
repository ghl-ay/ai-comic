<!-- web/src/components/style/StylePresetSelector.vue -->
<template>
  <div class="style-preset-selector">
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-alert
      v-else-if="loadError"
      type="error"
      variant="tonal"
      class="mb-3"
    >
      风格列表加载失败，请重试
      <template #append>
        <v-btn variant="text" size="small" color="error" @click="retryLoad">
          重试
        </v-btn>
      </template>
    </v-alert>

    <template v-else>
      <StylePresetGrid
        v-if="presets.length > 0"
        :presets="presets"
        :selected-preset-id="innerPresetId"
        @select="handlePresetSelect"
      />
      <v-alert v-else type="info" variant="tonal" class="mb-3">
        暂时没有可选风格
      </v-alert>

      <div v-if="selectedSummary" class="style-preset-selector__summary mt-3">
        <div class="text-caption text-medium-emphasis mb-1">已选择</div>
        <div class="text-body-2 font-weight-medium">{{ selectedSummary.title }}</div>
        <div v-if="selectedSummary.desc" class="text-caption text-medium-emphasis mt-1">
          {{ selectedSummary.desc }}
        </div>
        <div v-if="innerPresetId" class="text-caption text-medium-emphasis mt-1">
          生成漫画时会尽量贴近上方预览的画面感觉
        </div>
      </div>

      <v-expansion-panels v-model="customPanel" class="mt-3" variant="accordion">
        <v-expansion-panel value="custom">
          <v-expansion-panel-title class="text-body-2">
            没有合适的？自己写一段风格描述
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-textarea
              :model-value="stylePrompt"
              label="你想要的画面感觉"
              placeholder="例如：日系黑白漫画，线条清晰，有网点阴影；或：明亮的全彩动漫风格"
              rows="3"
              variant="outlined"
              counter
              hint="填写后将按你的描述来画，不再使用上方预设风格"
              persistent-hint
              @update:model-value="handleCustomInput"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <div v-if="showActions" class="d-flex justify-end mt-4 pt-2">
      <v-btn variant="text" class="mr-2" @click="$emit('cancel')">
        取消
      </v-btn>
      <v-btn color="primary" @click="handleConfirm">
        确定
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStylePresetStore } from '@/stores/stylePreset';
import StylePresetGrid from './StylePresetGrid.vue';

const props = defineProps({
  stylePrompt: {
    type: String,
    default: '',
  },
  stylePresetId: {
    type: Number,
    default: null,
    validator: value => value === null || typeof value === 'number',
  },
  showActions: {
    type: Boolean,
    default: false,
  },
  autoSelectDefault: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits([
  'update:stylePrompt',
  'update:stylePresetId',
  'confirm',
  'cancel',
]);

const stylePresetStore = useStylePresetStore();
const loadError = ref(false);
const customPanel = ref([]);
const innerPresetId = ref(null);
const hasInitialized = ref(false);

const loading = computed(() => stylePresetStore.loading);
const presets = computed(() => stylePresetStore.presets);

const selectedSummary = computed(() => {
  if (innerPresetId.value != null) {
    const preset = stylePresetStore.getPresetById(innerPresetId.value);
    if (preset) {
      return { title: preset.name, desc: preset.description };
    }
  }
  if (props.stylePrompt) {
    return { title: '自定义描述', desc: props.stylePrompt };
  }
  return null;
});

function emitStyle(prompt, presetId) {
  emit('update:stylePrompt', prompt);
  emit('update:stylePresetId', presetId);
}

/**
 * 仅从 props 同步内部展示状态，不主动回写父级（避免受控循环）。
 * 选中态只认 stylePresetId；有自定义文案且无 id 时展开自定义区。
 * 例外：autoSelectDefault 在首次无值时主动写入默认预设。
 */
function syncFromProps() {
  if (!stylePresetStore.loaded) return;

  if (props.stylePresetId != null) {
    innerPresetId.value = props.stylePresetId;
    customPanel.value = [];
    hasInitialized.value = true;
    return;
  }

  // 父级显式解绑 / 自定义：不高亮预设
  if (props.stylePrompt) {
    innerPresetId.value = null;
    customPanel.value = ['custom'];
    hasInitialized.value = true;
    return;
  }

  if (props.autoSelectDefault && !hasInitialized.value) {
    const defaultPreset = stylePresetStore.getDefaultPreset();
    if (defaultPreset) {
      innerPresetId.value = defaultPreset.id;
      emitStyle(defaultPreset.stylePrompt, defaultPreset.id);
    }
  }
  hasInitialized.value = true;
}

watch(
  () => [props.stylePresetId, props.stylePrompt, stylePresetStore.loaded],
  () => {
    if (stylePresetStore.loaded) {
      syncFromProps();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (!stylePresetStore.loaded) {
    await loadPresets();
  } else {
    syncFromProps();
  }
});

async function loadPresets() {
  loadError.value = false;
  try {
    await stylePresetStore.fetchPresets();
    syncFromProps();
  } catch (error) {
    console.error('Failed to load style presets:', error);
    loadError.value = true;
  }
}

async function retryLoad() {
  stylePresetStore.clearCache();
  await loadPresets();
}

function handlePresetSelect(preset) {
  innerPresetId.value = preset.id;
  customPanel.value = [];
  emitStyle(preset.stylePrompt, preset.id);
}

function handleCustomInput(value) {
  innerPresetId.value = null;
  emitStyle(value, null);
}

function handleConfirm() {
  emit('confirm', {
    stylePrompt: props.stylePrompt,
    stylePresetId: innerPresetId.value,
  });
}
</script>

<style scoped>
.style-preset-selector {
  width: 100%;
}

.style-preset-selector__summary {
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
