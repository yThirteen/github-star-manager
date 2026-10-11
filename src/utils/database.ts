/**
 * SQLite 数据库工具函数（通过 Rust 后端）
 */

// 静态导入：动态 import 反而会触发 "同时被静态与动态导入，dynamic import will not
// move module into another chunk" 警告（其他模块本就静态导入了 @tauri-apps/api/core）。
import { invoke } from '@tauri-apps/api/core'
import type { StarItem, SyncMetadata } from '../types/star'
import type { ApiItem, AIModuleConfig } from '../types/ai'

export interface GithubTokenInfo {
  token: string
  createdAt: string
  expiresAt?: string
  scopes?: string[]
  username?: string
}

interface GithubTokenVerificationResult {
  valid: boolean
  username?: string
  scopes?: string[]
  message?: string
}

/**
 * 检查是否在 Tauri 环境中
 */
export function isTauriAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const w = window as typeof window & {
    __TAURI__?: {
      invoke?: unknown
      core?: unknown
    }
    __TAURI_INTERNALS__?: unknown
  }

  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__?.invoke || w.__TAURI__?.core)
}

/**
 * 加载所有 stars
 */
export async function loadStarsFromDb(): Promise<StarItem[]> {
  if (!isTauriAvailable()) return []
  
  try {
    return await invoke<StarItem[]>('load_stars')
  } catch (error) {
    console.error('加载 stars 失败:', error)
    return []
  }
}

/**
 * 批量保存 stars（使用事务）
 */
export async function saveStarsToDb(stars: StarItem[]): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_stars_batch', { stars })
  } catch (error) {
    console.error('批量保存 stars 失败:', error)
    throw error
  }
}

/**
 * 删除 star
 */
export async function deleteStarFromDb(starId: string): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('delete_star', { id: starId })
  } catch (error) {
    console.error('删除 star 失败:', error)
    throw error
  }
}

/**
 * 加载同步元数据
 */
export async function loadMetaFromDb(): Promise<SyncMetadata> {
  if (!isTauriAvailable()) {
    return { last_sync: '', total_count: 0, synced_by: '' }
  }
  
  try {
    return await invoke<SyncMetadata>('load_metadata')
  } catch (error) {
    console.error('加载元数据失败:', error)
    return { last_sync: '', total_count: 0, synced_by: '' }
  }
}

/**
 * 保存同步元数据
 */
export async function saveMetaToDb(meta: SyncMetadata): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_metadata', { meta })
  } catch (error) {
    console.error('保存元数据失败:', error)
    throw error
  }
}

/**
 * 加载分组排序信息
 */
export async function loadGroupOrderFromDb(): Promise<Record<string, number>> {
  if (!isTauriAvailable()) return {}
  
  try {
    return await invoke<Record<string, number>>('load_group_order')
  } catch (error) {
    console.error('加载分组排序失败:', error)
    return {}
  }
}

/**
 * 保存分组排序信息
 */
export async function saveGroupOrderToDb(groupOrder: Record<string, number>): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_group_order', { order: groupOrder })
  } catch (error) {
    console.error('保存分组排序失败:', error)
    throw error
  }
}

/**
 * 加载所有 groups
 */
export async function loadGroupsFromDb(): Promise<string[]> {
  if (!isTauriAvailable()) return []
  
  try {
    return await invoke<string[]>('load_groups')
  } catch (error) {
    console.error('加载 groups 失败:', error)
    return []
  }
}

/**
 * 保存 groups（全量替换）
 */
export async function saveGroupsToDb(groups: string[]): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_groups', { groups })
  } catch (error) {
    console.error('保存 groups 失败:', error)
    throw error
  }
}

/**
 * 加载所有 tags
 */
export async function loadTagsFromDb(): Promise<string[]> {
  if (!isTauriAvailable()) return []
  
  try {
    return await invoke<string[]>('load_tags')
  } catch (error) {
    console.error('加载 tags 失败:', error)
    return []
  }
}

/**
 * 保存 tags（全量替换）
 */
