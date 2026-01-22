/**
 * 搜索索引缓存
 */

import Fuse from 'fuse.js'
import type { StarItem } from '../types/star'

// 缓存搜索索引，避免重复创建
const searchIndexCache = new Map<string, Fuse<StarItem>>()

/**
 * 获取缓存的搜索索引（统一搜索所有字段）
 */
export function getCachedSearchIndex(
  stars: StarItem[]
): Fuse<StarItem> {
  // 使用长度+首尾 ID 作为缓存键，避免访问 Fuse 内部属性
  const firstId = stars[0]?.id ?? ''
  const lastId = stars[stars.length - 1]?.id ?? ''
  const cacheKey = `${stars.length}:${firstId}:${lastId}`

  // 检查缓存是否存在且有效
  const cached = searchIndexCache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  // 缓存无效或不存在，创建新索引
  // 统一搜索所有字段，通过权重控制优先级
  // 名称匹配优先级最高，其次是描述和标签
  const keys: Array<{ name: string; weight: number }> = [
    { name: 'notes', weight: 0.5 },          // 笔记
    { name: 'tags', weight: 0.45 },           // 标签
    { name: 'description', weight: 0.3 },    // 描述
    { name: 'name', weight: 0.3 },           // 仓库名称
    { name: 'full_name', weight: 0.25 },       // 完整名称
    { name: 'language', weight: 0.15 },      // 语言
  ]
  
  const index = new Fuse(stars, {
    keys,
    threshold: 0.3, // 降低阈值，提高匹配精度（0.0 = 完全匹配, 1.0 = 匹配所有）
    includeScore: true,
    minMatchCharLength: 2, // 最小匹配字符数改为 2，避免单字符匹配
    ignoreLocation: false, // 考虑匹配位置，开头匹配优先级更高
    findAllMatches: false, // 只返回最佳匹配，不返回所有可能的匹配
  })
  
  // 更新缓存（只保留最近 3 个索引，避免内存泄漏）
  if (searchIndexCache.size >= 3) {
    const iter = searchIndexCache.keys()
    const firstKey = iter.next().value as string | undefined
    if (firstKey !== undefined) {
      searchIndexCache.delete(firstKey)
    }
  }
  searchIndexCache.set(cacheKey, index)
  
  return index
}

/**
 * 清除搜索索引缓存
 */
export function clearSearchIndexCache(): void {
  searchIndexCache.clear()
}

