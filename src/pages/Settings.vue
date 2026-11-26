<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 侧边栏 -->
    <GroupList />
    
    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 设置页面内容 -->
      <div class="flex-1 overflow-y-auto p-8">
        <div class="max-w-6xl mx-auto">
          <!-- 页面标题 -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ t('settings.title') }}</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {{ t('settings.subtitle') }}
            </p>
          </div>

          <div class="flex gap-6">
            <!-- 左侧导航列表 -->
            <div class="w-64 flex-shrink-0">
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <nav class="p-2">
                  <button
                    v-for="item in settingItems"
                    :key="item.id"
                    @click="activeSection = item.id"
                    :class="[
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                      activeSection === item.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    ]"
                  >
                    <span class="text-xl">{{ item.icon }}</span>
                    <div class="flex-1">
                      <div class="font-medium">{{ item.name }}</div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {{ item.description }}
                      </div>
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            <!-- 右侧设置内容区域 -->
            <div class="flex-1 min-w-0">
              <component :is="currentComponent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import GroupList from '../components/GroupList.vue'
import { useSettingsStore } from '../stores/settingsStore'
import UserManagement from '../components/settings/UserManagement.vue'
import ProviderManagement from '@/components/settings/ProviderManagement.vue'
import DataManagement from '../components/settings/DataManagement.vue'
import GeneralSettings from '../components/settings/GeneralSettings.vue'
import AboutSettings from '../components/settings/AboutSettings.vue'

const settingsStore = useSettingsStore()
const { t } = useI18n()

// 设置分区类型
type SettingSection = 'user' | 'providers' | 'data' | 'general' | 'about'

// 设置项列表
const settingItems = computed(() => [
  {
    id: 'user' as SettingSection,
    name: t('settings.sections.user.name'),
    description: t('settings.sections.user.description'),
    icon: '👤',
    component: UserManagement,
  },
  {
    id: 'providers' as SettingSection,
    name: t('settings.sections.providers.name'),
    description: t('settings.sections.providers.description'),
    icon: '🔌',
    component: ProviderManagement,
  },
  {
    id: 'data' as SettingSection,
    name: t('settings.sections.data.name'),
    description: t('settings.sections.data.description'),
    icon: '💾',
    component: DataManagement,
  },
  {
    id: 'general' as SettingSection,
    name: t('settings.sections.general.name'),
    description: t('settings.sections.general.description'),
    icon: '⚙️',
    component: GeneralSettings,
  },
  {
    id: 'about' as SettingSection,
    name: t('settings.sections.about.name'),
    description: t('settings.sections.about.description'),
    icon: 'ℹ️',
    component: AboutSettings,
  },
])

// 当前激活的分区
const activeSection = ref<SettingSection>('user')

// 当前显示的组件
const currentComponent = computed(() => {
  const item = settingItems.value.find(item => item.id === activeSection.value)
  return item?.component || UserManagement
})

onMounted(() => {
  // 确保设置从 localStorage 加载
  try {
    settingsStore.init()
  } catch (error) {
    console.error('设置加载失败:', error)
  }
})
</script>
