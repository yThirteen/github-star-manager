<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      >
        <Transition name="scale">
          <div
            v-if="visible"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
          >
            <!-- 标题 -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {{ resolvedTitle }}
              </h3>
            </div>

            <!-- 内容 -->
            <div class="px-6 py-4">
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {{ message }}
              </p>
            </div>

            <div
              v-if="showCheckbox"
              class="px-6 pb-2"
            >
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  :checked="checkboxValue"
                  @change="emit('update:checkboxValue', ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ resolvedCheckboxLabel }}</span>
              </label>
            </div>

            <!-- 按钮 -->
            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                @click="handleCancel"
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {{ resolvedCancelText }}
              </button>
              <button
                @click="handleConfirm"
                :class="[
                  'px-4 py-2 rounded-lg text-white transition-colors',
                  confirmButtonClass || 'bg-blue-600 hover:bg-blue-700'
                ]"
              >
                {{ resolvedConfirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// 仅通过弹窗内按钮进行关闭，禁用外部点击与 ESC
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  showCheckbox?: boolean
  checkboxLabel?: string
  checkboxValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmButtonClass: '',
  showCheckbox: false,
  checkboxValue: false,
})

const { t } = useI18n()

const resolvedTitle = computed(() => props.title ?? t('dialog.confirm.title'))
const resolvedConfirmText = computed(() => props.confirmText ?? t('dialog.confirm.confirm'))
const resolvedCancelText = computed(() => props.cancelText ?? t('dialog.confirm.cancel'))
const resolvedCheckboxLabel = computed(() => props.checkboxLabel ?? t('dialog.confirm.checkbox'))

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:visible': [value: boolean]
  'update:checkboxValue': [value: boolean]
}>()

function handleConfirm() {
  emit('confirm')
  emit('update:visible', false)
}

function handleCancel() {
  emit('cancel')
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

