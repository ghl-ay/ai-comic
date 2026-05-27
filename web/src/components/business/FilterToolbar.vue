<!-- web/src/components/business/FilterToolbar.vue -->
<template>
  <div class="filter-toolbar">
    <div class="filter-toolbar__inner">
      <!-- 搜索框 -->
      <div class="filter-toolbar__search-wrapper">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="搜索漫画..."
          variant="solo-filled"
          density="compact"
          hide-details
          clearable
          flat
          class="filter-toolbar__search"
          @update:model-value="updateSearch"
        />
      </div>
      
      <!-- 筛选选项 -->
      <div class="filter-toolbar__filters">
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          placeholder="排序"
          variant="solo-filled"
          density="compact"
          hide-details
          flat
          prepend-inner-icon="mdi-sort"
          class="filter-toolbar__select"
          @update:model-value="updateSort"
        />
        
        <v-select
          v-model="filterStatus"
          :items="statusOptions"
          placeholder="状态"
          variant="solo-filled"
          density="compact"
          hide-details
          flat
          prepend-inner-icon="mdi-filter"
          class="filter-toolbar__select"
          @update:model-value="updateFilter"
        />
      </div>
      
      <!-- 视图切换 -->
      <div class="filter-toolbar__actions">
        <div class="filter-toolbar__view-toggle">
          <button
            class="filter-toolbar__view-btn"
            :class="{ 'filter-toolbar__view-btn--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            <v-icon size="18">mdi-view-grid</v-icon>
          </button>
          <button
            class="filter-toolbar__view-btn"
            :class="{ 'filter-toolbar__view-btn--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <v-icon size="18">mdi-view-list</v-icon>
          </button>
        </div>
        
        <button
          class="filter-toolbar__refresh-btn"
          @click="$emit('refresh')"
        >
          <v-icon size="18">mdi-refresh</v-icon>
        </button>
      </div>
    </div>
  </div>
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
  margin-bottom: 32px;
}

.filter-toolbar__inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
}

.filter-toolbar__inner:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.filter-toolbar__search-wrapper {
  flex: 1;
  min-width: 200px;
}

.filter-toolbar__search :deep(.v-field) {
  border-radius: 12px !important;
  background: var(--color-surface-variant) !important;
}

.filter-toolbar__search :deep(.v-field.v-field--focused) {
  background: var(--color-surface) !important;
}

.filter-toolbar__filters {
  display: flex;
  gap: 12px;
}

.filter-toolbar__select {
  width: 140px;
}

.filter-toolbar__select :deep(.v-field) {
  border-radius: 12px !important;
  background: var(--color-surface-variant) !important;
}

.filter-toolbar__select :deep(.v-field.v-field--focused) {
  background: var(--color-surface) !important;
}

.filter-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-toolbar__view-toggle {
  display: flex;
  background: var(--color-surface-variant);
  border-radius: 10px;
  padding: 3px;
}

.filter-toolbar__view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-on-surface-variant);
  transition: all 0.2s ease;
}

.filter-toolbar__view-btn:hover {
  color: var(--color-on-surface);
  background: var(--color-surface);
}

.filter-toolbar__view-btn--active {
  color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-toolbar__refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  background: var(--color-surface-variant);
  border-radius: 10px;
  cursor: pointer;
  color: var(--color-on-surface-variant);
  transition: all 0.2s ease;
}

.filter-toolbar__refresh-btn:hover {
  color: var(--color-primary);
  background: var(--color-primary-container);
}

.filter-toolbar__refresh-btn:hover :deep(.v-icon) {
  animation: spin 0.5s ease;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 960px) {
  .filter-toolbar__inner {
    flex-wrap: wrap;
    padding: 12px;
  }
  
  .filter-toolbar__search-wrapper {
    width: 100%;
    min-width: 100%;
  }
  
  .filter-toolbar__filters {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .filter-toolbar__select {
    flex: 1;
    min-width: 120px;
    width: auto;
  }
  
  .filter-toolbar__actions {
    width: 100%;
    justify-content: center;
    padding-top: 8px;
    border-top: 1px solid var(--color-outline-variant);
  }
}

/* 深色主题调整 */
[data-theme="dark"] .filter-toolbar__inner {
  background: var(--color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.15);
}

[data-theme="dark"] .filter-toolbar__inner:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}
</style>
