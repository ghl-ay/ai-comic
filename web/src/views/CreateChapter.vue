<!-- web/src/views/CreateChapter.vue -->
<template>
  <v-container>
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>

    <template v-else-if="chapter">
      <!-- 面包屑导航 -->
      <v-row>
        <v-col cols="12">
          <div class="d-flex align-center">
            <v-btn variant="text" :to="`/comics/${chapter.comic_id}`" class="mr-2">
              <v-icon left>mdi-arrow-left</v-icon>
              返回
            </v-btn>
            <span class="text-h5">
              {{ chapter.comic?.title }} > {{ chapter.title }}
            </span>
          </div>
        </v-col>
      </v-row>

      <!-- 顶部水平 Tabs + 内容区域 -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-card>
            <!-- 顶部 Tabs -->
            <v-tabs
              v-model="currentStep"
              color="primary"
              align-tabs="center"
            >
              <v-tab :value="1">
                <v-icon start>mdi-account-group</v-icon>
                选择角色
              </v-tab>
              <v-tab :value="2">
                <v-icon start>mdi-script-text</v-icon>
                生成分镜脚本
              </v-tab>
              <v-tab :value="3">
                <v-icon start>mdi-image</v-icon>
                生成漫画图片
              </v-tab>
            </v-tabs>

            <v-divider />

            <!-- 内容区域 -->
            <v-window v-model="currentStep" class="pa-4">
              <!-- Step 1: 选择角色 -->
              <v-window-item :value="1">
                <v-card flat>
                  <v-card-title>选择本章出场角色</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col
                        v-for="char in characters"
                        :key="char.id"
                        cols="6"
                        sm="4"
                        md="3"
                      >
                        <v-card
                          :color="selectedCharacters.includes(char.id) ? 'primary' : undefined"
                          :variant="selectedCharacters.includes(char.id) ? 'outlined' : undefined"
                          @click="toggleCharacter(char.id)"
                          style="cursor: pointer"
                        >
                          <v-img
                            v-if="char.reference_image"
                            :src="char.reference_image"
                            height="120"
                            contain
                          />
                          <v-sheet v-else height="120" class="d-flex align-center justify-center bg-grey-lighten-2">
                            <v-icon size="48" color="grey">mdi-account</v-icon>
                          </v-sheet>
                          <v-card-text class="text-center pa-2">
                            {{ char.name }}
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>

                    <div v-if="characters.length === 0" class="text-center py-8">
                      <v-icon size="48" color="grey">mdi-account-group</v-icon>
                      <p class="text-grey mt-4">
                        还没有角色，
                        <router-link to="/characters">去创建角色</router-link>
                      </p>
                    </div>
                  </v-card-text>
                </v-card>
              </v-window-item>

              <!-- Step 2: 生成分镜脚本 -->
              <v-window-item :value="2">
                <v-card flat>
                  <v-card-title>生成分镜脚本</v-card-title>
                  <v-card-text>
                    <AiProviderSelect type="text" v-model="textProviderId" />
                    <v-textarea
                      v-model="chapterPrompt"
                      label="章节提示词"
                      hint="描述本章的剧情，如：小明在公园遇到一只迷路的小狗"
                      rows="3"
                      :disabled="generatingScript"
                    />

                    <div class="d-flex gap-2 mt-2">
                      <v-btn
                        variant="text"
                        size="small"
                        color="primary"
                        :loading="generatingPrompt"
                        :disabled="selectedCharacters.length === 0 || textProviderId == null"
                        @click="generateChapterPrompt"
                      >
                        <v-icon left size="small">mdi-auto-fix</v-icon>
                        AI 一键生成提示词
                      </v-btn>
                    </div>

                    <v-btn
                      color="primary"
                      class="mt-4"
                      :loading="generatingScript"
                      :disabled="!chapterPrompt.trim() || textProviderId == null"
                      @click="generateScript"
                    >
                      生成分镜脚本
                    </v-btn>

                    <!-- 脚本预览 -->
                    <div v-if="script" class="mt-6">
                      <h3 class="mb-4">分镜脚本预览</h3>
                      <v-row>
                        <v-col
                          v-for="panel in script.panels"
                          :key="panel.number"
                          cols="12"
                          sm="6"
                          md="3"
                        >
                          <v-card>
                            <v-card-title class="text-subtitle-1">
                              第 {{ panel.number }} 格
                            </v-card-title>
                            <v-card-text>
                              <div class="text-caption text-grey mb-2">场景</div>
                              <div class="text-body-2 mb-3">{{ panel.scene || '(未填写)' }}</div>

                              <div class="text-caption text-grey mb-2">对白</div>
                              <div class="text-body-2 mb-3">{{ panel.dialogue || '(无对白)' }}</div>

                              <div class="text-caption text-grey mb-2">角色</div>
                              <v-chip
                                v-for="charId in panel.characters"
                                :key="charId"
                                size="x-small"
                                class="mr-1"
                              >
                                {{ getCharacterName(charId) }}
                              </v-chip>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </v-row>
                    </div>
                  </v-card-text>
                </v-card>
              </v-window-item>

              <!-- Step 3: 生成漫画图片 -->
              <v-window-item :value="3">
                <v-card flat>
                  <v-card-title>生成漫画图片</v-card-title>
                  <v-card-text>
                    <AiProviderSelect type="image" v-model="imageProviderId" />
                    <div class="mb-4">
                      <div class="text-body-1">分镜布局：{{ chapter.layout_type }} 格</div>
                      <div class="text-body-1">风格：{{ chapter.comic?.style_prompt || '默认日系黑白漫画' }}</div>
                    </div>

                    <v-btn
                      color="primary"
                      :loading="generatingImage"
                      :disabled="generatingImage || imageProviderId == null"
                      @click="generateImage"
                    >
                      生成漫画图片
                    </v-btn>

                    <!-- 图片预览 -->
                    <div v-if="chapter.page_image" class="mt-6">
                      <h3 class="mb-4">生成的漫画图片</h3>
                      <v-img
                        :src="`/images/comics/${chapter.page_image}`"
                        max-width="600"
                        class="mx-auto"
                      />
                    </div>
                  </v-card-text>
                </v-card>
              </v-window-item>
            </v-window>

            <!-- 底部操作按钮 -->
            <v-divider />
            <v-card-actions class="pa-4">
              <v-btn
                v-if="currentStep > 1"
                variant="outlined"
                @click="currentStep--"
              >
                上一步
              </v-btn>
              <v-spacer />
              <v-btn
                v-if="currentStep < 3"
                color="primary"
                :disabled="currentStep === 1 && selectedCharacters.length === 0"
                @click="currentStep++"
              >
                下一步
              </v-btn>
              <v-btn
                v-if="currentStep === 3 && chapter.page_image"
                color="success"
                :to="`/comics/${chapter.comic_id}`"
              >
                完成
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import chapterApi from '../api/chapter'
import characterApi from '../api/character'
import AiProviderSelect from '../components/business/AiProviderSelect.vue'

