/**
 * 对话框 Composable
 * 提供统一的确认和提示对话框功能
 */

import { ref, provide, inject } from 'vue'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  showCheckbox?: boolean
  checkboxLabel?: string
  checkboxDefault?: boolean
}

interface AlertOptions {
  title?: string
  message: string
  icon?: string
  buttonText?: string
  buttonClass?: string
}

// 对话框服务类型
interface DialogService {
  confirmVisible: ReturnType<typeof ref<boolean>>
  confirmOptions: ReturnType<typeof ref<ConfirmOptions>>
  confirmCheckboxValue: ReturnType<typeof ref<boolean>>
  confirm: (options: ConfirmOptions) => Promise<boolean>
  handleConfirm: () => void
  handleCancel: () => void
  alertVisible: ReturnType<typeof ref<boolean>>
  alertOptions: ReturnType<typeof ref<AlertOptions>>
  alert: (options: AlertOptions) => Promise<void>
  handleAlertClose: () => void
}

// 创建对话框服务的 Symbol
const DialogServiceKey = Symbol('DialogService')

// 创建对话框服务（单例）
function createDialogService(): DialogService {
  // 确认对话框状态
  const confirmVisible = ref(false)
  const confirmOptions = ref<ConfirmOptions>({ message: '' })
  const confirmResolve = ref<((value: boolean) => void) | null>(null)
  const confirmCheckboxValue = ref(false)

  // 提示对话框状态
  const alertVisible = ref(false)
  const alertOptions = ref<AlertOptions>({ message: '' })
  const alertResolve = ref<(() => void) | null>(null)

  /**
   * 显示确认对话框
   */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      confirmOptions.value = options
      confirmCheckboxValue.value = options.checkboxDefault ?? false
      confirmResolve.value = resolve
      confirmVisible.value = true
    })
  }

  /**
   * 确认对话框 - 确认
   */
  function handleConfirm() {
    if (confirmResolve.value) {
      confirmResolve.value(true)
      confirmResolve.value = null
    }
    confirmVisible.value = false
  }

  /**
   * 确认对话框 - 取消
   */
  function handleCancel() {
    if (confirmResolve.value) {
      confirmResolve.value(false)
      confirmResolve.value = null
    }
    confirmVisible.value = false
  }

  /**
   * 显示提示对话框
   */
  function alert(options: AlertOptions): Promise<void> {
    return new Promise((resolve) => {
      alertOptions.value = options
      alertResolve.value = resolve
      alertVisible.value = true
    })
  }

  /**
   * 提示对话框 - 关闭
   */
  function handleAlertClose() {
    if (alertResolve.value) {
      alertResolve.value()
      alertResolve.value = null
    }
    alertVisible.value = false
  }

  return {
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
  }
}

/**
 * 提供对话框服务（在 App.vue 中使用）
 */
export function provideDialog() {
  const service = createDialogService()
  provide(DialogServiceKey, service)
  return service
}

/**
 * 使用对话框服务（在组件中使用）
 */
export function useDialog(): DialogService {
  const service = inject<DialogService>(DialogServiceKey)
  if (!service) {
    // 如果没有提供，创建一个新的（用于测试或独立使用）
    console.warn('DialogService not provided, creating a new instance')
    return createDialogService()
  }
  return service
}

