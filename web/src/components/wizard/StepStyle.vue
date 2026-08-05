<!-- web/src/components/wizard/StepStyle.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认标题和风格</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在根据小说推荐风格，请稍候…
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <v-row>
        <v-col cols="12">
          <AiProviderSelect
            ref="textProviderSelect"
            type="text"
            v-model="textProviderId"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="localStyle.title"
            label="漫画标题"
            :rules="[v => !!v || '请输入漫画标题']"
          />
        </v-col>
        <v-col cols="12">
          <div class="text-subtitle-2 mb-2">选择风格</div>
          <StylePresetSelector
            v-model:style-prompt="localStyle.stylePrompt"
            v-model:style-preset-id="localStyle.stylePresetId"
            :auto-select-default="!localStyle.stylePrompt && localStyle.stylePresetId == null"
          />
        </v-col>
        <v-col cols="12">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="store.loading"
            :disabled="textProviderId == null"
            @click="regenerate"
          >
            <v-icon left>mdi-refresh</v-icon>
            让 AI 重新推荐
          </v-btn>
          <span class="text-caption text-medium-emphasis ml-3">
            AI 推荐会写入自定义描述，并解除预设绑定；你仍可改选上方预设
          </span>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'
import AiProviderSelect from '../business/AiProviderSelect.vue'
import StylePresetSelector from '../style/StylePresetSelector.vue'

const store = useNovelWizardStore()
const textProviderSelect = ref(null)
const textProviderId = ref(null)

const localStyle = ref({
  title: store.style.title,
  stylePrompt: store.style.stylePrompt,
  stylePresetId: store.style.stylePresetId ?? null,
})

watch(
  localStyle,
  (val) => {
    store.style = {
      title: val.title,
      stylePrompt: val.stylePrompt,
      stylePresetId: val.stylePresetId,
    }
  },
  { deep: true }
)

onMounted(async () => {
  await textProviderSelect.value?.ensureLoaded()
  if (!store.style.title && store.novelId) {
    if (textProviderId.value == null) return
    try {
      await store.analyzeStyle(textProviderId.value)
      localStyle.value = {
        title: store.style.title,
        stylePrompt: store.style.stylePrompt,
        stylePresetId: store.style.stylePresetId ?? null,
      }
    } catch (error) {
      console.error('分析风格失败:', error)
    }
  }
})

async function regenerate() {
  if (textProviderId.value == null) return
  try {
    await store.analyzeStyle(textProviderId.value)
    localStyle.value = {
      title: store.style.title,
      stylePrompt: store.style.stylePrompt,
      stylePresetId: store.style.stylePresetId ?? null,
    }
  } catch (error) {
    console.error('重新生成失败:', error)
  }
}
</script>
