<!-- web/src/components/home/FeaturesSection.vue -->
<template>
  <section class="features-section">
    <v-container>
      <div class="features-section__header text-center mb-12">
        <h2 class="features-section__title">核心功能</h2>
        <p class="features-section__subtitle">
          强大的AI技术，让漫画创作变得简单而有趣
        </p>
      </div>
      
      <v-row>
        <v-col
          v-for="feature in features"
          :key="feature.title"
          cols="12"
          sm="6"
          lg="3"
        >
          <div class="feature-card" @click="$emit('feature-click', feature)">
            <div class="feature-card__icon" :style="{ background: feature.gradient }">
              <v-icon size="32" color="white">{{ feature.icon }}</v-icon>
            </div>
            
            <h3 class="feature-card__title">{{ feature.title }}</h3>
            
            <p class="feature-card__description">
              {{ feature.description }}
            </p>
            
            <div class="feature-card__action">
              <v-btn
                variant="text"
                color="primary"
                size="small"
                class="feature-card__btn"
              >
                了解更多
                <v-icon right size="16">mdi-arrow-right</v-icon>
              </v-btn>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup>
const features = [
  {
    title: '智能脚本生成',
    description: '只需输入故事概要，AI就能为你生成专业的漫画脚本，包括分镜、对白和场景描述。',
    icon: 'mdi-script-text',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  },
  {
    title: '多样风格选择',
    description: '支持日系、美漫、水墨、像素等多种艺术风格，满足不同创作需求。',
    icon: 'mdi-palette',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  },
  {
    title: '角色库管理',
    description: '创建和管理你的角色库，AI会保持角色形象的一致性，让故事更连贯。',
    icon: 'mdi-account-group',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
  },
  {
    title: '一键导出分享',
    description: '支持PDF导出、图片下载，轻松分享你的作品到社交媒体。',
    icon: 'mdi-share-variant',
    gradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  },
]

defineEmits(['feature-click'])
</script>

<style scoped>
.features-section {
  padding: 100px 0;
  background-color: var(--color-surface);
}

.features-section__title {
  font-family: var(--font-family-display);
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-on-surface);
  margin-bottom: 16px;
}

.features-section__subtitle {
  font-size: 1.125rem;
  color: var(--color-on-surface-variant);
  max-width: 600px;
  margin: 0 auto;
}

.feature-card {
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  padding: 32px 24px;
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-outline);
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
  border-color: transparent;
}

.feature-card__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-card__icon {
  transform: scale(1.1);
}

.feature-card__title {
  font-family: var(--font-family-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin-bottom: 12px;
}

.feature-card__description {
  font-size: 0.9375rem;
  color: var(--color-on-surface-variant);
  line-height: 1.6;
  margin-bottom: 24px;
}

.feature-card__action {
  margin-top: auto;
}

.feature-card__btn {
  text-transform: none;
  font-weight: 500;
  padding: 0;
}

.feature-card__btn:hover {
  background: transparent;
}

/* 响应式调整 */
@media (max-width: 960px) {
  .features-section {
    padding: 60px 0;
  }
  
  .features-section__title {
    font-size: 2rem;
  }
}

@media (max-width: 600px) {
  .features-section {
    padding: 40px 0;
  }
  
  .features-section__title {
    font-size: 1.75rem;
  }
  
  .feature-card {
    padding: 24px 20px;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .feature-card {
  background: var(--color-surface-variant);
  border-color: var(--color-outline);
}

[data-theme="dark"] .feature-card:hover {
  background: var(--color-surface);
}
</style>
