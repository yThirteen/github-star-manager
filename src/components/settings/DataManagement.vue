<template>
  <div class="space-y-6">
    <!-- 数据管理 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <span>{{ t('settings.dataManagement.title') }}</span>
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">{{ t('settings.dataManagement.subtitle') }}</span>
      </h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.dataManagement.sections.export.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.dataManagement.sections.export.description') }}
            </p>
          </div>
          <button
            @click="handleExport"
            :disabled="isExporting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isExporting">{{ t('status.exporting') }}</span>
            <span v-else>{{ t('settings.dataManagement.sections.export.button') }}</span>
          </button>
        </div>

        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.dataManagement.sections.import.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.dataManagement.sections.import.description') }}
            </p>
          </div>
          <button
            @click="handleImport"
            :disabled="isImporting"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isImporting">{{ t('status.importing') }}</span>
            <span v-else>{{ t('settings.dataManagement.sections.import.button') }}</span>
          </button>
        </div>

        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-red-600 dark:text-red-400">
              {{ t('settings.dataManagement.sections.clear.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.dataManagement.sections.clear.description') }}
            </p>
          </div>
          <button
            @click="handleClearData"
            :disabled="isClearing"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isClearing">{{ t('status.clearing') }}</span>
            <span v-else>{{ t('settings.dataManagement.sections.clear.button') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 导出数据 - 选择内容对话框 -->
    <div
      v-if="showExportDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <h3 class="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
          <span>{{ t('settings.dataManagement.dialogs.exportSelect.title') }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('settings.dataManagement.dialogs.exportSelect.subtitle') }}</span>
        </h3>

        <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <input
              id="export-star-data"
              type="checkbox"
              v-model="exportOptions.starData"
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="export-star-data" class="flex-1 cursor-pointer">
              <p class="font-semibold text-gray-900 dark:text-gray-100">
                {{ t('settings.dataManagement.dialogs.exportSelect.options.starData.title') }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('settings.dataManagement.dialogs.exportSelect.options.starData.desc') }}
              </p>
            </label>
          </div>

          <div class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <input
              id="export-api-config"
              type="checkbox"
              v-model="exportOptions.apiConfig"
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label for="export-api-config" class="flex-1 cursor-pointer">
              <p class="font-semibold text-gray-900 dark:text-gray-100">
                {{ t('settings.dataManagement.dialogs.exportSelect.options.apiConfig.title') }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('settings.dataManagement.dialogs.exportSelect.options.apiConfig.desc') }}
              </p>
            </label>
          </div>

          <div
            v-if="exportOptions.apiConfig"
            class="flex items-start gap-3 p-3 ml-7 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20"
          >
            <input
              id="export-include-api-keys"
              type="checkbox"
              v-model="exportOptions.includeApiKeys"
              class="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label for="export-include-api-keys" class="flex-1 cursor-pointer">
              <p class="font-semibold text-red-700 dark:text-red-300">
                {{ t('settings.dataManagement.dialogs.exportSelect.options.includeApiKeys.title') }}
              </p>
              <p class="text-sm text-red-600 dark:text-red-400">
                {{ t('settings.dataManagement.dialogs.exportSelect.options.includeApiKeys.desc') }}
              </p>
            </label>
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="cancelExportDialog"
            :disabled="isExporting"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            @click="confirmExport"
            :disabled="isExporting"
          >
            <span v-if="isExporting">{{ t('status.exporting') }}</span>
            <span v-else>{{ t('settings.dataManagement.dialogs.exportSelect.confirm') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 清空数据 - 选择内容对话框 -->
    <div
      v-if="showClearDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <span>{{ t('settings.dataManagement.dialogs.clearSelect.title') }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('settings.dataManagement.dialogs.clearSelect.subtitle') }}</span>
        </h3>

        <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <input
              id="clear-star-data"
              type="checkbox"
              v-model="clearOptions.starData"
              class="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label for="clear-star-data" class="flex-1 cursor-pointer">
              <p class="font-semibold text-gray-900 dark:text-gray-100">
                {{ t('settings.dataManagement.dialogs.clearSelect.options.starData.title') }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('settings.dataManagement.dialogs.clearSelect.options.starData.desc') }}
              </p>
            </label>
          </div>

          <div class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <input
              id="clear-api-config"
              type="checkbox"
              v-model="clearOptions.apiConfig"
              class="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label for="clear-api-config" class="flex-1 cursor-pointer">
              <p class="font-semibold text-gray-900 dark:text-gray-100">
                {{ t('settings.dataManagement.dialogs.clearSelect.options.apiConfig.title') }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t('settings.dataManagement.dialogs.clearSelect.options.apiConfig.desc') }}
              </p>
            </label>
          </div>

          <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <p class="font-semibold">{{ t('settings.dataManagement.dialogs.clearSelect.warningTitle') }}</p>
            <p class="mt-1 text-sm">{{ t('settings.dataManagement.dialogs.clearSelect.warningDesc') }}</p>
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="cancelClearDialog"
            :disabled="isClearing"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            @click="confirmClear"
            :disabled="isClearing"
          >
            <span v-if="isClearing">{{ t('status.clearing') }}</span>
            <span v-else>{{ t('settings.dataManagement.dialogs.clearSelect.confirm') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 导入数据确认对话框 -->
    <div
      v-if="showImportConfirmDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-4">
          {{ t('settings.dataManagement.dialogs.importConfirm.title') }}
        </h3>
        <div class="text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-2">
          <p class="font-semibold">{{ t('settings.dataManagement.dialogs.importConfirm.intro') }}</p>
          <p class="text-red-600 dark:text-red-400 font-semibold">
            {{ t('settings.dataManagement.dialogs.importConfirm.warning') }}
          </p>
          <div v-if="importDataPreview" class="mt-3 space-y-1">
            <p class="font-semibold">{{ t('settings.dataManagement.dialogs.importConfirm.previewTitle') }}</p>
            <ul class="list-disc list-inside ml-2 space-y-1">
              <li v-if="importDataPreview.stars > 0">{{ t('settings.dataManagement.dialogs.importConfirm.preview.stars', { count: importDataPreview.stars }) }}</li>
              <li v-if="importDataPreview.groups > 0">{{ t('settings.dataManagement.dialogs.importConfirm.preview.groups', { count: importDataPreview.groups }) }}</li>
              <li v-if="importDataPreview.tags > 0">{{ t('settings.dataManagement.dialogs.importConfirm.preview.tags', { count: importDataPreview.tags }) }}</li>
              <li v-if="importDataPreview.hasApiConfig && importDataPreview.apis !== undefined">{{ importDataPreview.apis }} 个 API 配置</li>
              <li v-if="importDataPreview.hasApiConfig && importDataPreview.apis === undefined">API 配置</li>
            </ul>
          </div>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="cancelImportConfirm"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            @click="confirmImport"
          >
            {{ t('settings.dataManagement.dialogs.importConfirm.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStarStore } from '../../stores/starStore'
import { exportData, selectImportFile, executeImport } from '../../utils/export'
import { clearData } from '../../utils/clearData'
import { useI18n } from 'vue-i18n'
import { useDialog } from '../../composables/useDialog'

const starStore = useStarStore()
const router = useRouter()
const { t } = useI18n()
const { alert: showAlert } = useDialog()

const isExporting = ref(false)
const isImporting = ref(false)
const isClearing = ref(false)

// 导出数据选择对话框状态
const showExportDialog = ref(false)
const exportOptions = ref({
  starData: true,
  apiConfig: false,
  // 默认不把 API Key 明文写进备份文件
  includeApiKeys: false,
})

// 清空数据选择对话框状态
const showClearDialog = ref(false)
const clearOptions = ref({
  starData: true,
  apiConfig: false,
})

// 导入数据确认对话框状态
const showImportConfirmDialog = ref(false)
const importDataPreview = ref<{
  stars: number
  groups: number
  tags: number
  apis?: number
  hasApiConfig?: boolean
} | null>(null)

// 存储待导入的数据
let pendingImportData: any = null

// 处理导出数据
function handleExport() {
  if (isExporting.value) return
  showExportDialog.value = true
}

// 取消导出对话框
function cancelExportDialog() {
  if (isExporting.value) return
  showExportDialog.value = false
}

// 确认导出
async function confirmExport() {
  if (isExporting.value) return

  if (!exportOptions.value.starData && !exportOptions.value.apiConfig) {
    await showAlert({
      title: t('settings.dataManagement.sections.export.title'),
      message: t('settings.dataManagement.dialogs.exportSelect.needSelect'),
      buttonText: t('common.confirm'),
      icon: '⚠️',
    })
    return
  }

  showExportDialog.value = false
  isExporting.value = true
  try {
    const success = await exportData({
      starData: exportOptions.value.starData,
      apiConfig: exportOptions.value.apiConfig,
      includeApiKeys: exportOptions.value.includeApiKeys,
    })
    if (success) {
      await showAlert({
        title: t('settings.dataManagement.sections.export.title'),
        message: t('settings.dataManagement.alerts.exportSuccess'),
        buttonText: t('common.confirm'),
      })
    }
  } catch (error) {
    console.error('Export failed:', error)
    const message = error instanceof Error ? error.message : t('settings.dataManagement.alerts.unknownError')
    await showAlert({
      title: t('settings.dataManagement.sections.export.title'),
      message: t('settings.dataManagement.alerts.exportFailed', { error: message }),
      buttonText: t('common.confirm'),
      icon: '⚠️',
    })
  } finally {
    isExporting.value = false
  }
}

// 处理导入数据
async function handleImport() {
  if (isImporting.value) return

  try {
    const data = await selectImportFile()
    if (!data) return

    pendingImportData = data
    
    // 构建预览信息
    const preview: any = {
      stars: data.stars ? data.stars.length : 0,
      groups: data.groups ? data.groups.length : 0,
      tags: data.tags ? data.tags.length : 0,
    }
    
    // 如果有 API 配置，添加相关信息
    if (data.apiConfig) {
      preview.hasApiConfig = true
      if (data.apiConfig.apis) {
        preview.apis = data.apiConfig.apis.length
      }
    }
    
    importDataPreview.value = preview
    showImportConfirmDialog.value = true
  } catch (error) {
    console.error('Selecting file failed:', error)
    const message = error instanceof Error ? error.message : t('settings.dataManagement.alerts.unknownError')
    await showAlert({
      title: t('settings.dataManagement.sections.import.title'),
      message: t('settings.dataManagement.alerts.selectFileFailed', { error: message }),
      buttonText: t('common.confirm'),
      icon: '⚠️',
    })
  }
}

// 取消导入确认
function cancelImportConfirm() {
  showImportConfirmDialog.value = false
  importDataPreview.value = null
  pendingImportData = null
}

// 确认导入
async function confirmImport() {
  if (!pendingImportData) return

  showImportConfirmDialog.value = false
  isImporting.value = true

  try {
    const success = await executeImport(pendingImportData)
    if (success) {
      await showAlert({
        title: t('settings.dataManagement.sections.import.title'),
        message: t('settings.dataManagement.alerts.importSuccess'),
        buttonText: t('common.confirm'),
      })
      router.push('/')
    }
  } catch (error) {
    console.error('Import failed:', error)
    const message = error instanceof Error ? error.message : t('settings.dataManagement.alerts.unknownError')
    await showAlert({
      title: t('settings.dataManagement.sections.import.title'),
      message: t('settings.dataManagement.alerts.importFailed', { error: message }),
      buttonText: t('common.confirm'),
      icon: '⚠️',
    })
  } finally {
    isImporting.value = false
    pendingImportData = null
    importDataPreview.value = null
  }
}

// 处理清空数据
function handleClearData() {
  if (isClearing.value) return
  showClearDialog.value = true
}

function cancelClearDialog() {
  if (isClearing.value) return
  showClearDialog.value = false
}

async function confirmClear() {
  if (isClearing.value) return

  if (!clearOptions.value.starData && !clearOptions.value.apiConfig) {
    await showAlert({
      title: t('settings.dataManagement.sections.clear.title'),
      message: t('settings.dataManagement.dialogs.clearSelect.needSelect'),
      buttonText: t('common.confirm'),
      icon: '⚠️',
    })
    return
  }

  isClearing.value = true
  try {
    await clearData({
      starData: clearOptions.value.starData,
      apiConfig: clearOptions.value.apiConfig,
    })

    if (clearOptions.value.starData) {
      await starStore.reload()
    }

    await showAlert({
      title: t('settings.dataManagement.sections.clear.title'),
      message: t('settings.dataManagement.alerts.clearSuccess'),
      buttonText: t('common.confirm'),
    })

    showClearDialog.value = false
  } catch (error) {
    console.error('清空数据失败:', error)
    const message = error instanceof Error ? error.message : t('settings.dataManagement.alerts.unknownError')
    await showAlert({
      title: t('settings.dataManagement.sections.clear.title'),
      message: t('settings.dataManagement.alerts.clearFailed', { error: message }),
      buttonText: t('common.confirm'),
      icon: '⚠️',
    })
  } finally {
    isClearing.value = false
  }
}
</script>

