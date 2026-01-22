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
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <!-- 标题 -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ editingApi ? t('modals.apiItem.title.edit') : t('modals.apiItem.title.create') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ t('modals.apiItem.subtitle') }}
              </p>
            </div>

            <!-- 内容 -->
            <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <!-- API 类型 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.apiType') }}
                </label>
                <select
                  v-model="formData.apiType"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openai">{{ t('modals.apiItem.apiTypes.openai') }}</option>
                  <option value="google">{{ t('modals.apiItem.apiTypes.google') }}</option>
                  <!-- <option value="microsoft">Microsoft Translator</option> -->
                </select>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.apiType') }}
                </p>
              </div>

              <!-- API 名称 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.apiName') }}
                  <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  :placeholder="t('modals.apiItem.placeholders.name')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.name') }}
                </p>
              </div>

              <!-- API Key -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.apiKey') }}
                </label>
                <input
                  v-model="formData.apiKey"
                  type="password"
                  :placeholder="t('modals.apiItem.placeholders.apiKey')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.apiKey') }}
                </p>
              </div>

              <!-- API URL -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.apiUrl') }}
                </label>
                <input
                  v-model="formData.apiUrl"
                  type="text"
                  :placeholder="t('modals.apiItem.placeholders.apiUrl')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.apiUrl') }}
                </p>
              </div>

              <!-- 模型 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.model') }}
                </label>
                <input
                  v-model="formData.model"
                  type="text"
                  :placeholder="t('modals.apiItem.placeholders.model')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.model') }}
                </p>
              </div>

              <!-- 用途标签 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.tags') }}
                </label>
                <div class="flex flex-wrap gap-3">
                  <label
                    v-for="module in moduleOptionsLocalized"
                    :key="module.id"
                    class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      :value="module.id"
                      v-model="formData.tags"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span class="flex items-center gap-1">
                      <span>{{ module.icon }}</span>
                      <span>{{ module.name }}</span>
                    </span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.tags') }}
                </p>
              </div>

              <!-- 描述（可选） -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.apiItem.fields.description') }}
                </label>
                <textarea
                  v-model="formData.description"
                  rows="3"
                  :placeholder="t('modals.apiItem.placeholders.description')"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                ></textarea>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {{ t('modals.apiItem.hints.description') }}
                </p>
              </div>

              <!-- 错误消息 -->
              <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
                {{ errorMessage }}
              </p>

              <!-- 测试结果 -->
              <p v-if="testMessage" :class="[
                'text-sm',
                testSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              ]">
                {{ testMessage }}
              </p>
            </div>

            <!-- 按钮 -->
            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-between">
              <div class="flex gap-2">
                <button
                  @click="handleTestTranslateApi"
                  :disabled="isTesting || isSaving"
                  class="px-4 py-2 border border-orange-300 dark:border-orange-600 rounded-lg text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isTesting">{{ t('status.testing') }}</span>
                  <span v-else>{{ t('modals.apiItem.buttons.testTranslate') }}</span>
                </button>
                <button
                  @click="handleTestClassifyApi"
                  :disabled="isTesting || isSaving"
                  class="px-4 py-2 border border-indigo-300 dark:border-indigo-600 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isTesting">{{ t('status.testing') }}</span>
                  <span v-else>{{ t('modals.apiItem.buttons.testClassify') }}</span>
                </button>
              </div>
              <div class="flex gap-3">
                <button
                  v-if="editingApi"
                  @click="handleDelete"
                  :disabled="isSaving || isTesting"
                  class="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ t('common.delete') }}
                </button>
                <button
                  @click="handleCancel"
                  class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  @click="handleSave"
                  :disabled="!canSave || isSaving || isTesting"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span v-if="isSaving">{{ t('status.saving') }}</span>
                  <span v-else>{{ editingApi ? t('common.save') : t('common.create') }}</span>
                </button>
              </div>
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
import type { ApiItem, ApiType, AIModule, AIModuleInfo } from '../types/ai'
import { AI_MODULES } from '../types/ai'
import { translateText, classifyRepository } from '../utils/ai'

interface Props {
  visible: boolean
  editingApi?: ApiItem | null
}

const props = withDefaults(defineProps<Props>(), {
  editingApi: null,
})

const { t, locale } = useI18n()

