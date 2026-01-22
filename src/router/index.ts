import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import Settings from '../pages/Settings.vue'

const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__

const router = createRouter({
  history: isTauri
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL || '/'),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
    },
    {
      path: '/settings',
      name: 'Settings',
      component: Settings,
    },
  ],
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
})

export default router

