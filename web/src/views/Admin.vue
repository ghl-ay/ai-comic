<!-- web/src/views/Admin.vue -->
<template>
  <div class="admin-page">
    <v-container>
      <v-row>
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <v-btn to="/comics" variant="text" class="mr-2">
              <v-icon left>mdi-arrow-left</v-icon>
              返回
            </v-btn>
            <h1>后台管理</h1>
          </div>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <v-tabs v-model="activeTab" class="mb-4">
            <v-tab to="/admin/ai-config">
              <v-icon left>mdi-cog</v-icon>
              AI 配置
            </v-tab>
            <v-tab to="/admin/style-presets">
              <v-icon left>mdi-palette</v-icon>
              风格预设
            </v-tab>
            <v-tab to="/admin/users">
              <v-icon left>mdi-account-group</v-icon>
              用户管理
            </v-tab>
            <v-tab to="/admin/oidc-config">
              <v-icon left>mdi-shield-key</v-icon>
              OIDC 配置
            </v-tab>
          </v-tabs>

          <router-view />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref(route.path)
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--color-background);
}
</style>
