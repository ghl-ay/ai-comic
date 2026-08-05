<!-- web/src/components/style/StylePresetGrid.vue -->
<template>
  <div class="style-preset-grid">
    <div class="style-preset-grid__grid">
      <StylePresetCard
        v-for="preset in presets"
        :key="preset.id"
        :preset="preset"
        :selected="selectedPresetId === preset.id"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import StylePresetCard from './StylePresetCard.vue';

defineProps({
  presets: {
    type: Array,
    required: true,
  },
  selectedPresetId: {
    type: Number,
    default: null,
    validator: value => value === null || typeof value === 'number',
  },
});

defineEmits(['select']);
</script>

<style scoped>
.style-preset-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  padding: 4px 0;
}

@media (max-width: 600px) {
  .style-preset-grid__grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
</style>
