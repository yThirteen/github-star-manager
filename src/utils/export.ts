/**
 * 数据导出/导入工具函数
 */

import { invoke } from '@tauri-apps/api/core'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import type { StarData } from '../types/star'
import {
  loadStarsFromDb,
  loadMetaFromDb,
  loadGroupsFromDb,
  loadTagsFromDb,
  loadGroupOrderFromDb,
} from './database'

// 导出选项接口
export interface ExportOptions {
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
 * 导出数据为 JSON 文件
 */
export async function exportData(options?: ExportOptions): Promise<boolean> {
  // 默认导出所有数据
  const exportOpts: ExportOptions = options || {
    starData: true,
    apiConfig: false,
  }

  const isTauri = isTauriAvailable()

  if (!isTauri) {
    const data = await loadSelectedData(exportOpts)
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `github-star-manager-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  }

  try {
    const dialogModule = await import('@tauri-apps/plugin-dialog')
    if (!dialogModule.save) {
      throw new Error('Dialog save 函数不可用')
    }

    const filePath = await dialogModule.save({
      defaultPath: `github-star-manager-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (!filePath) {
      return false
    }

    const data = await loadSelectedData(exportOpts)
    const jsonStr = JSON.stringify(data, null, 2)

    try {
      await writeTextFile(filePath, jsonStr)
      return true
    } catch (fsError) {
      console.warn('FS 插件写入失败，尝试备用方案:', fsError)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath.split(/[/\\]/).pop() || 'backup.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    }
  } catch (error) {
    console.error('导出失败:', error)
    throw error
  }
}

/**
 * 根据选项加载数据
 */
async function loadSelectedData(options: ExportOptions): Promise<any> {
  const result: any = {}

  if (options.starData) {
    if (!isTauriAvailable()) {
      const stored = localStorage.getItem('github-star-data')
      if (stored) {
        const parsed = JSON.parse(stored) as StarData
        result.stars = parsed.stars || []
        result.meta = parsed.meta || { last_sync: '', total_count: 0, synced_by: '' }
        result.groups = parsed.groups || []
        result.tags = parsed.tags || []
        result.groupOrder = parsed.groupOrder || {}
      } else {
        result.stars = []
        result.meta = { last_sync: '', total_count: 0, synced_by: '' }
        result.groups = []
        result.tags = []
        result.groupOrder = {}
      }
    } else {
      try {
        const [stars, meta, groups, tags, groupOrder] = await Promise.all([
          loadStarsFromDb(),
          loadMetaFromDb(),
          loadGroupsFromDb(),
          loadTagsFromDb(),
          loadGroupOrderFromDb(),
        ])
        result.stars = stars
        result.meta = meta
        result.groups = groups
        result.tags = tags
        result.groupOrder = groupOrder
      } catch (error) {
        console.error('加载星标数据失败:', error)
        throw error
      }
    }
  }

  if (options.apiConfig) {
    if (!isTauriAvailable()) {
      // 浏览器环境：API 配置不存储在 localStorage 中，返回空对象
      console.log('浏览器环境：API 配置不存储，返回空对象')
      result.apiConfig = {}
    } else {
      // Tauri 环境：从数据库加载 API 配置
      try {
        console.log('Tauri 环境：开始加载 API 配置')
        const { getAllApiItems, getAllModuleConfigs } = await import('./aiConfig')
        const [apis, configs] = await Promise.all([
          getAllApiItems(),
          getAllModuleConfigs(),
        ])
        console.log('API 配置加载成功:', { apisCount: apis.length, configsCount: configs.length })
        result.apiConfig = {
          apis,
          moduleConfigs: configs,
        }
      } catch (error) {
        console.error('加载 API 配置失败:', error)
        result.apiConfig = {}
      }
    }
  }

  return result
}


/**
 * 选择并解析导入文件（不执行导入）
 */
export async function selectImportFile(): Promise<any | null> {
  if (!isTauriAvailable()) {
    // 浏览器环境：使用文件输入
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        try {
          const text = await file.text()
          const data = JSON.parse(text)
          
          // 验证数据格式
          if (!validateDataFormat(data)) {
            alert('文件格式不正确，请确保是有效的备份文件')
            resolve(null)
            return
          }

          // 返回解析后的数据，不执行导入
          resolve(data)
        } catch (error) {
          console.error('解析文件失败:', error)
          alert(`解析文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
          resolve(null)
        }
      }
      input.click()
    })
  }

  // Tauri 环境：使用文件对话框
  try {
    console.log('=== 导入数据 ===')
    console.log('Tauri 环境，使用文件对话框导入')
    console.log('尝试导入 @tauri-apps/plugin-dialog...')
    const dialogModule = await import('@tauri-apps/plugin-dialog')
    console.log('Dialog 模块导入成功:', dialogModule)
    console.log('Dialog 模块的键:', Object.keys(dialogModule))
    
    // 检查 open 函数是否存在
    if (!dialogModule.open) {
      console.error('Dialog 模块中没有 open 函数')
      throw new Error('Dialog open 函数不可用')
    }
    
    console.log('调用 open 函数...')
    const filePath = await dialogModule.open({
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    }) as string | null
    
    console.log('选择的文件路径:', filePath)

    if (!filePath || typeof filePath !== 'string') {
      console.log('用户取消了文件选择或路径无效')
      return null
    }

    console.log('开始读取文件...')
    const content = await readTextFile(filePath)
    console.log('文件读取成功，长度:', content.length)
    const data = JSON.parse(content)
    console.log('JSON 解析成功')

    // 验证数据格式
    if (!validateDataFormat(data)) {
      alert('文件格式不正确，请确保是有效的备份文件')
      return null
    }

    // 返回解析后的数据，不执行导入
    return data
  } catch (error) {
    console.error('选择文件失败:', error)
    throw error
  }
}


/**
 * 执行导入（只执行导入操作，不包含文件选择和确认）
 */
export async function executeImport(data: StarData): Promise<boolean> {
  try {
    // 验证数据格式
    if (!validateDataFormat(data)) {
      throw new Error('INVALID_BACKUP_FILE')
    }

    await performImport(data)
    return true
  } catch (error) {
    console.error('导入失败:', error)
    throw error
  }
}

/**
 * 验证数据格式
 */
function validateDataFormat(data: any): data is StarData {
  if (!data || typeof data !== 'object') {
    return false
  }

  // 如果是只导出 API 配置的情况，只验证 apiConfig 字段
  if (data.apiConfig && !data.stars && !data.meta && !data.groups && !data.tags) {
    // 只有 apiConfig 的情况
    return typeof data.apiConfig === 'object' && data.apiConfig !== null
  }

  // 检查基本结构（星标数据）
  if (data.stars !== undefined && !Array.isArray(data.stars)) {
    return false
  }

  if (data.meta !== undefined && typeof data.meta !== 'object') {
    return false
  }

  if (data.groups !== undefined && !Array.isArray(data.groups)) {
    return false
  }

  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    return false
  }

  if (data.groupOrder !== undefined && typeof data.groupOrder !== 'object') {
    return false
  }

  // 如果有 stars 数据，验证 stars 结构
  if (data.stars && Array.isArray(data.stars)) {
    for (const star of data.stars) {
      if (!star.id || !star.name || !star.full_name || !star.html_url) {
        return false
      }
    }
  }

  return true
}

/**
 * 执行导入操作
 */
async function performImport(data: any): Promise<void> {
  // 处理 API 配置导入（无论是否同时有星标数据）
  if (data.apiConfig && isTauriAvailable()) {
    try {
      console.log('开始导入 API 配置')
      const { createApiItem, saveModuleConfig } = await import('./aiConfig')
      
      // 导入 API 配置
      if (data.apiConfig.apis && Array.isArray(data.apiConfig.apis)) {
        console.log('导入', data.apiConfig.apis.length, '个 API 配置')
        for (const api of data.apiConfig.apis) {
          try {
            await createApiItem({
              name: api.name,
              apiType: api.apiType,
              apiKey: api.apiKey,
              apiUrl: api.apiUrl,
              model: api.model,
              tags: api.tags || [],
              description: api.description || '',
            })
            console.log('API 配置导入成功:', api.name)
          } catch (error) {
            console.error('导入 API 配置失败:', api.name, error)
          }
        }
      }

      // 导入模块配置
      if (data.apiConfig.moduleConfigs && Array.isArray(data.apiConfig.moduleConfigs)) {
        console.log('导入', data.apiConfig.moduleConfigs.length, '个模块配置')
        for (const config of data.apiConfig.moduleConfigs) {
          try {
            await saveModuleConfig(config)
            console.log('模块配置导入成功:', config.module)
          } catch (error) {
            console.error('导入模块配置失败:', config.module, error)
          }
        }
      }

      console.log('API 配置导入完成')
    } catch (error) {
      console.error('API 配置导入失败:', error)
      // 不抛出错误，让星标数据导入继续进行
    }
  } else if (data.apiConfig && !isTauriAvailable()) {
    console.log('浏览器环境：跳过 API 配置导入')
  }

  // 处理星标数据导入（如果存在）
  if (data.stars) {
    if (!isTauriAvailable()) {
      // 浏览器环境：保存到 localStorage
      localStorage.setItem('github-star-data', JSON.stringify(data))
      // 刷新页面以加载新数据
      window.location.reload()
      return
    }

    // Tauri 环境：导入到数据库
    const payload: StarData = {
      ...data,
      groupOrder: data.groupOrder || {},
    }

    await invoke('import_all_data', { data: payload })

    // 重新加载数据到 store
    const { useStarStore } = await import('../stores/starStore')
    const starStore = useStarStore()
    await starStore.reload()
  }
}

