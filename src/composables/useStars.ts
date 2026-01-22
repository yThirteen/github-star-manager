/**
 * Stars 数据管理 Composable
 */

import { computed } from 'vue'
import { useStarStore } from '../stores/starStore'

export function useStars() {
  const starStore = useStarStore()

  const stars = computed(() => starStore.stars)
  const hasStars = computed(() => starStore.hasStars)

  return {
    stars,
    hasStars,
    starStore,
  }
}

