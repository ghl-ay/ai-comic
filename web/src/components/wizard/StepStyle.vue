<!-- web/src/components/wizard/StepStyle.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认漫画风格</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在分析小说，请稍候...
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="localStyle.title"
            label="漫画标题"
            :rules="[v => !!v || '请输入漫画标题']"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="localStyle.stylePrompt"
            label="风格提示词"
            hint="描述漫画的视觉风格，如：日系黑白漫画、彩色卡通风格等"
            rows="4"
            auto-grow
          />
        </v-col>
        <v-col cols="12">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="store.loading"
            @click="regenerate"
          >
            <v-icon left>mdi-refresh</v-icon>
            重新生成
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const localStyle = ref({
  title: store.style.title,
  stylePrompt: store.style.stylePrompt,
})

watch(localStyle, (val) => {
  store.style = val
}, { deep: true })

onMounted(async () => {
  if (!store.style.title && store.novelId) {
    try {
      await store.analyzeStyle()
      localStyle.value = { ...store.style }
    } catch (e) {
      console.error('分析风格失败:', e)
    }
  }
})

async function regenerate() {
  try {
    await store.analyzeStyle()
    localStyle.value = { ...store.style }
  } catch (e) {
    console.error('重新生成失败:', e)
  }
}
</script>
