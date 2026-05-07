// web/src/stores/novelWizard.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import novelApi from '../api/novel'
import comicApi from '../api/comic'
import characterApi from '../api/character'

export const useNovelWizardStore = defineStore('novelWizard', () => {
  // 状态
  const currentStep = ref(1)
  const novelId = ref(null)
  const novelContent = ref('')
  const novelTitle = ref('')
  const style = ref({ title: '', stylePrompt: '' })
  const characters = ref([])
  const chapters = ref([])
  const comicId = ref(null)
  const loading = ref(false)
  const error = ref('')

  // 计算属性
  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 1:
        return novelContent.value.trim().length > 0 && novelContent.value.length <= 10000
      case 2:
        return style.value.title.trim().length > 0
      case 3:
        return characters.value.filter(c => c.selected).length > 0
      case 4:
        return chapters.value.length > 0
      default:
        return true
    }
  })

  // 方法
  async function createNovel(title, content) {
    loading.value = true
    error.value = ''
    try {
      const res = await novelApi.createNovel({ title, content })
      novelId.value = res.novel.id
      novelTitle.value = res.novel.title
      return res.novel
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function analyzeStyle() {
    if (!novelId.value) return
    loading.value = true
    error.value = ''
    try {
      const res = await novelApi.analyzeStyle(novelId.value)
      style.value = {
        title: res.title,
        stylePrompt: res.stylePrompt,
      }
      return res
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function extractCharacters() {
    if (!novelId.value) return
    loading.value = true
    error.value = ''
    try {
      const res = await novelApi.extractCharacters(novelId.value)
      characters.value = res.characters
      return res.characters
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function generateChapters() {
    if (!novelId.value) return
    loading.value = true
    error.value = ''
    try {
      const characterIds = characters.value
        .filter(c => c.selected)
        .map(c => c.createdId || c.id)

      const res = await novelApi.generateChapters(novelId.value, {
        style: style.value,
        characterIds,
      })
      chapters.value = res.chapters
      return res.chapters
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createCharacters() {
    const selectedCharacters = characters.value.filter(c => c.selected)
    const createdIds = []

    for (const char of selectedCharacters) {
      try {
        const res = await characterApi.createCharacter({
          name: char.name,
          description: char.description,
          appearance: char.appearance,
        })
        createdIds.push(res.character.id)
        char.createdId = res.character.id
      } catch (e) {
        console.error('创建角色失败:', e)
      }
    }

    return createdIds
  }

  async function createComicAndChapters() {
    loading.value = true
    error.value = ''
    try {
      // 创建漫画
      const comicRes = await comicApi.createComic({
        title: style.value.title,
        stylePrompt: style.value.stylePrompt,
      })
      comicId.value = comicRes.comic.id

      // 获取已创建角色的 ID
      const characterIdMap = {}
      characters.value.filter(c => c.selected).forEach(c => {
        characterIdMap[c.id] = c.createdId
      })

      // 准备章节数据，映射角色 ID
      const chaptersData = chapters.value.map(ch => ({
        ...ch,
        characterIds: ch.characterIds.map(id => characterIdMap[id] || id).filter(Boolean),
      }))

      // 批量创建章节
      const res = await fetch('/api/comics/' + comicId.value + '/chapters/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chapters: chaptersData,
          novelId: novelId.value,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '创建章节失败')
      }

      return comicId.value
    } catch (e) {
      error.value = e.response?.data?.error || e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  function nextStep() {
    if (currentStep.value < 5) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  function reset() {
    currentStep.value = 1
    novelId.value = null
    novelContent.value = ''
    novelTitle.value = ''
    style.value = { title: '', stylePrompt: '' }
    characters.value = []
    chapters.value = []
    comicId.value = null
    loading.value = false
    error.value = ''
  }

  return {
    // 状态
    currentStep,
    novelId,
    novelContent,
    novelTitle,
    style,
    characters,
    chapters,
    comicId,
    loading,
    error,
    // 计算属性
    canProceed,
    // 方法
    createNovel,
    analyzeStyle,
    extractCharacters,
    generateChapters,
    createCharacters,
    createComicAndChapters,
    nextStep,
    prevStep,
    reset,
  }
})
