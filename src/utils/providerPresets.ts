/**
 * 常见供应商预设：新建供应商时选一个预设即可自动填好 API 地址与推荐模型。
 */

import type { ApiType } from '../types/ai'

export interface ProviderPreset {
  /** 预设标识 */
  id: string
  /** 供应商名称（同时也是新建供应商时的默认名称） */
  label: string
  /** API 类型 */
  apiType: ApiType
  /** API 地址（基础地址即可，请求时会自动补全 /chat/completions） */
  apiUrl: string
  /** 推荐模型 */
  model: string
  /** 是否需要 API Key */
  requiresKey: boolean
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    apiType: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    requiresKey: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiType: 'openai',
    apiUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    requiresKey: true,
  },
  {
    id: 'moonshot',
    label: 'Moonshot (Kimi)',
    apiType: 'openai',
    apiUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    requiresKey: true,
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    apiType: 'openai',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    requiresKey: true,
  },
  {
    id: 'qwen',
    label: '阿里通义千问',
    apiType: 'openai',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    requiresKey: true,
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    apiType: 'openai',
    apiUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    requiresKey: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    apiType: 'openai',
    apiUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    requiresKey: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    apiType: 'anthropic',
    apiUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-latest',
    requiresKey: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    apiType: 'gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    requiresKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama（本地）',
    apiType: 'ollama',
    apiUrl: 'http://localhost:11434',
    model: 'llama3.2',
    requiresKey: false,
  },
  {
    id: 'custom',
    label: '自定义',
    apiType: 'openai',
    apiUrl: '',
    model: '',
    requiresKey: true,
  },
]
