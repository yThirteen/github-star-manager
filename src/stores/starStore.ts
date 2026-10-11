/**
 * Star 数据全局状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { StarItem, StarData } from '../types/star'
import { loadStarData, saveStarData } from '../utils/storage'
import { clearSearchIndexCache } from '../utils/searchCache'
import { deleteStarFromDb } from '../utils/database'
import { useSettingsStore } from './settingsStore'

// 最大允许的分组层级默认值（可通过设置调整）
const DEFAULT_MAX_FOLDER_DEPTH = 3

export const useStarStore = defineStore('star', () => {
  const settingsStore = useSettingsStore()
  // 状态
  const stars = ref<StarItem[]>([])
  const lastSync = ref<string>('')
  const totalCount = ref<number>(0)
  const syncedByRef = ref<string>('') // 重命名避免可能的冲突
  const groups = ref<string[]>([])
  const tags = ref<string[]>([])
  const groupOrder = ref<Record<string, number>>({}) // 分组排序信息
  const maxFolderDepth = computed(() => settingsStore.maxFolderDepth ?? DEFAULT_MAX_FOLDER_DEPTH)

  // 计算属性
  const hasStars = computed(() => stars.value.length > 0)
  const starredRepos = computed(() => 
    stars.value.filter((star) => star.stargazers_count > 0)
  )

  // 系统伪分组的仓库数量。单次遍历 stars 统计，供 GroupList / StarList 直接读取，
  // 避免模板里每个数量显示都做一次全量 filter（旧实现每次渲染都是 O(仓库数) × 调用次数）。
  const SYSTEM_GROUP_NAMES = ['新增未分类', '特别关注', '已取消星标'] as const
  const systemGroupCounts = computed(() => {
    const counts: Record<string, number> = {}
    SYSTEM_GROUP_NAMES.forEach((name) => {
      counts[name] = 0
    })
    stars.value.forEach((star) => {
      if (!star.groups) return
      for (const group of star.groups) {
        // 只统计已知的系统伪分组（其它分组由 GroupList 的 groupCountMap 负责）
        if (counts[group] !== undefined) {
          counts[group]++
        }
      }
    })
    return counts
  })

  // 从本地加载数据
  async function loadFromLocal(forceReload = false) {
    // 如果已经有数据且不是强制重新加载，跳过
    if (!forceReload && stars.value.length > 0) {
      return
    }
    
    try {
      const data = await loadStarData()
      if (data) {
        // 强制重新加载时，总是更新所有状态，包括空数据
        if (forceReload || data.stars.length > 0 || data.meta.last_sync) {
          stars.value = data.stars
          lastSync.value = data.meta.last_sync
          totalCount.value = data.meta.total_count
          syncedByRef.value = data.meta.synced_by
          groups.value = data.groups || []
          tags.value = data.tags || []
          groupOrder.value = data.groupOrder || {}
        }
      }
    } catch (error) {
      // 静默失败，允许应用在没有本地数据的情况下运行
      console.warn('Failed to load from local (will continue with existing data):', error)
    }
  }

  // 保存到本地
  async function saveToLocal() {
    // 搜索索引依赖仓库数据，任何变更都需要清理缓存，避免使用过期结果
    clearSearchIndexCache()
    const data: StarData = {
      stars: stars.value,
      meta: {
        last_sync: lastSync.value,
        total_count: totalCount.value,
        synced_by: syncedByRef.value,
      },
      groups: groups.value,
      tags: tags.value,
      groupOrder: groupOrder.value,
    }
    await saveStarData(data)
  }

  // 批量更新（用于同步流程，避免多次保存导致事务冲突）
  function batchUpdate(
    newStars?: StarItem[],
    newMeta?: { lastSync?: string; totalCount?: number; syncedBy?: string },
    newGroups?: string[],
    newTags?: string[],
    newGroupOrder?: Record<string, number>
  ) {
    if (newStars !== undefined) {
      stars.value = newStars
    }
    if (newMeta) {
      if (newMeta.lastSync !== undefined) {
        lastSync.value = newMeta.lastSync
      }
      if (newMeta.totalCount !== undefined) {
        totalCount.value = newMeta.totalCount
      }
      if (newMeta.syncedBy !== undefined) {
        syncedByRef.value = newMeta.syncedBy
      }
    }
    if (newGroups !== undefined) {
      groups.value = newGroups
    }
    if (newTags !== undefined) {
      tags.value = newTags
    }
    if (newGroupOrder !== undefined) {
      groupOrder.value = newGroupOrder
    }
    // 批量更新后统一保存一次
    saveToLocal()
  }

  // 更新 Stars
  function setStars(newStars: StarItem[]) {
    stars.value = newStars
    saveToLocal()
  }

  // 更新单个 Star
  function updateStar(id: string, updates: Partial<StarItem>) {
    const index = stars.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      stars.value[index] = { ...stars.value[index], ...updates }
      saveToLocal()
    }
  }

  // 删除 Star
  async function deleteStar(id: string) {
    const index = stars.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      stars.value.splice(index, 1)
      // 从数据库中删除
      try {
        await deleteStarFromDb(id)
      } catch (error) {
        console.error('Failed to delete star from database:', error)
      }
      // 数据库行已单独删除；groups/tags/groupOrder/meta 都不受删除影响，
      // 因此不需要再触发一次「重写整张 stars 表」的保存，只需让搜索索引失效。
      clearSearchIndexCache()
    }
  }

  // 清空"已取消星标"文件夹中的所有仓库
  async function clearUnstarredGroup() {
    const unstaredStars = stars.value.filter((star) =>
      star.groups.includes('已取消星标')
    )

    if (unstaredStars.length === 0) {
      return
    }

    const ids = unstaredStars.map((star) => star.id)
    const removedIds = new Set(ids)

    // 一次性从内存中移除，避免逐条 splice 造成 O(n²)
    stars.value = stars.value.filter((star) => !removedIds.has(star.id))
    clearSearchIndexCache()

    // 并行发送单行删除，而不是逐条 await（互相独立，无需串行）
    const results = await Promise.allSettled(ids.map((id) => deleteStarFromDb(id)))
    const failed = results.filter((result) => result.status === 'rejected').length
    if (failed > 0) {
      console.error(`清除已取消星标：${failed}/${ids.length} 条数据库删除失败`)
    }
  }

  // 添加标签
  function addTag(starId: string, tag: string) {
    const star = stars.value.find((s) => s.id === starId)
    if (star && !star.tags.includes(tag)) {
      star.tags.push(tag)
      if (!tags.value.includes(tag)) {
        tags.value.push(tag)
      }
      saveToLocal()
    }
  }

  // 移除标签
  function removeTag(starId: string, tag: string) {
    const star = stars.value.find((s) => s.id === starId)
    if (star) {
      star.tags = star.tags.filter((t) => t !== tag)
      saveToLocal()
    }
  }

  // 添加到分组
  function addToGroup(starId: string, group: string) {
    const star = stars.value.find((s) => s.id === starId)
    if (star && !star.groups.includes(group)) {
      // 如果添加到的是非"新增未分类"分组，则先检查并移除"新增未分类"分组
      const hadUncategorizedGroup = star.groups.includes('新增未分类')
      if (group !== '新增未分类' && hadUncategorizedGroup) {
        star.groups = star.groups.filter((g) => g !== '新增未分类')
      }
      
      // 添加新分组
      star.groups.push(group)
      if (!groups.value.includes(group)) {
        groups.value.push(group)
      }
      
      saveToLocal()
    }
  }

  // 从分组移除
  function removeFromGroup(starId: string, group: string) {
    const star = stars.value.find((s) => s.id === starId)
    if (star) {
      star.groups = star.groups.filter((g) => g !== group)
      
      // 如果从非"新增未分类"分组移除，且移除后没有其他分组，则自动添加回"新增未分类"分组
      if (group !== '新增未分类' && star.groups.length === 0) {
        star.groups.push('新增未分类')
        // 确保"新增未分类"分组存在于 groups 列表中
        if (!groups.value.includes('新增未分类')) {
          groups.value.push('新增未分类')
        }
      }
      
      saveToLocal()
    }
  }

  // 批量移动到指定分组
  function moveStarsToGroup(starIds: string[], targetGroup: string, _sourceGroup?: string | null) {
    const trimmedTarget = targetGroup.trim()
    if (!trimmedTarget) {
      return { moved: 0, skipped: starIds.length }
    }

    const depth = trimmedTarget.split('/').filter(Boolean).length
    if (depth > maxFolderDepth.value) {
      throw new Error(`分组层级超过限制（最多 ${maxFolderDepth.value} 级）`)
    }

    // 确保目标分组存在
    if (!groups.value.includes(trimmedTarget)) {
      groups.value.push(trimmedTarget)
    }

    let moved = 0
    let skipped = 0

    const uniqueIds = Array.from(new Set(starIds))
    const specialGroupsToPreserve = new Set(['特别关注', '已取消星标'])

    uniqueIds.forEach((starId) => {
      const star = stars.value.find((s) => s.id === starId)
      if (!star) {
        skipped += 1
        return
      }

      const originalGroups = star.groups.slice()
      const nextGroups: string[] = []
      const seen = new Set<string>()

      originalGroups.forEach((group) => {
        if (group === trimmedTarget || specialGroupsToPreserve.has(group)) {
          if (!seen.has(group)) {
            nextGroups.push(group)
            seen.add(group)
          }
        }
      })

      if (!seen.has(trimmedTarget)) {
        nextGroups.push(trimmedTarget)
        seen.add(trimmedTarget)
      }

      const groupsChanged =
        originalGroups.length !== nextGroups.length ||
        originalGroups.some((group, index) => nextGroups[index] !== group)

      if (groupsChanged) {
        star.groups = nextGroups
        moved += 1
      } else {
        skipped += 1
      }
    })

    saveToLocal()

    return { moved, skipped }
  }

  // 创建新分组（支持创建子分组）
  function createGroup(groupName: string, parentGroup?: string) {
    const trimmedName = groupName.trim()
    if (!trimmedName) {
      throw new Error('分组名称不能为空')
    }
    // 名称里不允许出现 '/'：顶层输入 "a/b" 或子分组输入 "x/y" 都会创建出父路径不存在的
    // 「幽灵分组」（不在 topLevelGroups 中、也没有已声明的父分组），它在侧边栏里不可见、不可删除
    if (trimmedName.includes('/')) {
      throw new Error('分组名称不能包含 “/”')
    }
    
    // 构建完整的分组路径：父分组/子分组
    const fullPath = parentGroup ? `${parentGroup}/${trimmedName}` : trimmedName

    const depth = fullPath.split('/').filter(Boolean).length
    if (depth > maxFolderDepth.value) {
      throw new Error(`分组层级超过限制（最多 ${maxFolderDepth.value} 级）`)
    }
    
    // 检查是否已存在
    if (groups.value.includes(fullPath)) {
      throw new Error('分组已存在')
    }
    
    // 检查父分组是否存在（如果是创建子分组）
    if (parentGroup && !groups.value.includes(parentGroup)) {
      throw new Error('父分组不存在')
    }
    
    groups.value.push(fullPath)
    
    // 获取当前层级的其他分组，确定新分组的排序值（放在第一个位置）
    let sameLevelGroups: string[] = []
    if (parentGroup) {
      // 子分组：获取同一父分组下的所有子分组
      sameLevelGroups = groups.value.filter((g) => g.startsWith(`${parentGroup}/`))
    } else {
      // 一级分组：获取所有一级分组（排除系统分组）
      sameLevelGroups = groups.value.filter((g) => !g.includes('/') && g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标')
    }
    
    // 获取当前层级的最小排序值
    let minOrder = 0
    if (sameLevelGroups.length > 0) {
      const existingOrders = sameLevelGroups
        .map((g) => groupOrder.value[g] ?? 0)
        .filter((order) => order !== undefined)
      minOrder = existingOrders.length > 0 ? Math.min(...existingOrders) - 1 : -1
    } else {
      minOrder = 0
    }
    
    // 设置新分组的排序值（最小，即第一个位置）
    groupOrder.value[fullPath] = minOrder
    
    saveToLocal()
  }
  
  // 获取一级分组列表（不含子分组，按排序显示）
  function getTopLevelGroups(): string[] {
    if (!groups.value || groups.value.length === 0) {
      return []
    }
    const topLevelGroups = groups.value.filter((g) => g && !g.includes('/') && g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标')
    
    // 按排序值排序
    return topLevelGroups.sort((a, b) => {
      const orderA = groupOrder.value[a] ?? 0
      const orderB = groupOrder.value[b] ?? 0
      return orderA - orderB
    })
  }
  
  // 获取指定分组下的子分组列表（按排序显示）
  function getChildGroups(parentGroup: string): string[] {
    if (!groups.value || groups.value.length === 0 || !parentGroup) {
      return []
    }
    const childGroups = groups.value
      .filter((g) => g && g.startsWith(`${parentGroup}/`))
      .map((g) => g.replace(`${parentGroup}/`, ''))
    
    // 按排序值排序
    return childGroups.sort((a, b) => {
      const fullPathA = `${parentGroup}/${a}`
      const fullPathB = `${parentGroup}/${b}`
      const orderA = groupOrder.value[fullPathA] ?? 0
      const orderB = groupOrder.value[fullPathB] ?? 0
      return orderA - orderB
    })
  }
  
  
  // 检查分组是否为空（是否包含任何仓库）
  function isGroupEmpty(groupName: string): boolean {
    if (!stars.value || stars.value.length === 0) {
      return true // 没有仓库，分组为空
    }
    
    // 找到所有子分组
    const childGroups = groups.value.filter((g) => g && g.startsWith(`${groupName}/`))
    const allGroupPaths = [groupName, ...childGroups]
    
    // 检查是否有任何仓库属于该分组或其子分组
    const hasStars = stars.value.some((star) => {
      if (!star.groups || star.groups.length === 0) {
        return false
      }
      return allGroupPaths.some((groupPath) => star.groups.includes(groupPath))
    })
    
    return !hasStars
  }

  // 删除分组（同时删除其所有子分组）
  function deleteGroup(groupName: string) {
    // 系统分组不能被删除
    if (groupName === '新增未分类') {
      throw new Error('系统文件夹不能删除')
    }
    
    // 检查分组是否为空
    if (!isGroupEmpty(groupName)) {
      throw new Error('不能删除非空文件夹，请先移除其中的仓库')
    }
    
    // 找到所有子分组
    const childGroups = groups.value.filter((g) => g.startsWith(`${groupName}/`))
    
    // 从所有 stars 中移除该分组及其子分组
    stars.value.forEach((star) => {
      star.groups = star.groups.filter((g) => g !== groupName && !childGroups.includes(g))
    })
    
    // 从分组列表中移除该分组及其子分组
    groups.value = groups.value.filter((g) => g !== groupName && !childGroups.includes(g))
    
    // 从排序信息中移除该分组及其子分组
    delete groupOrder.value[groupName]
    childGroups.forEach((childGroup) => {
      delete groupOrder.value[childGroup]
    })
    
    saveToLocal()
  }

  // 重命名分组（使用 Windows 文件系统逻辑：递归更新所有层级的子分组路径）
  // newFullPath 应该是新的完整路径（对于子分组）或新名称（对于一级分组）
  function renameGroup(oldName: string, newFullPath: string) {
    if (!newFullPath.trim()) {
      throw new Error('分组名称不能为空')
    }
    if (oldName === newFullPath) {
      return // 名称未改变
    }
    // 只允许在同级内改名：新路径的父路径必须与原父路径一致。
    // 否则会改名出父路径不存在的「幽灵分组」，在侧边栏里不可见也不可删除。
    const parentOf = (path: string) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '')
    if (parentOf(oldName) !== parentOf(newFullPath)) {
      throw new Error('分组名称不能包含 “/”')
    }
    
    if (groups.value.includes(newFullPath)) {
      throw new Error('新分组名称已存在')
    }
    
    // Windows 文件系统逻辑：找到所有需要更新的子分组（包括所有层级的嵌套子分组）
    // 例如：如果 "cracktools" 被重命名为 "new_cracktools"
    // 那么 "cracktools/sub1" -> "new_cracktools/sub1"
    // 和 "cracktools/sub1/sub2" -> "new_cracktools/sub1/sub2" 都需要更新
    // 注意：这里对任意层级都要递归（旧实现只对一级分组生效，重命名中间层分组会留下孤儿分组）
    const allChildGroups = groups.value.filter((g) => g.startsWith(`${oldName}/`))
    
    // 创建路径映射：旧路径 -> 新路径
    const pathMapping = new Map<string, string>()
    
    // 添加主分组映射
    pathMapping.set(oldName, newFullPath)
    
    // 递归更新所有子分组的路径映射
    if (allChildGroups.length > 0) {
      allChildGroups.forEach((childGroup) => {
        // 计算新路径：将 oldName 替换为 newFullPath（只替换路径前缀）
        // 例如："cracktools/sub1/sub2" -> "new_cracktools/sub1/sub2"
        // 使用 startsWith 确保只替换前缀，避免误替换
        if (childGroup.startsWith(`${oldName}/`)) {
          const suffix = childGroup.substring(oldName.length)
          const newChildPath = `${newFullPath}${suffix}`
          pathMapping.set(childGroup, newChildPath)
        }
      })
    }
    
    // 检查新路径是否与现有分组冲突（排除自身和即将被重命名的路径）
    const allOldPaths = new Set(pathMapping.keys())
    const allNewPaths = new Set(pathMapping.values())
    
    for (const newPath of allNewPaths) {
      // 如果新路径不在旧路径集合中，且已存在于分组列表中，则冲突
      if (!allOldPaths.has(newPath) && groups.value.includes(newPath)) {
        throw new Error(`新分组路径 "${newPath}" 已存在`)
      }
    }
    
    // 更新分组列表（按从深到浅的顺序更新，避免路径冲突）
    // 先更新深层子分组，再更新浅层子分组，最后更新主分组
    const sortedChildGroups = [...allChildGroups].sort((a, b) => {
      // 按路径深度排序（深层在前）
      const depthA = a.split('/').length
      const depthB = b.split('/').length
      return depthB - depthA
    })
    
    // 先更新所有子分组
    sortedChildGroups.forEach((oldChildPath) => {
      const newChildPath = pathMapping.get(oldChildPath)!
      const childIndex = groups.value.indexOf(oldChildPath)
      if (childIndex !== -1) {
        groups.value[childIndex] = newChildPath
      }
    })
    
    // 最后更新主分组
    const index = groups.value.indexOf(oldName)
    if (index !== -1) {
      groups.value[index] = newFullPath
    }
    
    // 更新所有 stars 中的分组名称（使用路径映射）
    stars.value.forEach((star) => {
      star.groups = star.groups.map((group) => {
        return pathMapping.get(group) || group
      })
    })
    
    // 更新排序信息（使用路径映射）
    const updatedGroupOrder: Record<string, number> = { ...groupOrder.value }
    
    // 先删除所有旧路径的排序信息
    for (const oldPath of pathMapping.keys()) {
      if (updatedGroupOrder[oldPath] !== undefined) {
        delete updatedGroupOrder[oldPath]
      }
    }
    
    // 添加所有新路径的排序信息
    for (const [oldPath, newPath] of pathMapping.entries()) {
      if (groupOrder.value[oldPath] !== undefined) {
        updatedGroupOrder[newPath] = groupOrder.value[oldPath]
      }
    }
    
    groupOrder.value = updatedGroupOrder
    
    saveToLocal()
  }

  // 更新同步信息
  function setSyncInfo(username: string, count: number) {
    lastSync.value = new Date().toISOString()
    totalCount.value = count
    syncedByRef.value = username
    saveToLocal()
  }

  // 初始化（只在首次加载时强制重新加载）
  async function init() {
    try {
      // 首次加载时强制重新加载
      await loadFromLocal(true)
    } catch (error) {
      console.error('Init failed:', error)
    }
  }
  
  // 重新加载数据（用于同步后刷新）
  async function reload() {
    try {
      await loadFromLocal(true)
    } catch (error) {
      console.error('Reload failed:', error)
    }
  }

  // 批量应用 AI 分类结果
  async function applyClassificationResults(
    results: Map<string, string>
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    const ensureGroupHierarchy = (fullPath: string) => {
      const segments = fullPath
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)

      if (segments.length === 0) return

      if (segments.length > maxFolderDepth.value) {
        throw new Error(`分组层级超过限制（最多 ${maxFolderDepth.value} 级）: ${fullPath}`)
      }

      // 逐级确保每个层级的分组都存在，例如 a/b/c -> a, a/b, a/b/c
      let current = ''
      for (const segment of segments) {
        current = current ? `${current}/${segment}` : segment
        if (!groups.value.includes(current)) {
          groups.value.push(current)
        }
      }
    }

    for (const [starId, suggestedGroup] of results.entries()) {
      try {
        // 确保所有层级的分组均已创建
        ensureGroupHierarchy(suggestedGroup)

        // 将仓库添加到建议的分组
        addToGroup(starId, suggestedGroup)
        success++
      } catch (error) {
        console.error(`应用分类结果失败 (${starId} -> ${suggestedGroup}):`, error)
        failed++
      }
    }

    return { success, failed }
  }

  // 获取未分类的仓库列表
  function getUncategorizedStars(): StarItem[] {
    return stars.value.filter(
      (star) =>
        star.groups.length === 0 ||
        (star.groups.length === 1 && star.groups.includes('新增未分类'))
    )
  }

  return {
    // 状态
    stars,
    lastSync,
    totalCount,
    syncedBy: syncedByRef,
    groups,
    tags,
    groupOrder,
    maxFolderDepth,
    // 计算属性
    hasStars,
    starredRepos,
    systemGroupCounts,
    // 方法
    setStars,
    updateStar,
    deleteStar,
    clearUnstarredGroup,
    addTag,
    removeTag,
    addToGroup,
    removeFromGroup,
    moveStarsToGroup,
    createGroup,
    deleteGroup,
    renameGroup,
    getTopLevelGroups,
    getChildGroups,
    isGroupEmpty,
    setSyncInfo,
    init,
    reload,
    loadFromLocal,
    saveToLocal,
    batchUpdate,
    applyClassificationResults,
    getUncategorizedStars,
  }
})

