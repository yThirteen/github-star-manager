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
                {{ editingApi ? t('modals.provider.title.edit') : t('modals.provider.title.create') }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ t('modals.provider.subtitle') }}
              </p>
            </div>

            <!-- 内容 -->
            <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1" @input="touched = true" @change="touched = true">
              <!-- 提供方预设（仅新建时可选） -->
              <div v-if="!editingApi">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.provider.presetLabel') }}
                </label>
                <select
                  v-model="form.presetId"
                  @change="handlePresetChange"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{{ t('modals.provider.presetPlaceholder') }}</option>
                  <option v-for="preset in PROVIDER_PRESETS" :key="preset.id" :value="preset.id">
                    {{ preset.label }}
                  </option>
                </select>
              </div>

              <!-- API 密钥（主字段） -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t('modals.provider.fields.apiKey') }}
                </label>
                <input
                  v-model="form.apiKey"
                  type="password"
                  autocomplete="off"
                  :placeholder="apiKeyPlaceholder"
                  class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ apiKeyHint }}</p>
              </div>

              <!-- 自定义设置 -->
              <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  @click="showAdvanced = !showAdvanced"
                  class="w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>{{ t('modals.provider.sections.advanced') }}</span>
                  <span class="text-xs text-gray-400">{{ showAdvanced ? '▲' : '▼' }}</span>
                </button>

                <div v-show="showAdvanced" class="px-4 py-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
                  <!-- 显示名称 -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {{ t('modals.provider.fields.name') }}
                      <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="form.name"
                      :placeholder="t('modals.provider.placeholders.name')"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('modals.provider.hints.name') }}</p>
                  </div>

                  <!-- API 协议 -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {{ t('modals.provider.fields.apiType') }}
                    </label>
                    <select
                      v-model="form.apiType"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option
                        v-for="protocol in API_PROTOCOLS"
                        :key="protocol.value"
                        :value="protocol.value"
                      >
                        {{ t(`modals.provider.apiTypes.${protocol.value}`) }}
                      </option>
                    </select>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('modals.provider.hints.apiType') }}</p>
                  </div>

                  <!-- API 地址 -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {{ t('modals.provider.fields.apiUrl') }}
                    </label>
                    <input
                      v-model="form.apiUrl"
                      :placeholder="t('modals.provider.placeholders.apiUrl')"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('modals.provider.hints.apiUrl') }}</p>
                  </div>

                  <!-- 模型 -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {{ t('modals.provider.fields.model') }}
                    </label>
                    <div class="flex gap-2">
                      <input
                        v-model="form.model"
                        :placeholder="t('modals.provider.placeholders.model')"
                        class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        @click="handleFetchModels"
                        :disabled="isFetching || !protocolRequiresModel"
                        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {{ isFetching ? t('modals.provider.buttons.fetchingModels') : t('modals.provider.buttons.fetchModels') }}
                      </button>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('modals.provider.hints.model') }}</p>
                    <p v-if="fetchMessage" class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ fetchMessage }}</p>
                    <div
                      v-if="fetchedModels.length"
                      class="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <button
                        v-for="item in fetchedModels"
                        :key="item"
                        type="button"
                        @click="form.model = item"
                        :class="[
                          'block w-full text-left px-3 py-1.5 text-sm transition-colors',
                          form.model === item
                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        ]"
                      >
                        {{ item }}
                      </button>
                    </div>
                  </div>

                  <!-- 描述 -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {{ t('modals.provider.fields.description') }}
                    </label>
                    <textarea
                      v-model="form.description"
                      rows="2"
                      :placeholder="t('modals.provider.placeholders.description')"
                      class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- 校验提示 -->
              <p v-if="inlineError" class="text-sm text-red-600 dark:text-red-400">{{ inlineError }}</p>

              <!-- 测试结果 -->
              <p
                v-if="testMessage"
                :class="[
                  'text-sm',
                  testSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                ]"
              >
                {{ testMessage }}
              </p>
            </div>

            <!-- 按钮 -->
            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-between">
              <div class="flex gap-2">
                <button
                  @click="handleTestTranslateApi"
                  :disabled="isTesting"
                  class="px-4 py-2 border border-orange-300 dark:border-orange-600 rounded-lg text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isTesting">{{ t('status.testing') }}</span>
                  <span v-else>{{ t('modals.provider.buttons.testTranslate') }}</span>
                </button>
                <button
                  @click="handleTestClassifyApi"
                  :disabled="isTesting"
                  class="px-4 py-2 border border-indigo-300 dark:border-indigo-600 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="isTesting">{{ t('status.testing') }}</span>
                  <span v-else>{{ t('modals.provider.buttons.testClassify') }}</span>
                </button>
              </div>
              <div class="flex gap-3">
                <button
                  v-if="editingApi"
                  @click="handleDelete"
                  :disabled="isTesting"
                  class="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ t('common.delete') }}
                </button>
                <button
                  @click="emit('cancel')"
                  class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  @click="handleSave"
                  :disabled="!canSave"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {{ editingApi ? t('common.save') : t('common.create') }}
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
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { API_PROTOCOLS, getApiProtocol, type ApiItem, type ApiType } from '../types/ai'
import { PROVIDER_PRESETS } from '../utils/providerPresets'
import { formatApiKey } from '../utils/aiConfig'
import { classifyRepository, listProviderModels, toErrorMessage, translateText } from '../utils/ai'

