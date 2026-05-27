<!-- web/src/components/business/FilterToolbar.vue -->
<template>
  <v-card class="filter-toolbar" elevation="0" variant="outlined">
    <v-card-text class="filter-toolbar__content">
      <v-row align="center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="搜索漫画..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
            class="filter-toolbar__search"
            @update:model-value="updateSearch"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            label="排序方式"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-toolbar__sort"
            @update:model-value="updateSort"
          />
        </v-col>
        
        <v-col cols="12" md="3">
          <v-select
            v-model="filterStatus"
            :items="statusOptions"
            label="状态筛选"
            variant="outlined"
            density="compact"
            hide-details
            class="filter-toolbar__filter"
            @update:model-value="updateFilter"
          />
        </v-col>
        
        <v-col cols="12" md="2">
          <div class="filter-toolbar__actions">
            <v-btn-toggle
              v-model="viewMode"
              mandatory
              density="compact"
              class="filter-toolbar__view-toggle"
            >
              <v-btn value="grid" icon size="small">
                <v-icon size="20">mdi-view-grid</v-icon>
              </v-btn>
              <v-btn value="list" icon size="small">
                <v-icon size="20">mdi-view-list</v-icon>
              </v-btn>
            </v-btn-toggle>
            
            <v-btn
              icon
              variant="text"
              size="small"
              class="filter-toolbar__refresh"
              @click="$emit('refresh')"
            >
              <v-icon size="20">mdi-refresh</v-icon>
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      search: '',
      sortBy: 'newest',
      filterStatus: 'all',
      viewMode: 'grid',
    })
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

// 本地状态
const search = ref(props.modelValue.search || '')
const sortBy = ref(props.modelValue.sortBy || 'newest')
const filterStatus = ref(props.modelValue.filterStatus || 'all')
const viewMode = ref(props.modelValue.viewMode || 'grid')

// 排序选项
const sortOptions = [
  { title: '最新创建', value: 'newest' },
  { title: '最早创建', value: 'oldest' },
  { title: '标题 A-Z', value: 'title-asc' },
  { title: '标题 Z-A', value: 'title-desc' },
  { title: '章节最多', value: 'chapters-desc' },
  { title: '章节最少', value: 'chapters-asc' },
]

// 状态选项
const statusOptions = [
  { title: '全部状态', value: 'all' },
  { title: '草稿', value: 'draft' },
  { title: '脚本就绪', value: 'script_ready' },
  { title: '已完成', value: 'completed' },
]

// 更新搜索
function updateSearch(value) {
  emit('update:modelValue', {
    ...props.modelValue,
    search: value,
  })
}

// 更新排序
function updateSort(value) {
  emit('update:modelValue', {
    ...props.modelValue,
    sortBy: value,
  })
}

// 更新筛选
function updateFilter(value) {
  emit('update:modelValue', {
    ...props.modelValue,
    filterStatus: value,
  })
}

// 监听视图模式变化
watch(viewMode, (value) => {
  emit('update:modelValue', {
    ...props.modelValue,
    viewMode: value,
  })
})
</script>

<style scoped>
.filter-toolbar {
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  margin-bottom: 24px;
}

.filter-toolbar__content {
  padding: 16px;
}

.filter-toolbar__search :deep(.v-field) {
  border-radius: var(--border-radius-lg);
}

.filter-toolbar__sort :deep(.v-field) {
  border-radius: var(--border-radius-lg);
}

.filter-toolbar__filter :deep(.v-field) {
  border-radius: var(--border-radius-lg);
}

.filter-toolbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.filter-toolbar__view-toggle {
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.filter-toolbar__view-toggle :deep(.v-btn) {
  border-radius: 0;
}

.filter-toolbar__refresh {
  color: var(--color-on-surface-variant);
  transition: all 0.2s ease;
}

.filter-toolbar__refresh:hover {
  color: var(--color-primary);
  transform: rotate(180deg);
}

/* 响应式调整 */
@media (max-width: 960px) {
  .filter-toolbar__content {
    padding: 12px;
  }
  
  .filter-toolbar__actions {
    justify-content: center;
    margin-top: 8px;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .filter-toolbar {
  background: var(--color-surface-variant);
  border-color: var(--color-outline);
}
</style>
