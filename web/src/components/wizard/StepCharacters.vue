<!-- web/src/components/wizard/StepCharacters.vue -->
<template>
  <v-card flat>
    <v-card-title class="text-h5 mb-4">确认角色列表</v-card-title>
    <v-card-text>
      <v-alert v-if="store.loading" type="info" class="mb-4">
        AI 正在提取角色，请稍候...
      </v-alert>

      <v-alert v-if="store.error" type="error" class="mb-4">
        {{ store.error }}
      </v-alert>

      <AiProviderSelect
        ref="textProviderSelect"
        type="text"
        v-model="textProviderId"
      />

      <v-row>
        <v-col
          v-for="(char, index) in localCharacters"
          :key="index"
          cols="12"
          md="6"
        >
          <v-card :class="{ 'border-primary': char.selected }" @click="toggleSelect(char)">
            <v-card-text>
              <div class="d-flex align-center mb-2">
                <v-checkbox
                  v-model="char.selected"
                  hide-details
                  class="mr-2"
                  @click.stop
                />
                <v-text-field
                  v-model="char.name"
                  label="角色名称"
                  hide-details
                  density="compact"
                  @click.stop
                />
              </div>
              <v-textarea
                v-model="char.description"
                label="角色描述"
                rows="2"
                hide-details
                class="mb-2"
                @click.stop
              />
              <v-textarea
                v-model="char.appearance"
                label="外观描述"
                rows="2"
                hide-details
                hint="用于生成角色参考图"
                @click.stop
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="store.loading"
            :disabled="textProviderId == null"
            @click="regenerate"
          >
            <v-icon left>mdi-refresh</v-icon>
            重新提取
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useNovelWizardStore } from '../../stores/novelWizard'
import AiProviderSelect from '../business/AiProviderSelect.vue'

const store = useNovelWizardStore()
const textProviderSelect = ref(null)
const textProviderId = ref(null)

const localCharacters = ref([])

watch(localCharacters, (val) => {
  store.characters = val
}, { deep: true })

onMounted(async () => {
  await textProviderSelect.value?.ensureLoaded()
  if (store.characters.length === 0 && store.novelId) {
    if (textProviderId.value == null) return
    try {
      await store.extractCharacters(textProviderId.value)
      localCharacters.value = store.characters.map(c => ({
        ...c,
        selected: true,
      }))
    } catch (e) {
      console.error('提取角色失败:', e)
    }
  } else {
    localCharacters.value = store.characters.map(c => ({
      ...c,
      selected: c.selected !== false,
    }))
  }
})

async function regenerate() {
  if (textProviderId.value == null) return
  try {
    await store.extractCharacters(textProviderId.value)
    localCharacters.value = store.characters.map(c => ({
      ...c,
      selected: true,
    }))
  } catch (e) {
    console.error('重新提取失败:', e)
  }
}

function toggleSelect(char) {
  char.selected = !char.selected
}
</script>

<style scoped>
.border-primary {
  border: 2px solid rgb(var(--v-theme-primary));
}
</style>
