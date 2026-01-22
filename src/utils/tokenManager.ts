/**
 * GitHub Token 管理工具
 */

import { clearTokenCheckCache } from './tokenCheck'
import {
  loadGithubTokenFromDb,
  saveGithubTokenToDb,
  deleteGithubTokenFromDb,
  type GithubTokenInfo,
  verifyGithubTokenViaBackend,
  isTauriAvailable,
} from './database'

export interface TokenInfo {
  token: string
  createdAt: string // ISO 8601 格式
  expiresAt?: string // ISO 8601 格式（如果设置了过期时间）
  scopes?: string[]
  username?: string // GitHub 用户名
}

let cachedTokenInfo: TokenInfo | null = null
let tokenCacheLoaded = false

function normalizeTokenInfo(info: GithubTokenInfo | null): TokenInfo | null {
  if (!info) {
    return null
  }

  return {
    token: info.token,
    createdAt: info.createdAt,
    expiresAt: info.expiresAt,
    scopes: info.scopes && info.scopes.length > 0 ? info.scopes : [],
    username: info.username,
  }
}

async function refreshTokenCache(): Promise<TokenInfo | null> {
  const info = await loadGithubTokenFromDb()
  cachedTokenInfo = normalizeTokenInfo(info)
  tokenCacheLoaded = true
  return cachedTokenInfo
}

async function persistTokenInfo(info: TokenInfo): Promise<void> {
  const payload: GithubTokenInfo = {
    token: info.token,
    createdAt: info.createdAt,
    expiresAt: info.expiresAt,
    scopes: info.scopes && info.scopes.length > 0 ? info.scopes : [],
    username: info.username,
  }

  await saveGithubTokenToDb(payload)
  cachedTokenInfo = {
    ...info,
    scopes: payload.scopes,
  }
  tokenCacheLoaded = true
}

/**
 * 获取存储的 token
 */
export async function getStoredToken(): Promise<string | null> {
  const info = await getTokenInfo()
  return info?.token ?? null
}

/**
 * 获取 token 信息
 */
export async function getTokenInfo(): Promise<TokenInfo | null> {
  if (!tokenCacheLoaded) {
    await refreshTokenCache()
  }
  return cachedTokenInfo
}

/**
 * 强制刷新 token 缓存
 */
export async function reloadTokenInfo(): Promise<TokenInfo | null> {
  return refreshTokenCache()
}

/**
 * 保存 token
 * @param token - GitHub token
 */
export async function saveToken(token: string): Promise<void> {
  const existing = await getTokenInfo()
  const createdAtSource = existing && existing.token === token ? existing.createdAt : new Date().toISOString()

  const tokenInfo: TokenInfo = {
    token,
    createdAt: createdAtSource,
    expiresAt: existing && existing.token === token ? existing.expiresAt : undefined,
    scopes: existing && existing.token === token ? existing.scopes : [],
    username: existing && existing.token === token ? existing.username : undefined,
  }

  await persistTokenInfo(tokenInfo)
  clearTokenCheckCache()
}

/**
 * 删除 token
 */
export async function deleteToken(): Promise<void> {
  await deleteGithubTokenFromDb()
  cachedTokenInfo = null
  tokenCacheLoaded = true
  clearTokenCheckCache()
}

/**
 * 验证 token 并获取用户信息
 */
