<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t('settings.apiManagement.title') }}</h2>
        <button
          type="button"
          class="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          @click="handleShowApiHelp"
          :title="t('settings.apiManagement.help.tooltip')"
          :aria-label="t('settings.apiManagement.help.tooltip')"
        >
          ?
        </button>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {{ t('settings.apiManagement.subtitle') }}
      </p>
    </div>

    <!-- 模块配置 -->
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {{ t('settings.apiManagement.moduleConfig.title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ t('settings.apiManagement.moduleConfig.subtitle') }}
          </p>
        </div>
        <button
          @click="handleAddApi"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          {{ t('settings.apiManagement.moduleConfig.add') }}
        </button>
      </div>

      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div
          v-for="module in modules"
          :key="module.id"
          class="px-6 py-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ module.icon }}</span>
                <div>
                  <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {{ getModuleDisplayName(module.id) }}
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ getModuleDisplayDescription(module.id) }}
                  </p>
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ t('settings.apiManagement.selectLabel') }}
                </label>
                <div class="flex gap-2">
                  <select
                    :value="getModuleApiId(module.id)"
                    @change="(e) => handleModuleApiChange(module.id, (e.target as HTMLSelectElement).value)"
                    class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{{ t('settings.apiManagement.optionNone') }}</option>
                    <option
                      v-for="api in getAvailableApisForModule(module.id)"
                      :key="api.id"
                      :value="api.id"
                    >
                      {{ api.name }}
                    </option>
                  </select>
                  <button
                    @click="handleEditSelectedApi(module.id)"
                    :disabled="!getModuleApiId(module.id)"
                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ t('common.edit') }}
                  </button>
                  <button
                    @click="handleDeleteSelectedApi(module.id)"
                    :disabled="!getModuleApiId(module.id)"
                    class="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </div>

              <div class="mt-3 flex items-center">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="isModuleEnabled(module.id)"
                    :disabled="!getModuleApiId(module.id)"
                    @change="(e) => handleModuleEnabledChange(module.id, (e.target as HTMLInputElement).checked)"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  <span class="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                    {{ isModuleEnabled(module.id) ? t('settings.apiManagement.status.enabled') : t('settings.apiManagement.status.disabled') }}
                  </span>
                </label>
                <p v-if="!getModuleApiId(module.id)" class="ml-4 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('settings.apiManagement.status.selectFirst') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- API 编辑/创建模态框 -->
    <ApiItemModal
      :visible="showApiModal"
      :editing-api="editingApi"
      @save="handleApiSave"
      @cancel="handleApiCancel"
      @delete="handleApiDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApiItem, AIModule, AIModuleConfig } from '../../types/ai'
import { AI_MODULES } from '../../types/ai'
import { useSettingsStore } from '../../stores/settingsStore'
import { useDialog } from '../../composables/useDialog'
// import { formatApiKey } from '../../utils/aiConfig'
import ApiItemModal from '../ApiItemModal.vue'

const { t, tm } = useI18n()

const settingsStore = useSettingsStore()
const { confirm, alert } = useDialog()

const isLoading = ref(true)
const showApiModal = ref(false)
const editingApi = ref<ApiItem | null>(null)
const creatingForModule = ref<AIModule | null>(null)

// API 列表
const apiItems = computed(() => settingsStore.getApiItems())

// 模块列表
const modules = computed(() => Object.values(AI_MODULES))

// 模块配置
const moduleConfigs = computed(() => settingsStore.getModuleConfigs())

// 格式化日期
/* function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
} */

// 获取 API 使用情况
function getApiUsage(apiId: string): AIModule[] {
  return moduleConfigs.value
    .filter((config: AIModuleConfig) => config.apiId === apiId)
    .map((config: AIModuleConfig) => config.module)
}

function getModuleDisplayName(module: AIModule): string {
  const key = `settings.apiManagement.modules.${module}.name`
  const fallback = AI_MODULES[module]?.name || module
  return t(key, fallback)
}

function getModuleDisplayDescription(module: AIModule): string {
  const key = `settings.apiManagement.modules.${module}.description`
  const fallback = AI_MODULES[module]?.description || ''
  return t(key, fallback)
}

function formatModuleList(modules: AIModule[]): string {
  const separator = t('settings.apiManagement.listSeparator', '、')
  return modules.map(m => getModuleDisplayName(m)).join(separator)
}

// 获取模块的 API ID
function getModuleApiId(module: AIModule): string {
  const config = moduleConfigs.value.find((c: AIModuleConfig) => c.module === module)
  return config?.apiId || ''
}

// 模块是否启用
function isModuleEnabled(module: AIModule): boolean {
  const config = moduleConfigs.value.find((c: AIModuleConfig) => c.module === module)
  return config?.enabled || false
}