const emit = defineEmits<{
  save: [api: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'> | { id: string; updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>> }]
  cancel: []
  delete: [id: string]
}>()

// 表单数据
const formData = ref<{
  name: string
  apiKey?: string
  apiUrl?: string
  model?: string
  description?: string
  tags: AIModule[]
  apiType: ApiType
}>({
  name: '',
  apiKey: '',
  apiUrl: '',
  model: '',
  description: '',
  tags: [],
  apiType: 'openai',
})

const errorMessage = ref('')
const isSaving = ref(false)
const isTesting = ref(false)
const testMessage = ref('')
const testSuccess = ref(false)

// 模块选项
const moduleOptions = computed<AIModuleInfo[]>(() => Object.values(AI_MODULES))
const moduleOptionsLocalized = computed(() => {
  locale.value // 确保语言切换时的响应式更新
  return moduleOptions.value.map((m) => ({
    ...m,
    name: t(`settings.apiManagement.modules.${m.id}.name`),
    description: t(`settings.apiManagement.modules.${m.id}.description`),
  }))
})

// 是否可以保存
const canSave = computed(() => {
  // 只对 API 名称做必填校验
  if (!formData.value.name.trim()) return false
  return true
})


// 保存
function handleSave() {
  if (!canSave.value) {
    errorMessage.value = t('modals.apiItem.errors.nameRequired')
    return
  }

  errorMessage.value = ''
  isSaving.value = true

  try {
    if (props.editingApi) {
      // 编辑模式
      const updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>> = {
        name: formData.value.name,
        tags: formData.value.tags,
        apiKey: formData.value.apiKey ?? '',
        apiUrl: formData.value.apiUrl ?? '',
        model: formData.value.model ?? '',
        apiType: formData.value.apiType,
      }
      
      if (formData.value.description !== undefined) updates.description = formData.value.description
      
      emit('save', { id: props.editingApi.id, updates })
    } else {
      // 创建模式
      const apiType = formData.value.apiType
      const newApi: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.value.name,
        apiType: apiType,
        apiKey: formData.value.apiKey,
        apiUrl: formData.value.apiUrl,
        model: formData.value.model,
        tags: formData.value.tags,
      }
      
      if (formData.value.description) newApi.description = formData.value.description
      
      emit('save', newApi)
    }
  } finally {
    isSaving.value = false
  }
}

// 通用测试执行器，避免重复的状态处理
async function runTest(
  action: () => Promise<void>,
  successMessage: () => string,
  failureMessage: (errorText: string) => string
) {
  isTesting.value = true
  testMessage.value = ''
  testSuccess.value = false

  try {
    await action()
    testMessage.value = successMessage()
    testSuccess.value = true
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : t('modals.apiItem.messages.defaultError')
    testMessage.value = failureMessage(errorMsg)
    testSuccess.value = false
  } finally {
    isTesting.value = false
  }
}

// 获取表单字段的去空格值，若为空则返回undefined
function valueOrEmpty(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed === '' ? undefined : trimmed
}

// 测试翻译 API（使用样例文本调用后端翻译能力）
async function handleTestTranslateApi() {
  const apiType = formData.value.apiType
  const sampleText = t('modals.apiItem.test.sampleText')
  let res = ''
  await runTest(
    async () => {
      res = await translateText(
          sampleText,
          'zh',
          apiType,
          valueOrEmpty(formData.value.apiKey),
          valueOrEmpty(formData.value.apiUrl),
          valueOrEmpty(formData.value.model)
        )
    },
    () => t('modals.apiItem.messages.testTranslateSuccess', { source: sampleText, result: res }),
    (errorMsg) => t('modals.apiItem.messages.testTranslateFailure', { error: errorMsg })
  )
}

// 测试分类 API（使用样例仓库信息调用后端分类能力）
async function handleTestClassifyApi() {
  const apiType: 'openai' = 'openai'
  const sampleDescription = t('modals.apiItem.test.sampleDescription')
  const sampleGroup = t('modals.apiItem.test.sampleGroup')
  await runTest(
    async () => {
      const result = await classifyRepository(
        'sample-repo',
        sampleDescription,
        [sampleGroup],
        apiType,
        valueOrEmpty(formData.value.apiKey),
        valueOrEmpty(formData.value.apiUrl),
        valueOrEmpty(formData.value.model)
      )
      console.log(t('modals.apiItem.logs.classifyResult'), result)
    },
    () => t('modals.apiItem.messages.testClassifySuccess'),
    (errorMsg) => t('modals.apiItem.messages.testClassifyFailure', { error: errorMsg })
  )
}

// 取消
function handleCancel() {
  emit('cancel')
}

// 删除
function handleDelete() {
  if (!props.editingApi) return
  emit('delete', props.editingApi.id)
}

// 重置表单
function resetForm() {
  if (props.editingApi) {
    // 编辑模式：加载现有数据
    formData.value = {
      name: props.editingApi.name,
      apiKey: props.editingApi.apiKey || '',
      apiUrl: props.editingApi.apiUrl || '',
      model: props.editingApi.model || '',
      description: props.editingApi.description || '',
      tags: props.editingApi.tags || [],
      apiType: props.editingApi.apiType ,
    }
  } else {
    // 创建模式：重置为默认值
    formData.value = {
      name: '',
      apiKey: '',
      apiUrl: '',
      model: '',
      description: '',
      tags: [],
      apiType: 'openai', 
    }
  }
  errorMessage.value = ''
  testMessage.value = ''
  testSuccess.value = false
  isTesting.value = false
}

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

// 监听 editingApi 变化
watch(() => props.editingApi, () => {
  if (props.visible) {
    resetForm()
  }
})
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
