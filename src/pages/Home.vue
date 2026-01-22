<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 侧边栏 -->
    <GroupList />
    
    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 顶部搜索栏 -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <!-- 同步按钮和主题切换按钮（同一行） -->
        <div class="flex items-center justify-between mb-2">
          <!-- 左侧：同步按钮 -->
          <div class="flex items-center gap-3">
            <SyncButton />
            <div v-if="starStore.lastSync" class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('home.lastSync', { time: formatRelativeTime(starStore.lastSync, locale) }) }}
            </div>
          </div>
          <!-- 右侧：主题切换按钮 -->
          <button
            @click="uiStore.toggleTheme()"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="isLight ? t('home.switchToDark') : t('home.switchToLight')"
          >
            <span v-if="isLight" class="text-xl">🌙</span>
            <span v-else class="text-xl">☀️</span>
          </button>
        </div>
        <SearchBar />
      </div>
      
      <!-- Star 列表 -->
      <div class="flex-1 overflow-y-auto px-4 py-2 relative">
        <StarList />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStarStore } from '../stores/starStore'
import { useUIStore } from '../stores/uiStore'
import GroupList from '../components/GroupList.vue'
import SearchBar from '../components/SearchBar.vue'
import StarList from '../components/StarList.vue'
import SyncButton from '../components/SyncButton.vue'
import { formatRelativeTime } from '../utils/date'

const starStore = useStarStore()
const uiStore = useUIStore()
const { t, locale } = useI18n()

// 使用 computed 确保响应式更新
const theme = computed(() => uiStore.theme)
const isLight = computed(() => theme.value === 'light')

// 只在首次挂载时初始化
let initialized = false

onMounted(async () => {
  if (!initialized) {
    try {
      await starStore.init()
      initialized = true
    } catch (error) {
      console.error('Failed to initialize app:', error)
    }
  }
})
</script>

