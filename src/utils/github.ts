/**
 * GitHub API 封装（前端侧，实际调用 Rust 命令）
 */

import { invoke } from '@tauri-apps/api/core'

// 解析出的 invoke 会缓存在这里（优先使用 window 上注入的实现）
let invokeFn: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | null = null

// 扩展 Window 类型
declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
      }
    }
    __TAURI_INTERNALS__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>
    }
  }
}

/**
 * 等待 Tauri IPC 连接建立
 * 不依赖 isTauri() 检查，直接等待 __TAURI_INTERNALS__ 或足够的时间
 */
async function waitForTauriReady(maxRetries = 100, delay = 100): Promise<void> {
  
  // 等待 window.__TAURI_INTERNALS__ 出现
  let foundInternals = false
  for (let i = 0; i < maxRetries; i++) {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      foundInternals = true
      break
    }
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  if (!foundInternals) {
    console.warn('⚠️ window.__TAURI_INTERNALS__ 未检测到')
    console.warn('⚠️ 这可能是正常的（某些 Tauri 版本可能不设置此对象）')
    console.warn('⚠️ 将尝试继续，但如果调用失败，请检查：')
    console.warn('   1. 是否通过 `pnpm tauri:dev` 启动（不是浏览器）')
    console.warn('   2. Tauri 窗口是否完全加载')
    console.warn('   3. Rust 后端是否正常编译')
  }
  
  // 无论是否找到 __TAURI_INTERNALS__，都等待额外时间让 IPC 通道完全建立
  // 这对于开发模式下的 HMR 可能特别重要
  await new Promise(resolve => setTimeout(resolve, delay * 10)) // 增加到 1 秒
}

// 初始化 invoke 函数
async function getInvoke() {
  if (invokeFn) return invokeFn
  
  // 先等待一段时间，让 Tauri 完全初始化
  await waitForTauriReady()
  
  // 检查是否真的在 Tauri 环境中（不是浏览器）
  const isBrowser = typeof window !== 'undefined' && 
    (window.navigator?.userAgent?.includes('Chrome') || 
     window.navigator?.userAgent?.includes('Firefox') ||
     window.location?.protocol === 'http:' || 
     window.location?.protocol === 'https:')
  
  if (isBrowser && !window.__TAURI_INTERNALS__) {
    console.error('❌ 检测到在浏览器环境中运行！')
    console.error('请通过 Tauri 窗口运行应用，而不是直接在浏览器中打开 localhost:1420')
    throw new Error('请在 Tauri 窗口中运行应用，而不是浏览器。请使用 `pnpm tauri:dev` 启动。')
  }
  
  // 优先直接使用 window.__TAURI_INTERNALS__.invoke（因为模块的 invoke 也依赖它）
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__?.invoke) {
    invokeFn = window.__TAURI_INTERNALS__.invoke.bind(window.__TAURI_INTERNALS__)
    return invokeFn
  }
  
  // 备用方案：使用 window.__TAURI__.core.invoke
  if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
    invokeFn = window.__TAURI__.core.invoke.bind(window.__TAURI__.core)
    return invokeFn
  }
  
  // 如果 __TAURI_INTERNALS__ 不存在，模块的 invoke 也无法工作（因为它依赖它）
  // 但我们还是尝试一下
  if (typeof invoke === 'function') {
    // 检查模块内部是否真的可以访问 __TAURI_INTERNALS__
    // 由于我们无法直接检查，只能尝试使用
    invokeFn = invoke
    console.warn('⚠️ 从 @tauri-apps/api/core 加载 invoke，但 __TAURI_INTERNALS__ 不可见')
    console.warn('⚠️ 如果调用失败，可能是 Tauri 后端未启动或窗口未正确加载')
    return invokeFn
  }
  
  throw new Error(
    '无法初始化 invoke 函数。\n' +
    '可能原因：\n' +
    '1. 应用未在 Tauri 窗口中运行（不要在浏览器中打开 localhost:1420）\n' +
    '2. Tauri 后端进程未启动\n' +
    '3. IPC 通道未建立\n' +
    '\n请确保：\n' +
    '- 使用 `pnpm tauri:dev` 启动应用\n' +
    '- 等待 Tauri 窗口完全加载\n' +
    '- 检查 Rust 后端是否正常编译和运行'
  )
}

import type { GitHubStarResponse } from '../types/api'
import type { StarItem } from '../types/star'

/**
 * 从 Rust 后端获取 GitHub Stars
 */
export async function fetchStars(token: string): Promise<StarItem[]> {
  try {
    const invoke = await getInvoke()
    
    
    try {
      const response = await invoke<GitHubStarResponse[]>('fetch_stars', { token })
    
    // 转换为前端使用的 StarItem 格式
    return response.map((star) => ({
      id: star.id.toString(),
      name: star.name,
      full_name: star.full_name,
      description: star.description,
      html_url: star.html_url,
      language: star.language,
      stargazers_count: star.stargazers_count,
      pushed_at: star.pushed_at,
      tags: [],
      groups: [],
      notes: '',
      starred_at: star.starred_at,
    }))
    } catch (invokeError) {
      console.error('invoke 调用失败:', invokeError)
      // 如果是 IPC 连接错误，尝试重新初始化
      if (invokeError instanceof Error && (
        invokeError.message.includes('invoke') ||
        invokeError.message.includes('connection') ||
        invokeError.message.includes('undefined')
      )) {
        invokeFn = null // 重置缓存的 invoke
        await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒
        const retryInvoke = await getInvoke()
        const response = await retryInvoke<GitHubStarResponse[]>('fetch_stars', { token })
        return response.map((star) => ({
          id: star.id.toString(),
          name: star.name,
          full_name: star.full_name,
          description: star.description,
          html_url: star.html_url,
          language: star.language,
          stargazers_count: star.stargazers_count,
          pushed_at: star.pushed_at,
          tags: [],
          groups: [],
          notes: '',
          starred_at: star.starred_at,
        }))
      }
      throw invokeError
    }
  } catch (error) {
    console.error('Failed to fetch stars:', error)
    if (error instanceof Error) {
      if (error.message.includes('invoke') || error.message.includes('未加载')) {
        throw new Error('无法连接到后端，请确保 Tauri 应用正常运行')
      }
      throw error
    }
    throw new Error('同步失败: ' + String(error))
  }
}
