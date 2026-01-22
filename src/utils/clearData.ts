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

  // 浏览器环境：仅能清空本地存储中的星标数据
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    if (starData) {
      localStorage.removeItem('github-star-data')
    }
    // 浏览器中没有 API 配置存储，apiConfig 选项在此环境下无效果
    return
  }

  if (!isTauriAvailable()) {
    if (starData) {
      localStorage.removeItem('github-star-data')
    }
    return
  }

  await invoke('clear_data', { options: { star_data: starData, api_config: apiConfig } })
}

// 兼容旧调用
export async function clearAllData(): Promise<void> {
  await clearData({ starData: true, apiConfig: true })
}