export async function verifyToken(token: string): Promise<{
  valid: boolean
  username?: string
  expiresAt?: string
  error?: string
}> {
  try {
    const existingInfo = await getTokenInfo()

    if (isTauriAvailable()) {
      const backendResult = await verifyGithubTokenViaBackend(token)
      if (backendResult) {
        if (!backendResult.valid) {
          return {
            valid: false,
            error: backendResult.message || 'Token 无效或已过期',
          }
        }

        const tokenInfo: TokenInfo = {
          token,
          createdAt: existingInfo && existingInfo.token === token
            ? existingInfo.createdAt
            : new Date().toISOString(),
          scopes: backendResult.scopes && backendResult.scopes.length > 0 ? backendResult.scopes : [],
          username: backendResult.username,
          expiresAt: existingInfo && existingInfo.token === token ? existingInfo.expiresAt : undefined,
        }

        await persistTokenInfo(tokenInfo)

        return {
          valid: true,
          username: backendResult.username,
        }
      }
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        // 使用 Bearer 提高对细粒度 PAT 的兼容性
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        // 浏览器环境无法设置 User-Agent，Tauri/桌面环境会忽略此限制
        'User-Agent': 'github-star-manage',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: 'Token 无效或已过期' }
      }
      return { valid: false, error: `验证失败: ${response.statusText}` }
    }

    const user = await response.json()

    const scopesHeader = response.headers.get('X-OAuth-Scopes')
    const scopes = scopesHeader
      ? scopesHeader
          .split(',')
          .map(scope => scope.trim())
          .filter(scope => scope.length > 0)
      : []

    const tokenInfo: TokenInfo = {
      token,
      createdAt: existingInfo && existingInfo.token === token ? existingInfo.createdAt : new Date().toISOString(),
      scopes,
      username: user.login,
      expiresAt: existingInfo && existingInfo.token === token ? existingInfo.expiresAt : undefined,
    }

    await persistTokenInfo(tokenInfo)

    return {
      valid: true,
      username: user.login,
    }
  } catch (error) {
    console.error('验证 token 失败:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : '验证失败',
    }
  }
}

/**
 * 计算 token 剩余时间（基于创建时间，如果用户设置了过期时间）
 * 注意：GitHub API 不直接返回过期时间，这里返回的是基于用户设置的过期时间
 */
export async function getTokenRemainingTime(): Promise<{
  hasToken: boolean
  remainingDays?: number
  message: string
}> {
  const token = await getStoredToken()
  if (!token) {
    return {
      hasToken: false,
      message: '未设置 Token',
    }
  }

  const tokenInfo = await getTokenInfo()
  if (!tokenInfo) {
    return {
      hasToken: true,
      message: 'Token 信息不可用',
    }
  }

  // 如果设置了过期时间
  if (tokenInfo.expiresAt) {
    const expiresAt = new Date(tokenInfo.expiresAt)
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs < 0) {
      return {
        hasToken: true,
        remainingDays: 0,
        message: 'Token 已过期',
      }
    }

    return {
      hasToken: true,
      remainingDays: diffDays,
      message: diffDays > 30 ? `剩余 ${diffDays} 天` : diffDays > 0 ? `剩余 ${diffDays} 天` : '即将过期',
    }
  }

  // 如果没有设置过期时间，尝试根据创建时间推断（如果是最近30天内创建的，假设是30天token）
  if (tokenInfo.createdAt) {
    const createdAt = new Date(tokenInfo.createdAt)
    const now = new Date()
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    
    // 如果是在30天内创建的，且没有设置过期时间，可能是30天token但用户没有手动设置
    // 我们假设如果创建时间在30天内，且没有过期时间，可能是30天token，显示预计剩余时间
    if (daysSinceCreation < 30) {
      const estimatedExpiresAt = new Date(createdAt)
      estimatedExpiresAt.setDate(estimatedExpiresAt.getDate() + 30)
      const diffMs = estimatedExpiresAt.getTime() - now.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays > 0) {
        return {
          hasToken: true,
          remainingDays: diffDays,
          message: `预计剩余 ${diffDays} 天（基于30天默认值）`,
        }
      }
    }
  }
  
  // 如果没有设置过期时间且无法推断，显示永久有效
  return {
    hasToken: true,
    message: '永久有效（未设置过期时间）',
  }
}

/**
 * 格式化 token（隐藏中间部分）
 */
export function formatToken(token: string): string {
  if (!token || token.length < 10) return token
  const start = token.substring(0, 4)
  const end = token.substring(token.length - 4)
  return `${start}${'*'.repeat(Math.max(0, token.length - 8))}${end}`
}

