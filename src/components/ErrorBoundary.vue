<template>
  <div v-if="error" class="p-4 text-red-600">
    <p class="font-bold">错误: {{ error }}</p>
    <button @click="error = null" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
      重试
    </button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<string | null>(null)

onErrorCaptured((err) => {
  error.value = err.message
  console.error('Component error:', err)
  return false
})
</script>

