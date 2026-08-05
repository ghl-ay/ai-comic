// web/src/composables/useAiProviderOptions.js
import { ref, computed, onMounted } from 'vue'
import aiProviderApi from '../api/ai-provider'

/**
 * 业务页 AI 提供商选择状态
 * @param {'text'|'image'} type
 * @param {{ autoLoad?: boolean }} options
 */
export function useAiProviderOptions(type, options = {}) {
  const { autoLoad = true } = options

  const providerOptions = ref([])
  const selectedProviderId = ref(null)
  const loading = ref(false)
  const loadError = ref(null)
  const hasLoaded = ref(false)

  let loadPromise = null

  const isEmpty = computed(() => hasLoaded.value && providerOptions.value.length === 0)
  const showSelector = computed(() => providerOptions.value.length >= 2)
  const emptyMessage = '没有供应商可选'

  async function load() {
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
      loading.value = true
      loadError.value = null
      try {
        const res = await aiProviderApi.options(type)
        providerOptions.value = res.options || []
        const defaultItem = providerOptions.value.find(item => item.isDefault)
        selectedProviderId.value =
          defaultItem?.id ?? providerOptions.value[0]?.id ?? null
      } catch (error) {
        loadError.value = error.response?.data?.error || error.message
        providerOptions.value = []
        selectedProviderId.value = null
      } finally {
        hasLoaded.value = true
        loading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  /** 等待首次加载完成（幂等，可安全在 onMounted 中 await） */
  async function ensureLoaded() {
    if (hasLoaded.value) return
    return load()
  }

  function providerPayload() {
    if (selectedProviderId.value == null) return {}
    return { providerId: selectedProviderId.value }
  }

  if (autoLoad) {
    onMounted(() => {
      load()
    })
  }

  return {
    options: providerOptions,
    selectedProviderId,
    loading,
    loadError,
    isEmpty,
    showSelector,
    emptyMessage,
    hasLoaded,
    load,
    ensureLoaded,
    providerPayload,
  }
}
