/**
 * Token 每日检查工具
 * 用于在应用启动时检查 token 是否有效
 */

import { getStoredToken, verifyToken } from './tokenManager'

const LAST_CHECK_DATE_KEY = 'github_token_last_check_date'
const LAST_CHECK_RESULT_KEY = 'github_token_last_check_result'

interface CheckResult {
  isValid: boolean
  username?: string
  error?: string
}

/**
 * 检查今天是否已经检查过 token
 */
function hasCheckedToday(): boolean {
  if (typeof window === 'undefined') return false
  
  const lastCheckDate = localStorage.getItem(LAST_CHECK_DATE_KEY)
  if (!lastCheckDate) return false
  
  const today = new Date().toDateString()
  return lastCheckDate === today
}

/**
 * 获取上次检查结果
 */
function getLastCheckResult(): CheckResult | null {
  if (typeof window === 'undefined') return null
  
  const resultStr = localStorage.getItem(LAST_CHECK_RESULT_KEY)
  if (!resultStr) return null
  
  try {
    return JSON.parse(resultStr) as CheckResult
  } catch {
    return null
  }
}

/**
 * 保存检查结果
 */
function saveCheckResult(result: CheckResult): void {
  if (typeof window === 'undefined') return
  
  const today = new Date().toDateString()
  localStorage.setItem(LAST_CHECK_DATE_KEY, today)
  localStorage.setItem(LAST_CHECK_RESULT_KEY, JSON.stringify(result))
}

/**
 * 清除检查缓存
 * 当更新 token 时应调用此函数，以确保下次启动时会重新检查
 */
export function clearTokenCheckCache(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem(LAST_CHECK_DATE_KEY)
  localStorage.removeItem(LAST_CHECK_RESULT_KEY)
}

/**
 * 每天第一次启动时检查 token 有效性
 * @returns 如果 token 无效，返回错误信息，否则返回 null
 */
export async function checkTokenOnStartup(): Promise<string | null> {
  const token = await getStoredToken()
  
  // 如果没有 token，不检查
  if (!token) {
    return null
  }
  
  // 如果今天已经检查过，使用缓存结果
  if (hasCheckedToday()) {
    const lastResult = getLastCheckResult()
    if (lastResult && !lastResult.isValid) {
      return 'Token 已失效，请在设置中更新 Token'
    }
    return null
  }
  
  // 执行检查
  try {
    const result = await verifyToken(token)
    saveCheckResult({
      isValid: result.valid,
      username: result.username,
      error: result.error,
    })
    
    if (!result.valid) {
      return result.error || 'Token 已失效，请在设置中更新 Token'
    }
    
    return null
  } catch (error) {
    // 网络错误等，不阻止应用启动
    console.warn('Token 检查失败:', error)
    return null
  }
}

