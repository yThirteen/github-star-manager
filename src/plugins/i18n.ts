import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import zhCN from '../locales/zh-CN.json'
import { invoke } from '@tauri-apps/api/core'

export type AppLocale = 'en' | 'zh-CN'

export const SUPPORTED_LOCALES: Array<{ value: AppLocale; label: string }> = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
]

const DEFAULT_LOCALE: AppLocale = 'zh-CN'

export const messages = {
  en,
  'zh-CN': zhCN,
}

function isLocale(locale: string): locale is AppLocale {
  return Object.prototype.hasOwnProperty.call(messages, locale)
}

export function resolveLocale(locale?: string | null): AppLocale {
  if (!locale) {
    return DEFAULT_LOCALE
  }

  if (isLocale(locale)) {
    return locale
  }

  const normalized = locale.toLowerCase()
  if (normalized.startsWith('zh')) {
    return 'zh-CN'
  }
  if (normalized.startsWith('en')) {
    return 'en'
  }

  return DEFAULT_LOCALE
}

// 获取系统语言
async function getSystemLanguage(): Promise<AppLocale> {
  try {
    const systemLang = await invoke<string>('get_system_language')
    return resolveLocale(systemLang)
  } catch (error) {
    console.warn('Failed to get system language:', error)
    return DEFAULT_LOCALE
  }
}

// 获取存储的语言设置
function getStoredLanguage(): AppLocale | null {
  try {
    const stored = localStorage.getItem('app-language')
    return stored ? resolveLocale(stored) : null
  } catch {
    return null
  }
}

// 保存语言设置
function saveLanguage(locale: AppLocale) {
  try {
    localStorage.setItem('app-language', locale)
  } catch (error) {
    console.warn('Failed to save language preference:', error)
  }
}

// 获取安装时选择的语言
async function getInstallLanguage(): Promise<AppLocale | null> {
  try {
    const installLang = await invoke<string | null>('get_install_language')
    return installLang ? resolveLocale(installLang) : null
  } catch (error) {
    console.warn('Failed to get install language:', error)
    return null
  }
}

type GlobalTranslator = {
  global: { t: (key: string, params?: Record<string, unknown>) => string }
}

// useI18n() 只能在组件 setup 里调用，工具函数/组合式函数里拿不到实例；
// 这里保留一份全局实例，供那些地方按当前语言取文案（例如后台任务写入的错误信息）。
let appI18n: GlobalTranslator | null = null

export function setI18nInstance(instance: unknown) {
  appI18n = instance as GlobalTranslator
}

/**
 * 在组件之外翻译文案；实例尚未就绪时原样返回 key，避免抛错。
 */
export function translate(key: string, params?: Record<string, unknown>): string {
  if (!appI18n) {
    return key
  }
  try {
    return params ? appI18n.global.t(key, params) : appI18n.global.t(key)
  } catch (error) {
    console.warn(`Failed to translate key: ${key}`, error)
    return key
  }
}

export async function createAppI18n(locale?: string | null) {
  // 优先级：存储设置 > 安装时选择 > 系统语言 > 默认语言
  let finalLocale: AppLocale
  
  if (locale) {
    finalLocale = resolveLocale(locale)
  } else {
    const stored = getStoredLanguage()
    if (stored) {
      finalLocale = stored
    } else {
      const installLang = await getInstallLanguage()
      if (installLang) {
        finalLocale = installLang
        // 保存安装语言到存储中
        saveLanguage(installLang)
      } else {
        finalLocale = await getSystemLanguage()
      }
    }
  }

  const i18n = createI18n({
    legacy: false,
    locale: finalLocale,
    fallbackLocale: 'en',
    messages,
    globalInjection: true,
  })

  setI18nInstance(i18n)

  return i18n
}
