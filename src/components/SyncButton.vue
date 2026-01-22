<template>
  <div>
    <button
      :disabled="isLoading"
      :class="[
        'px-4 py-2 rounded-lg font-medium transition-colors',
        isLoading
          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      ]"
      @click="handleSync"
    >
      {{ isLoading ? t('sync.button.loading') : t('sync.button.start') }}
    </button>
    
    <!-- Token 输入对话框（简化版，后续可改为设置页面） -->
    <div
      v-if="showTokenInput"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-semibold mb-4">{{ t('sync.tokenModal.title') }}</h3>
        <input
          v-model="token"
          type="password"
          :placeholder="t('sync.tokenModal.placeholder')"
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
        />
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            @click="closeTokenModal"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="showTokenGuide = true"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            {{ t('settings.userManagement.token.form.getToken') }}
          </button>
          <button
            :disabled="isVerifyingToken"
            :class="[
              'px-4 py-2 rounded-lg text-white transition-colors',
              isVerifyingToken ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            ]"
            @click="confirmSync"
          >
            {{ isVerifyingToken ? t('sync.tokenModal.verifying') : t('sync.tokenModal.confirm') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Token 获取引导对话框 -->
    <div
      v-if="showTokenGuide"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ t('settings.userManagement.guide.title') }}
          </h3>
          <button
            @click="showTokenGuide = false"
            class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            :aria-label="t('common.close')"
          >
            ✕
          </button>
        </div>
        
        <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p class="font-medium text-blue-900 dark:text-blue-200 mb-2">{{ t('settings.userManagement.guide.intro.title') }}</p>
            <p class="text-blue-800 dark:text-blue-300">
              {{ t('settings.userManagement.guide.intro.body') }}
            </p>
          </div>

          <div>
            <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('settings.userManagement.guide.step1.title') }}</h4>
            <p class="mb-2">{{ t('settings.userManagement.guide.step1.description') }}</p>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {{ t('settings.userManagement.guide.buttons.openSettings') }}
            </a>
          </div>
          
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('settings.userManagement.guide.step2.title') }}</h4>
            <ol class="list-decimal list-inside space-y-2 ml-2">
              <li v-for="(item, index) in guideStep2Items" :key="`step2-${index}`" v-html="item"></li>
            </ol>
          </div>
          
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('settings.userManagement.guide.step3.title') }}</h4>
            <ol class="list-decimal list-inside space-y-2 ml-2">
              <li v-html="t('settings.userManagement.guide.step3.items.name')"></li>
              <li v-html="t('settings.userManagement.guide.step3.items.expiration')"></li>
              <li>
                {{ t('settings.userManagement.guide.step3.items.scopes.intro') }}
                <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li v-for="(scope, index) in guideStep3Scopes" :key="`scope-${index}`" v-html="scope"></li>
                </ul>
              </li>
            </ol>
          </div>
          
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('settings.userManagement.guide.step4.title') }}</h4>
            <ol class="list-decimal list-inside space-y-2 ml-2">
              <li v-for="(item, index) in guideStep4Items" :key="`step4-${index}`" v-html="item"></li>
            </ol>
          </div>
          
          <div>
            <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('settings.userManagement.guide.step5.title') }}</h4>
            <p>{{ t('settings.userManagement.guide.step5.description') }}</p>
          </div>
          
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p class="font-medium text-yellow-900 dark:text-yellow-200 mb-1">{{ t('settings.userManagement.guide.security.title') }}</p>
            <ul class="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-300 ml-2">
              <li v-for="(item, index) in guideSecurityItems" :key="`security-${index}`">{{ item }}</li>
            </ul>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end gap-2">
          <button
            @click="showTokenGuide = false"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {{ t('common.close') }}
          </button>
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {{ t('settings.userManagement.guide.buttons.openSettings') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StarItem } from '../types/star'
import { useStarStore } from '../stores/starStore'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useDialog } from '../composables/useDialog'
import { fetchStars } from '../utils/github'
import {
  getStoredToken,
  saveToken,
  verifyToken,
  getTokenInfo,
} from '../utils/tokenManager'

