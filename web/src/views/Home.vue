<!-- web/src/views/Home.vue -->
<template>
  <div class="home">
    <!-- 英雄区域 -->
    <hero-section
      @start="startCreate"
      @demo="watchDemo"
    />
    
    <!-- 功能特性 -->
    <features-section
      @feature-click="handleFeatureClick"
    />
    
    <!-- CTA区域 -->
    <section class="cta-section">
      <v-container>
        <div class="cta-section__content text-center">
          <h2 class="cta-section__title">准备好开始创作了吗？</h2>
          <p class="cta-section__subtitle">
            加入我们的创作社区，用AI释放你的创意潜能
          </p>
          <div class="cta-section__actions">
            <v-btn
              size="x-large"
              color="primary"
              class="cta-section__btn"
              @click="startCreate"
            >
              <v-icon left>mdi-rocket-launch</v-icon>
              立即开始
            </v-btn>
          </div>
        </div>
      </v-container>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import HeroSection from '../components/home/HeroSection.vue'
import FeaturesSection from '../components/home/FeaturesSection.vue'

const router = useRouter()

function startCreate() {
  router.push('/comics')
}

function watchDemo() {
  // TODO: 实现演示功能
  console.log('观看演示')
}

function handleFeatureClick(feature) {
  // TODO: 实现功能详情
  console.log('功能点击:', feature.title)
}

</script>

<style scoped>
.home {
  min-height: 100vh;
  background: var(--color-background);
}

.cta-section {
  padding: 48px 0;
  background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface) 100%);
}

.cta-section__content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-section__title {
  font-family: var(--font-family-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-on-surface);
  margin-bottom: 12px;
}

.cta-section__subtitle {
  font-size: 1rem;
  color: var(--color-on-surface-variant);
  margin-bottom: 24px;
  line-height: 1.6;
}

.cta-section__actions {
  display: flex;
  justify-content: center;
}

.cta-section__btn {
  font-weight: 600;
  text-transform: none;
  border-radius: var(--border-radius-xl);
  padding: 0 40px;
  height: 64px;
  font-size: 1.125rem;
}

/* 响应式调整 */
@media (max-width: 960px) {
  .cta-section {
    padding: 36px 0;
  }
  
  .cta-section__title {
    font-size: 2rem;
  }
}

@media (max-width: 600px) {
  .cta-section {
    padding: 24px 0;
  }
  
  .cta-section__title {
    font-size: 1.75rem;
  }
  
  .cta-section__btn {
    width: 100%;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .cta-section {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
}
</style>
