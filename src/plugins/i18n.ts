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
export function saveLanguage(locale: AppLocale) {
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

  return createI18n({
    legacy: false,
    locale: finalLocale,
    fallbackLocale: 'en',
    messages,
    globalInjection: true,
  })
}