const starStore = useStarStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const isLoading = ref(false)
const showTokenInput = ref(false)
const showTokenGuide = ref(false)
const token = ref('')
const isVerifyingToken = ref(false)
const { alert: showAlert, confirm: showConfirm, confirmCheckboxValue } = useDialog()
const { t, tm } = useI18n()

// 引导内容的计算属性
const guideStep2Items = computed(() => tm('settings.userManagement.guide.step2.items') as string[])
const guideStep3Scopes = computed(() => tm('settings.userManagement.guide.step3.items.scopes.list') as string[])
const guideStep4Items = computed(() => tm('settings.userManagement.guide.step4.items') as string[])
const guideSecurityItems = computed(() => tm('settings.userManagement.guide.security.items') as string[])

async function handleSync() {
  // 检查是否已有 token（可以从本地存储读取）
  const savedToken = await getStoredToken()
  if (savedToken) {
    await performSync(savedToken)
  } else {
    showTokenInput.value = true
  }
}

function closeTokenModal() {
  showTokenInput.value = false
  token.value = ''
}

async function confirmSync() {
  if (!token.value.trim()) {
    await showAlert({
      title: t('sync.tokenModal.missingTitle'),
      message: t('sync.tokenModal.missingMessage'),
      icon: '⚠️',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
      buttonText: t('common.confirm'),
    })
    return
  }

  const trimmed = token.value.trim()
  isVerifyingToken.value = true

  try {
    const result = await verifyToken(trimmed)
    if (!result.valid) {
      await showAlert({
        title: t('sync.messages.failureTitle'),
        message: result.error || t('sync.messages.failureMessage', { error: t('sync.messages.unknownError') }),
        icon: '❌',
        buttonClass: 'bg-red-600 hover:bg-red-700',
        buttonText: t('common.confirm'),
      })
      return
    }

    await saveToken(trimmed)
    closeTokenModal()
    const username = result.username
    await performSync(trimmed, username)
  } catch (error) {
    console.error('Token verification failed:', error)
    const errorMessage = error instanceof Error ? error.message : t('sync.messages.unknownError')
    await showAlert({
      title: t('sync.messages.failureTitle'),
      message: t('sync.messages.failureMessage', { error: errorMessage }),
      icon: '❌',
      buttonClass: 'bg-red-600 hover:bg-red-700',
      buttonText: t('common.confirm'),
    })
  } finally {
    isVerifyingToken.value = false
  }
}

