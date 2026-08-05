// web/src/composables/useAiFormFill.js
import { ref } from 'vue'
import aiAssistApi from '../api/ai-assist'

/**
 * 通用 AI 表单填充 composable
 * provider 选择由页面上的 AiProviderSelect 负责，本 composable 只负责请求。
 * @param {Object} options
 * @param {Function} [options.onSuccess]
 * @param {Function} [options.onError]
 */
export function useAiFormFill(options = {}) {
  const loading = ref(false)
  const error = ref(null)

  function hasContent(formData, fields) {
    return fields.some(field => {
      const value = formData[field]
      return value && typeof value === 'string' && value.trim().length > 0
    })
  }

  /**
   * @param {Object} params
   * @param {Object} params.schema
   * @param {string} params.context
   * @param {Object} [params.formData]
   * @param {Array} [params.fillFields]
   * @param {Function} [params.onFill]
   * @param {number|string|null} params.providerId
   */
  async function fillForm({ schema, context, formData, fillFields = [], onFill, providerId }) {
    if (formData && fillFields.length > 0 && hasContent(formData, fillFields)) {
      const confirmed = window.confirm('当前表单已有内容，AI 生成将会覆盖是否继续？')
      if (!confirmed) return
    }

    if (providerId == null) {
      const message = '没有供应商可选'
      error.value = message
      options.onError?.(message)
      throw new Error(message)
    }

    loading.value = true
    error.value = null

    try {
      const result = await aiAssistApi.fillForm(schema, context, providerId)

      if (result.data && onFill) {
        onFill(result.data)
      }

      options.onSuccess?.(result.data)
      return result.data
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'AI 生成失败'
      error.value = message
      options.onError?.(message)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fillForm,
    hasContent,
  }
}
