<!-- web/src/views/ComicDetail.vue -->
<template>
  <v-container>
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-col>
    </v-row>

    <template v-else-if="comic">
      <v-row>
        <v-col cols="12">
          <div class="d-flex justify-space-between align-center mb-4">
            <div class="d-flex align-center">
              <v-btn variant="text" to="/comics" class="mr-2">
                <v-icon left>mdi-arrow-left</v-icon>
                返回
              </v-btn>
              <h1
                v-if="!editingTitle"
                class="d-flex align-center"
                style="cursor: pointer"
                tabindex="0"
                @click="startEditTitle"
                @keyup.enter="startEditTitle"
              >
                {{ comic.title }}
                <v-icon size="small" class="ml-2" color="grey">mdi-pencil</v-icon>
              </h1>
              <v-text-field
                v-else
                ref="titleInput"
                v-model="editTitleValue"
                variant="outlined"
                density="compact"
                hide-details
                :loading="savingTitle"
                @blur="saveTitle"
                @keyup.enter="saveTitle"
                @keyup.escape="cancelEditTitle"
                style="min-width: 400px; max-width: 600px"
              />
            </div>
            <div>
              <v-btn
                v-if="hasNovel"
                variant="outlined"
                color="info"
                class="mr-2"
                @click="openNovelDialog"
              >
                <v-icon left>mdi-book-open-variant</v-icon>
                查看小说
              </v-btn>
              <v-btn
                variant="outlined"
                color="primary"
                class="mr-2"
                @click="openPreview"
              >
                <v-icon left>mdi-book-open-page-variant</v-icon>
                预览漫画
              </v-btn>
              <v-btn
                variant="outlined"
                color="secondary"
                class="mr-2"
                @click="exportPdf"
                :loading="exporting"
              >
                <v-icon left>mdi-download</v-icon>
                导出漫画
              </v-btn>
              <v-btn color="primary" @click="openCreateChapterDialog">
                <v-icon left>mdi-plus</v-icon>
                创建章节
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- 漫画信息 -->
      <v-row>
        <v-col cols="12" md="4">
          <v-card>
            <v-img
              v-if="comic.cover_image"
              :src="`/images/comics/${comic.cover_image}`"
              height="300"
              contain
            />
            <v-sheet v-else height="300" class="d-flex align-center justify-center bg-grey-lighten-2">
              <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
            </v-sheet>
            <v-card-text>
              <div class="d-flex align-center">
                <div v-if="comic.style_prompt">
                  <strong>风格：</strong> {{ comic.style_prompt }}
                </div>
                <div v-else class="text-grey">
                  未设置风格
                </div>
                <v-btn size="small" variant="text" class="ml-2" @click="openStyleDialog">
                  <v-icon>mdi-pencil</v-icon>
                  编辑
                </v-btn>
              </div>
              <div class="text-caption text-grey mt-2">
                创建于 {{ formatDate(comic.created_at) }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="8">
          <v-card>
            <v-card-title>章节列表</v-card-title>
            <v-list v-if="comic.chapters && comic.chapters.length > 0">
              <v-list-item
                v-for="chapter in comic.chapters"
                :key="chapter.id"
                @click="goToCreate(chapter.id)"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="36">
                    {{ chapter.chapter_number }}
                  </v-avatar>
                </template>

                <v-list-item-title>{{ chapter.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ chapter.layout_type }} 格分镜 · {{ getStatusText(chapter.status) }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    v-if="chapter.page_image"
                    icon
                    variant="text"
                    :href="`/images/comics/${chapter.page_image}`"
                    target="_blank"
                  >
                    <v-icon>mdi-image</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="error"
                    @click.stop="confirmDeleteChapter(chapter)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-center py-8">
              <v-icon size="48" color="grey">mdi-book-open-page-variant</v-icon>
              <p class="text-grey mt-4">还没有章节，点击上方按钮创建第一章</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- 创建章节对话框 -->
      <v-dialog v-model="createChapterDialog" max-width="500">
        <v-card>
          <v-card-title>创建新章节</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="createChapter">
              <v-text-field
                v-model="chapterForm.title"
                label="章节标题（可选）"
                hint="留空将自动生成"
              />
              <v-select
                v-model="chapterForm.layoutType"
                :items="layoutOptions"
                label="分镜布局"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="createChapterDialog = false">取消</v-btn>
            <v-btn color="primary" @click="createChapter" :loading="creating">
              创建
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 删除章节确认对话框 -->
      <v-dialog v-model="deleteChapterDialog" max-width="400">
        <v-card>
          <v-card-title>确认删除</v-card-title>
          <v-card-text>
            确定要删除「{{ deleteChapterTarget?.title }}」吗？此操作不可撤销。
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="deleteChapterDialog = false">取消</v-btn>
            <v-btn color="error" @click="deleteChapter" :loading="deleting">
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 编辑风格对话框 -->
      <v-dialog v-model="styleDialog" max-width="500">
        <v-card>
          <v-card-title>编辑风格提示词</v-card-title>
          <v-card-text>
            <v-textarea
              v-model="editStyleValue"
              label="风格提示词"
              hint="如：日系黑白漫画、彩色卡通风格等"
              rows="15"
              auto-grow
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="styleDialog = false">取消</v-btn>
            <v-btn color="primary" @click="saveStyle" :loading="savingStyle">
              保存
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- 漫画预览 -->
      <ComicPreview
        v-model="showPreview"
        :chapters="comic?.chapters || []"
      />

      <!-- 无图片提示 -->
      <v-snackbar
        v-model="showNoImageHint"
        :timeout="2000"
        color="warning"
      >
        暂无漫画图片
      </v-snackbar>

      <!-- 小说查看弹窗 -->
      <v-dialog v-model="novelDialog" max-width="800">
        <v-card>
          <v-card-title>{{ novelTitle }}</v-card-title>
          <v-card-text>
            <v-progress-circular v-if="loadingNovel" indeterminate color="primary" />
            <pre v-else style="white-space: pre-wrap; word-wrap: break-word;">{{ novelContent }}</pre>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="novelDialog = false">关闭</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { jsPDF } from 'jspdf'
import comicApi from '../api/comic'
import chapterApi from '../api/chapter'
import ComicPreview from '../components/ComicPreview.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const comic = ref(null)
const createChapterDialog = ref(false)
const deleteChapterDialog = ref(false)
const deleteChapterTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)
const showPreview = ref(false)
const showNoImageHint = ref(false)
const exporting = ref(false)
const editingTitle = ref(false)
const editTitleValue = ref('')
const savingTitle = ref(false)
const titleInput = ref(null)
const styleDialog = ref(false)
const editStyleValue = ref('')
const savingStyle = ref(false)
const novelDialog = ref(false)
const novelContent = ref('')
const novelTitle = ref('')
const loadingNovel = ref(false)
const hasNovel = ref(false)

const layoutOptions = [
  { title: '4 格分镜', value: 4 },
  { title: '6 格分镜', value: 6 },
  { title: '8 格分镜', value: 8 },
]

const chapterForm = ref({
  title: '',
  layoutType: 4,
})

async function loadComic() {
  loading.value = true
  try {
    const res = await comicApi.getComic(route.params.id)
    comic.value = res.comic
    // 检查是否有关联的小说
    try {
      const novelRes = await fetch(`/api/novels/by-comic/${route.params.id}`, {
        credentials: 'include',
      })
      hasNovel.value = novelRes.ok
    } catch (e) {
      hasNovel.value = false
    }
  } catch (e) {
    console.error('加载漫画失败', e)
    router.push('/comics')
  } finally {
    loading.value = false
  }
}

async function openNovelDialog() {
  loadingNovel.value = true
  novelDialog.value = true
  try {
    const res = await fetch(`/api/novels/by-comic/${route.params.id}`, {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      novelContent.value = data.novel?.content || ''
      novelTitle.value = data.novel?.title || '小说原文'
    }
  } catch (e) {
    console.error('加载小说失败', e)
  } finally {
    loadingNovel.value = false
  }
}

function openCreateChapterDialog() {
  chapterForm.value = { title: '', layoutType: 4 }
  createChapterDialog.value = true
}

async function createChapter() {
  creating.value = true
  try {
    const res = await chapterApi.createChapter(route.params.id, chapterForm.value)
    comic.value.chapters.push(res.chapter)
    createChapterDialog.value = false
    // 跳转到创作页面
    router.push(`/create/${route.params.id}/${res.chapter.id}`)
  } catch (e) {
    console.error('创建章节失败', e)
    alert('创建章节失败：' + (e.response?.data?.error || e.message))
  } finally {
    creating.value = false
  }
}

function goToCreate(chapterId) {
  router.push(`/create/${route.params.id}/${chapterId}`)
}

function openPreview() {
  const chaptersWithImages = comic.value.chapters?.filter(ch => ch.page_image) || []
  if (chaptersWithImages.length === 0) {
    showNoImageHint.value = true
    return
  }
  showPreview.value = true
}

async function exportPdf() {
  const chaptersWithImages = comic.value.chapters?.filter(ch => ch.page_image) || []
  if (chaptersWithImages.length === 0) {
    showNoImageHint.value = true
    return
  }

  exporting.value = true
  try {
    const sortedChapters = [...chaptersWithImages].sort((a, b) => a.chapter_number - b.chapter_number)

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    for (let i = 0; i < sortedChapters.length; i++) {
      const chapter = sortedChapters[i]

      if (i > 0) {
        pdf.addPage()
      }

      try {
        const imgData = await loadImage(`/images/comics/${chapter.page_image}`)
        // 计算保持宽高比的尺寸
        const imgRatio = imgData.width / imgData.height
        const pageWidth = 190
        const pageHeight = 277
        let drawWidth, drawHeight, x, y

        if (imgRatio > pageWidth / pageHeight) {
          drawWidth = pageWidth
          drawHeight = pageWidth / imgRatio
        } else {
          drawHeight = pageHeight
          drawWidth = pageHeight * imgRatio
        }
        x = (pageWidth - drawWidth) / 2 + 10
        y = (pageHeight - drawHeight) / 2 + 10
        pdf.addImage(imgData.dataUrl, 'JPEG', x, y, drawWidth, drawHeight)
      } catch (e) {
        console.error(`加载图片失败: ${chapter.page_image}`, e)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    pdf.save(`${comic.value.title}-${today}.pdf`)
  } catch (e) {
    console.error('导出 PDF 失败', e)
    alert('导出失败，请重试')
  } finally {
    exporting.value = false
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.95),
        width: img.width,
        height: img.height
      })
    }
    img.onerror = reject
    img.src = url
  })
}

