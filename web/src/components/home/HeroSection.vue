<!-- web/src/components/home/HeroSection.vue -->
<template>
  <section class="hero-section">
    <v-container class="hero-section__container">
      <v-row align="center" justify="center" class="min-height-screen">
        <v-col cols="12" md="6" class="text-center text-md-left">
          <div class="hero-section__content">
            <h1 class="hero-section__title">
              <span class="hero-section__title-main">AI 漫画创作平台</span>
              <span class="hero-section__title-sub">用人工智能的力量，将你的创意转化为精美的漫画作品</span>
            </h1>
            
            <p class="hero-section__description">
              告别繁琐的绘画过程，只需输入你的故事创意，AI就能为你生成专业级的漫画作品。
              支持多种风格，无限创意可能。
            </p>
            
            <div class="hero-section__actions">
              <v-btn
                size="x-large"
                color="primary"
                class="hero-section__cta"
                @click="$emit('start')"
              >
                <v-icon left>mdi-plus</v-icon>
                开始创作
              </v-btn>
              
              <v-btn
                size="x-large"
                variant="outlined"
                color="primary"
                class="hero-section__demo"
                @click="$emit('demo')"
              >
                <v-icon left>mdi-play-circle</v-icon>
                观看演示
              </v-btn>
            </div>
            
            <div class="hero-section__stats">
              <div class="hero-section__stat">
                <span class="hero-section__stat-number">10K+</span>
                <span class="hero-section__stat-label">用户信赖</span>
              </div>
              <div class="hero-section__stat">
                <span class="hero-section__stat-number">50K+</span>
                <span class="hero-section__stat-label">作品生成</span>
              </div>
              <div class="hero-section__stat">
                <span class="hero-section__stat-number">98%</span>
                <span class="hero-section__stat-label">满意度</span>
              </div>
            </div>
          </div>
        </v-col>
        
        <v-col cols="12" md="6" class="d-none d-md-flex justify-center">
          <div class="hero-section__illustration">
            <div class="hero-section__illustration-container">
              <div class="hero-section__illustration-card hero-section__illustration-card--1">
                <v-icon size="48" color="primary">mdi-book-open-page-variant</v-icon>
                <span>漫画创作</span>
              </div>
              <div class="hero-section__illustration-card hero-section__illustration-card--2">
                <v-icon size="48" color="secondary">mdi-palette</v-icon>
                <span>多种风格</span>
              </div>
              <div class="hero-section__illustration-card hero-section__illustration-card--3">
                <v-icon size="48" color="accent">mdi-robot</v-icon>
                <span>AI驱动</span>
              </div>
              <div class="hero-section__illustration-circle" />
              <div class="hero-section__illustration-dots" />
            </div>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup>
defineEmits(['start', 'demo'])
</script>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, var(--color-primary-container) 0%, var(--color-surface) 100%);
  padding: 48px 0;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
  opacity: 0.1;
  border-radius: 50%;
}

.hero-section__container {
  position: relative;
  z-index: 1;
}

.min-height-screen {
  min-height: 50vh;
}

.hero-section__content {
  max-width: 600px;
}

.hero-section__title {
  margin-bottom: 24px;
}

.hero-section__title-main {
  display: block;
  font-family: var(--font-family-display);
  font-size: 2.75rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-on-background);
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-section__title-sub {
  display: block;
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--color-on-surface-variant);
  line-height: 1.6;
}

.hero-section__description {
  font-size: 1rem;
  color: var(--color-on-surface-variant);
  line-height: 1.7;
  margin-bottom: 24px;
}

.hero-section__actions {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.hero-section__cta {
  font-weight: 600;
  text-transform: none;
  border-radius: var(--border-radius-xl);
  padding: 0 32px;
  height: 56px;
  font-size: 1.125rem;
}

.hero-section__demo {
  font-weight: 600;
  text-transform: none;
  border-radius: var(--border-radius-xl);
  padding: 0 32px;
  height: 56px;
  font-size: 1.125rem;
}

.hero-section__stats {
  display: flex;
  gap: 48px;
}

.hero-section__stat {
  text-align: center;
}

.hero-section__stat-number {
  display: block;
  font-family: var(--font-family-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.2;
}

.hero-section__stat-label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-on-surface-variant);
  margin-top: 4px;
}

/* 插画区域 */
.hero-section__illustration {
  position: relative;
  width: 100%;
  max-width: 500px;
  height: 400px;
}

.hero-section__illustration-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.hero-section__illustration-card {
  position: absolute;
  background: var(--color-surface);
  border-radius: var(--border-radius-xl);
  padding: 24px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  color: var(--color-on-surface);
  transition: transform 0.3s ease;
}

.hero-section__illustration-card:hover {
  transform: translateY(-8px);
}

.hero-section__illustration-card--1 {
  top: 5%;
  left: 40%;
  animation: float 6s ease-in-out infinite;
}

.hero-section__illustration-card--2 {
  top: 40%;
  right: 10%;
  animation: float 6s ease-in-out infinite 2s;
}

.hero-section__illustration-card--3 {
  bottom: 20%;
  left: 20%;
  animation: float 6s ease-in-out infinite 4s;
}

.hero-section__illustration-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  opacity: 0.1;
}

.hero-section__illustration-dots {
  position: absolute;
  top: 10%;
  right: 20%;
  width: 100px;
  height: 100px;
  background-image: radial-gradient(var(--color-primary) 2px, transparent 2px);
  background-size: 20px 20px;
  opacity: 0.3;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

/* 响应式调整 */
@media (max-width: 960px) {
  .hero-section {
    padding: 36px 0;
  }
  
  .hero-section__title-main {
    font-size: 2.5rem;
  }
  
  .hero-section__title-sub {
    font-size: 1.125rem;
  }
  
  .hero-section__stats {
    gap: 32px;
  }
  
  .hero-section__stat-number {
    font-size: 1.5rem;
  }
}

@media (max-width: 600px) {
  .hero-section {
    padding: 24px 0;
  }
  
  .hero-section__title-main {
    font-size: 2rem;
  }
  
  .hero-section__actions {
    flex-direction: column;
  }
  
  .hero-section__cta,
  .hero-section__demo {
    width: 100%;
  }
  
  .hero-section__stats {
    justify-content: center;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .hero-section {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
}

[data-theme="dark"] .hero-section__illustration-card {
  background: var(--color-surface-variant);
}
</style>
