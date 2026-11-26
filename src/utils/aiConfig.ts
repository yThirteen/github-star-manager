/**
 * API 供应商配置管理工具函数（使用数据库存储）
 */

import { getApiProtocol, type ApiItem } from '../types/ai'
import {
  loadApiItemsFromDb,
  loadApiItemByIdFromDb,
  saveApiItemToDb,
  deleteApiItemFromDb,
} from './database'

/** 用户选定的默认供应商（localStorage） */
const DEFAULT_PROVIDER_KEY = 'ai.defaultProviderId'

/**
 * 获取所有供应商，按创建时间倒序（最新添加的排在前面）
 */
export async function getAllApiItems(): Promise<ApiItem[]> {
  const items = await loadApiItemsFromDb()
  return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * 根据 ID 获取供应商
 */
export async function getApiItemById(id: string): Promise<ApiItem | null> {
  return await loadApiItemByIdFromDb(id)
}

/**
 * 创建供应商
 */
export async function createApiItem(
  api: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiItem> {
  const now = Date.now()
  const newApi: ApiItem = {
    ...api,
    id: `api_${now}_${Math.random().toString(36).slice(2, 11)}`,
    createdAt: now,
    updatedAt: now,
  }
  await saveApiItemToDb(newApi)
  return newApi
}

/**
 * 更新供应商
 */
export async function updateApiItem(
  id: string,
  updates: Partial<Omit<ApiItem, 'id' | 'createdAt'>>
): Promise<ApiItem | null> {
  const existing = await getApiItemById(id)
  if (!existing) {
    return null
  }

  const updated: ApiItem = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  }

  await saveApiItemToDb(updated)
  return updated
}

/**
 * 删除供应商
 */
export async function deleteApiItem(id: string): Promise<boolean> {
  try {
    await deleteApiItemFromDb(id)
    if (getDefaultProviderId() === id) {
      setDefaultProviderId(null)
    }
    return true
  } catch (error) {
    console.error('删除供应商失败:', error)
    return false
  }
}

/**
 * 格式化 API Key（用于显示）
 */
export function formatApiKey(apiKey: string | undefined): string {
  if (!apiKey) {
    return ''
  }
  if (apiKey.length <= 8) {
    return apiKey
  }
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
}

/**
 * 读取用户选定的默认供应商 ID（未设置时返回空串）
 */
export function getDefaultProviderId(): string {
  try {
    return localStorage.getItem(DEFAULT_PROVIDER_KEY) ?? ''
  } catch (error) {
    console.warn('读取默认供应商失败:', error)
    return ''
  }
}

/**
 * 设置默认供应商（传 null 表示清除）
 */
export function setDefaultProviderId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(DEFAULT_PROVIDER_KEY, id)
    } else {
      localStorage.removeItem(DEFAULT_PROVIDER_KEY)
    }
  } catch (error) {
    console.warn('保存默认供应商失败:', error)
  }
}

/** 配置类错误的错误码，界面按当前语言查表展示 */
export type AiConfigErrorCode =
  | 'providerNotConfigured'
  | 'providerMissing'
  | 'unsupportedApiType'
  | 'missingApiKey'
  | 'missingApiUrl'
  | 'missingModel'

/** AI 配置不可用；message 即错误码，展示文案由调用方翻译 */
export class AiConfigError extends Error {
  readonly code: AiConfigErrorCode

  constructor(code: AiConfigErrorCode) {
    super(code)
    this.name = 'AiConfigError'
    this.code = code
  }
}

/**
 * 判断某个供应商能否用于当前场景（不做网络请求）。
 * 返回 null 表示可用，否则返回不可用的原因。
 */
export function providerProblem(api: ApiItem): AiConfigErrorCode | null {
  const protocol = getApiProtocol(api.apiType)
  if (!protocol) {
    return 'unsupportedApiType'
  }
  if (protocol.requiresKey && !api.apiKey?.trim()) {
    return 'missingApiKey'
  }
  if (protocol.requiresUrl && !api.apiUrl?.trim()) {
    return 'missingApiUrl'
  }
  if (protocol.requiresModel && !api.model?.trim()) {
    return 'missingModel'
  }
  return null
}

/**
 * 列出当前可直接使用的供应商（按创建时间倒序）
 */
export async function getUsableProviders(): Promise<ApiItem[]> {
  const all = await getAllApiItems()
  return all.filter((api) => providerProblem(api) === null)
}

/**
 * 取出一次 AI 调用要使用的供应商：优先默认供应商，其次第一个可用供应商。
 * 都不满足时抛出带错误码的 AiConfigError，界面据此给出明确提示。
 */
export async function resolveProvider(
  options: { defaultProviderId?: string } = {}
): Promise<ApiItem> {
  const all = await getAllApiItems()
  if (!all.length) {
    throw new AiConfigError('providerNotConfigured')
  }

  const defaultId = options.defaultProviderId ?? getDefaultProviderId()
  const preferred = defaultId ? all.find((api) => api.id === defaultId) : undefined

  if (preferred && providerProblem(preferred) === null) {
    return preferred
  }

  const usable = all.find((api) => providerProblem(api) === null)
  if (usable) {
    return usable
  }

  const fallback = preferred ?? all[0]
  throw new AiConfigError(providerProblem(fallback) ?? 'providerNotConfigured')
}
