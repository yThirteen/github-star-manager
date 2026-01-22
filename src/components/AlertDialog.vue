<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]"
      >
        <Transition name="scale">
          <div
            v-if="visible"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
          >
            <!-- 标题 -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ icon }}</span>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ resolvedTitle }}
                </h3>
              </div>
            </div>

            <!-- 内容 -->
            <div class="px-6 py-4">
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {{ message }}
              </p>
            </div>

            <!-- 按钮 -->
            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                @click="handleClose"
                :class="[
                  'px-4 py-2 rounded-lg text-white transition-colors',
                  buttonClass || 'bg-blue-600 hover:bg-blue-700'
                ]"
              >
                {{ resolvedButtonText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// 移除外部点击和 ESC 关闭，仅通过按钮关闭
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  title?: string
  message: string
  icon?: string
  buttonText?: string
  buttonClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'ℹ️',
  buttonClass: '',
})

const { t } = useI18n()

const resolvedTitle = computed(() => props.title ?? t('dialog.alert.title'))
const resolvedButtonText = computed(() => props.buttonText ?? t('dialog.alert.confirm'))

const emit = defineEmits<{
  close: []
  'update:visible': [value: boolean]
}>()

function handleClose() {
  emit('close')
  emit('update:visible', false)
}

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

