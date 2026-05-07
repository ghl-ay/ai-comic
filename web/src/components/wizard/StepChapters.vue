<!-- web/src/components/wizard/StepChapters.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认章节规划</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在生成章节规划，请稍候...
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <v-expansion-panels v-if="localChapters.length > 0">
        <v-expansion-panel
          v-for="(chapter, index) in localChapters"
          :key="index"
        >
          <v-expansion-panel-title>
            <div class="d-flex align-center w-100">
              <v-chip size="small" color="primary" class="mr-2">
                {{ chapter.chapterNumber }}
              </v-chip>
              <v-text-field
                v-model="chapter.title"
                variant="plain"
                density="compact"
                hide-details
                class="flex-grow-1"
                @click.stop
              />
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="chapter.layoutType"
                  :items="layoutOptions"
                  label="分格数量"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="chapter.characterIds"
                  :items="characterOptions"
                  label="出场角色"
                  multiple
                  chips
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="chapter.description"
                  label="章节描述"
                  rows="2"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="chapter.chapterPrompt"
                  label="章节提示词"
                  hint="用于生成分镜脚本"
                  rows="4"
                />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-row class="mt-4">
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
import { ref, watch, computed, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const localChapters = ref([])

const layoutOptions = [
  { title: '4 格分镜', value: 4 },
  { title: '6 格分镜', value: 6 },
  { title: '8 格分镜', value: 8 },
]

const characterOptions = computed(() => {
  return store.characters
    .filter(c => c.selected)
    .map(c => ({
      title: c.name,
      value: c.id,
    }))
})

watch(localChapters, (val) => {
  store.chapters = val
}, { deep: true })

onMounted(async () => {
  if (store.chapters.length === 0 && store.novelId) {
    try {
      await store.generateChapters()
      localChapters.value = [...store.chapters]
    } catch (e) {
      console.error('生成章节失败:', e)
    }
  } else {
    localChapters.value = [...store.chapters]
  }
})

async function regenerate() {
  try {
    await store.generateChapters()
    localChapters.value = [...store.chapters]
  } catch (e) {
    console.error('重新生成失败:', e)
  }
}
</script>
