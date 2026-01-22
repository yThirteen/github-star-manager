/**
 * AI 功能 Composable
 */

import { ref, computed } from 'vue'
import { useStarStore } from '../stores/starStore'
import { useSettingsStore } from '../stores/settingsStore'
import {
  translateText,
  classifyRepository,
  classifyGroupsHierarchy,
  type GroupParent,
  type LanguageName,
  LANGUAGE_CODES,
} from '../utils/ai'
// import { getModuleConfig, getApiItemById } from '../utils/aiConfig'
// 改为动态导入以避免混合导入警告
import type { StarItem } from '../types/star'

/**
 * 获取动态导入的 AI 配置函数
 */
async function getAIConfig() {
  const { getModuleConfig, getApiItemById } = await import('../utils/aiConfig')
  return { getModuleConfig, getApiItemById }
}

export function useAI() {
  const starStore = useStarStore()
  const settingsStore = useSettingsStore()

  const isTranslating = ref(false)
  const translationError = ref<string | null>(null)
  const translatedText = ref<string | null>(null)
  // 翻译取消/并发控制版本号：每次开始或取消翻译都会自增
  const translationVersion = ref(0)

  const isClassifying = ref(false)
  const classificationError = ref<string | null>(null)
  const classificationProgress = ref<{ current: number; total: number } | null>(null)
  const isCancelling = ref(false)

  // 文件夹分类次数控制：最多进行 (maxFolderDepth - 1) 次
  const refineAttempts = ref(0)
  const maxRefineRounds = computed(() => {
    // console.log('starStore.maxFolderDepth', starStore.maxFolderDepth)
    const depth = starStore.maxFolderDepth ?? 3
    return Math.max(0, depth - 1)
  })

  /**
   * 翻译文本
   */
  async function translate(
    text: string,
    targetLang: LanguageName | string = '中文'
  ): Promise<string | null> {
    if (!text || !text.trim()) {
      translationError.value = '文本不能为空'
      return null
    }

    // 生成并记录本次翻译版本号
    const myVersion = translationVersion.value + 1
    translationVersion.value = myVersion
    isTranslating.value = true
    translationError.value = null
    translatedText.value = null

    try {
      const langCode =
        targetLang in LANGUAGE_CODES
          ? LANGUAGE_CODES[targetLang as LanguageName]
          : targetLang

      const { getModuleConfig, getApiItemById } = await getAIConfig()
      const moduleConfig = await getModuleConfig('translate')
      if (!moduleConfig || !moduleConfig.apiId || !moduleConfig.enabled) {
        throw new Error('请先在设置中配置并启用翻译 API')
      }

      const api = await getApiItemById(moduleConfig.apiId)
      if (!api) {
        throw new Error('API 配置不存在')
      }

      const result = await translateText(
        text,
        langCode,
        api.apiType,
        api.apiKey,
        api.apiUrl,
        api.model
      )

      // 若在等待期间被取消或开启了新翻译任务，则忽略结果
      if (myVersion !== translationVersion.value) {
        return null
      }
      translatedText.value = result
      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '翻译失败，请稍后重试'
      // 若已被取消或开启了新任务，忽略错误提示
      if (myVersion === translationVersion.value) {
        translationError.value = errorMessage
      }
      console.error('翻译错误:', error)
      return null
    } finally {
      // 仅当仍是当前版本时，结束加载态
      if (myVersion === translationVersion.value) {
        isTranslating.value = false
      }
    }
  }

  async function translateToAppLanguage(text: string): Promise<string | null> {
    // 根据当前应用语言设置确定翻译目标
    const currentLocale = settingsStore.language
    let targetLang: string
    
    if (currentLocale === 'zh-CN') {
      targetLang = 'zh'  // 中文环境翻译到中文
    } else if (currentLocale === 'en') {
      targetLang = 'en'  // 英文环境翻译到英文
    } else {
      targetLang = 'zh'  // 默认翻译到中文
    }
    
    return translate(text, targetLang)
  }

  function clearTranslation() {
    translatedText.value = null
    translationError.value = null
  }

  function cancelTranslation() {
    // 自增版本号以使进行中的请求产出被忽略
    translationVersion.value += 1
    isTranslating.value = false
    translatedText.value = null
    translationError.value = null
  }

  /**
   * 对单个仓库进行分类
   */
  async function classifyStar(
    star: StarItem,
    existingGroups: string[]
  ): Promise<string | null> {
    if (!star.name) {
      classificationError.value = '仓库名称不能为空'
      return null
    }

    isClassifying.value = true
    classificationError.value = null

    try {
      const { getModuleConfig, getApiItemById } = await getAIConfig()
      const moduleConfig = await getModuleConfig('classify')
      if (!moduleConfig || !moduleConfig.apiId || !moduleConfig.enabled) {
        throw new Error('请先在设置中配置并启用分类 API')
      }

      const api = await getApiItemById(moduleConfig.apiId)
      if (!api) {
        throw new Error('API 配置不存在')
      }

      if (api.apiType !== 'openai') {
        throw new Error('分类 API 仅支持符合 OpenAI 接口规范的实现')
      }


      if (!api.apiKey) {
        throw new Error('请配置 API Key')
      }

      // 对于兼容 OpenAI 接口的第三方服务，可通过配置 apiUrl 实现；不强制要求

      const suggestedGroup = await classifyRepository(
        star.name,
        star.description,
        existingGroups,
        api.apiType,
        api.apiKey,
        api.apiUrl,
        api.model
      )
      return suggestedGroup
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '分类失败，请稍后重试'
      classificationError.value = errorMessage
      console.error('分类错误:', error)
      return null
    } finally {
      isClassifying.value = false
    }
  }

  /**
   * 批量分类核心逻辑
   */
  async function _classifyStarsBatch(
    stars: StarItem[],
    candidateGroups: string[],
    api: any,
    onProgress?: (completed: number, total: number) => void,
    concurrency?: number,
    promptOverride?: string
  ): Promise<Map<string, string>> {
    const MAX_CONCURRENCY = Math.max(1, Math.min(20, concurrency || 6))
    const normalizeGroupName = (name: string) =>
      name.trim().replace(/^\/+|\/+$/g, '')

    const results = new Map<string, string>()
    let completed = 0
    let nextIndex = 0
    const total = stars.length

    const runTask = async (index: number) => {
      if (isCancelling.value) return

      const star = stars[index]
      try {
        // 防止在排队/执行过程中被取消
        if (isCancelling.value) return

        const suggestedGroup = await classifyRepository(
          star.name,
          star.description,
          candidateGroups,
          api.apiType,
          api.apiKey,
          api.apiUrl,
          api.model,
          promptOverride
        )

        if (isCancelling.value) return

        if (suggestedGroup) {
          results.set(star.id, normalizeGroupName(suggestedGroup))
        }
      } catch (error) {
        console.error(`分类仓库 ${star.name} 失败:`, error)
      } finally {
        completed += 1
        if (!isCancelling.value && onProgress) {
          onProgress(completed, total)
        }
      }
    }

    const worker = async (): Promise<void> => {
      while (true) {
        if (isCancelling.value) return

        const current = nextIndex
        nextIndex += 1
        if (current >= total) return

        await runTask(current)
      }
    }

    const workerCount = Math.min(MAX_CONCURRENCY, total)
    await Promise.all(Array.from({ length: workerCount }, () => worker()))

    return results
  }

  /**
   * 批量对仓库进行分类
   */
  async function classifyStars(
    stars: StarItem[],
    existingGroups: string[],
    onProgress?: (current: number, total: number) => void,
    options?: {
      forceCandidateGroups?: string[]
      concurrency?: number
      promptOverride?: string
    }
  ): Promise<Map<string, string>> {
    const uncategorizedStars = stars.filter(
      (star) =>
        star.groups.length === 0 ||
        (star.groups.length === 1 && star.groups.includes('新增未分类'))
    )

    if (uncategorizedStars.length === 0) {
      classificationError.value = '没有未分类的仓库'
      return new Map()
    }

    isClassifying.value = true
    classificationError.value = null
    classificationProgress.value = { current: 0, total: uncategorizedStars.length }
    isCancelling.value = false
    // 新一轮批量分类开始，重置文件夹分类次数
    refineAttempts.value = 0

    try {
      const { getModuleConfig, getApiItemById } = await getAIConfig()
      const moduleConfig = await getModuleConfig('classify')
      if (!moduleConfig || !moduleConfig.apiId || !moduleConfig.enabled) {
        throw new Error('请先在设置中配置并启用分类 API')
      }

      const api = await getApiItemById(moduleConfig.apiId)
      if (!api) {
        throw new Error('API 配置不存在')
      }

      const candidateGroups = options?.forceCandidateGroups ?? existingGroups
      const settings = useSettingsStore()
      const effectiveConcurrency = options?.concurrency ?? settings.classifyConcurrency
      const effectivePrompt = options?.promptOverride ?? settings.classifyPromptTemplate

      const results = await _classifyStarsBatch(
        uncategorizedStars,
        candidateGroups,
        api,
        (current, total) => {
          // 若已取消，不再推进进度，避免误导
          if (isCancelling.value) return
          classificationProgress.value = { current, total }
          if (onProgress) onProgress(current, total)
        },
        effectiveConcurrency,
        effectivePrompt && effectivePrompt.trim() ? effectivePrompt : undefined
      )

      return results
    } catch (error) {
      if (error instanceof Error && error.message === 'CLASSIFICATION_CANCELLED') {
        // 取消时返回空结果，不触发后续逻辑
        classificationError.value = null
        return new Map()
      }

      const errorMessage =
        error instanceof Error ? error.message : '批量分类失败，请稍后重试'
      classificationError.value = errorMessage
      console.error('批量分类错误:', error)
      return new Map()
    } finally {
      isClassifying.value = false
      classificationProgress.value = null
      isCancelling.value = false
    }
  }

  /**
   * 优化分类结果（文件夹分类）
   */
  async function refineClassification(
    currentAssignments: Map<string, string>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    // 若已达最大分类次数，则直接返回原结果
    if (refineAttempts.value >= maxRefineRounds.value) {
      classificationError.value = `已达到最大文件夹分类次数限制（最多 ${maxRefineRounds.value} 次）`
      return new Map(currentAssignments)
    }

    // 计数 +1（本次分类尝试）
    refineAttempts.value += 1
    const normalizeGroupName = (name: string) =>
      name.trim().replace(/^\/+|\/+$/g, '')

    const uniqueGroups = Array.from(
      new Set(
        Array.from(currentAssignments.values()).map((group) => normalizeGroupName(group))
      )
    )
    if (uniqueGroups.length === 0) {
      return new Map()
    }

    // 仅对一级文件夹进行归纳，避免重复处理已存在的子层级
    const topLevelGroups = Array.from(
      new Set(uniqueGroups.map((group) => (group.split('/')[0] || '未命名')))
    )

    isClassifying.value = true
    classificationError.value = null
    classificationProgress.value = { current: 0, total: topLevelGroups.length }
    isCancelling.value = false

    try {
      const { getModuleConfig, getApiItemById } = await getAIConfig()
      const moduleConfig = await getModuleConfig('classify')
      if (!moduleConfig || !moduleConfig.apiId || !moduleConfig.enabled) {
        throw new Error('请先在设置中配置并启用分类 API')
      }
      const api = await getApiItemById(moduleConfig.apiId)
      if (!api) throw new Error('API 配置不存在')

      if (api.apiType !== 'openai') {
        throw new Error('分类 API 仅支持符合 OpenAI 接口规范的实现')
      }


      if (isCancelling.value) {
        throw new Error('CLASSIFICATION_CANCELLED')
      }

      const hierarchy = await classifyGroupsHierarchy(
        topLevelGroups,
        api.apiType,
        api.apiKey,
        api.apiUrl,
        api.model
      )

      // 调试：记录 AI 返回的层级结果
      console.debug('AI hierarchy raw result', hierarchy)

      if (isCancelling.value) {
        throw new Error('CLASSIFICATION_CANCELLED')
      }

      const groupParentMap = new Map<string, string>()
      hierarchy.forEach((item: GroupParent) => {
        const normalizedGroup = normalizeGroupName(item.group)
        if (item.parent) {
          groupParentMap.set(normalizedGroup, normalizeGroupName(item.parent))
        }
      })

      classificationProgress.value = { current: topLevelGroups.length, total: topLevelGroups.length }
      if (onProgress) onProgress(topLevelGroups.length, topLevelGroups.length)

      const finalResults = new Map<string, string>()
      let changed = false
      currentAssignments.forEach((group, starId) => {
        const normalizedGroup = normalizeGroupName(group)
        const topLevel = normalizedGroup.split('/')[0] || '未命名'
        const parent = groupParentMap.get(topLevel)
        if (parent && parent !== topLevel) {
          finalResults.set(starId, `${parent}/${normalizedGroup}`)
          changed = true
        } else {
          finalResults.set(starId, normalizedGroup)
        }
      })

      if (groupParentMap.size === 0 || !changed) {
        classificationError.value = '未生成新的层级结构，AI 可能未返回有效父级信息'
        console.debug('AI hierarchy debug - no changes applied', { hierarchy, groupParentMap })
        return new Map(currentAssignments)
      }

      return finalResults
    } catch (error) {
      if (error instanceof Error && error.message === 'CLASSIFICATION_CANCELLED') {
        classificationError.value = null
        return new Map(currentAssignments)
      }
      const errorMessage = error instanceof Error ? error.message : '优化分类失败'
      classificationError.value = errorMessage
      console.error('优化分类错误:', error)
      return new Map()
    } finally {
      isClassifying.value = false
      classificationProgress.value = null
      isCancelling.value = false
    }
  }

  function clearClassification() {
    classificationError.value = null
    classificationProgress.value = null
  }

  function cancelClassification() {
    // 标记取消，并立刻隐藏加载遮罩与进度
    isCancelling.value = true
    isClassifying.value = false
    classificationProgress.value = null
    // 不设置错误信息，避免误以为失败
    // classificationError 保持不变或由调用方决定是否提示
  }

  return {
    isTranslating: computed(() => isTranslating.value),
    translationError: computed(() => translationError.value),
    translatedText: computed(() => translatedText.value),
    isClassifying: computed(() => isClassifying.value),
    classificationError: computed(() => classificationError.value),
    classificationProgress: computed(() => classificationProgress.value),
    isCancelling: computed(() => isCancelling.value),
    refineAttempts: computed(() => refineAttempts.value),
    maxRefineRounds,
    translate,
    translateToAppLanguage,
    clearTranslation,
    cancelTranslation,
    classifyStar,
    classifyStars,
    refineClassification,
    clearClassification,
    cancelClassification,
  }
}