const route = useRoute()
const router = useRouter()

const textProviderId = ref(null)
const imageProviderId = ref(null)

function textProviderPayload() {
  if (textProviderId.value == null) return {}
  return { providerId: textProviderId.value }
}

function imageProviderPayload() {
  if (imageProviderId.value == null) return {}
  return { providerId: imageProviderId.value }
}

const loading = ref(true)
const chapter = ref(null)
const characters = ref([])
const selectedCharacters = ref([])
const currentStep = ref(1)
const chapterPrompt = ref('')
const script = ref(null)
const generatingScript = ref(false)
const generatingImage = ref(false)

async function loadChapter() {
  loading.value = true
  try {
    const res = await chapterApi.getChapter(route.params.chapterId)
    chapter.value = res.chapter

    // 如果已存储提示词，回显
    if (chapter.value.chapter_prompt) {
      chapterPrompt.value = chapter.value.chapter_prompt
    }

    // 如果已存储角色ID，回显
    if (chapter.value.character_ids) {
      selectedCharacters.value = JSON.parse(chapter.value.character_ids)
    }

    // 如果已有脚本，解析它
    if (chapter.value.script_content) {
      script.value = JSON.parse(chapter.value.script_content)
      currentStep.value = 3
    }

    // 如果已有图片，保持在第三步
    if (chapter.value.page_image) {
      currentStep.value = 3
    }
  } catch (e) {
    console.error('加载章节失败', e)
    router.push(`/comics/${route.params.comicId}`)
  } finally {
    loading.value = false
  }
}

async function loadCharacters() {
  try {
    const res = await characterApi.getCharacters()
    characters.value = res.characters
  } catch (e) {
    console.error('加载角色失败', e)
  }
}

function toggleCharacter(id) {
  const index = selectedCharacters.value.indexOf(id)
  if (index === -1) {
    selectedCharacters.value.push(id)
  } else {
    selectedCharacters.value.splice(index, 1)
  }
}

const generatingPrompt = ref(false)

async function generateChapterPrompt() {
  if (selectedCharacters.value.length === 0) {
    alert('请先选择出场角色')
    return
  }

  generatingPrompt.value = true
  try {
    const res = await chapterApi.generatePrompt(route.params.chapterId, {
      characterIds: selectedCharacters.value,
      ...textProviderPayload(),
    })
    chapterPrompt.value = res.prompt
  } catch (e) {
    console.error('生成章节提示词失败', e)
    alert('生成章节提示词失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingPrompt.value = false
  }
}

async function generateScript() {
  generatingScript.value = true
  try {
    const res = await chapterApi.generateScript(route.params.chapterId, {
      prompt: chapterPrompt.value,
      characterIds: selectedCharacters.value,
      ...textProviderPayload(),
    })
    script.value = res.script
  } catch (e) {
    console.error('生成脚本失败', e)
    alert('生成脚本失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingScript.value = false
  }
}

async function generateImage() {
  generatingImage.value = true
  try {
    await chapterApi.generateImage(route.params.chapterId, imageProviderPayload())
    // 重新加载章节获取图片
    await loadChapter()
  } catch (e) {
    console.error('生成图片失败', e)
    alert('生成图片失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingImage.value = false
  }
}

function getCharacterName(charId) {
  const char = characters.value.find(c => c.id === charId)
  return char ? char.name : `角色${charId}`
}

onMounted(() => {
  loadChapter()
  loadCharacters()
})
</script>