function confirmDeleteChapter(chapter) {
  deleteChapterTarget.value = chapter
  deleteChapterDialog.value = true
}

async function deleteChapter() {
  if (!deleteChapterTarget.value) return

  deleting.value = true
  try {
    await chapterApi.deleteChapter(deleteChapterTarget.value.id)
    comic.value.chapters = comic.value.chapters.filter(c => c.id !== deleteChapterTarget.value.id)
    deleteChapterDialog.value = false
    deleteChapterTarget.value = null
  } catch (e) {
    console.error('删除章节失败', e)
    alert('删除章节失败：' + (e.response?.data?.error || e.message))
  } finally {
    deleting.value = false
  }
}

function startEditTitle() {
  editTitleValue.value = comic.value.title
  editingTitle.value = true
  nextTick(() => {
    titleInput.value?.focus()
  })
}

async function saveTitle() {
  if (!editTitleValue.value.trim()) {
    editTitleValue.value = comic.value.title
    editingTitle.value = false
    return
  }

  if (editTitleValue.value === comic.value.title) {
    editingTitle.value = false
    return
  }

  savingTitle.value = true
  try {
    await comicApi.updateComic(comic.value.id, { title: editTitleValue.value })
    comic.value.title = editTitleValue.value
    editingTitle.value = false
  } catch (e) {
    console.error('保存标题失败', e)
    alert('保存失败：' + (e.response?.data?.error || e.message))
    editTitleValue.value = comic.value.title
  } finally {
    savingTitle.value = false
  }
}

function cancelEditTitle() {
  editTitleValue.value = comic.value.title
  editingTitle.value = false
}

function openStyleDialog() {
  editStyleValue.value = comic.value.style_prompt || ''
  styleDialog.value = true
}

async function saveStyle() {
  savingStyle.value = true
  try {
    await comicApi.updateComic(comic.value.id, { stylePrompt: editStyleValue.value })
    comic.value.style_prompt = editStyleValue.value
    styleDialog.value = false
  } catch (e) {
    console.error('保存风格失败', e)
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    savingStyle.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function getStatusText(status) {
  const statusMap = {
    draft: '草稿',
    script_ready: '脚本就绪',
    completed: '已完成',
  }
  return statusMap[status] || status
}

onMounted(() => {
  loadComic()
})
</script>
