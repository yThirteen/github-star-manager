<template>
  <router-view v-slot="{ Component }">
    <component v-if="Component" :is="Component" />
    <div v-else class="flex items-center justify-center h-screen">
      <p class="text-gray-500">{{ t('app.loading') }}</p>
    </div>
  </router-view>

  <!-- 全局对话框 -->
  <ConfirmDialog
    :visible="confirmVisible ?? false"
    :title="confirmOptions?.title"
    :message="confirmOptions?.message ?? ''"
    :confirm-text="confirmOptions?.confirmText"
    :cancel-text="confirmOptions?.cancelText"
    :confirm-button-class="confirmOptions?.confirmButtonClass"
    :show-checkbox="confirmOptions?.showCheckbox ?? false"
    :checkbox-label="confirmOptions?.checkboxLabel"
    v-model:checkbox-value="confirmCheckboxValue"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @update:visible="confirmVisible = $event"
  />

  <AlertDialog
    :visible="alertVisible ?? false"
    :title="alertOptions?.title"
    :message="alertOptions?.message ?? ''"
    :icon="alertOptions?.icon"
    :button-text="alertOptions?.buttonText"
    :button-class="alertOptions?.buttonClass"
    @close="handleAlertClose"
    @update:visible="alertVisible = $event"
  />
</template>

<script setup lang="ts">
import { onErrorCaptured } from 'vue'
import { useI18n } from 'vue-i18n'
import { provideDialog } from './composables/useDialog'
import ConfirmDialog from './components/ConfirmDialog.vue'
import AlertDialog from './components/AlertDialog.vue'

const { t } = useI18n()

// 全局错误捕获
onErrorCaptured((err, _instance, info) => {
  console.error('组件错误:', err)
  console.error('错误信息:', info)
  if (typeof window !== 'undefined') {
    const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err)
    window.alert(`组件错误: ${message}\n\n详情: ${info}`)
  }
  return false
})

// 全局对话框（提供对话框服务）
const {
  confirmVisible,
  confirmOptions,
  confirmCheckboxValue,
  confirm,
  handleConfirm,
  handleCancel,
  alertVisible,
  alertOptions,
  alert,
  handleAlertClose,
} = provideDialog()

// 将对话框方法暴露到全局，方便在任何地方使用
if (typeof window !== 'undefined') {
  ;(window as any).$confirm = confirm
  ;(window as any).$alert = alert
}
</script>

