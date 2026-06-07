// web/src/stores/stylePreset.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { stylePresetApi } from '@/api/stylePreset';

export const useStylePresetStore = defineStore('stylePreset', () => {
  const categories = ref([]);
  const loading = ref(false);
  const loaded = ref(false);

  async function fetchPresets() {
    if (loaded.value) return;
    loading.value = true;
    try {
      const res = await stylePresetApi.list();
      categories.value = res.categories || [];
      loaded.value = true;
    } catch (error) {
      console.error('Failed to fetch style presets:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function getPresetByPrompt(stylePrompt) {
    for (const cat of categories.value) {
      const found = cat.presets.find(p => p.stylePrompt === stylePrompt);
      if (found) return found;
    }
    return null;
  }

  function clearCache() {
    categories.value = [];
    loaded.value = false;
  }

  return {
    categories,
    loading,
    loaded,
    fetchPresets,
    getPresetByPrompt,
    clearCache
  };
});
