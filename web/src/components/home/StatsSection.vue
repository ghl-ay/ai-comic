<!-- web/src/components/home/StatsSection.vue -->
<template>
  <section class="stats-section">
    <v-container>
      <v-row justify="center">
        <v-col
          v-for="stat in stats"
          :key="stat.label"
          cols="6"
          md="3"
        >
          <div class="stat-item">
            <div class="stat-item__icon" :style="{ background: stat.gradient }">
              <v-icon size="24" color="white">{{ stat.icon }}</v-icon>
            </div>
            
            <div class="stat-item__content">
              <div class="stat-item__number">{{ stat.value }}</div>
              <div class="stat-item__label">{{ stat.label }}</div>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup>
const stats = [
  {
    value: '10K+',
    label: '活跃用户',
    icon: 'mdi-account-group',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  },
  {
    value: '50K+',
    label: '作品生成',
    icon: 'mdi-book-open-page-variant',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  },
  {
    value: '98%',
    label: '满意度',
    icon: 'mdi-emoticon-happy',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
  },
  {
    value: '24/7',
    label: '在线服务',
    icon: 'mdi-clock-check',
    gradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  },
]
</script>

<style scoped>
.stats-section {
  padding: 80px 0;
  background: var(--color-surface);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  border: 1px solid var(--color-outline);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.stat-item__icon {
  width: 56px;
  height: 56px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-item__content {
  flex: 1;
}

.stat-item__number {
  font-family: var(--font-family-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-on-surface);
  line-height: 1.2;
}

.stat-item__label {
  font-size: 0.875rem;
  color: var(--color-on-surface-variant);
  margin-top: 4px;
}

/* 响应式调整 */
@media (max-width: 960px) {
  .stats-section {
    padding: 60px 0;
  }
  
  .stat-item {
    padding: 20px;
    gap: 16px;
  }
  
  .stat-item__icon {
    width: 48px;
    height: 48px;
  }
  
  .stat-item__number {
    font-size: 1.5rem;
  }
}

@media (max-width: 600px) {
  .stats-section {
    padding: 40px 0;
  }
  
  .stat-item {
    flex-direction: column;
    text-align: center;
    gap: 12px;
    padding: 24px 16px;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .stat-item {
  background: var(--color-surface-variant);
  border-color: var(--color-outline);
}

[data-theme="dark"] .stat-item:hover {
  background: var(--color-surface);
}
</style>
