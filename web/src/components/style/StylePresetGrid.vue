<!-- web/src/components/style/StylePresetGrid.vue -->
<template>
  <div class="style-preset-grid">
    <v-tabs
      v-model="activeCategory"
      class="style-preset-grid__category-tabs"
      show-arrows
    >
      <v-tab
        v-for="category in categories"
        :key="category.name"
        :value="category.name"
      >
        {{ category.name }}
      </v-tab>
    </v-tabs>
    
    <div class="style-preset-grid__content">
      <v-window v-model="activeCategory">
        <v-window-item
          v-for="category in categories"
          :key="category.name"
          :value="category.name"
        >
          <div class="style-preset-grid__grid">
            <StylePresetCard
              v-for="preset in category.presets"
              :key="preset.id"
              :preset="preset"
              :selected="selectedPresetId === preset.id"
              @select="$emit('select', $event)"
            />
          </div>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import StylePresetCard from './StylePresetCard.vue';

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  selectedPresetId: {
    type: Number,
    default: null,
    validator: (v) => v === null || typeof v === 'number'
  }
});

defineEmits(['select']);

const activeCategory = ref('');

watch(() => props.categories, (newCategories) => {
  if (newCategories.length > 0 && !activeCategory.value) {
    activeCategory.value = newCategories[0].name;
  }
}, { immediate: true });
</script>

<style scoped>
.style-preset-grid__category-tabs {
  margin-bottom: 16px;
}

.style-preset-grid__content {
  max-height: 400px;
  overflow-y: auto;
}

.style-preset-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 8px;
}

@media (max-width: 600px) {
  .style-preset-grid__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>
