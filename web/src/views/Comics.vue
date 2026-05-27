<!-- web/src/views/Comics.vue -->
<template>
  <div class="comics-page">
    <!-- 页面头部 -->
    <div class="comics-page__header">
      <v-container>
        <v-row align="center">
          <v-col>
            <h1 class="comics-page__title">我的漫画</h1>
            <p class="comics-page__subtitle">管理和创作你的漫画作品</p>
          </v-col>
          <v-col cols="auto">
            <div class="comics-page__actions">
              <v-btn
                color="primary"
                size="large"
                class="comics-page__create-btn"
                @click="openCreateDialog"
              >
                <v-icon left>mdi-plus</v-icon>
                创建新漫画
              </v-btn>
              
              <v-btn
                variant="outlined"
                color="primary"
                size="large"
                class="comics-page__upload-btn"
                to="/novel-wizard"
              >
                <v-icon left>mdi-file-document-plus</v-icon>
                上传小说生成
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>
    
    <!-- 筛选工具栏 -->
    <v-container>
      <filter-toolbar
        v-model="filters"
        @refresh="loadComics"
      />
      
      <!-- 漫画列表 -->
      <v-row v-if="filteredComics.length > 0">
        <v-col
          v-for="comic in filteredComics"
          :key="comic.id"
          :cols="filters.viewMode === 'grid' ? 12 : 12"
          :sm="filters.viewMode === 'grid' ? 6 : 12"
          :md="filters.viewMode === 'grid' ? 4 : 12"
          :lg="filters.viewMode === 'grid' ? 3 : 12"
        >
          <comic-card
            :comic="comic"
            :view-mode="filters.viewMode"
            @click="goToComic(comic.id)"
            @preview="previewComic(comic)"
            @view="goToComic(comic.id)"
            @delete="confirmDelete(comic)"
          />
        </v-col>
      </v-row>
      
      <!-- 空状态 -->
      <empty-state
        v-else
        icon="mdi-book-open-variant"
        title="还没有漫画作品"
        description="点击上方按钮创建你的第一部漫画，开始你的创作之旅"
      >
        <template #actions>
          <v-btn
            color="primary"
            size="large"
            @click="openCreateDialog"
          >
            <v-icon left>mdi-plus</v-icon>
            开始创作
          </v-btn>
        </template>
      </empty-state>
    </v-container>
    
    <!-- 创建漫画对话框 -->
    <v-dialog v-model="createDialog" max-width="500">
      <v-card class="comics-page__dialog">
        <v-card-title class="comics-page__dialog-title">
          创建新漫画
        </v-card-title>
        
        <v-card-text class="comics-page__dialog-content">
          <v-form @submit.prevent="createComic">
            <v-text-field
              v-model="createForm.title"
              label="漫画标题"
              :rules="[v => !!v || '请输入漫画标题']"
              required
              variant="outlined"
              class="mb-4"
            />
            
            <v-textarea
              v-model="createForm.stylePrompt"
              label="风格提示词（可选）"
              hint="如：日系黑白漫画、彩色卡通风格等"
              rows="3"
              variant="outlined"
              class="mb-4"
            />
          </v-form>
        </v-card-text>
        
        <v-card-actions class="comics-page__dialog-actions">
          <v-spacer />
          <v-btn @click="createDialog = false">取消</v-btn>
          <v-btn
            color="primary"
            @click="createComic"
            :loading="creating"
          >
            创建
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="comics-page__dialog">
        <v-card-title class="comics-page__dialog-title">
          确认删除
        </v-card-title>
        
        <v-card-text class="comics-page__dialog-content">
          确定要删除漫画「{{ deleteTarget?.title }}」吗？所有章节也将被删除，此操作不可撤销。
        </v-card-text>
        
        <v-card-actions class="comics-page__dialog-actions">
          <v-spacer />
          <v-btn @click="deleteDialog = false">取消</v-btn>
          <v-btn
            color="error"
            @click="deleteComic"
            :loading="deleting"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import comicApi from '../api/comic'
import ComicCard from '../components/business/ComicCard.vue'
import FilterToolbar from '../components/business/FilterToolbar.vue'
import EmptyState from '../components/business/EmptyState.vue'

const router = useRouter()
const authStore = useAuthStore()
const vuetifyTheme = useTheme()
const themeStore = useThemeStore()

// 状态
const comics = ref([])
const createDialog = ref(false)
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)

