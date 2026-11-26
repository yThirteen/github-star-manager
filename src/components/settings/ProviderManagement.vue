<template>
  <div class="space-y-6">
    <!-- 页头 -->
    <div>
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ t('settings.providers.title') }}
        </h2>
        <button
          @click="handleShowHelp"
          :title="t('settings.providers.help.tooltip')"
          class="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ?
        </button>
        <button
          @click="handleAddProvider"
          class="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {{ t('settings.providers.add') }}
        </button>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {{ t('settings.providers.subtitle') }}
      </p>
    </div>

    <!-- 加载中 -->
    <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('status.loading') }}
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!apiItems.length"
      class="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      {{ t('settings.providers.empty') }}
    </div>

    <!-- 供应商列表 -->
    <div
      v-else
      class="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700"
    >
      <div
        v-for="api in apiItems"
        :key="api.id"
        class="px-6 py-4 flex items-start justify-between gap-4"
      >
        <div class="flex items-start gap-3 min-w-0">
          <span
            class="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0"
            :class="isUsable(api) ? 'bg-green-500' : 'bg-red-500'"
            :title="isUsable(api) ? t('settings.providers.configured') : t('settings.providers.notConfigured')"
          ></span>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ api.name }}</span>
              <span
                class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                {{ getApiProtocol(api.apiType) ? t(`settings.providers.types.${api.apiType}`) : api.apiType }}
              </span>
              <span
                v-if="isDefaultProvider(api)"
                class="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
              >
                {{ t('settings.providers.defaultBadge') }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
              {{ providerSummary(api) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            v-if="!isDefaultProvider(api)"
            @click="settingsStore.setDefaultProviderId_store(api.id)"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {{ t('settings.providers.setDefault') }}
          </button>
          <button
            v-else
            @click="settingsStore.setDefaultProviderId_store(null)"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {{ t('settings.providers.unsetDefault') }}
          </button>
          <button
            @click="handleEditProvider(api)"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {{ t('settings.providers.edit') }}
          </button>
          <button
            @click="handleDeleteProvider(api.id)"
            class="px-3 py-1.5 text-sm border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
          >
            {{ t('settings.providers.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 供应商编辑弹窗 -->
    <ProviderModal
      :visible="showProviderModal"
      :editing-api="editingApi"
      @create="handleCreateProvider"
      @update="handleUpdateProvider"
      @cancel="handleProviderCancel"
      @delete="handleDeleteProvider"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApiItem } from '../../types/ai'
import { getApiProtocol } from '../../types/ai'
import { providerProblem } from '../../utils/aiConfig'
import { useSettingsStore } from '../../stores/settingsStore'
import { useDialog } from '../../composables/useDialog'
import { toErrorMessage } from '../../utils/ai'
import ProviderModal from '../ProviderModal.vue'

const { t, tm } = useI18n()

const settingsStore = useSettingsStore()
const { confirm, alert } = useDialog()

const isLoading = ref(true)
const showProviderModal = ref(false)
const editingApi = ref<ApiItem | null>(null)

const apiItems = computed(() => settingsStore.getApiItems())

/** 供应商是否可用（必填项齐全即为可用） */
function isUsable(api: ApiItem): boolean {
  return providerProblem(api) === null
}

function isDefaultProvider(api: ApiItem): boolean {
  return settingsStore.defaultProviderId === api.id
}

/** 列表副标题：接口地址与模型，缺失时提示配置不完整 */
function providerSummary(api: ApiItem): string {
  const parts = [api.apiUrl?.trim(), api.model?.trim()].filter(Boolean) as string[]
  return parts.length ? parts.join(' · ') : t('settings.providers.notConfigured')
}

function handleAddProvider() {
  editingApi.value = null
  showProviderModal.value = true
}

function handleEditProvider(api: ApiItem) {
  editingApi.value = api
  showProviderModal.value = true
}

function handleProviderCancel() {
  showProviderModal.value = false
  editingApi.value = null
}

async function showSaveError(error: unknown) {
  await alert({
    title: t('settings.providers.dialogs.saveError.title'),
    message: toErrorMessage(error) || t('settings.providers.dialogs.saveError.message'),
    icon: '⚠️',
    buttonText: t('common.confirm'),
  })
}

async function handleCreateProvider(provider: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    await settingsStore.addApiItem(provider)
    handleProviderCancel()
  } catch (error) {
    await showSaveError(error)
  }
}

async function handleUpdateProvider(id: string, updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>>) {
  try {
    await settingsStore.updateApiItem_store(id, updates)
    handleProviderCancel()
  } catch (error) {
    await showSaveError(error)
  }
}

async function handleDeleteProvider(id: string) {
  const target = apiItems.value.find((api) => api.id === id)
  if (!target) {
    return
  }

  const confirmed = await confirm({
    title: t('settings.providers.dialogs.delete.title'),
    message: t('settings.providers.dialogs.delete.message', { name: target.name }),
    confirmText: t('settings.providers.dialogs.delete.confirm'),
    cancelText: t('common.cancel'),
    confirmButtonClass: 'bg-red-600 hover:bg-red-700',
  })
  if (!confirmed) {
    return
  }

  const success = await settingsStore.deleteApiItem_store(id)
  if (success) {
    handleProviderCancel()
  }
}

async function handleShowHelp() {
  const steps = (tm('settings.providers.help.steps') as string[]) || []
  await alert({
    title: t('settings.providers.help.title'),
    message: steps.join('\n\n'),
    icon: 'ℹ️',
    buttonText: t('settings.providers.help.button'),
  })
}

onMounted(async () => {
  try {
    await settingsStore.loadAIConfigs()
  } finally {
    isLoading.value = false
  }
})
</script>
