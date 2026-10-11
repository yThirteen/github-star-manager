/**
 * 内置配置初始化工具
 */

import {
  createApiItem,
  getAllApiItems,
  getAllModuleConfigs,
  saveModuleConfig,
} from './aiConfig'
import type { ApiItem, AIModuleConfig } from '../types/ai'

/**
 * 内置谷歌翻译API配置
 */
const BUILTIN_GOOGLE_TRANSLATE_API: Omit<ApiItem, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Google Translate (内置)',
  apiType: 'google',
  apiKey: '',
  apiUrl: 'https://translate.googleapis.com/translate_a/single',
  description: '免费的 Google 翻译服务(需要科学上网)，已内置到应用中',
  tags: ['translate'],
}

/**
 * 内置翻译模块配置
 */
const BUILTIN_TRANSLATE_MODULE_CONFIG: AIModuleConfig = {
  module: 'translate',
  apiId: '', // 将在初始化时设置
  enabled: true,
}

/**
 * 检查是否已经存在内置的谷歌翻译API
 */
async function hasBuiltinGoogleTranslate(): Promise<boolean> {
  try {
    const apis = await getAllApiItems()
    return apis.some(api => 
      api.apiType === 'google' && 
      api.name.includes('内置') &&
      api.apiUrl === 'https://translate.googleapis.com/translate_a/single'
    )
  } catch (error) {
    console.error('检查内置配置失败:', error)
    return false
  }
}

/**
 * 检查翻译模块是否已经配置
 */
async function hasTranslateModuleConfig(): Promise<boolean> {
  try {
    const configs = await getAllModuleConfigs()
    return configs.some(config => config.module === 'translate' && config.enabled)
  } catch (error) {
    console.error('检查翻译模块配置失败:', error)
    return false
  }
}

/**
 * 初始化内置的谷歌翻译API配置
 */
async function initBuiltinGoogleTranslate(): Promise<void> {
  try {
    // 如果已经存在内置配置，则跳过
    if (await hasBuiltinGoogleTranslate()) {
      return
    }

    // 创建内置API配置
    const googleApi = await createApiItem(BUILTIN_GOOGLE_TRANSLATE_API)

    // 检查翻译模块配置
    if (!(await hasTranslateModuleConfig())) {
      // 配置翻译模块使用内置的Google API
      const translateConfig: AIModuleConfig = {
        ...BUILTIN_TRANSLATE_MODULE_CONFIG,
        apiId: googleApi.id,
      }
      await saveModuleConfig(translateConfig)
    }

  } catch (error) {
    console.error('初始化内置 Google Translate API 失败:', error)
  }
}

/**
 * 初始化所有内置配置
 */
export async function initBuiltinConfigs(): Promise<void> {
  await initBuiltinGoogleTranslate()
}