export async function saveTagsToDb(tags: string[]): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_tags', { tags })
  } catch (error) {
    console.error('保存 tags 失败:', error)
    throw error
  }
}

/**
 * API 配置数据库操作
 */

/**
 * 加载所有 API 配置项
 */
export async function loadApiItemsFromDb(): Promise<ApiItem[]> {
  if (!isTauriAvailable()) return []
  
  try {
    return await invoke<ApiItem[]>('load_api_items')
  } catch (error) {
    console.error('加载 API 配置失败:', error)
    return []
  }
}

/**
 * 根据 ID 加载单个 API 配置项
 */
export async function loadApiItemByIdFromDb(id: string): Promise<ApiItem | null> {
  if (!isTauriAvailable()) return null
  
  try {
    const items = await loadApiItemsFromDb()
    return items.find(item => item.id === id) || null
  } catch (error) {
    console.error('加载 API 配置失败:', error)
    return null
  }
}

/**
 * 保存 API 配置项
 */
export async function saveApiItemToDb(api: ApiItem): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_api_item', { api })
  } catch (error) {
    console.error('保存 API 配置失败:', error)
    throw error
  }
}

/**
 * 删除 API 配置项
 */
export async function deleteApiItemFromDb(id: string): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('delete_api_item', { id })
  } catch (error) {
    console.error('删除 API 配置失败:', error)
    throw error
  }
}

/**
 * 加载所有 AI 模块配置
 */
export async function loadAIModuleConfigsFromDb(): Promise<AIModuleConfig[]> {
  if (!isTauriAvailable()) return []
  
  try {
    return await invoke<AIModuleConfig[]>('load_ai_module_configs')
  } catch (error) {
    console.error('加载 AI 模块配置失败:', error)
    return []
  }
}

/**
 * 根据模块加载 AI 模块配置
 */
export async function loadAIModuleConfigByModuleFromDb(module: string): Promise<AIModuleConfig | null> {
  if (!isTauriAvailable()) return null
  
  try {
    const configs = await loadAIModuleConfigsFromDb()
    return configs.find(config => config.module === module) || null
  } catch (error) {
    console.error('加载 AI 模块配置失败:', error)
    return null
  }
}

/**
 * 保存 AI 模块配置
 */
export async function saveAIModuleConfigToDb(config: AIModuleConfig): Promise<void> {
  if (!isTauriAvailable()) return
  
  try {
    await invoke('save_ai_module_config', { config })
  } catch (error) {
    console.error('保存 AI 模块配置失败:', error)
    throw error
  }
}

/**
 * GitHub Token 数据库操作
 */

export async function loadGithubTokenFromDb(): Promise<GithubTokenInfo | null> {
  if (!isTauriAvailable()) {
    return null
  }

  try {
    return await invoke<GithubTokenInfo | null>('load_github_token')
  } catch (error) {
    console.error('加载 GitHub Token 失败:', error)
    return null
  }
}

export async function saveGithubTokenToDb(info: GithubTokenInfo): Promise<void> {
  if (!isTauriAvailable()) {
    return
  }

  try {
    await invoke('save_github_token', { info })
  } catch (error) {
    console.error('保存 GitHub Token 失败:', error)
    throw error
  }
}

export async function deleteGithubTokenFromDb(): Promise<void> {
  if (!isTauriAvailable()) {
    return
  }

  try {
    await invoke('delete_github_token')
  } catch (error) {
    console.error('删除 GitHub Token 失败:', error)
    throw error
  }
}

export async function verifyGithubTokenViaBackend(token: string): Promise<GithubTokenVerificationResult | null> {
  if (!isTauriAvailable()) {
    return null
  }

  try {
    const result = await invoke<GithubTokenVerificationResult>('verify_github_token', { token })
    return {
      valid: result.valid,
      username: result.username,
      scopes: result.scopes ?? [],
      message: result.message,
    }
  } catch (error) {
    console.error('验证 GitHub Token 失败:', error)
    return {
      valid: false,
      scopes: [],
      message: error instanceof Error ? error.message : '验证失败',
    }
  }
}

