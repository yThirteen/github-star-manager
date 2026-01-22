/**
 * 清空应用数据工具函数
 */

import { invoke } from '@tauri-apps/api/core'

export interface ClearOptions {
  starData: boolean
  apiConfig: boolean
}

function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && (
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window ||
    (window as any).__TAURI__ !== undefined
  )
}

/**
 * 清空所有应用数据
 */
export async function clearData(options: ClearOptions): Promise<void> {
  const { starData, apiConfig } = options

  if (!isTauriAvailable()) {
    console.warn('浏览器环境：无法清空数据')
    return
  }

  await invoke('clear_data', { options: { star_data: starData, api_config: apiConfig } })
}

// 兼容旧调用
export async function clearAllData(): Promise<void> {
  await clearData({ starData: true, apiConfig: true })
}

