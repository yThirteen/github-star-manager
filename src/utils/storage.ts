/**
 * 本地存储工具函数（使用 SQLite + localStorage 回退）
 */

import type { StarData } from '../types/star';

// 数据库相关操作
import {
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

// 缓存 Tauri 环境检测结果
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

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

// ---------------------------------------------------------------------------
// 写入合并
//
// 每次保存都要把整张 stars 表重写一遍，而调用方（starStore 的各种变更函数）
// 几乎都是「改完内存状态就 fire-and-forget 调一次保存」。批量操作时这会退化成
// O(n²)：n 个仓库各触发一次全表重写。
//
// 这里把并发保存合并成串行队列，只保留最后一次快照：
//   - 写盘期间到达的新快照不会并发写入，而是在当前快照写完后立即补写；
//   - 因此 N 次连续保存最多只写 2 次（在途 1 次 + 最新 1 次）；
//   - 同一时刻只有一条写入序列在跑，也就不会出现「A 的 stars 配 B 的 groups」
//     这种跨表撕裂的快照。
// ---------------------------------------------------------------------------
let pendingData: StarData | null = null;
let pendingWaiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];
let flushPromise: Promise<void> | null = null;

async function drainPendingWrites(): Promise<void> {
  while (pendingData) {
    const snapshot = pendingData;
    const waiters = pendingWaiters;
    pendingData = null;
    pendingWaiters = [];

    try {
      await saveWithRetry(snapshot);
      waiters.forEach((waiter) => waiter.resolve());
    } catch (error) {
      waiters.forEach((waiter) => waiter.reject(error));
      // 单个快照写失败不应卡死整个队列：通知等待者后继续处理后续快照。
    }
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
 *
 * 并发调用会被合并（见上方「写入合并」说明）。返回的 Promise 在该次调用所提交的
 * 快照（或更新的快照）真正落盘后 resolve。
 */
export async function saveStarData(data: StarData): Promise<void> {
  if (!isTauri) {
    console.warn('非 Tauri 环境，无法保存数据');
    return;
  }

  pendingData = data;
  const settled = new Promise<void>((resolve, reject) => {
    pendingWaiters.push({ resolve, reject });
  });

  if (!flushPromise) {
    flushPromise = drainPendingWrites().finally(() => {
      flushPromise = null;
    });
  }

  return settled;
}

/**
 * 创建空数据结构
 */
function createEmptyData(): StarData {
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