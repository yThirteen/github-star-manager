/**
 * API 供应商相关类型定义
 */

/**
 * API 协议：决定请求怎么发、响应怎么解析。
 * 每一种取值都必须在 src-tauri/src/commands/ai.rs 里有对应实现。
 */
export type ApiType = 'openai' | 'anthropic' | 'gemini' | 'ollama'

/** 一种协议的必填项 */
export interface ApiProtocol {
  /** 协议标识（存库值） */
  value: ApiType
  /** 是否必须填写 API 密钥 */
  requiresKey: boolean
  /** 是否必须填写 API 地址 */
  requiresUrl: boolean
  /** 是否必须指定模型 */
  requiresModel: boolean
}

/**
 * 支持的协议清单：界面上的协议下拉与必填校验都据此判断。
 */
export const API_PROTOCOLS: ApiProtocol[] = [
  { value: 'openai', requiresKey: true, requiresUrl: true, requiresModel: true },
  { value: 'anthropic', requiresKey: true, requiresUrl: true, requiresModel: true },
  { value: 'gemini', requiresKey: true, requiresUrl: true, requiresModel: true },
  { value: 'ollama', requiresKey: false, requiresUrl: true, requiresModel: true },
]

/** 查协议定义；老数据库里可能残留已移除的取值，所以返回值可能为 undefined */
export function getApiProtocol(apiType: string | undefined): ApiProtocol | undefined {
  return API_PROTOCOLS.find((protocol) => protocol.value === apiType)
}

/**
 * API 供应商（所有供应商都由用户创建和管理）
 */
export interface ApiItem {
  id: string // 唯一标识符
  name: string // 供应商名称（用户自定义）
  apiType: ApiType // API 协议
  apiKey?: string // API Key（某些协议可能不需要）
  apiUrl?: string // API URL（某些协议可能不需要）
  model?: string // 模型名称（如 deepseek-chat、claude-3-5-sonnet-latest）
  description?: string // 描述信息
  createdAt: number // 创建时间戳
  updatedAt: number // 更新时间戳
}
