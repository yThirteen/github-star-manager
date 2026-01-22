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
  }
}

/**
 * 保存数据
 */
async function saveWithRetry(data: StarData): Promise<void> {
  try {
    await saveStarsToDb(data.stars || []);
    await saveMetaToDb(data.meta);
    await saveGroupsToDb(data.groups || []);
    await saveTagsToDb(data.tags || []);
    await saveGroupOrderToDb(data.groupOrder || {});
  } catch (error) {
    console.error('SQLite 保存失败:', error);
    throw new Error('无法保存数据：SQLite 保存失败');
  }
}

/**
 * 加载 Star 数据
 */
export async function loadStarData(): Promise<StarData | null> {
  if (!isTauri) {
    return createEmptyData();
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
    console.error('从 SQLite 加载失败:', error);
    return createEmptyData();
  }
}

/**
 * 保存 Star 数据
 */
export async function saveStarData(data: StarData): Promise<void> {
  if (!isTauri) {
    console.warn('非 Tauri 环境，无法保存数据');
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