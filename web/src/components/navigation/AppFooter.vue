<!-- web/src/components/navigation/AppFooter.vue -->
<template>
  <v-footer class="app-footer" :class="footerClasses">
    <v-container>
      <v-row align="center" justify="center">
        <v-col cols="12" class="text-center">
          <div class="app-footer__content">
            <div class="app-footer__brand">
              <v-avatar size="24" color="primary" class="mr-2">
                <v-icon color="white" size="14">mdi-book-open-page-variant</v-icon>
              </v-avatar>
              <span class="font-weight-bold">AI漫画创作平台</span>
            </div>
            
            <v-divider vertical class="mx-4" />
            
            <div class="app-footer__links">
              <a href="#" class="app-footer__link">关于我们</a>
              <a href="#" class="app-footer__link">使用条款</a>
              <a href="#" class="app-footer__link">隐私政策</a>
              <a href="#" class="app-footer__link">帮助中心</a>
            </div>
          </div>
          
          <div class="app-footer__copyright mt-2">
            <span class="text-caption text-grey">
              &copy; {{ currentYear }} AI漫画创作平台. All rights reserved.
            </span>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup>
import { computed } from 'vue'

const currentYear = new Date().getFullYear()

const props = defineProps({
  // 是否固定在底部
  fixed: {
    type: Boolean,
    default: false
  },
  
  // 是否显示边框
  bordered: {
    type: Boolean,
    default: true
  }
})

const footerClasses = computed(() => ({
  'app-footer--fixed': props.fixed,
  'app-footer--bordered': props.bordered,
}))
</script>

<style scoped>
.app-footer {
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-outline);
  padding: 24px 0;
  margin-top: auto;
}

.app-footer--fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-index-sticky);
}

.app-footer--bordered {
  border-top: 1px solid var(--color-outline);
}

.app-footer__content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.app-footer__brand {
  display: flex;
  align-items: center;
  color: var(--color-on-surface);
}

.app-footer__links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-footer__link {
  color: var(--color-on-surface-variant);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.app-footer__link:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.app-footer__copyright {
  color: var(--color-on-surface-variant);
}

/* 响应式调整 */
@media (max-width: 600px) {
  .app-footer__content {
    flex-direction: column;
    gap: 12px;
  }
  
  .app-footer__links {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
  
  .app-footer {
    padding: 16px 0;
  }
}

/* 深色主题调整 */
[data-theme="dark"] .app-footer {
  background-color: var(--color-surface);
  border-top-color: var(--color-outline);
}
</style>
