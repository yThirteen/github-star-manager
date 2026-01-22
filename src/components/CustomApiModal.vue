<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <Transition name="scale">
          <div
            v-if="visible"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden"
          >
            <!-- 标题 -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ editingId ? t('modals.customApi.title.edit') : t('modals.customApi.title.create') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ t('modals.customApi.subtitle') }}
              </p>
            </div>

            <!-- 内容 -->
            <div class="px-6 py-4 space-y-4">
              <!-- 名称输入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.customApi.fields.name') }}
                  <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="localName"
                  type="text"
                  :placeholder="t('modals.customApi.placeholders.name')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @keydown.enter="handleSave"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.customApi.hints.name') }}
                </p>
              </div>

              <!-- API Key 输入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.customApi.fields.apiKey') }}
                  <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="localApiKey"
                  type="password"
                  :placeholder="t('modals.customApi.placeholders.apiKey')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @keydown.enter="handleSave"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.customApi.hints.apiKey') }}
                </p>
              </div>

              <!-- API URL 输入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.customApi.fields.apiUrl') }}
                  <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="localApiUrl"
                  type="text"
                  :placeholder="t('modals.customApi.placeholders.apiUrl')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @keydown.enter="handleSave"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.customApi.hints.apiUrl') }}
                </p>
              </div>

              <!-- 错误消息 -->
              <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
                {{ errorMessage }}
              </p>
            </div>

            <!-- 按钮 -->
            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                @click="handleCancel"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                @click="handleSave"
                :disabled="!canSave || isSaving"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="isSaving">{{ t('status.saving') }}</span>
                <span v-else>{{ t('common.save') }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  editingId?: string // 编辑模式下的 API ID
  name?: string
  apiKey?: string
  apiUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  editingId: undefined,
  name: '',
  apiKey: '',
  apiUrl: '',
})

const { t } = useI18n()

const emit = defineEmits<{
  save: [id: string | undefined, name: string, apiKey: string, apiUrl: string]
  cancel: []
  'update:visible': [value: boolean]
}>()

// 本地状态
const localName = ref('')
const localApiKey = ref('')
const localApiUrl = ref('')
const errorMessage = ref('')
const isSaving = ref(false)

// 是否为编辑模式
const editingId = computed(() => props.editingId)

// 是否可以保存
const canSave = computed(() => {
  return localName.value.trim() !== '' && localApiKey.value.trim() !== '' && localApiUrl.value.trim() !== ''
})

// 监听 visible 变化，初始化表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    localName.value = props.name || ''
    localApiKey.value = props.apiKey || ''
    localApiUrl.value = props.apiUrl || ''
    errorMessage.value = ''
  }
}, { immediate: true })

// 监听 props 变化，更新表单
watch([() => props.name, () => props.apiKey, () => props.apiUrl], ([newName, newApiKey, newApiUrl]) => {
  if (props.visible) {
    localName.value = newName || ''
    localApiKey.value = newApiKey || ''
    localApiUrl.value = newApiUrl || ''
  }
})

function handleSave() {
  if (!canSave.value) {
    errorMessage.value = t('modals.customApi.errors.required')
    return
  }

  errorMessage.value = ''
  isSaving.value = true

  // 验证 URL 格式
  try {
    new URL(localApiUrl.value.trim())
  } catch {
    errorMessage.value = t('modals.customApi.errors.invalidUrl')
    isSaving.value = false
    return
  }

  // 触发保存事件
  emit('save', editingId.value, localName.value.trim(), localApiKey.value.trim(), localApiUrl.value.trim())
  emit('update:visible', false)
  isSaving.value = false
}

function handleCancel() {
  errorMessage.value = ''
  emit('cancel')
  emit('update:visible', false)
}

// 禁用 ESC 关闭，保留仅通过按钮关闭
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

