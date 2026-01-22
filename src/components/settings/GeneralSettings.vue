<template>
  <div class="space-y-6">
    <!-- 常规设置 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <span>{{ t('settings.general.title') }}</span>
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">{{ t('settings.general.subtitle') }}</span>
      </h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.language.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.language.description') }}
            </p>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <select
              :value="settingsStore.language"
              @change="handleLanguageChange"
              class="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="option in localeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- 打开链接确认 -->
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.items.linkConfirm.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.items.linkConfirm.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              :checked="!settingsStore.skipLinkConfirm"
              @change="handleLinkConfirmChange"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <!-- 删除标签确认 -->
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.items.tagDelete.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.items.tagDelete.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              :checked="!settingsStore.skipTagDeleteConfirm"
              @change="handleTagDeleteConfirmChange"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <!-- 删除分组确认 -->
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.items.groupDelete.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.items.groupDelete.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              :checked="!settingsStore.skipGroupDeleteConfirm"
              @change="handleGroupDeleteConfirmChange"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <!-- 同步后提示星标变化 -->
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.items.starDeltaPrompt.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.items.starDeltaPrompt.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              :checked="!settingsStore.skipStarDeltaPrompt"
              @change="handleStarDeltaPromptChange"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div
          v-if="settingsStore.skipStarDeltaPrompt"
          class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
        >
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.items.starDeltaAuto.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.items.starDeltaAuto.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              :checked="settingsStore.starDeltaAutoShow"
              @change="handleStarDeltaAutoShowChange"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
              {{ t('settings.general.items.maxFolderDepth.title') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ t('settings.general.items.maxFolderDepth.description') }}
            </p>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <input
              type="number"
              min="1"
              max="6"
              step="1"
              :value="settingsStore.maxFolderDepth"
              @change="handleMaxFolderDepthChange"
              class="w-20 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-right text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ t('settings.general.items.maxFolderDepth.unit') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, type AppLocale } from '../../plugins/i18n'
import { useSettingsStore } from '../../stores/settingsStore'

const settingsStore = useSettingsStore()
const { t } = useI18n()

const localeOptions = computed(() => SUPPORTED_LOCALES.map((item) => ({
  value: item.value,
  label: t(`settings.general.languageOptions.${item.value}`),
})))

// 处理打开链接确认设置变更
function handleLinkConfirmChange(event: Event) {
  const target = event.target as HTMLInputElement
  settingsStore.setSkipLinkConfirm(!target.checked)
}

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const value = target.value as AppLocale
  if (value !== settingsStore.language) {
    settingsStore.setLanguage(value)
  }
}

// 处理删除标签确认设置变更
function handleTagDeleteConfirmChange(event: Event) {
  const target = event.target as HTMLInputElement
  settingsStore.setSkipTagDeleteConfirm(!target.checked)
}

// 处理删除分组确认设置变更
function handleGroupDeleteConfirmChange(event: Event) {
  const target = event.target as HTMLInputElement
  settingsStore.setSkipGroupDeleteConfirm(!target.checked)
}

function handleStarDeltaPromptChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    settingsStore.setSkipStarDeltaPrompt(false)
    settingsStore.setStarDeltaAutoShow(false)
  } else {
    settingsStore.setSkipStarDeltaPrompt(true)
    settingsStore.setStarDeltaAutoShow(true)
  }
}

function handleStarDeltaAutoShowChange(event: Event) {
  const target = event.target as HTMLInputElement
  settingsStore.setStarDeltaAutoShow(target.checked)
}

function handleMaxFolderDepthChange(event: Event) {
  const target = event.target as HTMLInputElement
  settingsStore.setMaxFolderDepth(Number(target.value))
  target.value = String(settingsStore.maxFolderDepth)
}
</script>

