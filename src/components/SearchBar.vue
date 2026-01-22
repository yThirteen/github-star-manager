<template>
  <div class="flex items-center">
    <!-- 搜索输入框 -->
    <div class="flex-1 relative">
      <input
        v-model="query"
        type="text"
        placeholder="搜索仓库名称、描述、标签、笔记..."
        class="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        🔍
      </span>
      <button
        v-if="query"
        @click="clearSearch"
        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="清空搜索"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { debounce } from '../utils/debounce'

const uiStore = useUIStore()

// 本地搜索输入值（用于防抖）
const localQuery = ref(uiStore.searchQuery)

// 防抖更新搜索查询（300ms 延迟）
const debouncedSetSearchQuery = debounce((value: string) => {
  uiStore.setSearchQuery(value)
}, 300)

// 监听本地输入变化，使用防抖更新
watch(localQuery, (newValue) => {
  debouncedSetSearchQuery(newValue)
})

// 同步外部搜索查询变化（例如清空按钮）
watch(() => uiStore.searchQuery, (newValue) => {
  if (localQuery.value !== newValue) {
    localQuery.value = newValue
  }
})

const query = computed({
  get: () => localQuery.value,
  set: (value: string) => {
    localQuery.value = value
  },
})

function clearSearch() {
  uiStore.setSearchQuery('')
}
</script>