async function performSync(githubToken: string, verifiedUsername?: string) {
  isLoading.value = true
  try {
    const hadPreviousSync = Boolean(starStore.lastSync)
    const newStars = await fetchStars(githubToken)
    
    // 合并新数据（保留已有标签和分组）
    const existingStarsMap = new Map(
      starStore.stars.map((s) => [s.id, s])
    )
    
    // 特殊文件夹名称
    const UNCATEGORIZED_GROUP = '新增未分类'
    const UNSTARRED_GROUP = '已取消星标'
    
    // 存储新增的项目 ID
    const newStarIds: string[] = []
    
    // 获取新数据中的所有 ID
    const newStarIdsSet = new Set(newStars.map(s => s.id))
    
    // 找出已取消星标的仓库（在现有数据中但不在新数据中）
    const unstaredStars: StarItem[] = []
    existingStarsMap.forEach((existing, id) => {
      if (!newStarIdsSet.has(id)) {
        // 已取消星标，移动到"已取消星标"文件夹
        unstaredStars.push({
          ...existing,
          groups: existing.groups.includes(UNSTARRED_GROUP) 
            ? existing.groups 
            : [...existing.groups.filter(g => g !== UNCATEGORIZED_GROUP), UNSTARRED_GROUP],
        })
      }
    })
    
    const mergedStars: StarItem[] = newStars.map((newStar) => {
      const existing = existingStarsMap.get(newStar.id)
      if (existing) {
        // 保留已有的标签、分组和笔记
        // 保存同步前的星星数量，用于显示增减
        // 如果之前在"已取消星标"文件夹中，移除它（因为已经重新星标了）
        const groups = existing.groups.filter(g => g !== UNSTARRED_GROUP)
        return {
          ...newStar,
          tags: existing.tags,
          groups: groups.length > 0 ? groups : existing.groups,
          notes: existing.notes,
          previous_stargazers_count: existing.stargazers_count,
        }
      } else {
        // 新增的项目：自动添加到"新增未分类"文件夹
        newStarIds.push(newStar.id)
        return {
          ...newStar,
          groups: [UNCATEGORIZED_GROUP],
          tags: [],
          notes: '',
        }
      }
    })
    
    // 将已取消星标的仓库添加到合并列表中
    mergedStars.push(...unstaredStars)
    
    // 确保特殊分组存在
    const updatedGroups = [...starStore.groups]
    if (!updatedGroups.includes(UNCATEGORIZED_GROUP)) {
      updatedGroups.push(UNCATEGORIZED_GROUP)
    }
    if (!updatedGroups.includes(UNSTARRED_GROUP)) {
      updatedGroups.push(UNSTARRED_GROUP)
    }
    
    // 更新所有标签列表（从 stars 中提取）
    const allTags = new Set<string>()
    mergedStars.forEach(star => {
      star.tags.forEach(tag => allTags.add(tag))
    })
    const updatedTags = Array.from(allTags)
    
    // 使用批量更新，只保存一次，避免事务冲突
    let username = verifiedUsername
    if (!username) {
      const info = await getTokenInfo()
      username = info?.username || 'user'
    }
    starStore.batchUpdate(
      mergedStars,
      {
        lastSync: new Date().toISOString(),
        totalCount: mergedStars.length,
        syncedBy: username,
      },
      updatedGroups,
      updatedTags
    )
    
    const newCount = newStarIds.length
    const unstaredCount = unstaredStars.length
    const summaryParts = [
      t('sync.messages.successSummary', { count: newStars.length }),
    ]
    if (newCount > 0) {
      summaryParts.push(
        t('sync.messages.successNew', {
          count: newCount,
          group: t('groups.uncategorized'),
        })
      )
    }
    if (unstaredCount > 0) {
      summaryParts.push(
        t('sync.messages.successUnstarred', {
          count: unstaredCount,
          group: t('groups.unstarred'),
        })
      )
    }
    await showAlert({
      title: t('sync.messages.successTitle'),
      message: summaryParts.join('\n'),
      icon: '✅',
      buttonClass: 'bg-green-600 hover:bg-green-700',
      buttonText: t('common.confirm'),
    })

    if (hadPreviousSync) {
      const skipPromptBefore = settingsStore.shouldSkipStarDeltaPrompt()
      if (skipPromptBefore) {
        if (settingsStore.shouldAutoShowStarDelta()) {
          uiStore.setSortOption('starDelta')
          uiStore.setSortOrder('desc')
        }
      } else {
        const shouldShowChanges = await showConfirm({
          title: t('sync.prompts.viewChangesTitle'),
          message: t('sync.prompts.viewChangesMessage'),
          confirmText: t('sync.prompts.viewChangesConfirm'),
          cancelText: t('sync.prompts.viewChangesLater'),
          confirmButtonClass: 'bg-blue-600 hover:bg-blue-700',
          showCheckbox: true,
          checkboxLabel: t('sync.prompts.viewChangesDontAsk'),
        })

        if (shouldShowChanges) {
          if (confirmCheckboxValue.value) {
            settingsStore.setSkipStarDeltaPrompt(true)
            settingsStore.setStarDeltaAutoShow(true)
          }
          uiStore.setSortOption('starDelta')
          uiStore.setSortOrder('desc')
        } else if (confirmCheckboxValue.value) {
          settingsStore.setSkipStarDeltaPrompt(true)
          settingsStore.setStarDeltaAutoShow(false)
        }
      }
    }
  } catch (error) {
    console.error('Sync failed:', error)
    const errorMessage = error instanceof Error ? error.message : t('sync.messages.unknownError')
    await showAlert({
      title: t('sync.messages.failureTitle'),
      message: t('sync.messages.failureMessage', { error: errorMessage }),
      icon: '❌',
      buttonClass: 'bg-red-600 hover:bg-red-700',
      buttonText: t('common.confirm'),
    })
  } finally {
    isLoading.value = false
  }
}
</script>

