/**
 * AI 功能工具函数
 */

import { invoke } from '@tauri-apps/api/core'
import type { ApiType } from '../types/ai'

/**
 * 把任意抛出物转成可展示的文案。
 * Tauri 对 Rust 的 `Err(String)` reject 的是字符串而不是 Error 实例，
 * 所以这里必须先处理字符串，否则真实原因（如 401、缺少 API Key）会被丢掉。
 */
export function toErrorMessage(error: unknown, fallback = ''): string {
  if (typeof error === 'string') {
    return error.trim() || fallback
  }
  if (error instanceof Error) {
    return error.message.trim() || fallback
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message.trim() || fallback
    }
  }
  return fallback
}

/**
 * 翻译文本
 * @param text 要翻译的文本
 * @param targetLang 目标语言代码（如 "zh" 中文, "en" 英文, "ja" 日文等）
 * @param apiType api 协议（openai / anthropic / gemini / ollama）
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
    // 保留后端给出的真实原因，交给上层决定如何翻译展示
    throw new Error(toErrorMessage(error))
  }
}

/**
 * 使用 AI 对仓库进行分类
 * @param repoName 仓库名称
 * @param description 仓库描述
 * @param existingGroups 现有的分组列表
 * @param apiType api 协议（openai / anthropic / gemini / ollama）
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
  apiType: ApiType,
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
    throw new Error(toErrorMessage(error))
  }
}

export type GroupParent = {
  group: string
  parent: string | null
}

export async function classifyGroupsHierarchy(
  groups: string[],
  apiType: ApiType,
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
    throw new Error(toErrorMessage(error))
  }
}

/**
 * 查询供应商端点当前提供的模型列表。
 *
 * apiType 决定请求哪一套模型接口（OpenAI `GET /models`、Anthropic `GET /v1/models`、
 * Gemini `GET /v1beta/models`、Ollama `GET /api/tags`）；apiKey 为空时只发送匿名请求。
 */
export async function listProviderModels(
  apiType: ApiType,
  apiUrl: string,
  apiKey?: string
): Promise<string[]> {
  try {
    const response = await invoke<string[]>('list_provider_models', {
      apiType,
      apiUrl: apiUrl.trim(),
      apiKey: apiKey?.trim() || null,
    })
    return response
  } catch (error) {
    throw new Error(toErrorMessage(error))
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

