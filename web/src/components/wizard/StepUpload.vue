<!-- web/src/components/wizard/StepUpload.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">上传小说</v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <v-file-input
            v-model="file"
            accept=".txt"
            label="上传 TXT 文件"
            prepend-icon="mdi-file-document"
            :rules="[v => !v || v.size <= 1024 * 1020 || '文件大小不能超过 1MB']"
            @update:modelValue="handleFileChange"
          />
        </v-col>
        <v-col cols="12" class="text-center">
          <div class="text-grey mb-2">或者直接粘贴小说内容</div>
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="store.novelContent"
            label="小说内容"
            placeholder="请粘贴小说内容..."
            rows="12"
            auto-grow
            :counter="10000"
            :rules="[v => !v || v.length <= 10000 || '内容不能超过 10000 字']"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="store.novelTitle"
            label="小说标题（可选）"
            hint="如果上传文件，将从文件名自动提取"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()

const file = ref(null)

function handleFileChange(f) {
  if (!f) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target.result
    if (content.length > 10000) {
      store.novelContent = content.substring(0, 10000)
      alert('小说内容已截取前 10000 字')
    } else {
      store.novelContent = content
    }

    // 从文件名提取标题
    if (!store.novelTitle) {
      const fileName = f.name.replace(/\.txt$/i, '')
      store.novelTitle = fileName
    }
  }
  reader.readAsText(f)
}
</script>
