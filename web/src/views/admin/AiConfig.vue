<!-- web/src/views/admin/AiConfig.vue -->
<template>
  <div class="ai-admin">
    <header class="ai-admin__header">
      <div>
        <h2 class="ai-admin__title">
          AI 提供商
        </h2>
        <p class="ai-admin__subtitle">
          管理多个文本 / 图片模型接入。
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openCreate"
      >
        添加提供商
      </v-btn>
    </header>

    <v-tabs
      v-model="activeTab"
      color="primary"
      density="comfortable"
      class="ai-admin__tabs"
    >
      <v-tab value="text">
        文本提供商
      </v-tab>
      <v-tab value="image">
        图片提供商
      </v-tab>
    </v-tabs>

    <v-card
      class="ai-admin__table-card mt-4"
      variant="outlined"
    >
      <v-data-table
        :headers="headers"
        :items="currentItems"
        :loading="loading"
        :items-per-page="20"
        :no-data-text="emptyText"
      >
        <template #item.protocol="{ item }">
          <div class="d-flex align-center ga-1">
            <span>{{ protocolLabel(item.protocol) }}</span>
            <v-chip
              v-if="item.protocol === 'comfyui'"
              size="x-small"
              color="purple"
              variant="tonal"
            >
              {{ item.extra?.templateId || (item.extra?.workflow ? '定制工作流' : '工作流') }}
            </v-chip>
          </div>
        </template>
        <template #item.status="{ item }">
          <div class="d-flex ga-2 flex-wrap">
            <v-chip
              v-if="item.isDefault"
              size="small"
              color="primary"
              variant="flat"
            >
              默认
            </v-chip>
            <v-chip
              size="small"
              :color="item.enabled ? 'success' : 'default'"
              variant="tonal"
            >
              {{ item.enabled ? '启用' : '禁用' }}
            </v-chip>
          </div>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn
              v-if="!item.isDefault && item.enabled"
              size="small"
              variant="text"
              @click="onSetDefault(item)"
            >
              设默认
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              @click="openEdit(item)"
            >
              编辑
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              color="error"
              @click="confirmRemove(item)"
            >
              删除
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <AiProviderFormDialog
      v-model="dialogOpen"
      :provider-id="editingId"
      :initial-type="activeTab"
      :protocols="protocols"
      :provider="editingProvider"
      :saving="saving"
      @submit="onDialogSubmit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import aiProviderApi from '../../api/ai-provider'
import AiProviderFormDialog from '../../components/business/AiProviderFormDialog.vue'

const activeTab = ref('text')
const loading = ref(false)
const saving = ref(false)
const providers = ref([])
const protocols = ref({ text: ['openai', 'anthropic'], image: ['openai', 'grok', 'comfyui'] })

const dialogOpen = ref(false)
const editingId = ref(null)
const editingProvider = ref(null)

const headers = [
  { title: '名称', key: 'name' },
  { title: '协议', key: 'protocol' },
  { title: '模型', key: 'model' },
  { title: 'Base URL', key: 'baseUrl' },
  { title: '状态', key: 'status', sortable: false },
  { title: '操作', key: 'actions', sortable: false, align: 'end' },
]

const currentItems = computed(() =>
  providers.value.filter(item => item.type === activeTab.value)
)

const emptyText = computed(() =>
  activeTab.value === 'text'
    ? '还没有文本提供商，点击右上角添加'
    : '还没有图片提供商，点击右上角添加'
)

function protocolLabel(protocol) {
  const labels = {
    openai: 'OpenAI 兼容',
    anthropic: 'Anthropic',
    grok: 'Grok（sub2api）',
    comfyui: 'ComfyUI (本地/远程)',
  }
  return labels[protocol] || protocol
}

async function load() {
  loading.value = true
  try {
    const res = await aiProviderApi.list()
    providers.value = res.providers || []
    if (res.protocols) protocols.value = res.protocols
  } catch (error) {
    alert('加载失败：' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  editingProvider.value = null
  dialogOpen.value = true
}

function openEdit(item) {
  editingId.value = item.id
  editingProvider.value = item
  dialogOpen.value = true
}

async function onDialogSubmit(payload) {
  saving.value = true
  try {
    if (editingId.value) {
      await aiProviderApi.update(editingId.value, payload)
    } else {
      await aiProviderApi.create(payload)
    }
    dialogOpen.value = false
    await load()
  } catch (error) {
    alert('保存失败：' + (error.response?.data?.error || error.message))
  } finally {
    saving.value = false
  }
}

async function onSetDefault(item) {
  try {
    await aiProviderApi.setDefault(item.id)
    await load()
  } catch (error) {
    alert('设置默认失败：' + (error.response?.data?.error || error.message))
  }
}

async function confirmRemove(item) {
  if (!confirm(`确定删除提供商「${item.name}」？`)) return
  try {
    await aiProviderApi.remove(item.id)
    await load()
  } catch (error) {
    alert('删除失败：' + (error.response?.data?.error || error.message))
  }
}

onMounted(load)
</script>

<style scoped>
.ai-admin {
  padding: 4px 2px 24px;
}

.ai-admin__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.ai-admin__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ai-admin__subtitle {
  margin: 6px 0 0;
  max-width: 52ch;
  font-size: 0.875rem;
  opacity: 0.72;
  line-height: 1.5;
}

.ai-admin__tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ai-admin__table-card {
  border-radius: 12px;
  overflow: hidden;
}
</style>
