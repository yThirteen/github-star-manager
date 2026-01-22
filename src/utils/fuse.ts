/**
 * Fuse.js 搜索配置
 */

import Fuse from 'fuse.js'
import type { StarItem } from '../types/star'

// 连续子串判断（大小写不敏感）
function hasContiguousMatch(item: StarItem, query: string): boolean {
  const q = query.toLowerCase()
  const fields: Array<string | null | undefined> = [
    item.name,
    item.full_name,
    item.description,
    item.notes,
    item.language,
    // tags 是数组，按空格连接后检查
    Array.isArray(item.tags) ? item.tags.join(' ') : ''
  ]
  return fields.some((val) => (val ?? '').toLowerCase().includes(q))
}

// 将查询字符串拆分为关键词（按空格分隔）
function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * 搜索 Stars（统一搜索所有字段）
 */
export function searchStars(
  index: Fuse<StarItem>,
  query: string
): StarItem[] {
  if (!query.trim()) {
    return []
  }
  
  const tokens = tokenizeQuery(query)

  // 单个关键词：保持原先逻辑（连续子串过滤）
  if (tokens.length === 1) {
    const singleResults = index.search(tokens[0])
      .filter((res) => hasContiguousMatch(res.item, tokens[0]))
    const finalSingle = singleResults.length > 0 ? singleResults : index.search(tokens[0])
    return finalSingle
      .sort((a, b) => (a.score || 1) - (b.score || 1))
      .map((result) => result.item)
  }

  // 多关键词：分别搜索，每个词都需要命中（AND），否则回退到 OR
  const perTokenResults = tokens.map((t) =>
    index.search(t).filter((res) => hasContiguousMatch(res.item, t))
  )

  // 计算交集（AND）
  const idSets = perTokenResults.map((list) => new Set(list.map((r) => r.item.id)))
  let intersection = new Set<string>(idSets[0])
  for (let i = 1; i < idSets.length; i++) {
    intersection = new Set([...intersection].filter((id) => idSets[i].has(id)))
  }

  function scoreForId(id: string): number {
    // 汇总每个词的 score（未命中的用 1 作为较差值）
    return perTokenResults.reduce((sum, list) => {
      const found = list.find((r) => r.item.id === id)
      return sum + (found?.score ?? 1)
    }, 0)
  }

  function itemForId(id: string): StarItem | undefined {
    for (const list of perTokenResults) {
      const found = list.find((r) => r.item.id === id)
      if (found) return found.item
    }
    return undefined
  }

  let records: Array<{ item: StarItem; score: number }> = []
  if (intersection.size > 0) {
    records = [...intersection].map((id) => ({
      item: itemForId(id)!,
      score: scoreForId(id),
    }))
  } else {
    // 回退到 OR（至少匹配一个关键词）
    const unionIds = new Set<string>()
    perTokenResults.forEach((list) => list.forEach((r) => unionIds.add(r.item.id)))
    records = [...unionIds].map((id) => ({
      item: itemForId(id)!,
      score: scoreForId(id),
    }))
  }

  return records
    .sort((a, b) => a.score - b.score)
    .map((r) => r.item)
}

