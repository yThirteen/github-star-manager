/**
 * API 响应类型定义
 */

export interface GitHubStarResponse {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  pushed_at: string
  starred_at: string
  [key: string]: unknown
}

export interface GitHubReleaseResponse {
  tag_name: string
  published_at: string
  html_url: string
  [key: string]: unknown
}

