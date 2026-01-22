/**
 * GitHub Star 相关类型定义
 */

export interface StarItem {
  id: string
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  pushed_at?: string | null
  previous_stargazers_count?: number // 同步前的星星数量，用于显示增减
  tags: string[]
  groups: string[]
  notes: string
  starred_at: string
  last_release?: ReleaseInfo
  translated_description?: string | null // 翻译后的描述（保存的）
  // GitHub API 原始字段（可选）
  [key: string]: unknown
}

export interface ReleaseInfo {
  tag_name: string
  published_at: string
  html_url?: string
}

export interface StarMetadata {
  tags: string[]
  groups: string[]
  notes: string
}

export interface SyncMetadata {
  last_sync: string
  total_count: number
  synced_by: string
}

export interface StarData {
  stars: StarItem[]
  meta: SyncMetadata
  groups: string[]
  tags: string[]
  groupOrder?: Record<string, number> // 分组排序信息，key 是分组名称，value 是排序值
}

