// web/src/composables/useAiFormFill.js
import { ref } from 'vue'
import aiAssistApi from '../api/ai-assist'

/**
 * 通用 AI 表单填充 composable
 * @param {Object} options - 配置选项
 * @param {Function} options.onSuccess - 成功回调，返回填充数据
 * @param {Function} options.onError - 错误回调
 * @returns {Object} - { loading, error, fillForm }
 */
export function useAiFormFill(options = {}) {
  const loading = ref(false)
  const error = ref(null)

  /**
   * 检查表单是否有内容
   * @param {Object} formData - 表单数据
   * @param {Array} fields - 要检查的字段名列表
   * @returns {boolean}
   */
  function hasContent(formData, fields) {
    return fields.some(field => {
      const value = formData[field]
      return value && typeof value === 'string' && value.trim().length > 0
    })
  }

  /**
   * 执行 AI 表单填充
   * @param {Object} params - 参数
   * @param {Object} params.schema - 表单结构定义
   * @param {string} params.context - 上下文信息
   * @param {Object} params.formData - 当前表单数据（用于检查是否有内容）
   * @param {Array} params.fillFields - 要填充的字段名列表（用于二次确认）
   * @param {Function} params.onFill - 填充回调，接收生成的数据
   */
  async function fillForm({ schema, context, formData, fillFields = [], onFill }) {
    // 检查是否有内容需要二次确认
    if (formData && fillFields.length > 0 && hasContent(formData, fillFields)) {
      const confirmed = window.confirm('当前表单已有内容，AI 生成将会覆盖是否继续？')
      if (!confirmed) return
    }

    loading.value = true
    error.value = null

    try {
      const result = await aiAssistApi.fillForm(schema, context)

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
