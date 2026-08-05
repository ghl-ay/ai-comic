// web/src/stores/stylePreset.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { stylePresetApi } from '@/api/stylePreset';

export const useStylePresetStore = defineStore('stylePreset', () => {
  const categories = ref([]);
  const presets = ref([]);
  const loading = ref(false);
  const loaded = ref(false);

  const defaultPreset = computed(() => {
    return presets.value.find(preset => preset.code === 'jp_monochrome') || presets.value[0] || null;
  });

  async function fetchPresets(force = false) {
    if (loaded.value && !force) return;
    loading.value = true;
    try {
      const res = await stylePresetApi.list();
      categories.value = res.categories || [];
      presets.value = res.presets || flattenFromCategories(res.categories || []);
      loaded.value = true;
    } catch (error) {
      console.error('Failed to fetch style presets:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function flattenFromCategories(categoryList) {
    const list = [];
    for (const category of categoryList) {
      for (const preset of category.presets || []) {
        list.push(preset);
      }
    }
    return list;
  }

  function getPresetById(presetId) {
    if (presetId == null) return null;
    return presets.value.find(preset => preset.id === presetId) || null;
  }

  function getPresetByPrompt(stylePrompt) {
    if (!stylePrompt) return null;
    return presets.value.find(preset => preset.stylePrompt === stylePrompt) || null;
  }

  function getDefaultPreset() {
    return defaultPreset.value;
  }

  function clearCache() {
    categories.value = [];
    presets.value = [];
    loaded.value = false;
  }

  return {
    categories,
    presets,
    loading,
    loaded,
    defaultPreset,
    fetchPresets,
    getPresetById,
    getPresetByPrompt,
    getDefaultPreset,
    clearCache,
  };
});
