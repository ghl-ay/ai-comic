<!-- web/src/components/style/StylePresetCard.vue -->
<template>
  <v-card
    class="style-preset-card"
    :class="{ 'style-preset-card--selected': selected }"
    :elevation="selected ? 6 : hovered ? 3 : 1"
    @click="$emit('select', preset)"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="style-preset-card__image-container">
      <v-img
        v-if="preset.coverImage"
        :src="preset.coverImage"
        :alt="preset.name"
        height="100%"
        cover
      >
        <template #placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <v-progress-circular indeterminate color="grey-lighten-1" size="24" />
          </div>
        </template>
        <template #error>
          <div class="style-preset-card__placeholder">
            <v-icon size="40" color="grey-lighten-1">mdi-image-off-outline</v-icon>
          </div>
        </template>
      </v-img>
      <div v-else class="style-preset-card__placeholder">
        <v-icon size="40" color="grey-lighten-1">mdi-palette-outline</v-icon>
        <span class="style-preset-card__placeholder-text">暂无预览</span>
      </div>

      <v-icon
        v-if="selected"
        class="style-preset-card__check"
        color="primary"
        size="28"
      >
        mdi-check-circle
      </v-icon>
    </div>

    <v-card-text class="style-preset-card__content">
      <div class="style-preset-card__name">{{ preset.name }}</div>
      <div v-if="preset.description" class="style-preset-card__desc">
        {{ preset.description }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  preset: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['select']);

const hovered = ref(false);
</script>

<style scoped>
.style-preset-card {
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  height: 100%;
  border: 2px solid transparent;
  overflow: hidden;
}

.style-preset-card--selected {
  border-color: rgb(var(--v-theme-primary));
}

.style-preset-card__image-container {
  position: relative;
  height: 140px;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.style-preset-card__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 4px;
}

.style-preset-card__placeholder-text {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.style-preset-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgb(var(--v-theme-surface));
  border-radius: 50%;
}

.style-preset-card__content {
  padding: 10px 12px 12px !important;
  text-align: left;
}

.style-preset-card__name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.3;
}

.style-preset-card__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 600px) {
  .style-preset-card__image-container {
    height: 110px;
  }
}
</style>
