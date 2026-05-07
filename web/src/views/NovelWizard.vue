<!-- web/src/views/NovelWizard.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn variant="text" to="/comics" class="mr-4">
            <v-icon left>mdi-arrow-left</v-icon>
            返回
          </v-btn>
          <h1>小说转漫画</h1>
        </div>
      </v-col>
    </v-row>

    <!-- 步骤条 -->
    <v-row>
      <v-col cols="12">
        <v-stepper v-model="store.currentStep" alt-labels>
          <v-stepper-header>
            <v-stepper-item
              :value="1"
              title="上传小说"
              :complete="store.currentStep > 1"
            />
            <v-divider />
            <v-stepper-item
              :value="2"
              title="确认风格"
              :complete="store.currentStep > 2"
            />
            <v-divider />
            <v-stepper-item
              :value="3"
              title="确认角色"
              :complete="store.currentStep > 3"
            />
            <v-divider />
            <v-stepper-item
              :value="4"
              title="确认章节"
              :complete="store.currentStep > 4"
            />
            <v-divider />
            <v-stepper-item
              :value="5"
              title="完成"
            />
          </v-stepper-header>

          <v-stepper-window>
            <v-stepper-window-item :value="1">
              <StepUpload />
            </v-stepper-window-item>

            <v-stepper-window-item :value="2">
              <StepStyle />
            </v-stepper-window-item>

            <v-stepper-window-item :value="3">
              <StepCharacters />
            </v-stepper-window-item>

            <v-stepper-window-item :value="4">
              <StepChapters />
            </v-stepper-window-item>

            <v-stepper-window-item :value="5">
              <StepComplete />
            </v-stepper-window-item>
          </v-stepper-window>

          <v-stepper-actions v-if="store.currentStep < 5">
            <template #prev>
              <v-btn
                variant="text"
                :disabled="store.currentStep === 1"
                @click="handlePrev"
              >
                上一步
              </v-btn>
            </template>
            <template #next>
              <v-btn
                color="primary"
                :disabled="!store.canProceed || store.loading"
                :loading="processing"
                @click="handleNext"
              >
                {{ store.currentStep === 4 ? '创建漫画' : '下一步' }}
              </v-btn>
            </template>
          </v-stepper-actions>
        </v-stepper>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelWizardStore } from '../stores/novelWizard'
import StepUpload from '../components/wizard/StepUpload.vue'
import StepStyle from '../components/wizard/StepStyle.vue'
import StepCharacters from '../components/wizard/StepCharacters.vue'
import StepChapters from '../components/wizard/StepChapters.vue'
import StepComplete from '../components/wizard/StepComplete.vue'

const router = useRouter()
const store = useNovelWizardStore()
const processing = ref(false)

async function handleNext() {
  if (store.currentStep === 1) {
    // 创建小说
    processing.value = true
    try {
      await store.createNovel(store.novelTitle, store.novelContent)
      store.nextStep()
    } catch (e) {
      console.error('创建小说失败:', e)
    } finally {
      processing.value = false
    }
  } else if (store.currentStep === 4) {
    // 创建角色和漫画
    processing.value = true
    try {
      await store.createCharacters()
      await store.createComicAndChapters()
      store.nextStep()
    } catch (e) {
      console.error('创建失败:', e)
    } finally {
      processing.value = false
    }
  } else {
    store.nextStep()
  }
}

function handlePrev() {
  store.prevStep()
}
</script>
