<!-- web/src/components/style/StylePresetCard.vue -->
<template>
  <v-card
    class="style-preset-card"
    :class="{ 'style-preset-card--selected': selected }"
    :elevation="selected ? 8 : (hovered ? 4 : 1)"
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
        <template v-slot:placeholder>
          <div class="d-flex align-center justify-center fill-height">
            <v-progress-circular indeterminate color="grey-lighten-4" />
          </div>
        </template>
      </v-img>
      <div v-else class="style-preset-card__placeholder">
        <v-icon size="48" color="grey-lighten-1">mdi-palette</v-icon>
      </div>
      
      <v-icon
        v-if="selected"
        class="style-preset-card__check"
        color="primary"
        size="32"
      >
        mdi-check-circle
      </v-icon>
    </div>
    
    <v-card-text class="style-preset-card__content">
      <div class="style-preset-card__name">{{ preset.name }}</div>
      <v-tooltip
        v-if="preset.description"
        location="top"
        max-width="300"
      >
        <template v-slot:activator="{ props }">
          <v-icon
            v-bind="props"
            size="16"
            color="grey"
            class="mt-1"
          >
            mdi-information-outline
          </v-icon>
        </template>
        <span>{{ preset.description }}</span>
      </v-tooltip>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  preset: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
});

defineEmits(['select']);

const hovered = ref(false);
</script>

<style scoped>
.style-preset-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
  max-width: 150px;
}

.style-preset-card--selected {
  border: 2px solid rgb(var(--v-theme-primary));
}

.style-preset-card__image-container {
  position: relative;
  height: 100px;
  background-color: #f5f5f5;
}

.style-preset-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.style-preset-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: white;
  border-radius: 50%;
}

.style-preset-card__content {
  padding: 12px;
  text-align: center;
}

.style-preset-card__name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.2;
}

@media (max-width: 600px) {
  .style-preset-card {
    max-width: 120px;
  }
  
  .style-preset-card__image-container {
    height: 80px;
  }
}
</style>
