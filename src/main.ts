import { createApp, watch } from 'vue'
import { pinia } from './stores'
import router from './router'
import App from './App.vue'
import './style.css'
import { useSettingsStore } from './stores/settingsStore'
import { useStarStore } from './stores/starStore'
import { useUIStore } from './stores/uiStore'
import { checkTokenOnStartup } from './utils/tokenCheck'
import { createAppI18n, resolveLocale } from './plugins/i18n'
import { initBuiltinConfigs } from './utils/builtinConfig'

const isTauriEnv = typeof window !== 'undefined' && '__TAURI__' in window

if (typeof window !== 'undefined') {
  let reportingError = false

  const notifyFatalError = async (message: string) => {
    if (reportingError) {
      return
    }
    reportingError = true

    try {
      if (isTauriEnv) {
        try {
          const dialogModule = await import('@tauri-apps/plugin-dialog')
          if (typeof dialogModule.message === 'function') {
            await dialogModule.message(message, { title: '应用错误' })
          } else {
            window.alert(message)
          }
        } catch (dialogError) {
          console.error('显示错误对话框失败:', dialogError)
          window.alert(message)
        }
      } else {
        window.alert(message)
      }
    } finally {
      reportingError = false
    }
  }

  window.addEventListener('error', (event) => {
    // 弹窗只给可读的一句错误信息，完整堆栈留在控制台里方便排查
    const detail = event.error?.message || event.message || '未知错误'
    console.error('全局错误:', event.error?.stack || detail)
    notifyFatalError(`检测到未处理的错误:\n${detail}`)
  })

  window.addEventListener('unhandledrejection', (event) => {
    // 同上：优先展示 message，堆栈只在控制台输出
    const reason = (event.reason && (event.reason.message || event.reason.stack)) || String(event.reason)
    console.error('未处理的 Promise 拒绝:', event.reason?.stack || reason)
    notifyFatalError(`检测到未处理的 Promise 拒绝:\n${reason}`)
  })
}

// 异步初始化应用
async function bootstrapApp() {
  const app = createApp(App)

  const bootstrapLocale = typeof window !== 'undefined'
    ? localStorage.getItem('app.language') ?? (typeof navigator !== 'undefined' ? navigator.language : null)
    : null

  const i18n = await createAppI18n(resolveLocale(bootstrapLocale))

  app.use(pinia)
  app.use(router)
  app.use(i18n)

  // 初始化各个 store（必须在 pinia 注册后）
  const settingsStore = useSettingsStore()
  settingsStore.init()

  i18n.global.locale.value = settingsStore.language
  if (typeof document !== 'undefined') {
    document.documentElement.lang = settingsStore.language
  }

  watch(
    () => settingsStore.language,
    (locale) => {
      i18n.global.locale.value = locale
      if (typeof document !== 'undefined') {
        document.documentElement.lang = locale
      }
    }
  )

  const starStore = useStarStore()
  // 异步初始化星标数据，加载本地数据
  starStore.init().catch((error) => {
    console.error('星标数据初始化失败:', error)
  })

  const uiStore = useUIStore()
  uiStore.initTheme()

  // 初始化内置配置（如Google Translate API）
  initBuiltinConfigs().catch((error) => {
    console.error('内置配置初始化失败:', error)
  })

  app.mount('#app')

  // 每天第一次启动时检查 token 有效性
  checkTokenOnStartup().then((error) => {
    if (error) {
      // 延迟显示提示，确保 UI 已加载
      setTimeout(() => {
        alert(`⚠️ ${error}`)
      }, 1000)
    }
  }).catch((error) => {
    console.error('Token 检查失败:', error)
  })
}

// 启动应用
bootstrapApp().catch((error) => {
  console.error('应用启动失败:', error)
  if (typeof window !== 'undefined') {
    window.alert('应用启动失败，请刷新页面重试')
  }
})

