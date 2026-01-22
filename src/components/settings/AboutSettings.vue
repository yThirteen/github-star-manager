<template>
  <div class="space-y-6">
    <!-- 关于信息 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <span>{{ t('settings.about.title') }}</span>
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400">{{ t('settings.about.subtitle') }}</span>
      </h2>

      <div class="space-y-6">
        <!-- 应用信息 -->
        <div class="text-center py-6 border-b border-gray-200 dark:border-gray-700">
          <div class="mb-4">
            <img src="/app-icon.png" alt="GitHub 星标管理器" class="w-20 h-20 mx-auto rounded-lg shadow-md" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {{ t('common.appName') }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ t('settings.about.description') }}
          </p>
          <div class="flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>版本 1.0.0</span>
            <span>•</span>
            <span>基于 Vue 3 + Tauri</span>
          </div>
        </div>

        <!-- 作者信息 -->
        <div class="space-y-4">
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ t('settings.about.author.title') }}
          </h4>
          
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                G
              </div>
              <div>
                <h5 class="font-medium text-gray-900 dark:text-gray-100">GitHub 星标管理器开发团队</h5>
                <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('settings.about.author.role') }}</p>
              </div>
            </div>
            
            <p class="text-gray-700 dark:text-gray-300 mb-4">
              {{ t('settings.about.author.description') }}
            </p>

            <div class="flex flex-wrap gap-3">
              <a
                href="https://github.com/yThirteen"
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {{ t('settings.about.author.github') }}
              </a>
              
              <a
                href="mailto:contact@example.com"
                class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                {{ t('settings.about.author.email') }}
              </a>
            </div>
          </div>
        </div>

        <!-- 技术栈 -->
        <div class="space-y-4">
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ t('settings.about.technology.title') }}
          </h4>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <div class="text-green-600 dark:text-green-400 font-medium">Vue 3</div>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
              <div class="text-blue-600 dark:text-blue-400 font-medium">TypeScript</div>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
              <div class="text-purple-600 dark:text-purple-400 font-medium">Tauri</div>
            </div>
            <div class="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3 text-center">
              <div class="text-cyan-600 dark:text-cyan-400 font-medium">TailwindCSS</div>
            </div>
          </div>
        </div>

        <!-- 许可证 -->
        <div class="space-y-4">
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ t('settings.about.license.title') }}
          </h4>
          
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p class="text-gray-700 dark:text-gray-300 mb-2">
              {{ t('settings.about.license.description') }}
            </p>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              MIT License
            </a>
          </div>
        </div>

        <!-- 致谢 -->
        <div class="space-y-4">
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ t('settings.about.acknowledgments.title') }}
          </h4>
          
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p class="text-gray-700 dark:text-gray-300">
              {{ t('settings.about.acknowledgments.description') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
