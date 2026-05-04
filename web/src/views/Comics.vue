<!-- web/src/views/Comics.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>我的漫画</h1>
          <div>
            <v-btn
              color="primary"
              variant="text"
              to="/characters"
              class="mr-2"
            >
              <v-icon left>mdi-account-group</v-icon>
              角色库
            </v-btn>
            <v-btn
              v-if="authStore.isAdmin"
              color="secondary"
              variant="text"
              to="/admin"
              class="mr-2"
            >
              <v-icon left>mdi-shield-account</v-icon>
              后台管理
            </v-btn>
            <v-btn
              color="default"
              variant="text"
              class="mr-2"
              @click="toggleTheme"
            >
              <v-icon left>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
              {{ isDark ? '浅色' : '深色' }}
            </v-btn>
            <v-btn color="error" variant="text" @click="logout">
              <v-icon left>mdi-logout</v-icon>
              登出
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- 创建漫画按钮 -->
    <v-row>
      <v-col cols="12">
        <v-btn color="primary" @click="openCreateDialog">
          <v-icon left>mdi-plus</v-icon>
          创建新漫画
        </v-btn>
      </v-col>
    </v-row>

    <!-- 漫画列表 -->
    <v-row v-if="comics.length > 0" class="mt-4">
      <v-col
        v-for="comic in comics"
        :key="comic.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="card-fixed" @click="goToComic(comic.id)" style="cursor: pointer">
          <v-img
            v-if="comic.cover_image"
            :src="`/images/comics/${comic.cover_image}`"
            height="200"
            contain
          />
          <v-sheet v-else height="200" class="d-flex align-center justify-center bg-grey-lighten-2">
            <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
          </v-sheet>

          <v-card-title class="text-ellipsis-1">{{ comic.title }}</v-card-title>
          <v-card-text>
            <div class="text-caption text-grey">
              {{ comic.chapterCount || 0 }} 章节
            </div>
            <div v-if="comic.style_prompt" class="text-caption text-grey mt-1 text-ellipsis-3">
              风格：{{ comic.style_prompt }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn size="small" color="primary" variant="text">
              查看
            </v-btn>
            <v-spacer />
            <v-btn
              size="small"
              color="error"
              variant="text"
              @click.stop="confirmDelete(comic)"
            >
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 空状态 -->
    <v-row v-else class="mt-4">
      <v-col cols="12" class="text-center py-8">
        <v-icon size="64" color="grey">mdi-book-open-variant</v-icon>
        <p class="text-grey mt-4">还没有漫画，点击上方按钮创建第一部漫画</p>
      </v-col>
    </v-row>

    <!-- 创建漫画对话框 -->
    <v-dialog v-model="createDialog" max-width="500">
      <v-card>
        <v-card-title>创建新漫画</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createComic">
            <v-text-field
              v-model="createForm.title"
              label="漫画标题"
              :rules="[v => !!v || '请输入漫画标题']"
              required
            />
            <v-textarea
              v-model="createForm.stylePrompt"
              label="风格提示词（可选）"
              hint="如：日系黑白漫画、彩色卡通风格等"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="createDialog = false">取消</v-btn>
          <v-btn color="primary" @click="createComic" :loading="creating">
            创建
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除漫画「{{ deleteTarget?.title }}」吗？所有章节也将被删除，此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" @click="deleteComic" :loading="deleting">
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import comicApi from '../api/comic'

const router = useRouter()
const authStore = useAuthStore()
const vuetifyTheme = useTheme()
const themeStore = useThemeStore()

const isDark = computed(() => themeStore.currentTheme === 'dark')

function toggleTheme() {
  themeStore.toggleTheme(vuetifyTheme)
}

const comics = ref([])
const createDialog = ref(false)
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const creating = ref(false)
const deleting = ref(false)

const createForm = ref({
  title: '',
  stylePrompt: '',
})

async function loadComics() {
  try {
    const res = await comicApi.getComics()
    comics.value = res.comics
  } catch (e) {
    console.error('加载漫画失败', e)
  }
}

function openCreateDialog() {
  createForm.value = { title: '', stylePrompt: '' }
  createDialog.value = true
}

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

function goToComic(id) {
  router.push(`/comics/${id}`)
}

function confirmDelete(comic) {
  deleteTarget.value = comic
  deleteDialog.value = true
}

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

async function logout() {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadComics()
  themeStore.applyTheme(vuetifyTheme)
  themeStore.watchSystemTheme(vuetifyTheme)
})
</script>

<style scoped>
.card-fixed {
  height: 420px;
  display: flex;
  flex-direction: column;
}

.card-fixed .v-card-text {
  flex: 1;
  overflow: hidden;
}

.text-ellipsis-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-ellipsis-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
