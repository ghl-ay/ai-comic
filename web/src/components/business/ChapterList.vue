<!-- web/src/components/business/ChapterList.vue -->
<template>
  <v-card class="chapter-list" elevation="0" variant="outlined">
    <v-card-title class="chapter-list__header">
      <div class="chapter-list__header-content">
        <v-icon size="24" color="primary">mdi-book-open-page-variant</v-icon>
        <span class="chapter-list__title">章节列表</span>
        <v-chip
          size="small"
          color="primary"
          variant="tonal"
          class="chapter-list__count"
        >
          {{ chapters.length }} 章
        </v-chip>
      </div>
      
      <v-btn
        color="primary"
        size="small"
        class="chapter-list__add-btn"
        @click="$emit('add-chapter')"
      >
        <v-icon left size="16">mdi-plus</v-icon>
        添加章节
      </v-btn>
    </v-card-title>
    
    <v-divider />
    
    <v-card-text class="chapter-list__content">
      <div v-if="chapters.length > 0" class="chapter-list__items">
        <div
          v-for="chapter in sortedChapters"
          :key="chapter.id"
          class="chapter-item"
          :class="{ 'chapter-item--has-image': chapter.page_image }"
          @click="$emit('chapter-click', chapter)"
        >
          <div class="chapter-item__number">
            <v-avatar
              :color="chapter.page_image ? 'primary' : 'grey-lighten-1'"
              size="40"
            >
              <span class="text-h6 font-weight-bold">{{ chapter.chapter_number }}</span>
            </v-avatar>
          </div>
          
          <div class="chapter-item__content">
            <h4 class="chapter-item__title">{{ chapter.title || `第 ${chapter.chapter_number} 章` }}</h4>
            
            <div class="chapter-item__meta">
              <v-chip
                size="x-small"
                :color="getStatusColor(chapter.status)"
                variant="flat"
              >
                {{ getStatusText(chapter.status) }}
              </v-chip>
              
              <span class="chapter-item__layout">
                {{ chapter.layout_type }} 格分镜
              </span>
            </div>
          </div>
          
          <div class="chapter-item__actions">
            <v-btn
              v-if="chapter.page_image"
              icon
              variant="text"
              size="small"
              color="primary"
              :href="`/images/comics/${chapter.page_image}`"
              target="_blank"
              @click.stop
            >
              <v-icon size="20">mdi-image</v-icon>
            </v-btn>
            
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              @click.stop="$emit('delete-chapter', chapter)"
            >
              <v-icon size="20">mdi-delete</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
      
      <div v-else class="chapter-list__empty">
        <v-icon size="64" color="grey-lighten-1">mdi-book-open-page-variant</v-icon>
        <h4 class="chapter-list__empty-title">还没有章节</h4>
        <p class="chapter-list__empty-text">
          点击上方按钮创建第一章，开始你的漫画创作
        </p>
        
        <v-btn
          color="primary"
          variant="outlined"
          class="chapter-list__empty-btn"
          @click="$emit('add-chapter')"
        >
          <v-icon left>mdi-plus</v-icon>
          创建第一章
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  chapters: {
    type: Array,
    default: () => [],
  }
})

defineEmits(['add-chapter', 'chapter-click', 'delete-chapter'])

// 按章节号排序
const sortedChapters = computed(() => {
  return [...props.chapters].sort((a, b) => a.chapter_number - b.chapter_number)
})

// 获取状态颜色
function getStatusColor(status) {
  const colors = {
    draft: 'grey',
    script_ready: 'info',
    completed: 'success',
  }
  return colors[status] || 'grey'
}

// 获取状态文本
function getStatusText(status) {
  const texts = {
    draft: '草稿',
    script_ready: '脚本就绪',
    completed: '已完成',
  }
  return texts[status] || status
}
</script>

<style scoped>
.chapter-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}

.chapter-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: var(--color-surface);
}

.chapter-list__header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-list__title {
  font-family: var(--font-family-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.chapter-list__count {
  font-size: 0.75rem;
}

.chapter-list__add-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: var(--border-radius-md);
}

.chapter-list__content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}

.chapter-list__items {
  padding: 8px;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--border-radius-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.chapter-item:hover {
  background: var(--color-state-hover);
}

.chapter-item:last-child {
  margin-bottom: 0;
}

.chapter-item__number {
  flex-shrink: 0;
}

.chapter-item__content {
  flex: 1;
  min-width: 0;
}

.chapter-item__title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-on-surface);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.chapter-item__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-item__layout {
  font-size: 0.8125rem;
  color: var(--color-on-surface-variant);
}

.chapter-item__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.chapter-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.chapter-list__empty-title {
  font-family: var(--font-family-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin: 16px 0 8px;
}

.chapter-list__empty-text {
  font-size: 0.9375rem;
  color: var(--color-on-surface-variant);
  margin: 0 0 24px;
  max-width: 300px;
}

.chapter-list__empty-btn {
  text-transform: none;
  font-weight: 500;
  border-radius: var(--border-radius-lg);
}

/* 响应式调整 */
@media (max-width: 960px) {
  .chapter-list__header {
    padding: 16px 20px;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .chapter-list__add-btn {
    width: 100%;
  }
  
  .chapter-item {
    padding: 12px;
    gap: 12px;
  }
  
  .chapter-item__actions {
    flex-direction: column;
    gap: 8px;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .chapter-list {
  background: var(--color-surface-variant);
  border-color: var(--color-outline);
}

[data-theme="dark"] .chapter-list__header {
  background: var(--color-surface-variant);
}

[data-theme="dark"] .chapter-item:hover {
  background: var(--color-state-hover);
}
</style>
