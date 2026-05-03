<!-- web/src/components/ComicPreview.vue -->
<template>
  <VueEasyLightbox
    :visible="visible"
    :imgs="images"
    v-model:index="currentIndex"
    :loop="true"
    :scrollDisabled="true"
    :maskClosable="true"
    :escToClose="true"
    :moveDisabled="false"
    :zoomScale="1.2"
    :rotateDisabled="true"
    @hide="handleClose"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import VueEasyLightbox from 'vue-easy-lightbox'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  chapters: {
    type: Array,
    default: () => []
  },
  initialChapterId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const currentIndex = ref(0)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const images = computed(() => {
  return props.chapters
    .filter(ch => ch.page_image)
    .sort((a, b) => a.chapter_number - b.chapter_number)
    .map(ch => ({
      src: `/images/comics/${ch.page_image}`,
      title: ch.title || `第${ch.chapter_number}话`,
      chapterId: ch.id
    }))
})

watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.initialChapterId) {
      const idx = images.value.findIndex(img => img.chapterId === props.initialChapterId)
      if (idx !== -1) {
        currentIndex.value = idx
      }
    } else {
      currentIndex.value = 0
    }
  }
})

function handleClose() {
  visible.value = false
}
</script>
