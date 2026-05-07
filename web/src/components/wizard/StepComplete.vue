<!-- web/src/components/wizard/StepComplete.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">创建完成</v-card-title>
    <v-card-text class="text-center py-8">
      <v-icon size="80" color="success" class="mb-4">mdi-check-circle</v-icon>
      <h2 class="mb-2">漫画创建成功！</h2>
      <p class="text-grey mb-6">
        已创建 {{ store.chapters.length }} 个章节，您可以在漫画详情页继续创作
      </p>
      <v-btn
        color="primary"
        size="large"
        :to="`/comics/${store.comicId}`"
      >
        前往漫画详情
        <v-icon right>mdi-arrow-right</v-icon>
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useNovelWizardStore } from '../../stores/novelWizard'

const store = useNovelWizardStore()
</script>
