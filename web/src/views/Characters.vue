<!-- web/src/views/Characters.vue -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="d-flex align-center">
            <v-btn
              variant="text"
              @click="$router.back()"
              class="mr-2"
            >
              <v-icon left>mdi-arrow-left</v-icon>
              返回
            </v-btn>
            <h1>角色库</h1>
          </div>
          <v-btn color="primary" @click="openCreateDialog">
            <v-icon left>mdi-plus</v-icon>
            创建角色
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- 角色列表 -->
    <v-row v-if="characters.length > 0">
      <v-col
        v-for="character in characters"
        :key="character.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="card-fixed">
          <v-img
            v-if="character.reference_image"
            :src="character.reference_image"
            height="200"
            contain
          />
          <v-sheet v-else height="200" class="d-flex align-center justify-center bg-grey-lighten-2">
            <v-icon size="64" color="grey">mdi-account</v-icon>
          </v-sheet>

          <v-card-title class="text-ellipsis-1">{{ character.name }}</v-card-title>
          <v-card-text>
            <div v-if="character.description" class="mb-2 text-ellipsis-3">
              {{ character.description }}
            </div>
            <div v-if="character.appearance" class="text-caption text-grey text-ellipsis-3">
              外观：{{ character.appearance }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              size="small"
              color="primary"
              variant="text"
              @click="openEditDialog(character)"
            >
              编辑
            </v-btn>
            <v-btn
              size="small"
              color="secondary"
              variant="text"
              @click="generateReference(character)"
              :loading="generatingId === character.id"
              :disabled="!character.appearance"
            >
              {{ character.reference_image ? '重新生成' : '生成参考图' }}
            </v-btn>
            <v-spacer />
            <v-btn
              size="small"
              color="error"
              variant="text"
              @click="confirmDelete(character)"
            >
              删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 空状态 -->
    <v-row v-else>
      <v-col cols="12" class="text-center py-8">
        <v-icon size="64" color="grey">mdi-account-group</v-icon>
        <p class="text-grey mt-4">还没有角色，点击上方按钮创建第一个角色</p>
      </v-col>
    </v-row>

    <!-- 创建/编辑对话框 -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑角色' : '创建角色' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveCharacter">
            <v-text-field
              v-model="form.name"
              label="角色名称"
              :rules="[v => !!v || '请输入角色名称']"
              required
            />
            <div class="mb-4">
              <v-btn
                variant="text"
                size="small"
                color="primary"
                :loading="aiLoading"
                :disabled="!form.name.trim()"
                @click="generateWithAi"
              >
                <v-icon left size="small">mdi-auto-fix</v-icon>
                AI 一键生成
              </v-btn>
            </div>
            <v-textarea
              v-model="form.description"
              label="角色描述"
              hint="描述角色的性格、背景等"
              rows="3"
            />
            <v-textarea
              v-model="form.appearance"
              label="外观描述"
              hint="描述角色的外貌特征，用于生成参考图"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn
            color="primary"
            @click="saveCharacter"
            :loading="saving"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认对话框 -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除角色「{{ deleteTarget?.name }}」吗？此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">取消</v-btn>
          <v-btn
            color="error"
            @click="deleteCharacter"
            :loading="deleting"
          >
            删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import characterApi from '../api/character'
import { useAiFormFill } from '../composables/useAiFormFill'

const { loading: aiLoading, fillForm: aiFillForm } = useAiFormFill({
  onError: (msg) => alert('AI 生成失败：' + msg),
})

const characters = ref([])
const dialog = ref(false)
const deleteDialog = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
const deleteTarget = ref(null)
const saving = ref(false)
const deleting = ref(false)
const generatingId = ref(null)

const form = ref({
  name: '',
  description: '',
  appearance: '',
})

async function loadCharacters() {
  try {
    const res = await characterApi.getCharacters()
    characters.value = res.characters
  } catch (e) {
    console.error('加载角色失败', e)
  }
}

async function generateWithAi() {
  if (!form.value.name.trim()) return

  const schema = {
    description: '角色描述，描述角色的性格、背景故事、特点等，100-200字',
    appearance: '外观描述，详细描述角色的外貌特征，包括发型、发色、眼睛、服装、配饰等，用于生成参考图，100-200字',
  }

  await aiFillForm({
    schema,
    context: `角色名称：${form.value.name}`,
    formData: form.value,
    fillFields: ['description', 'appearance'],
    onFill: (data) => {
      if (data.description) form.value.description = data.description
      if (data.appearance) form.value.appearance = data.appearance
    },
  })
}

function openCreateDialog() {
  isEdit.value = false
  editingId.value = null
  form.value = { name: '', description: '', appearance: '' }
  dialog.value = true
}

function openEditDialog(character) {
  isEdit.value = true
  editingId.value = character.id
  form.value = {
    name: character.name,
    description: character.description || '',
    appearance: character.appearance || '',
  }
  dialog.value = true
}

async function saveCharacter() {
  if (!form.value.name.trim()) return

  saving.value = true
  try {
    if (isEdit.value) {
      const res = await characterApi.updateCharacter(editingId.value, form.value)
      const index = characters.value.findIndex(c => c.id === editingId.value)
      if (index !== -1) {
        characters.value[index] = res.character
      }
    } else {
      const res = await characterApi.createCharacter(form.value)
      characters.value.unshift(res.character)
    }
    dialog.value = false
  } catch (e) {
    console.error('保存失败', e)
  } finally {
    saving.value = false
  }
}

function confirmDelete(character) {
  deleteTarget.value = character
  deleteDialog.value = true
}

async function deleteCharacter() {
  if (!deleteTarget.value) return

  deleting.value = true
  try {
    await characterApi.deleteCharacter(deleteTarget.value.id)
    characters.value = characters.value.filter(c => c.id !== deleteTarget.value.id)
    deleteDialog.value = false
    deleteTarget.value = null
  } catch (e) {
    console.error('删除失败', e)
  } finally {
    deleting.value = false
  }
}

async function generateReference(character) {
  generatingId.value = character.id
  try {
    const res = await characterApi.generateReference(character.id)
    const index = characters.value.findIndex(c => c.id === character.id)
    if (index !== -1) {
      characters.value[index] = res.character
    }
  } catch (e) {
    console.error('生成参考图失败', e)
    alert('生成参考图失败：' + (e.response?.data?.error || e.message))
  } finally {
    generatingId.value = null
  }
}

onMounted(() => {
  loadCharacters()
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