interface ProviderForm {
  presetId: string
  name: string
  apiType: ApiType
  apiKey: string
  apiUrl: string
  model: string
  description: string
}

const props = defineProps<{
  visible: boolean
  editingApi?: ApiItem | null
}>()

const emit = defineEmits<{
  (e: 'create', provider: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>): void
  (e: 'update', id: string, updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>>): void
  (e: 'cancel'): void
  (e: 'delete', id: string): void
}>()

const { t } = useI18n()

function emptyForm(): ProviderForm {
  return {
    presetId: '',
    name: '',
    apiType: 'openai',
    apiKey: '',
    apiUrl: '',
    model: '',
    description: '',
  }
}

const form = ref<ProviderForm>(emptyForm())
const showAdvanced = ref(false)
const touched = ref(false)
const testMessage = ref('')
const testSuccess = ref(false)
const isTesting = ref(false)
const fetchedModels = ref<string[]>([])
const fetchMessage = ref('')
const isFetching = ref(false)

const editingApi = computed(() => props.editingApi ?? null)

const selectedPreset = computed(() =>
  PROVIDER_PRESETS.find((preset) => preset.id === form.value.presetId)
)

/** 当前选中的协议定义：决定哪些字段必填、能否做分类测试 */
const currentProtocol = computed(() => getApiProtocol(form.value.apiType))
const protocolRequiresKey = computed(() => currentProtocol.value?.requiresKey ?? true)
const protocolRequiresModel = computed(() => currentProtocol.value?.requiresModel ?? true)

const apiHasStoredKey = computed(() => Boolean(props.editingApi?.apiKey?.trim()))

/** 测试与保存时真正使用的密钥：输入框优先，编辑态留空则沿用已存密钥 */
const effectiveApiKey = computed(
  () => form.value.apiKey.trim() || props.editingApi?.apiKey?.trim() || ''
)

const apiKeyPlaceholder = computed(() =>
  props.editingApi && apiHasStoredKey.value
    ? formatApiKey(props.editingApi.apiKey)
    : t('modals.provider.placeholders.apiKey')
)

const apiKeyHint = computed(() => {
  if (props.editingApi && apiHasStoredKey.value) {
    return t('modals.provider.hints.apiKeyStored')
  }
  if (!protocolRequiresKey.value) {
    return t('modals.provider.hints.apiKeyOptional')
  }
  return t('modals.provider.hints.apiKey')
})

