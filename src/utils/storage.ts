/**
 * 本地存储工具函数（使用 SQLite + localStorage 回退）
 */

import type { StarData } from '../types/star';

// 数据库相关操作
import {
  initDatabase,
  loadStarsFromDb,
  loadMetaFromDb,
  loadGroupsFromDb,
  loadTagsFromDb,
  loadGroupOrderFromDb,
  saveStarsToDb,
  saveMetaToDb,
  saveGroupsToDb,
  saveTagsToDb,
  saveGroupOrderToDb,
} from './database';

let migrationChecked = false;

// 缓存 Tauri 环境检测结果
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * 初始化数据库（仅一次）
 */
async function checkAndMigrate(): Promise<void> {
  if (migrationChecked) return;
  migrationChecked = true;

  if (!isTauri) {
    console.warn('非 Tauri 环境，跳过 SQLite 初始化');
    return;
  }

  try {
    await initDatabase();
  } catch (error) {
    console.error('数据库初始化过程中出错:', error);
    // 不中断流程，允许后续从 localStorage 加载
  }
}

/**
 * 保存数据（后端已统一串行/池化，前端无需再做锁重试）
 */
async function saveWithRetry(data: StarData): Promise<void> {
  try {
    await saveStarsToDb(data.stars || []);
    await saveMetaToDb(data.meta);
    await saveGroupsToDb(data.groups || []);
    await saveTagsToDb(data.tags || []);
    await saveGroupOrderToDb(data.groupOrder || {});
  } catch (error) {
    console.error('SQLite 保存失败，尝试回退到 localStorage:', error);
    try {
      localStorage.setItem('github-star-data', JSON.stringify(data));
      console.warn('已将数据保存至 localStorage 作为临时备份');
    } catch (lsError) {
      console.error('localStorage 保存也失败:', lsError);
      throw new Error('无法保存数据：SQLite 和 localStorage 均失败');
    }
  }
}

/**
 * 从 localStorage 加载（非 Tauri 环境或数据库失败时）
 */
function loadFromLocalStorage(): StarData | null {
  try {
    const stored = localStorage.getItem('github-star-data');
    return stored ? (JSON.parse(stored) as StarData) : createEmptyData();
  } catch (error) {
    console.error('从 localStorage 加载失败:', error);
    return createEmptyData();
  }
}

/**
 * 加载 Star 数据
 */
export async function loadStarData(): Promise<StarData | null> {
  if (!isTauri) {
    return loadFromLocalStorage();
  }

  try {
    await checkAndMigrate();

    const [stars, meta, groups, tags, groupOrder] = await Promise.all([
      loadStarsFromDb(),
      loadMetaFromDb(),
      loadGroupsFromDb(),
      loadTagsFromDb(),
      loadGroupOrderFromDb(),
    ]);

    return { stars, meta, groups, tags, groupOrder };
  } catch (error) {
    console.error('从 SQLite 加载失败，尝试 localStorage:', error);
    return loadFromLocalStorage();
  }
}

/**
 * 保存 Star 数据
 */
export async function saveStarData(data: StarData): Promise<void> {
  if (!isTauri) {
    console.warn('非 Tauri 环境，使用 localStorage 保存');
    localStorage.setItem('github-star-data', JSON.stringify(data));
    return;
  }

  await saveWithRetry(data);
}

/**
 * 创建空数据结构
 */
export function createEmptyData(): StarData {
  return {
    stars: [],
    meta: {
      last_sync: '',
      total_count: 0,
      synced_by: '',
    },
    groups: [],
    tags: [],
    groupOrder: {},
  };
}