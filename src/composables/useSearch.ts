/**
 * 搜索功能 Composable（统一搜索所有字段）
 */

import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useStarStore } from '../stores/starStore'
import { getCachedSearchIndex } from '../utils/searchCache'
import { searchStars } from '../utils/fuse'

export function useSearch() {
  const uiStore = useUIStore()
  const starStore = useStarStore()

  const searchResults = computed(() => {
    if (!uiStore.searchQuery.trim()) {
      return starStore.stars
    }
    const index = getCachedSearchIndex(starStore.stars)
    return searchStars(index, uiStore.searchQuery)
  })

  return {
    searchQuery: computed(() => uiStore.searchQuery),
    searchResults,
    setSearchQuery: uiStore.setSearchQuery,
  }
}