const validationError = computed<string | null>(() => {
  if (!form.value.name.trim()) {
    return 'nameRequired'
  }

  const key = form.value.apiKey.trim()
  if (key && (/\s/.test(key) || /^["'`]|["'`]$/.test(key))) {
    return 'keyInvalid'
  }

  const protocol = currentProtocol.value
  if (!protocol) {
    return 'apiTypeRequired'
  }
  if (protocol.requiresKey && !key && !apiHasStoredKey.value) {
    return 'apiKeyRequired'
  }
  if (protocol.requiresUrl && !form.value.apiUrl.trim()) {
    return 'apiUrlRequired'
  }
  if (protocol.requiresModel && !form.value.model.trim()) {
    return 'modelRequired'
  }
  return null
})

const canSave = computed(() => validationError.value === null)

/** 用户动过表单之后才提示，避免一打开就报错 */
const inlineError = computed(() =>
  touched.value && validationError.value
    ? t(`modals.provider.errors.${validationError.value}`)
    : ''
)

function resetForm() {
  touched.value = false
  testMessage.value = ''
  testSuccess.value = false
  fetchedModels.value = []
  fetchMessage.value = ''

  const editing = props.editingApi
  if (editing) {
    form.value = {
      presetId: '',
      name: editing.name,
      apiType: editing.apiType,
      apiKey: '',
      apiUrl: editing.apiUrl ?? '',
      model: editing.model ?? '',
      description: editing.description ?? '',
    }
    showAdvanced.value = true
  } else {
    form.value = emptyForm()
    showAdvanced.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

watch(
  () => props.editingApi,
  () => {
    if (props.visible) {
      resetForm()
    }
  }
)

function handlePresetChange() {
  touched.value = true
  const preset = selectedPreset.value
  if (!preset) {
    return
  }
  form.value.apiType = preset.apiType
  form.value.apiUrl = preset.apiUrl
  form.value.model = preset.model
  form.value.name = preset.label
  fetchedModels.value = []
  fetchMessage.value = ''
}

async function handleFetchModels() {
  if (isFetching.value) {
    return
  }

  const apiUrl = form.value.apiUrl.trim()
  if (!apiUrl) {
    fetchMessage.value = t('modals.provider.messages.fetchNeedUrl')
    return
  }

  isFetching.value = true
  fetchedModels.value = []
  fetchMessage.value = ''
  try {
    const models = await listProviderModels(
      form.value.apiType,
      apiUrl,
      effectiveApiKey.value
    )
    fetchedModels.value = models
    fetchMessage.value = models.length
      ? t('modals.provider.messages.fetchSuccess', { count: models.length })
      : t('modals.provider.messages.fetchEmpty')
  } catch (error) {
    fetchMessage.value = t('modals.provider.messages.fetchFailed', {
      error: toErrorMessage(error),
    })
  } finally {
    isFetching.value = false
  }
}

async function handleTestTranslateApi() {
  if (isTesting.value) {
    return
  }

  isTesting.value = true
  testMessage.value = ''
  try {
    const sample = t('modals.provider.test.sampleText')
    const result = await translateText(
      sample,
      'zh',
      form.value.apiType,
      effectiveApiKey.value,
      form.value.apiUrl.trim(),
      form.value.model.trim()
    )
    testSuccess.value = true
    testMessage.value = t('modals.provider.messages.testTranslateSuccess', {
      source: sample,
      result,
    })
  } catch (error) {
    testSuccess.value = false
    testMessage.value = t('modals.provider.messages.testTranslateFailure', {
      error: toErrorMessage(error),
    })
  } finally {
    isTesting.value = false
  }
}

async function handleTestClassifyApi() {
  if (isTesting.value) {
    return
  }

  isTesting.value = true
  testMessage.value = ''
  try {
    await classifyRepository(
      'example/repository',
      t('modals.provider.test.sampleDescription'),
      [t('modals.provider.test.sampleGroup')],
      form.value.apiType,
      effectiveApiKey.value,
      form.value.apiUrl.trim(),
      form.value.model.trim()
    )
    testSuccess.value = true
    testMessage.value = t('modals.provider.messages.testClassifySuccess')
  } catch (error) {
    testSuccess.value = false
    testMessage.value = t('modals.provider.messages.testClassifyFailure', {
      error: toErrorMessage(error),
    })
  } finally {
    isTesting.value = false
  }
}

function handleSave() {
  touched.value = true
  if (!canSave.value) {
    return
  }

  const base = {
    name: form.value.name.trim(),
    apiType: form.value.apiType,
    apiUrl: form.value.apiUrl.trim(),
    model: form.value.model.trim(),
    description: form.value.description.trim(),
  }
  const key = form.value.apiKey.trim()

  if (props.editingApi) {
    const updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>> = { ...base }
    if (key) {
      updates.apiKey = key
    }
    emit('update', props.editingApi.id, updates)
  } else {
    emit('create', { ...base, apiKey: key })
  }
}

function handleDelete() {
  if (props.editingApi) {
    emit('delete', props.editingApi.id)
  }
}
</script>
