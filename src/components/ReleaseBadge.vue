<template>
  <span
    v-if="isRecent"
    class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded cursor-pointer hover:bg-red-200 dark:hover:bg-red-800"
    :title="`最新 Release: ${release.tag_name}`"
  >
    🆕 Release
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isRecentRelease } from '../utils/date'
import type { ReleaseInfo } from '../types/star'

interface Props {
  release: ReleaseInfo
}

const props = defineProps<Props>()

const isRecent = computed(() => isRecentRelease(props.release.published_at))
</script>

