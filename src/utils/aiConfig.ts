/**
 * API 配置管理工具函数（使用数据库存储）
 */

import type { ApiItem, AIModuleConfig, AIModule } from '../types/ai'
import {
  loadApiItemsFromDb,
  loadApiItemByIdFromDb,
  saveApiItemToDb,
  deleteApiItemFromDb,
  loadAIModuleConfigsFromDb,
  loadAIModuleConfigByModuleFromDb,
  saveAIModuleConfigToDb,
} from './database'

/**
 * 获取所有 API 配置项
 */
export async function getAllApiItems(): Promise<ApiItem[]> {
  return await loadApiItemsFromDb()
}

/**
 * 根据 ID 获取 API 配置项
 */
export async function getApiItemById(id: string): Promise<ApiItem | null> {
  return await loadApiItemByIdFromDb(id)
}

/**
 * 创建 API 配置项
 */
export async function createApiItem(
  api: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiItem> {
  const now = Date.now()
  const newApi: ApiItem = {
    ...api,
    tags: api.tags || [],
    id: `api_${now}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  }
  await saveApiItemToDb(newApi)
  return newApi
}

/**
 * 更新 API 配置项
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
    tags: updates.tags ?? existing.tags ?? [],
    updatedAt: Date.now(),
  }

  await saveApiItemToDb(updated)
  return updated
}

/**
 * 删除 API 配置项
 */
export async function deleteApiItem(id: string): Promise<boolean> {
  try {
    // 删除 API
    await deleteApiItemFromDb(id)
    
    // 清除所有引用了该 API 的模块配置
    const moduleConfigs = await loadAIModuleConfigsFromDb()
    for (const config of moduleConfigs) {
      if (config.apiId === id) {
        await saveAIModuleConfigToDb({
          module: config.module,
          apiId: null,
          enabled: false,
        })
      }
    }
    
    return true
  } catch (error) {
    console.error('删除 API 配置项失败:', error)
    return false
  }
}

/**
 * 获取所有模块配置
 */
export async function getAllModuleConfigs(): Promise<AIModuleConfig[]> {
  return await loadAIModuleConfigsFromDb()
}

/**
 * 获取指定模块的配置
 */
export async function getModuleConfig(module: AIModule): Promise<AIModuleConfig | null> {
  return await loadAIModuleConfigByModuleFromDb(module)
}

/**
 * 保存模块配置
 */
export async function saveModuleConfig(config: AIModuleConfig): Promise<void> {
  return saveAIModuleConfigToDb(config)
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

