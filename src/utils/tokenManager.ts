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
 * 格式化 token（隐藏中间部分）
 */
export function formatToken(token: string): string {
  if (!token || token.length < 10) return token
  const start = token.substring(0, 4)
  const end = token.substring(token.length - 4)
  return `${start}${'*'.repeat(Math.max(0, token.length - 8))}${end}`
}

