/**
 * 日期格式化工具
 */

import { format, formatDistanceToNow, isAfter, subDays } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'

/**
 * 格式化日期
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

/**
 * 相对时间（如：2 天前）
 */
export function formatRelativeTime(date: string | Date, locale?: string): string {
  const dateLocale = locale === 'en' ? enUS : zhCN
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: dateLocale,
  })
}

/**
 * 检查是否有新 Release（7 天内）
 */
export function isRecentRelease(releaseDate: string | Date): boolean {
  const date = new Date(releaseDate)
  const sevenDaysAgo = subDays(new Date(), 7)
  return isAfter(date, sevenDaysAgo)
}

