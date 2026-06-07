<!-- web/src/views/admin/StylePresets.vue -->
<template>
  <div class="style-presets-admin">
    <v-card>
      <v-card-title class="d-flex align-center">
        风格预设管理
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          新增预设
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="presets"
          :loading="loading"
          loading-text="加载中..."
        >
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
              @click="confirmDelete(item)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- 新增/编辑对话框 -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title>{{ isEdit ? '编辑预设' : '新增预设' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field
              v-model="form.code"
              label="编码"
              :rules="[v => !!v || '必填']"
              :disabled="isEdit"
              class="mb-2"
            />
            <v-text-field
              v-model="form.name"
              label="名称"
              :rules="[v => !!v || '必填']"
              class="mb-2"
            />
            <v-text-field
              v-model="form.category"
              label="分类"
              :rules="[v => !!v || '必填']"
              class="mb-2"
            />
            <v-textarea
              v-model="form.stylePrompt"
              label="风格提示词"
              :rules="[v => !!v || '必填']"
              rows="4"
              class="mb-2"
            />
            <v-textarea
              v-model="form.description"
              label="描述"
              rows="2"
              class="mb-2"
            />
            <v-text-field
              v-model.number="form.sortOrder"
              label="排序权重"
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

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除预设「{{ deleteTarget?.name }}」吗？
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
const isEdit = ref(false)
const editId = ref(null)
const deleteTarget = ref(null)
const formRef = ref(null)

const form = ref({
  code: '',
  name: '',
  category: '',
  stylePrompt: '',
  description: '',
  sortOrder: 0
})

const headers = [
  { title: '编码', key: 'code', width: '120px' },
  { title: '名称', key: 'name', width: '120px' },
  { title: '分类', key: 'category', width: '100px' },
  { title: '风格提示词', key: 'stylePrompt', minWidth: '200px' },
  { title: '排序', key: 'sortOrder', width: '90px' },
  { title: '启用', key: 'isEnabled', width: '90px' },
  { title: '操作', key: 'actions', width: '120px', sortable: false }
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
    sortOrder: 0
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
    sortOrder: item.sortOrder
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

onMounted(loadPresets)
</script>

<style scoped>
.style-presets-admin {
  width: 100%;
}
</style>
