/**
 * UI 状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // 侧边栏显示状态
  const sidebarOpen = ref(true)
  
  // 主题模式：'light' | 'dark'
  const theme = ref<'light' | 'dark'>('light')
  
  // 搜索关键词
  const searchQuery = ref('')
  
  // 搜索类型：'name' | 'description' | 'tags'
  const searchType = ref<'name' | 'description' | 'tags'>('name')
  
  // 当前选中的分组
  const selectedGroup = ref<string | null>(null)
  
  // 当前选中的语言标签（单选）
  const selectedTag = ref<string | null>(null)
  
  // 当前选中的自建标签（多选）
  const selectedTags = ref<string[]>([])

  // 分页：每页数量与当前页
  const pageSize = ref<number>(20)
  const currentPage = ref<number>(1)

  // 列表排序
  const sortOption = ref<'default' | 'starDelta' | 'starCount' | 'starredAt'>('default')
  const sortOrder = ref<'desc' | 'asc'>('desc')

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function toggleTheme() {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'
    theme.value = newTheme
    applyTheme(newTheme)
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    applyTheme(newTheme)
  }

  function applyTheme(newTheme: 'light' | 'dark') {
    if (typeof document === 'undefined') return
    
    const html = document.documentElement
    const body = document.body
    
    if (newTheme === 'dark') {
      html.classList.add('dark')
      body.classList.add('dark')
    } else {
      html.classList.remove('dark')
      body.classList.remove('dark')
    }
    
    // 持久化到 localStorage
    localStorage.setItem('theme', newTheme)
  }

  function initTheme() {
    // 检查 HTML 元素是否已经有 dark 类（由内联脚本添加）
    const html = document.documentElement
    const hasDarkClass = html.classList.contains('dark')
    
    // 从 localStorage 读取主题设置
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    
    // 如果 HTML 已经有 dark 类，同步到 store
    if (hasDarkClass) {
      theme.value = 'dark'
    } else if (savedTheme) {
      theme.value = savedTheme
      applyTheme(savedTheme)
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme.value = 'dark'
      applyTheme('dark')
    } else {
      theme.value = 'light'
      // 确保 light 模式下没有 dark 类
      html.classList.remove('dark')
      if (document.body) {
        document.body.classList.remove('dark')
      }
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setSearchType(type: 'name' | 'description' | 'tags') {
    searchType.value = type
  }

  function setSelectedGroup(group: string | null) {
    selectedGroup.value = group
  }

  function setSelectedTag(tag: string | null) {
    selectedTag.value = tag
  }

  function toggleSelectedTag(tag: string) {
    const index = selectedTags.value.indexOf(tag)
    if (index === -1) {
      selectedTags.value.push(tag)
    } else {
      selectedTags.value.splice(index, 1)
    }
  }

  function clearSelectedTags() {
    selectedTags.value = []
  }

  function clearFilters() {
    searchQuery.value = ''
    searchType.value = 'name'
    selectedGroup.value = null
    selectedTag.value = null
    selectedTags.value = []
    currentPage.value = 1
  }

  function setPageSize(size: number) {
    pageSize.value = size > 0 ? size : 20
    currentPage.value = 1
  }

  function setCurrentPage(page: number) {
    currentPage.value = page < 1 ? 1 : page
  }

  function setSortOption(option: 'default' | 'starDelta' | 'starCount' | 'starredAt') {
    sortOption.value = option
  }

  function setSortOrder(order: 'desc' | 'asc') {
    sortOrder.value = order
  }

  function toggleSortOrder() {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  }

  return {
    sidebarOpen,
    theme,
    searchQuery,
    searchType,
    selectedGroup,
    selectedTag,
    selectedTags,
    pageSize,
    currentPage,
    sortOption,
    sortOrder,
    toggleSidebar,
    toggleTheme,
    setTheme,
    initTheme,
    setSearchQuery,
    setSearchType,
    setSelectedGroup,
    setSelectedTag,
    toggleSelectedTag,
    clearSelectedTags,
    clearFilters,
    setPageSize,
    setCurrentPage,
    setSortOption,
    setSortOrder,
    toggleSortOrder,
  }
})

