/**
 * AI 功能工具函数
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * 翻译文本
 * @param text 要翻译的文本
 * @param targetLang 目标语言代码（如 "zh" 中文, "en" 英文, "ja" 日文等）
 * @param apiType api类型（仅支持 'openai'，兼容其接口规范的实现）
 * @param apiKey API Key（可选）
 * @param apiUrl API URL（可选，部分提供商或自定义端点需要）
 * @param model 模型名称（可选，仅 OpenAI 需要）
 * @returns 翻译后的文本
 */
export async function translateText(
  text: string,
  targetLang: string = 'zh',
  apiType?: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string
): Promise<string> {
  try {
    const translated = await invoke<string>('translate_text', {
      text: text.trim(),
      targetLang: targetLang,
      apiType: apiType || null,
      apiKey: apiKey || null,
      apiUrl: apiUrl || null,
      model: model || null,
    })
    return translated
  } catch (error) {
    console.error('翻译失败:', error)
    
    // 提供更友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes('Tauri') || error.message.includes('invoke')) {
        throw new Error('翻译功能需要在 Tauri 环境中运行')
      }
      throw new Error(`翻译失败: ${error.message}`)
    }
    throw new Error('翻译失败，请稍后重试')
  }
}

/**
 * 使用 AI 对仓库进行分类
 * @param repoName 仓库名称
 * @param description 仓库描述
 * @param existingGroups 现有的分组列表
 * @param apiType api类型（仅支持 'openai'，兼容其接口规范的实现）
 * @param apiKey API Key
 * @param apiUrl API URL（可选，用于兼容 OpenAI 接口的第三方服务）
 * @param model 模型名称（仅 OpenAI 需要）
 * @param promptOverride 自定义提示词（可选）
 * @returns 建议的分组名称
 */
export async function classifyRepository(
  repoName: string,
  description: string | null,
  existingGroups: string[],
  apiType: 'openai',
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  promptOverride?: string
): Promise<string> {
  try {
    const suggestedGroup = await invoke<string>('classify_repository', {
      repoName: repoName.trim(),
      description: description || null,
      existingGroups: existingGroups,
      apiType: apiType,
      apiKey: apiKey || null,
      apiUrl: apiUrl || null,
      model: model || null,
      promptOverride: promptOverride || null,
    })

    return suggestedGroup
  } catch (error) {
    console.error('AI 分类失败:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Tauri') || error.message.includes('invoke')) {
        throw new Error('AI 分类功能需要在 Tauri 环境中运行')
      }
      throw new Error(`AI 分类失败: ${error.message}`)
    }
    throw new Error('AI 分类失败，请稍后重试')
  }
}

export type GroupParent = {
  group: string
  parent: string | null
}

export async function classifyGroupsHierarchy(
  groups: string[],
  apiType: 'openai',
  apiKey?: string,
  apiUrl?: string,
  model?: string
): Promise<GroupParent[]> {
  if (!groups.length) {
    return []
  }

  try {
    const response = await invoke<GroupParent[]>('classify_groups_hierarchy', {
      groups,
      apiType: apiType,
      apiKey: apiKey || null,
      apiUrl: apiUrl || null,
      model: model || null,
    })
    return response
  } catch (error) {
    console.error('批量分组层级归类失败:', error)
    if (error instanceof Error) {
      throw new Error(`批量分组层级归类失败: ${error.message}`)
    }
    throw new Error('批量分组层级归类失败，请稍后重试')
  }
}

/**
 * 常用语言代码映射
 */
export const LANGUAGE_CODES = {
  '中文': 'zh',
  '英文': 'en',
  '日文': 'ja',
  '韩文': 'ko',
  '法文': 'fr',
  '德文': 'de',
  '西班牙文': 'es',
  '俄文': 'ru',
  '葡萄牙文': 'pt',
} as const

export type LanguageName = keyof typeof LANGUAGE_CODES