// 筛选条件
const filters = ref({
  search: '',
  sortBy: 'newest',
  filterStatus: 'all',
  viewMode: 'grid',
})

// 创建表单
const createForm = ref({
  title: '',
  stylePrompt: '',
})

// 计算过滤后的漫画列表
const filteredComics = computed(() => {
  let result = [...comics.value]
  
  // 搜索过滤
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(comic =>
      comic.title.toLowerCase().includes(searchLower) ||
      (comic.style_prompt && comic.style_prompt.toLowerCase().includes(searchLower))
    )
  }
  
  // 状态过滤
  if (filters.value.filterStatus !== 'all') {
    result = result.filter(comic => comic.status === filters.value.filterStatus)
  }
  
  // 排序
  switch (filters.value.sortBy) {
    case 'newest':
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      break
    case 'oldest':
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      break
    case 'title-asc':
      result.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'title-desc':
      result.sort((a, b) => b.title.localeCompare(a.title))
      break
    case 'chapters-desc':
      result.sort((a, b) => (b.chapterCount || 0) - (a.chapterCount || 0))
      break
    case 'chapters-asc':
      result.sort((a, b) => (a.chapterCount || 0) - (b.chapterCount || 0))
      break
  }
  
  return result
})

// 加载漫画列表
async function loadComics() {
  try {
    const res = await comicApi.getComics()
    comics.value = res.comics
  } catch (e) {
    console.error('加载漫画失败', e)
  }
}

// 打开创建对话框
function openCreateDialog() {
  createForm.value = { title: '', stylePrompt: '' }
  createDialog.value = true
}

// 创建漫画
async function createComic() {
  if (!createForm.value.title.trim()) return
  
  creating.value = true
  try {
    const res = await comicApi.createComic(createForm.value)
    comics.value.unshift(res.comic)
    createDialog.value = false
    router.push(`/comics/${res.comic.id}`)
  } catch (e) {
    console.error('创建漫画失败', e)
    alert('创建漫画失败：' + (e.response?.data?.error || e.message))
  } finally {
    creating.value = false
  }
}

// 跳转到漫画详情
function goToComic(id) {
  router.push(`/comics/${id}`)
}

// 预览漫画
function previewComic(comic) {
  // TODO: 实现预览功能
  console.log('预览漫画:', comic.title)
}

// 确认删除
function confirmDelete(comic) {
  deleteTarget.value = comic
  deleteDialog.value = true
}

// 删除漫画
async function deleteComic() {
  if (!deleteTarget.value) return
  
  deleting.value = true
  try {
    await comicApi.deleteComic(deleteTarget.value.id)
    comics.value = comics.value.filter(c => c.id !== deleteTarget.value.id)
    deleteDialog.value = false
    deleteTarget.value = null
  } catch (e) {
    console.error('删除漫画失败', e)
    alert('删除漫画失败：' + (e.response?.data?.error || e.message))
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadComics()
})
</script>

<style scoped>
.comics-page {
  min-height: 100vh;
  background: var(--color-background);
}

.comics-page__header {
  background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface) 100%);
  padding: 40px 0;
  margin-bottom: 24px;
}

.comics-page__title {
  font-family: var(--font-family-display);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-on-surface);
  margin-bottom: 8px;
}

.comics-page__subtitle {
  font-size: 1.125rem;
  color: var(--color-on-surface-variant);
  margin: 0;
}

.comics-page__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.comics-page__create-btn,
.comics-page__upload-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: var(--border-radius-lg);
}

.comics-page__dialog {
  border-radius: var(--border-radius-xl);
}

.comics-page__dialog-title {
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-on-surface);
  padding: 24px 24px 16px;
}

.comics-page__dialog-content {
  padding: 0 24px 24px;
}

.comics-page__dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid var(--color-outline-variant);
  background: linear-gradient(180deg, var(--color-surface-variant) 0%, var(--color-surface) 100%);
}

/* 响应式调整 */
@media (max-width: 960px) {
  .comics-page__header {
    padding: 24px 0;
  }
  
  .comics-page__title {
    font-size: 2rem;
  }
  
  .comics-page__actions {
    margin-top: 16px;
  }
}

@media (max-width: 600px) {
  .comics-page__header {
    padding: 20px 0;
  }
  
  .comics-page__title {
    font-size: 1.75rem;
  }
  
  .comics-page__actions {
    flex-direction: column;
  }
  
  .comics-page__create-btn,
  .comics-page__upload-btn {
    width: 100%;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .comics-page__header {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
}
</style>