// 获取模块可用的 API 列表
function getAvailableApisForModule(module: AIModule): ApiItem[] {
  return apiItems.value.filter((api: ApiItem) => {
    // 分类模块仅支持兼容 OpenAI 接口的实现
    if (module === 'classify' && api.apiType !== 'openai') {
      return false
    }
    // 没有 tags 视为兼容所有模块（兼容旧数据）
    if (!api.tags || api.tags.length === 0) return true
    return api.tags.includes(module)
  })
}

// 添加 API
function handleAddApi() {
  editingApi.value = null
  creatingForModule.value = null
  showApiModal.value = true
}

// 为指定模块添加 API
/* function handleAddApiForModule(module: AIModule) {
  editingApi.value = null
  creatingForModule.value = module
  showApiModal.value = true
}
 */
// 编辑 API
function handleEditApi(api: ApiItem) {
  editingApi.value = api
  showApiModal.value = true
}

// 编辑选中的 API
function handleEditSelectedApi(module: AIModule) {
  const apiId = getModuleApiId(module)
  if (!apiId) return
  
  const api = apiItems.value.find((a: ApiItem) => a.id === apiId)
  if (api) {
    handleEditApi(api)
  }
}

// 删除 API
async function handleApiDelete(apiId: string) {
  const api = apiItems.value.find((a: ApiItem) => a.id === apiId)
  if (!api) return

  const usage = getApiUsage(api.id)
  const message = usage.length > 0
    ? t('settings.apiManagement.dialogs.delete.messageWithUsage', { name: api.name, modules: formatModuleList(usage) })
    : t('settings.apiManagement.dialogs.delete.message', { name: api.name })

  const confirmed = await confirm({
    title: t('settings.apiManagement.dialogs.delete.title'),
    message,
    confirmText: t('settings.apiManagement.dialogs.delete.confirm'),
    cancelText: t('common.cancel'),
    confirmButtonClass: 'bg-red-600 hover:bg-red-700',
  })

  if (confirmed) {
    await settingsStore.deleteApiItem_store(api.id)
    showApiModal.value = false
    editingApi.value = null
  }
}

// 删除已选中的 API（基于模块）
async function handleDeleteSelectedApi(module: AIModule) {
  const apiId = getModuleApiId(module)
  if (!apiId) return
  await handleApiDelete(apiId)
}

// 保存 API
async function handleApiSave(data: any) {
  try {
    let newApiId: string
    
    if ('id' in data) {
      // 编辑模式
      await settingsStore.updateApiItem_store(data.id, data.updates)
      newApiId = data.id
    } else {
      // 创建模式
      const newApi = await settingsStore.addApiItem(data)
      newApiId = newApi.id
    }
    
    // 如果是在模块上下文中创建的，自动分配给该模块
    if (creatingForModule.value && !('id' in data)) {
      // const moduleConfig = moduleConfigs.value.find((c: AIModuleConfig) => c.module === creatingForModule.value)
      await settingsStore.saveModuleConfig_store({
        module: creatingForModule.value,
        apiId: newApiId,
        enabled: true, // 自动启用
      })
    }
    
    showApiModal.value = false
    creatingForModule.value = null
  } catch (error) {
    console.error('保存 API 失败:', error)
  }
}

// 取消 API 编辑
function handleApiCancel() {
  showApiModal.value = false
  editingApi.value = null
}

// 显示 API 使用说明
async function handleShowApiHelp() {
  const steps = (tm('settings.apiManagement.help.steps') as string[]) || []
  const helpMessage = steps.join('\n\n')

  await alert({
    title: t('settings.apiManagement.help.title'),
    message: helpMessage,
    icon: 'ℹ️',
    buttonText: t('settings.apiManagement.help.button'),
  })
}

// 模块 API 变更
async function handleModuleApiChange(module: AIModule, apiId: string) {
  const config = moduleConfigs.value.find((c: AIModuleConfig) => c.module === module)
  await settingsStore.saveModuleConfig_store({
    module,
    apiId: apiId || null,
    enabled: apiId ? (config?.enabled || false) : false,
  })
}

// 模块启用状态变更
async function handleModuleEnabledChange(module: AIModule, enabled: boolean) {
  const config = moduleConfigs.value.find((c: AIModuleConfig) => c.module === module)
  if (config?.apiId) {
    await settingsStore.saveModuleConfig_store({
      module,
      apiId: config.apiId,
      enabled,
    })
  }
}

// 初始化
onMounted(async () => {
  try {
    await settingsStore.loadAIConfigs()
  } finally {
    isLoading.value = false
  }
})
</script>
