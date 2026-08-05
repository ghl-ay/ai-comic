<!-- web/src/views/admin/StylePresets.vue -->
<template>
  <div class="style-presets-admin">
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        风格预设管理
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-image-multiple"
          :loading="batchGenerating"
          @click="regenerateAllCovers"
        >
          批量生成预览图
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          新增风格
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          系统内置 8 种核心风格不可删除。预览图展示各风格大致效果，方便用户挑选；批量生成会逐张调用接口，可能需要几分钟。
        </v-alert>
        <v-alert
          v-if="batchGenerating && batchProgress"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          正在生成预览图：{{ batchProgress }}
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="presets"
          :loading="loading"
          loading-text="加载中..."
        >
          <template #item.coverImage="{ item }">
            <div class="style-presets-admin__cover">
              <v-img
                v-if="item.coverImage"
                :src="item.coverImage"
                width="64"
                height="64"
                cover
                class="rounded"
              >
                <template #error>
                  <div class="style-presets-admin__cover-empty">无图</div>
                </template>
              </v-img>
              <div v-else class="style-presets-admin__cover-empty">无图</div>
            </div>
          </template>

          <template #item.isEnabled="{ item }">
            <v-switch
              :model-value="item.isEnabled"
              color="primary"
              hide-details
              @change="togglePreset(item)"
            />
          </template>

          <template #item.actions="{ item }">
            <v-btn
              icon
              variant="text"
              size="small"
              color="secondary"
              :loading="regeneratingId === item.id"
              title="重新生成预览图"
              @click="regenerateOne(item)"
            >
              <v-icon>mdi-image-refresh</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="primary"
              @click="openEditDialog(item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              :disabled="item.isCore"
              :title="item.isCore ? '内置风格不能删除' : '删除'"
              @click="confirmDelete(item)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title>{{ isEdit ? '编辑风格' : '新增风格' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field
              v-model="form.code"
              label="编码（系统用）"
              :rules="[v => !!v || '必填']"
              :disabled="isEdit"
              class="mb-2"
            />
            <v-text-field
              v-model="form.name"
              label="显示名称"
              :rules="[v => !!v || '必填']"
              class="mb-2"
            />
            <v-text-field
              v-model="form.category"
              label="分组"
              :rules="[v => !!v || '必填']"
              class="mb-2"
            />
            <v-textarea
              v-model="form.stylePrompt"
              label="给 AI 的风格说明（中文）"
              :rules="[v => !!v || '必填']"
              rows="4"
              class="mb-2"
            />
            <v-textarea
              v-model="form.description"
              label="给用户看的简介"
              rows="2"
              class="mb-2"
            />
            <v-text-field
              v-model="form.coverImage"
              label="预览图地址"
              hint="一般由「生成预览图」自动填写，也可手动指定路径"
              persistent-hint
              class="mb-2"
            />
            <v-text-field
              v-model.number="form.sortOrder"
              label="排序（数字越小越靠前）"
              type="number"
              class="mb-2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除风格「{{ deleteTarget?.name }}」吗？
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" :loading="deleting" @click="deletePreset">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { stylePresetApi } from '@/api/stylePreset'

const loading = ref(false)
const presets = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const batchGenerating = ref(false)
const regeneratingId = ref(null)
const isEdit = ref(false)
const editId = ref(null)
const deleteTarget = ref(null)
const formRef = ref(null)
const batchProgress = ref('')

const form = ref({
  code: '',
  name: '',
  category: '',
  stylePrompt: '',
  description: '',
  coverImage: '',
  sortOrder: 0,
})

const headers = [
  { title: '预览', key: 'coverImage', width: '90px', sortable: false },
  { title: '编码', key: 'code', width: '120px' },
  { title: '名称', key: 'name', width: '120px' },
  { title: '分组', key: 'category', width: '100px' },
  { title: '风格说明', key: 'stylePrompt', minWidth: '200px' },
  { title: '排序', key: 'sortOrder', width: '90px' },
  { title: '启用', key: 'isEnabled', width: '90px' },
  { title: '操作', key: 'actions', width: '160px', sortable: false },
]

async function loadPresets() {
  loading.value = true
  try {
    const res = await stylePresetApi.adminList()
    presets.value = res.presets || []
  } catch (error) {
    console.error('加载失败:', error)
    alert('加载失败: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEdit.value = false
  editId.value = null
  form.value = {
    code: '',
    name: '',
    category: '',
    stylePrompt: '',
    description: '',
    coverImage: '',
    sortOrder: 0,
  }
  dialog.value = true
}

function openEditDialog(item) {
  isEdit.value = true
  editId.value = item.id
  form.value = {
    code: item.code,
    name: item.name,
    category: item.category,
    stylePrompt: item.stylePrompt,
    description: item.description,
    coverImage: item.coverImage || '',
    sortOrder: item.sortOrder,
  }
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    if (isEdit.value) {
      await stylePresetApi.update(editId.value, form.value)
    } else {
      await stylePresetApi.create(form.value)
    }
    dialog.value = false
    await loadPresets()
  } catch (error) {
    alert('保存失败: ' + (error.response?.data?.error || error.message))
  } finally {
    saving.value = false
  }
}

async function togglePreset(item) {
  try {
    await stylePresetApi.toggle(item.id)
    await loadPresets()
  } catch (error) {
    alert('切换失败: ' + (error.response?.data?.error || error.message))
  }
}

function confirmDelete(item) {
  if (item.isCore) {
    alert('内置核心风格不能删除')
    return
  }
  deleteTarget.value = item
  deleteDialog.value = true
}

async function deletePreset() {
  deleting.value = true
  try {
    await stylePresetApi.destroy(deleteTarget.value.id)
    deleteDialog.value = false
    await loadPresets()
  } catch (error) {
    alert('删除失败: ' + (error.response?.data?.error || error.message))
  } finally {
    deleting.value = false
  }
}

async function regenerateOne(item) {
  regeneratingId.value = item.id
  try {
    await stylePresetApi.regenerateCover(item.id)
    await loadPresets()
  } catch (error) {
    alert('生成失败: ' + (error.response?.data?.error || error.message))
  } finally {
    regeneratingId.value = null
  }
}

async function regenerateAllCovers() {
  if (!confirm('将为全部风格逐张生成预览图，可能需要几分钟，是否继续？')) {
    return
  }
  batchGenerating.value = true
  batchProgress.value = ''
  const results = []
  const list = [...presets.value]
  try {
    // 前端逐条调用单张接口，避免单请求串行生图触发网关超时
    for (let index = 0; index < list.length; index++) {
      const item = list[index]
      batchProgress.value = `${index + 1}/${list.length} ${item.name || item.code}`
      regeneratingId.value = item.id
      try {
        await stylePresetApi.regenerateCover(item.id)
        results.push({ code: item.code, ok: true })
      } catch (error) {
        results.push({
          code: item.code,
          ok: false,
          error: error.response?.data?.error || error.message,
        })
      }
    }
    await loadPresets()
    const failed = results.filter(item => !item.ok)
    if (failed.length) {
      alert(
        `完成，但有 ${failed.length} 张失败：\n` +
          failed.map(item => `${item.code}: ${item.error}`).join('\n')
      )
    } else {
      alert(`全部成功，共 ${results.length} 张`)
    }
  } finally {
    regeneratingId.value = null
    batchGenerating.value = false
    batchProgress.value = ''
  }
}

onMounted(loadPresets)
</script>

<style scoped>
.style-presets-admin {
  width: 100%;
}

.style-presets-admin__cover {
  width: 64px;
  height: 64px;
}

.style-presets-admin__cover-empty {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
}
</style>
