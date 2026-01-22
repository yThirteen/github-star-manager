/**
 * 应用设置全局状态管理
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ApiItem, AIModuleConfig, AIModule } from '../types/ai'
import {
  getAllApiItems,
  createApiItem,
  updateApiItem,
  deleteApiItem,
  getAllModuleConfigs,
  saveModuleConfig,
} from '../utils/aiConfig'
import { resolveLocale, type AppLocale } from '../plugins/i18n'

// 设置项键名
const SETTING_KEYS = {
  skipLinkConfirm: 'skipLinkConfirm',
  skipTagDeleteConfirm: 'skipTagDeleteConfirm',
  skipGroupDeleteConfirm: 'skipGroupDeleteConfirm',
  skipStarDeltaPrompt: 'skipStarDeltaPrompt',
  starDeltaAutoShow: 'starDeltaAutoShow',
  maxFolderDepth: 'star.group.maxDepth',
  language: 'app.language',
} as const

const DEFAULT_MAX_FOLDER_DEPTH = 3
const MIN_FOLDER_DEPTH = 1
const MAX_FOLDER_DEPTH = 6

function normalizeFolderDepth(value: number | null | undefined): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return DEFAULT_MAX_FOLDER_DEPTH
  }
  const rounded = Math.floor(numeric)
  return Math.min(MAX_FOLDER_DEPTH, Math.max(MIN_FOLDER_DEPTH, rounded))
}

export const useSettingsStore = defineStore('settings', () => {
  // 状态：是否跳过各种确认对话框
  const skipLinkConfirm = ref<boolean>(false)
  const skipTagDeleteConfirm = ref<boolean>(false)
  const skipGroupDeleteConfirm = ref<boolean>(false)
  const skipStarDeltaPrompt = ref<boolean>(false)
  const starDeltaAutoShow = ref<boolean>(true)
  const maxFolderDepth = ref<number>(DEFAULT_MAX_FOLDER_DEPTH)
  const language = ref<AppLocale>(resolveLocale(typeof navigator !== 'undefined' ? navigator.language : 'zh-CN'))
  
  // API 配置
  const apiItems = ref<ApiItem[]>([])
  const moduleConfigs = ref<AIModuleConfig[]>([])
  const isLoadingApis = ref(false)

  // AI 分类相关全局设置
  const classifyConcurrency = ref<number>(6)
  const classifyPromptTemplate = ref<string>('')

  // 初始化：从 localStorage 加载设置
  function init() {
    skipLinkConfirm.value = localStorage.getItem(SETTING_KEYS.skipLinkConfirm) === 'true'
    skipTagDeleteConfirm.value = localStorage.getItem(SETTING_KEYS.skipTagDeleteConfirm) === 'true'
    skipGroupDeleteConfirm.value = localStorage.getItem(SETTING_KEYS.skipGroupDeleteConfirm) === 'true'
    skipStarDeltaPrompt.value = localStorage.getItem(SETTING_KEYS.skipStarDeltaPrompt) === 'true'
    const autoShowRaw = localStorage.getItem(SETTING_KEYS.starDeltaAutoShow)
    starDeltaAutoShow.value = autoShowRaw === null ? true : autoShowRaw === 'true'

    // 读取 AI 分类并发与提示词
    const savedConcurrency = localStorage.getItem('ai.classify.concurrency')
    classifyConcurrency.value = savedConcurrency ? Math.max(1, Number(savedConcurrency)) : 6
    const savedPrompt = localStorage.getItem('ai.classify.prompt')
    classifyPromptTemplate.value = savedPrompt || ''

    const savedDepth = localStorage.getItem(SETTING_KEYS.maxFolderDepth)
    maxFolderDepth.value = savedDepth === null
      ? DEFAULT_MAX_FOLDER_DEPTH
      : normalizeFolderDepth(Number(savedDepth))

    const savedLanguage = localStorage.getItem(SETTING_KEYS.language)
    language.value = resolveLocale(savedLanguage ?? language.value)
  }
  
  // 异步加载 API 配置（从数据库）
  async function loadAIConfigs() {
    if (isLoadingApis.value) return
    
    isLoadingApis.value = true
    try {
      const [apis, configs] = await Promise.all([
        getAllApiItems(),
        getAllModuleConfigs(),
      ])
      apiItems.value = apis
      moduleConfigs.value = configs
    } catch (error) {
      console.error('加载 AI 配置失败:', error)
    } finally {
      isLoadingApis.value = false
    }
  }
  
  // 获取所有 API
  function getApiItems(): ApiItem[] {
    return apiItems.value
  }
  
  // 根据 ID 获取 API
  function getApiItemById_sync(id: string): ApiItem | undefined {
    return apiItems.value.find(api => api.id === id)
  }
  
  // 添加 API
  async function addApiItem(api: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiItem> {
    const newApi = await createApiItem(api)
    apiItems.value.push(newApi)
    // 刷新模块配置，确保引用到最新的 API 列表
    moduleConfigs.value = await getAllModuleConfigs()
    return newApi
  }
  
  // 更新 API
  async function updateApiItem_store(id: string, updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>>): Promise<ApiItem | null> {
    const updated = await updateApiItem(id, updates)
    if (updated) {
      const index = apiItems.value.findIndex(api => api.id === id)
      if (index !== -1) {
        apiItems.value[index] = updated
      }
      // 更新后刷新模块配置，避免引用过期
      moduleConfigs.value = await getAllModuleConfigs()
    }
    return updated
  }
  
  // 删除 API
  async function deleteApiItem_store(id: string): Promise<boolean> {
    const success = await deleteApiItem(id)
    if (success) {
      apiItems.value = apiItems.value.filter(api => api.id !== id)
      // 重新加载模块配置（因为可能有模块引用了该 API）
      moduleConfigs.value = await getAllModuleConfigs()
    }
    return success
  }
  
  // 获取所有模块配置
  function getModuleConfigs(): AIModuleConfig[] {
    return moduleConfigs.value
  }
  
  // 获取指定模块的配置
  function getModuleConfig_sync(module: AIModule): AIModuleConfig | undefined {
    return moduleConfigs.value.find(c => c.module === module)
  }
  
  // 保存模块配置
  async function saveModuleConfig_store(config: AIModuleConfig): Promise<void> {
    await saveModuleConfig(config)
    // 从数据库重新拉取，避免本地状态与存储不一致
    moduleConfigs.value = await getAllModuleConfigs()
  }

  // 设置 AI 分类并发
  function setClassifyConcurrency(value: number) {
    const v = Math.max(1, Math.floor(value || 1))
    classifyConcurrency.value = v
    localStorage.setItem('ai.classify.concurrency', String(v))
  }

  // 设置 AI 分类提示词模板（留空使用默认）
  function setClassifyPromptTemplate(value: string) {
    classifyPromptTemplate.value = value || ''
    if (value && value.trim()) {
      localStorage.setItem('ai.classify.prompt', value)
    } else {
      localStorage.removeItem('ai.classify.prompt')
    }
  }

  // 设置跳过链接确认
  function setSkipLinkConfirm(value: boolean) {
    skipLinkConfirm.value = value
    if (value) {
      localStorage.setItem(SETTING_KEYS.skipLinkConfirm, 'true')
    } else {
      localStorage.removeItem(SETTING_KEYS.skipLinkConfirm)
    }
  }

  // 设置跳过标签删除确认
  function setSkipTagDeleteConfirm(value: boolean) {
    skipTagDeleteConfirm.value = value
    if (value) {
      localStorage.setItem(SETTING_KEYS.skipTagDeleteConfirm, 'true')
    } else {
      localStorage.removeItem(SETTING_KEYS.skipTagDeleteConfirm)
    }
  }

  // 设置跳过分组删除确认
  function setSkipGroupDeleteConfirm(value: boolean) {
    skipGroupDeleteConfirm.value = value
    if (value) {
      localStorage.setItem(SETTING_KEYS.skipGroupDeleteConfirm, 'true')
    } else {
      localStorage.removeItem(SETTING_KEYS.skipGroupDeleteConfirm)
    }
  }

  function setSkipStarDeltaPrompt(value: boolean) {
    skipStarDeltaPrompt.value = value
    if (value) {
      localStorage.setItem(SETTING_KEYS.skipStarDeltaPrompt, 'true')
    } else {
      localStorage.removeItem(SETTING_KEYS.skipStarDeltaPrompt)
    }
  }

  function setStarDeltaAutoShow(value: boolean) {
    starDeltaAutoShow.value = value
    localStorage.setItem(SETTING_KEYS.starDeltaAutoShow, value ? 'true' : 'false')
  }

  function setMaxFolderDepth(value: number) {
    const normalized = normalizeFolderDepth(value)
    maxFolderDepth.value = normalized
    localStorage.setItem(SETTING_KEYS.maxFolderDepth, String(normalized))
  }

  function setLanguage(value: AppLocale) {
    language.value = value
    localStorage.setItem(SETTING_KEYS.language, value)
  }

  // 检查是否应该跳过链接确认（兼容旧代码）
  function shouldSkipLinkConfirm(): boolean {
    return skipLinkConfirm.value
  }

  // 检查是否应该跳过标签删除确认（兼容旧代码）
  function shouldSkipTagDeleteConfirm(): boolean {
    return skipTagDeleteConfirm.value
  }

  // 检查是否应该跳过分组删除确认（兼容旧代码）
  function shouldSkipGroupDeleteConfirm(): boolean {
    return skipGroupDeleteConfirm.value
  }

  function shouldSkipStarDeltaPrompt(): boolean {
    return skipStarDeltaPrompt.value
  }

  function shouldAutoShowStarDelta(): boolean {
    return starDeltaAutoShow.value
  }

  return {
    skipLinkConfirm,
    skipTagDeleteConfirm,
    skipGroupDeleteConfirm,
    skipStarDeltaPrompt,
    starDeltaAutoShow,
    apiItems,
    moduleConfigs,
    isLoadingApis,
    init,
    loadAIConfigs,
    setSkipLinkConfirm,
    setSkipTagDeleteConfirm,
    setSkipGroupDeleteConfirm,
    setSkipStarDeltaPrompt,
    setStarDeltaAutoShow,
    shouldSkipLinkConfirm,
    shouldSkipTagDeleteConfirm,
    shouldSkipGroupDeleteConfirm,
    shouldSkipStarDeltaPrompt,
    shouldAutoShowStarDelta,
    // API 管理
    getApiItems,
    getApiItemById_sync,
    addApiItem,
    updateApiItem_store,
    deleteApiItem_store,
    // 模块配置管理
    getModuleConfigs,
    getModuleConfig_sync,
    saveModuleConfig_store,
    // AI 分类设置
    classifyConcurrency,
    classifyPromptTemplate,
    setClassifyConcurrency,
    setClassifyPromptTemplate,
    maxFolderDepth,
    setMaxFolderDepth,
    language,
    setLanguage,
  }
})

