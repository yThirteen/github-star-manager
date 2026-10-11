/**
 * API 配置相关类型定义
 */

/**
 * API 模块类型
 */
export type AIModule = 'translate' | 'classify' | 'chat'

/**
 * API 提供商类型   当要支持新的 API 提供商时，可以在这里添加新的类型
 */
export type ApiType = 'openai' | 'google' 

/**
 * API 配置项（所有 API 都由用户创建和管理）
 */
export interface ApiItem {
  id: string // 唯一标识符
  name: string // API 名称（用户自定义）
  apiType: ApiType // API 类型
  apiKey?: string // API Key（某些类型可能不需要）
  apiUrl?: string // API URL（某些类型可能不需要）
  model?: string // 模型名称（Deepseek 的 deepseek-chat 模型等）
  description?: string // 描述信息
  tags?: AIModule[] // 支持的功能标签（可多选）
  createdAt: number // 创建时间戳
  updatedAt: number // 更新时间戳
}

/**
 * AI 模块配置（每个模块关联一个 API）
 */
export interface AIModuleConfig {
  module: AIModule
  apiId: string | null // 关联的 API ID，null 表示未配置
  enabled: boolean // 是否启用该模块
}

/**
 * AI 模块信息
 */
export interface AIModuleInfo {
  id: AIModule
  name: string
  description: string
  icon: string
}

/**
 * 预定义的 AI 模块信息
 */
export const AI_MODULES: Record<AIModule, AIModuleInfo> = {
  translate: {
    id: 'translate',
    name: '翻译 API',
    description: '用于翻译仓库描述',
    icon: '🌐',
  },
  classify: {
    id: 'classify',
    name: '分类 API',
    description: '用于AI分类仓库',
    icon: '📂',
  },
  chat: {
    id: 'chat',
    name: '对话 API',
    description: '用于 AI 对话功能（预留功能）',
    icon: '💬',
  },
}

