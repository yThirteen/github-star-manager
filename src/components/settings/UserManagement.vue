<template>
  <div class="space-y-6">
    <!-- GitHub Token 管理 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 relative">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ t('settings.userManagement.token.title') }}
          </h2>
          <span class="text-sm font-normal text-gray-500 dark:text-gray-400">{{ t('settings.userManagement.token.subtitle') }}</span>
        </div>
        <button
          v-if="tokenInfo.hasToken"
          @click="handleDeleteToken"
          class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          :title="t('settings.userManagement.token.deleteTooltip')"
        >
          {{ t('settings.userManagement.token.delete') }}
        </button>
      </div>

      <div v-if="!isLoadingToken" class="space-y-4">
        <!-- Token 状态显示 -->
        <div v-if="tokenInfo.hasToken" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div class="flex-1">
            <h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              {{ t('settings.userManagement.token.status.title') }}
            </h3>
            <div class="space-y-2">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                <span class="font-medium">{{ t('settings.userManagement.token.status.token') }}</span>
                <span class="font-mono">{{ tokenInfo.formattedToken }}</span>
              </p>
              <p v-if="tokenInfo.username" class="text-sm text-gray-600 dark:text-gray-400">
                <span class="font-medium">{{ t('settings.userManagement.token.status.user') }}</span>
                <span>{{ tokenInfo.username }}</span>
              </p>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('settings.userManagement.token.status.state') }}</span>
                <span
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    tokenInfo.isValid
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  ]"
                >
                  {{ tokenInfo.isValid ? t('settings.userManagement.token.status.valid') : t('settings.userManagement.token.status.invalid') }}
                </span>
                <span v-if="!tokenInfo.isValid" class="text-xs text-red-600 dark:text-red-400">
                  {{ t('settings.userManagement.token.status.updateHint') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Token 输入/编辑 -->
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 class="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
            {{ tokenInfo.hasToken ? t('settings.userManagement.token.form.updateTitle') : t('settings.userManagement.token.form.setTitle') }}
          </h3>
          <div class="space-y-3">
            <input
              v-model="tokenInput"
              type="password"
              :placeholder="t('settings.userManagement.token.form.placeholder')"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div class="flex gap-2">
              <button
                @click="handleSaveToken"
                :disabled="!tokenInput.trim() || isVerifying || isSaving"
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="isVerifying">{{ t('settings.userManagement.token.form.verifying') }}</span>
                <span v-else-if="isSaving">{{ t('settings.userManagement.token.form.saving') }}</span>
                <span v-else>{{ tokenInfo.hasToken ? t('settings.userManagement.token.form.update') : t('settings.userManagement.token.form.save') }}</span>
              </button>
              <button
                @click="showTokenGuide = true"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                {{ t('settings.userManagement.token.form.getToken') }}
              </button>
            </div>
            <p v-if="tokenError" class="text-sm text-red-600 dark:text-red-400">
              {{ tokenError }}
            </p>
            <p v-if="tokenSuccess" class="text-sm text-green-600 dark:text-green-400">
              {{ tokenSuccess }}
            </p>
          </div>
        </div>
      </div>

      <!-- 初次加载占位，避免闪烁 -->
      <div v-else class="space-y-4">
        <div class="animate-pulse bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 h-24"></div>
        <div class="animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-40"></div>
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

    <!-- Token 删除确认对话框 -->
    <div
      v-if="showDeleteTokenConfirmDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          {{ t('settings.userManagement.dialogs.delete.title') }}
        </h3>
        <div class="text-sm text-gray-700 dark:text-gray-300 mb-4 space-y-2">
          <p class="mb-2">{{ t('settings.userManagement.dialogs.delete.intro') }}</p>
          <p class="text-red-600 dark:text-red-400 font-semibold">
            {{ t('settings.userManagement.dialogs.delete.warning') }}
          </p>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            {{ t('settings.userManagement.dialogs.delete.note') }}
          </p>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="cancelDeleteToken"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            @click="confirmDeleteToken"
          >
            {{ t('settings.userManagement.dialogs.delete.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  saveToken,
  deleteToken,
  getTokenInfo,
  verifyToken,
  formatToken,
  type TokenInfo,
} from '../../utils/tokenManager'

const { t, tm } = useI18n()

// Token 管理相关状态
const tokenInput = ref('')
const isVerifying = ref(false)
const isSaving = ref(false)
const tokenError = ref('')
const tokenSuccess = ref('')
const showTokenGuide = ref(false)
const tokenValidStatus = ref<{ isValid: boolean; username?: string } | null>(null)
const showDeleteTokenConfirmDialog = ref(false)
const tokenDetails = ref<TokenInfo | null>(null)
const isLoadingToken = ref(true)

const guideStep2Items = computed(() => tm('settings.userManagement.guide.step2.items') as string[])
const guideStep3Scopes = computed(() => tm('settings.userManagement.guide.step3.items.scopes.list') as string[])
const guideStep4Items = computed(() => tm('settings.userManagement.guide.step4.items') as string[])
const guideSecurityItems = computed(() => tm('settings.userManagement.guide.security.items') as string[])

// Token 信息
const tokenInfo = computed(() => {
  const details = tokenDetails.value
  const isValid = tokenValidStatus.value?.isValid ?? (details ? true : false)
  const username = tokenValidStatus.value?.username || details?.username || ''

  return {
    hasToken: !!details,
    token: details?.token || '',
    formattedToken: details ? formatToken(details.token) : '',
    username,
    isValid,
  }
})

async function loadTokenDetails() {
  tokenDetails.value = await getTokenInfo()
}

// 保存 Token
async function handleSaveToken() {
  if (!tokenInput.value.trim()) {
    tokenError.value = '请输入 Token'
    return
  }

  tokenError.value = ''
  tokenSuccess.value = ''
  isVerifying.value = true

  try {
    const result = await verifyToken(tokenInput.value.trim())
    
    if (!result.valid) {
      tokenError.value = result.error || 'Token 验证失败'
      return
    }

    isVerifying.value = false
    isSaving.value = true
    
    await saveToken(tokenInput.value.trim())
    await loadTokenDetails()
    
    tokenValidStatus.value = {
      isValid: true,
      username: result.username,
    }
    
    tokenInput.value = ''
    tokenSuccess.value = `Token 已${tokenInfo.value.hasToken ? '更新' : '保存'}，用户: ${result.username || '未知'}`
    
    setTimeout(() => {
      tokenSuccess.value = ''
    }, 3000)
  } catch (error) {
    tokenError.value = error instanceof Error ? error.message : '保存失败'
  } finally {
    isVerifying.value = false
    isSaving.value = false
  }
}

// 删除 Token
function handleDeleteToken() {
  showDeleteTokenConfirmDialog.value = true
}

function cancelDeleteToken() {
  showDeleteTokenConfirmDialog.value = false
}

async function confirmDeleteToken() {
  showDeleteTokenConfirmDialog.value = false
  
  await deleteToken()
  tokenDetails.value = null
  
  tokenInput.value = ''
  tokenError.value = ''
  tokenSuccess.value = ''
  
  tokenValidStatus.value = null
  
  await nextTick()
  
  tokenSuccess.value = 'Token 已删除'
  
  setTimeout(() => {
    tokenSuccess.value = ''
  }, 3000)
}

onMounted(() => {
  ;(async () => {
    await loadTokenDetails()
    isLoadingToken.value = false
  })()
})
</script>

