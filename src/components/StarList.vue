<template>
  <div ref="rootEl" class="flex flex-col min-h-full">
    <!-- Classification overlay prevents interactions during AI grouping -->
    <div v-if="isClassifying"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-xl px-8 py-6 flex flex-col gap-4 text-gray-800 dark:text-gray-100 min-w-[320px]">
        <div class="flex items-center gap-3">
          <span class="animate-spin text-2xl">⏳</span>
          <div class="flex-1">
            <p class="font-semibold text-lg">
              {{ t(isFolderAggregating ? 'starList.overlay.folderAggregating' : 'starList.overlay.classifying') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <template v-if="isFolderAggregating">
                {{ t('starList.overlay.folderAggregationStatus', {
                  count: folderAggregationCount ?? classificationProgress?.total ?? 0
                }) }}
              </template>
              <template v-else>
                {{ t('starList.overlay.progress', {
                  current: classificationProgress?.current || 0,
                  total: classificationProgress?.total || 0
                }) }}
              </template>
            </p>
          </div>
        </div>

        <!-- 进度条：仅非文件夹聚合时显示 -->
        <div v-if="!isFolderAggregating" class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div class="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: `${((classificationProgress?.current || 0) / (classificationProgress?.total || 1)) * 100}%` }">
          </div>
        </div>

        <!-- 取消按钮 -->
        <button @click="handleCancelClassification"
          class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
          {{ t('starList.overlay.cancel') }}
        </button>
      </div>
    </div>

    <!-- List statistics and actions toolbar -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <template v-if="displayItems.length > 0">
            <span v-if="childGroupsCount > 0">{{ t('starList.stats.childFolders', { count: childGroupsCount }) }}，</span>
            {{ t('starList.stats.repositories', { count: filteredStars.length }) }}
          </template>
          <template v-else>{{ t('starList.stats.repositoriesZero') }}</template>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-gray-500 dark:text-gray-400">{{ t('starList.sort.label') }}</span>
          <select
            class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            :value="uiStore.sortOption" @change="handleSortOptionChange" :title="t('starList.sort.modeTooltip')">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button
            class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
            :disabled="uiStore.sortOption === 'default'" @click="handleToggleSortOrder" :title="t('starList.sort.toggleTooltip')">
            {{ sortOrderIcon }}
          </button>
        </div>

        <!-- AI classification controls, visible only inside the uncategorized folder -->
        <div v-if="uiStore.selectedGroup === '新增未分类' && uncategorizedCount > 0" class="flex items-center gap-2">
          <!-- 接收分类结果按钮（只在有预览结果时显示） -->
          <button v-if="hasPreviewResults" @click="handleAcceptClassification"
            class="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            :title="t('starList.ai.tooltips.accept')">
            <span>✅</span>
            <span>{{ t('starList.ai.buttons.accept', { count: selectedPreviewCount }) }}</span>
          </button>

          <!-- 全选/取消全选按钮（只在有预览结果时显示） -->
          <button v-if="hasPreviewResults" @click="handleToggleAllPreviews"
            class="px-3 py-1.5 text-sm border border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-1.5"
            :title="t('starList.ai.tooltips.toggleAll')">
            <span>{{ isAllPreviewsSelected ? '☑️' : '☐' }}</span>
            <span>{{ isAllPreviewsSelected ? t('starList.ai.buttons.deselectAll') : t('starList.ai.buttons.selectAll') }}</span>
          </button>

          <!-- 文件夹预览按钮 -->
          <button v-if="hasPreviewResults" @click.stop="showFolderPreview = true"
            class="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg transition-colors flex items-center gap-1.5"
            :title="t('starList.ai.tooltips.preview')">
            <span>📁</span>
            <span>{{ t('starList.ai.buttons.preview') }}</span>
          </button>

          <!-- AI 分类按钮 -->
          <button v-if="!showContinueClassify && !hasPreviewResults" @click="handleAIClassify" :disabled="isClassifying"
            class="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5"
            :title="isClassifying
              ? t('starList.ai.tooltips.running')
              : t('starList.ai.tooltips.start')">
            <span v-if="isClassifying" class="animate-spin">⏳</span>
            <span v-else>🤖</span>
            <span v-if="isClassifying">
              ({{ classificationProgress?.current || 0 }}/{{ classificationProgress?.total || 0 }})
            </span>
            <span v-else>{{ t('starList.ai.buttons.start') }}</span>
          </button>

          <!-- 继续分类按钮 -->
          <button v-if="showContinueClassify" @click="handleRefineClassification" :disabled="isClassifying"
            class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5"
            :title="t('starList.ai.tooltips.refine')">
            <span v-if="isClassifying" class="animate-spin">⏳</span>
            <span v-else>📂</span>
            <span>{{ t('starList.ai.buttons.refine') }}</span>
          </button>

          <!-- 取消预览按钮（只在有预览结果时显示） -->
          <button v-if="hasPreviewResults" @click="handleCancelPreview"
            class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
            :title="t('starList.ai.tooltips.cancelPreview')">
            ✕
          </button>
        </div>

        <!-- Clear unstarred button, only visible inside the unstarred folder -->
        <button v-if="uiStore.selectedGroup === '已取消星标' && getUnstarredCount() > 0" @click="handleClearUnstarred"
          class="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg transition-colors"
          :title="t('starList.unstarred.clearTooltip')">
          🗑️ {{ t('starList.unstarred.clearButton', { count: getUnstarredCount() }) }}
        </button>
      </div>


    </div>

    <div
      v-if="hasSelection"
      class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-200"
    >
      <span>{{ t('starList.selection.summary', { count: selectedStarIds.length }) }}</span>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
          :checked="isAllVisibleSelected"
          @change="handleToggleSelectAllVisible"
        />
        <span>{{ t('starList.selection.selectAllCurrent') }}</span>
      </label>
      <div class="flex items-center gap-2">
        <div class="relative" ref="moveDropdownWrapper">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-blue-950 text-blue-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors min-w-[180px]"
            @click="toggleMoveDropdown"
          >
            <span class="truncate">{{ moveDropdownLabel }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 transition-transform duration-200"
              :class="{ 'rotate-180': showMoveDropdown }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            v-if="showMoveDropdown"
            class="absolute top-full left-0 mt-1 min-w-[220px] max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50"
          >
            <div class="p-1.5 space-y-0.5">
              <template v-for="item in moveOrganizedGroups" :key="item.fullPath">
                <div
                  :class="[
                    'w-full flex items-center gap-1',
                    item.level > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''
                  ]"
                  :style="{
                    paddingLeft: `${item.level > 0 ? 12 + (item.level - 1) * 16 : 0}px`,
                    marginLeft: item.level > 0 ? '6px' : '0'
                  }"
                >
                  <button
                    v-if="item.hasChildren"
                    type="button"
                    class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors flex-shrink-0"
                    @click.stop="toggleMoveGroupExpand(item.fullPath)"
                    :title="expandedMoveGroups.includes(item.fullPath)
                      ? t('starList.move.collapseChildren')
                      : t('starList.move.expandChildren')"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3.5 w-3.5 transition-transform duration-200"
                      :class="{ '-rotate-90': !expandedMoveGroups.includes(item.fullPath) }"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <span v-else class="w-4 flex-shrink-0"></span>
                  <button
                    type="button"
                    :class="moveOptionButtonClasses(item)"
                    @click.stop="handleSelectMoveTarget(item.fullPath)"
                  >
                    <svg
                      v-if="item.isSpecial"
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                    <svg
                      v-else-if="item.systemType === 'uncategorized'"
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      :class="item.level === 0 ? 'h-4 w-4 flex-shrink-0' : 'h-3.5 w-3.5 flex-shrink-0'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span class="font-medium flex-1 truncate">{{ getGroupDisplayName(item.name) }}</span>
                    <span
                      v-if="moveTargetGroup === item.fullPath"
                      class="text-xs font-medium text-blue-600 dark:text-blue-300"
                    >
                      {{ t('starList.move.selected') }}
                    </span>
                  </button>
                </div>
              </template>

              <div v-if="moveOrganizedGroups.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {{ t('starList.move.empty') }}
              </div>
            </div>
          </div>
        </div>

        <button
          class="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          :disabled="!moveTargetGroup"
          @click="handleBatchMove"
        >
          {{ t('starList.move.confirm') }}
        </button>
      </div>
      <button
        class="px-3 py-1.5 rounded border border-blue-200 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        @click="clearSelection"
      >
        {{ t('starList.selection.clear') }}
      </button>
    </div>

    <!-- 分类错误提示 -->
    <div v-if="uiStore.selectedGroup === '新增未分类' && classificationError"
      class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-sm text-red-600 dark:text-red-400">
        ⚠️ {{ classificationError }}
      </p>
    </div>

    <div class="relative flex flex-col flex-1 ">
      <!-- 空状态 -->
      <div v-if="!starStore.hasStars" class="grow text-center py-12 text-gray-500 dark:text-gray-400">
        <p class="text-lg mb-2">{{ t('starList.empty.title') }}</p>
        <p class="text-sm">{{ t('starList.empty.action') }}</p>
      </div>

      <!-- Star 列表 -->
      <div v-else-if="displayItemsPaginated.length > 0" class="grow px-2 py-2 flex flex-col gap-4">
        <!-- 子文件夹卡片 -->
        <template v-for="item in displayItemsPaginated" :key="item.key">
          <!-- 子文件夹 -->
          <div v-if="item.type === 'childGroup'"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            @click="handleGroupClick(item.fullPath)">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">📂</span>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {{ item.name }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('starList.childGroup.count', { count: item.count }) }}
                  </p>
                </div>
              </div>
              <span class="text-gray-400 dark:text-gray-500">→</span>
            </div>
          </div>

          <!-- 仓库卡片 -->
          <div v-else-if="item.type === 'star'" class="flex items-start gap-3">
            <!-- AI预览结果选择框 -->
            <label v-if="previewResults.has(item.star.id)" class="mt-1.5 flex-shrink-0">
              <input
                type="checkbox"
                class="h-5 w-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                :checked="isPreviewSelected(item.star.id)"
                @change="(e) => togglePreviewSelection(item.star.id, (e.target as HTMLInputElement).checked)"
                :aria-label="t('starList.selection.previewCheckboxAria', { name: item.star.full_name })"
              />
            </label>
            <!-- 普通选择框 -->
            <label v-else class="mt-1.5 flex-shrink-0">
              <input
                type="checkbox"
                class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                :checked="isStarSelected(item.star.id)"
                @change="(e) => toggleStarSelection(item.star.id, (e.target as HTMLInputElement).checked)"
                :aria-label="t('starList.selection.checkboxAria', { name: item.star.full_name })"
              />
            </label>
            <div class="flex-1">
              <StarCard
                :star="item.star"
                :preview-group="previewResults.get(item.star.id)"
                @tag-click="handleTagClick"
                @add-tag="(tag) => handleAddTag(item.star.id, tag)"
                @remove-tag="(tag) => handleRemoveTag(item.star.id, tag)"
                @create-tag="(tag) => handleCreateTagForStar(item.star.id, tag)"
                @group-click="handleGroupClick"
                @add-group="(group) => handleAddToGroup(item.star.id, group)"
                @remove-group="(group) => handleRemoveFromGroup(item.star.id, group)"
                @create-group="() => handleCreateGroupForStar(item.star.id)"
                @update-notes="(notes) => handleUpdateNotes(item.star.id, notes)"
                @delete-star="() => handleDeleteStar(item.star.id)"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- 无搜索结果 -->
      <div v-else-if="uiStore.searchQuery" class="grow text-center py-12 text-gray-500 dark:text-gray-400">
        <p>{{ t('starList.search.noResults') }}</p>
      </div>

      <!-- 悬浮分页控制 + 直达顶部（同一行，跟随列表滚动，左右分布） -->
      <div v-if="filteredStars.length > 0"
        class="mt-auto sticky bottom-1 left-4 right-4 z-40 flex items-center justify-between gap-3 px-2">
        <div
          class="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur">
          <span class="text-gray-600 dark:text-gray-300">{{ t('starList.pagination.pageStatus', { current: currentPage, total: totalPages }) }}</span>
          <button
            class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            :disabled="currentPage <= 1" @click="goFirstPage" :title="t('starList.pagination.first')">«</button>
          <button
            class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            :disabled="currentPage <= 1" @click="prevPage" :title="t('starList.pagination.previous')">&lt;</button>
          <button
            class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            :disabled="currentPage >= totalPages" @click="nextPage" :title="t('starList.pagination.next')">&gt;</button>
          <button
            class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            :disabled="currentPage >= totalPages" @click="goLastPage" :title="t('starList.pagination.last')">»</button>
          <select class="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            :value="pageSize" @change="onPageSizeChange($event)" :title="t('starList.pagination.perPageTitle')">
            <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ t('starList.pagination.perPageOption', { count: opt }) }}</option>
          </select>
        </div>

        <button v-if="showScrollToTop" @click="scrollToTop"
          class="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
          :title="t('starList.pagination.scrollToTop')">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 文件夹预览弹窗 -->
    <Teleport to="body">
      <div v-if="showFolderPreview"
        class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60]">
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[760px] max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('starList.preview.title') }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('starList.preview.subtitle') }}</p>
            </div>
            <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click="showFolderPreview = false" :aria-label="t('starList.preview.close')">
              ✕
            </button>
          </div>

          <div class="px-6 py-4 space-y-4 overflow-y-auto">
            <div class="flex flex-wrap gap-2 text-sm">
              <span class="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                {{ t('starList.preview.total', { count: previewResults.size }) }}
              </span>
              <span v-for="item in folderPreviewStats.levelCounts" :key="item.level"
                class="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                {{ t('starList.preview.levelCount', { level: item.level, count: item.count }) }}
              </span>
            </div>

            <div class="space-y-3">
              <p class="text-sm text-gray-600 dark:text-gray-300">{{ t('starList.preview.structure') }}</p>
              <div v-if="folderPreviewStats.roots.length > 0" class="space-y-3">
                <FolderPreviewNode v-for="node in folderPreviewStats.roots" :key="node.fullPath" :node="node" />
              </div>
              <div v-else class="text-sm text-gray-500 dark:text-gray-400">{{ t('starList.preview.empty') }}</div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              class="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
              @click="showFolderPreview = false">
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- AI 分类确认与配置弹窗 -->
    <Teleport to="body">
      <div v-if="showAIConfigDialog"
        class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60]">
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[760px] max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('starList.ai.config.title') }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('starList.ai.config.subtitle', { count: uncategorizedCount }) }}</p>
            </div>
            <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              @click="cancelAIConfig" :aria-label="t('starList.ai.config.close')">
              ✕
            </button>
          </div>

          <div class="px-6 py-4 space-y-4 overflow-y-auto">
            <div class="text-sm text-gray-600 dark:text-gray-300">
              {{ t('starList.ai.config.notice') }}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('starList.ai.config.fields.concurrency.label') }}</label>
                <input type="number" min="1" step="1" v-model.number="tempConcurrency"
                  class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  :placeholder="t('starList.ai.config.fields.concurrency.placeholder')" />
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('starList.ai.config.fields.concurrency.hint') }}</p>
              </div>

              <div class="space-y-2 md:col-span-2">
                <label class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('starList.ai.config.fields.prompt.label') }}</label>
                <textarea rows="5" v-model="tempPrompt"
                  class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-xs leading-5"
                  :placeholder="t('starList.ai.config.fields.prompt.placeholder')"></textarea>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('starList.ai.config.fields.prompt.hint') }}</p>
              </div>
            </div>
            <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div class="flex flex-wrap items-center gap-2">
                <span class="leading-6">{{ t('starList.ai.config.instructions.description') }}</span>
                <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs"
                  @click="handleOneClickCreate">
                  {{ t('starList.ai.config.instructions.oneClick') }}
                </button>
              </div>
              <div class="space-y-2">
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ t('starList.ai.config.recommend.title') }}</div>
                <div class="flex flex-wrap gap-2">
                  <span v-if="recommendedFolders.length === 0"
                    class="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                    {{ t('starList.ai.config.recommend.empty') }}
                  </span>
                  <span v-for="folder in recommendedFolders" :key="folder"
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <span>{{ folder }}</span>
                    <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      @click.stop="removeRecommendedFolder(folder)" :aria-label="t('starList.ai.config.recommend.remove')">
                      ✕
                    </button>
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <input v-model="newRecommendedFolder" type="text"
                    class="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    :placeholder="t('starList.ai.config.recommend.placeholder')" @keyup.enter="addRecommendedFolder" />
                  <button
                    class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                    @click="addRecommendedFolder">
                    {{ t('starList.ai.config.recommend.add') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              @click="cancelAIConfig">
              {{ t('common.cancel') }}
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="!tempConcurrency || tempConcurrency < 1" @click="confirmAIConfig">
              {{ t('starList.ai.config.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 清空"已取消星标"确认对话框 -->
    <div v-if="showClearUnstarredDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          ⚠️ {{ t('starList.unstarred.dialog.title') }}
        </h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">
          {{ t('starList.unstarred.dialog.message') }}
        </p>
        <p class="text-sm text-red-600 dark:text-red-400 font-semibold mb-4">
          {{ t('starList.unstarred.dialog.warning', { count: getUnstarredCount() }) }}
        </p>
        <div class="flex gap-2 justify-end">
          <button @click="cancelClearUnstarred"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmClearUnstarred"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            {{ t('starList.unstarred.dialog.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, onMounted, onUnmounted, type PropType, type VNode } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStarStore } from '../stores/starStore'
import { useUIStore } from '../stores/uiStore'
import { useAI } from '../composables/useAI'
import { useSettingsStore } from '../stores/settingsStore'
import { useDialog } from '../composables/useDialog'
import { searchStars } from '../utils/fuse'
import { getCachedSearchIndex } from '../utils/searchCache'
import StarCard from './StarCard.vue'
import type { StarItem } from '../types/star'

// 清空"已取消星标"确认对话框
const showClearUnstarredDialog = ref(false)

const starStore = useStarStore()
const uiStore = useUIStore()
const {
  classifyStars,
  refineClassification,
  isClassifying,
  classificationError,
  classificationProgress,
  cancelClassification,
  isCancelling,
  refineAttempts,
  maxRefineRounds,
  refineLimitReached,
} = useAI()
const { confirm, alert } = useDialog()
const settingsStore = useSettingsStore()
const { t, tm } = useI18n()

const selectedStarIds = ref<string[]>([])
const moveTargetGroup = ref('')

const hasSelection = computed(() => selectedStarIds.value.length > 0)
const moveDropdownWrapper = ref<HTMLElement | null>(null)
const showMoveDropdown = ref(false)
const expandedMoveGroups = ref<string[]>([])

type MoveGroupOption = {
  name: string
  fullPath: string
  level: number
  hasChildren: boolean
  isSpecial?: boolean
  systemType?: 'uncategorized'
}

function getGroupDisplayName(name: string): string {
  if (name === '新增未分类') {
    return t('groups.uncategorized')
  }
  if (name === '已取消星标') {
    return t('groups.unstarred')
  }
  if (name === '特别关注') {
    return t('starList.groups.favorites')
  }
  return name
}

const moveDropdownLabel = computed(() => {
  if (moveTargetGroup.value) {
    return getGroupDisplayName(moveTargetGroup.value)
  }
  return t('starList.move.selectTarget')
})

const moveOrganizedGroups = computed<MoveGroupOption[]>(() => {
  const groupOrder = starStore.groupOrder || {}
  const allGroupSet = new Set<string>(starStore.groups)

  // 确保系统文件夹始终可见
  allGroupSet.add('新增未分类')
  allGroupSet.add('特别关注')
  allGroupSet.delete('已取消星标')

  const result: MoveGroupOption[] = []

  if (allGroupSet.has('特别关注')) {
    result.push({
      name: '特别关注',
      fullPath: '特别关注',
      level: 0,
      hasChildren: false,
      isSpecial: true,
    })
  }

  if (allGroupSet.has('新增未分类')) {
    result.push({
      name: '新增未分类',
      fullPath: '新增未分类',
      level: 0,
      hasChildren: false,
      systemType: 'uncategorized',
    })
  }

  const nonSystemGroups = Array.from(allGroupSet).filter(
    (group) => group !== '新增未分类' && group !== '特别关注'
  )

  if (nonSystemGroups.length === 0) {
    return result
  }

  const validGroups = new Set(nonSystemGroups)
  const nameMap = new Map<string, string>()
  const childMap = new Map<string, Set<string>>()
  const rootSet = new Set<string>()

  nonSystemGroups.forEach((fullPath) => {
    if (!fullPath) return
    const segments = fullPath.split('/').filter(Boolean)
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath = index === 0 ? segment : `${currentPath}/${segment}`

      if (!nameMap.has(currentPath)) {
        nameMap.set(currentPath, segment)
      }

      if (index === 0) {
        rootSet.add(currentPath)
      }

      if (index > 0) {
        const parentPath = currentPath.slice(0, currentPath.lastIndexOf('/'))
        if (!childMap.has(parentPath)) {
          childMap.set(parentPath, new Set())
        }
        childMap.get(parentPath)!.add(currentPath)
      }
    })
  })

  const sortPaths = (paths: string[]): string[] =>
    paths.sort((a, b) => {
      const orderA = groupOrder[a] ?? 0
      const orderB = groupOrder[b] ?? 0
      if (orderA !== orderB) {
        return orderA - orderB
      }
      const nameA = nameMap.get(a) ?? a.split('/').pop() ?? a
      const nameB = nameMap.get(b) ?? b.split('/').pop() ?? b
      return nameA.localeCompare(nameB)
    })

  const visit = (paths: string[], level: number) => {
    paths.forEach((path) => {
      const children = sortPaths(Array.from(childMap.get(path) ?? []))
      const isValidGroup = validGroups.has(path)

      if (isValidGroup) {
        result.push({
          name: nameMap.get(path) ?? path.split('/').pop() ?? path,
          fullPath: path,
          level,
          hasChildren: children.length > 0,
        })
      }

      if (children.length === 0) {
        return
      }

      if (isValidGroup) {
        if (expandedMoveGroups.value.includes(path)) {
          visit(children, level + 1)
        }
      } else {
        visit(children, level)
      }
    })
  }

  const sortedRoots = sortPaths(Array.from(rootSet))
  visit(sortedRoots, 0)

  return result
})

type SortOption = 'default' | 'starDelta' | 'starCount' | 'starredAt'

const sortOptions = computed<Array<{ value: SortOption; label: string }>>(() => [
  { value: 'default', label: t('starList.sort.options.default') },
  { value: 'starDelta', label: t('starList.sort.options.starDelta') },
  { value: 'starCount', label: t('starList.sort.options.starCount') },
  { value: 'starredAt', label: t('starList.sort.options.starredAt') },
])

const sortOrderIcon = computed(() => (uiStore.sortOrder === 'desc' ? '↓' : '↑'))

// AI 分类相关
const uncategorizedCount = computed(() => starStore.getUncategorizedStars().length)

// 预览结果（Map<starId, suggestedGroup>）
const previewResults = ref<Map<string, string>>(new Map())
// 预览结果选择状态（Map<starId, boolean>）
const previewSelections = ref<Map<string, boolean>>(new Map())
const showFolderPreview = ref(false)
const showContinueClassify = ref(false)
const hasPreviewResults = computed(() => previewResults.value.size > 0)
const selectedPreviewCount = computed(() => {
  let count = 0
  // 只遍历当前预览结果：previewSelections 只写不删（selectAllPreviews 只 set 不 delete），
  // 而 previewResults 在「继续分类」时会被整体替换，直接遍历 previewSelections 会把上一轮的旧键也算进来，
  // 使「接收分类结果 (N)」的数字比实际可见/会被接收的行数虚高。
  for (const starId of previewResults.value.keys()) {
    if (previewSelections.value.get(starId)) count++
  }
  return count
})
const isAllPreviewsSelected = computed(() => {
  if (previewResults.value.size === 0) return false
  for (const starId of previewResults.value.keys()) {
    if (!previewSelections.value.get(starId)) return false
  }
  return true
})
const isFolderAggregating = ref(false)
const folderAggregationCount = ref<number | null>(null)
// 标记用户主动点击过“取消分类”以屏蔽后续提示
const userCancelled = ref(false)

// AI 分类确认配置弹窗状态
const showAIConfigDialog = ref(false)
const tempConcurrency = ref<number>(6)
const tempPrompt = ref<string>('')
const aiConfigDialogResolve = ref<((v: boolean) => void) | null>(null)

const defaultRecommendedFolders = computed<string[]>(() => {
  const raw = tm('starList.ai.config.recommend.defaults') as unknown
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item))
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .map((item) => String(item))
  }
  if (typeof raw === 'string') {
    return [raw]
  }
  return []
})

const recommendedFolders = ref<string[]>([])
const recommendedInitialized = ref(false)

watch(
  defaultRecommendedFolders,
  (defaults) => {
    if (!recommendedInitialized.value) {
      recommendedFolders.value = [...defaults]
      recommendedInitialized.value = true
    }
  },
  { immediate: true }
)

const newRecommendedFolder = ref('')

function openAIConfigDialog(): Promise<boolean> {
  // 初始化为当前全局设置
  tempConcurrency.value = settingsStore.classifyConcurrency
  tempPrompt.value = settingsStore.classifyPromptTemplate
  showAIConfigDialog.value = true
  return new Promise((resolve) => {
    aiConfigDialogResolve.value = resolve
  })
}

function confirmAIConfig() {
  // 写回设置（内部已做最小值限制与持久化）
  settingsStore.setClassifyConcurrency(Math.max(1, Math.floor(tempConcurrency.value || 1)))
  settingsStore.setClassifyPromptTemplate(tempPrompt.value || '')
  showAIConfigDialog.value = false
  aiConfigDialogResolve.value?.(true)
  aiConfigDialogResolve.value = null
}

function cancelAIConfig() {
  showAIConfigDialog.value = false
  aiConfigDialogResolve.value?.(false)
  aiConfigDialogResolve.value = null
}

const MAX_TOP_LEVEL_GROUPS = 15
const pageSizeOptions = [10, 20, 50, 100]
const untitledGroupName = computed(() => t('starList.common.untitled'))
const listSeparator = computed(() => t('starList.common.listSeparator'))

function formatNameList(items: string[]): string {
  return items.join(listSeparator.value)
}

function countTopLevelGroups(assignments: Map<string, string>): number {
  const topLevels = new Set<string>()
  assignments.forEach((groupPath) => {
    const normalized = groupPath.trim().replace(/^\/+|\/+$/g, '')
    const top = normalized.split('/')[0] || untitledGroupName.value
    topLevels.add(top)
  })
  return topLevels.size
}

function normalizeGroupName(name: string): string {
  return name.trim().replace(/^\/+|\/+$/g, '')
}

function addRecommendedFolder() {
  const name = normalizeGroupName(newRecommendedFolder.value)
  if (!name) return

  const exists = recommendedFolders.value.some((item) => normalizeGroupName(item) === name)
  if (exists) {
    newRecommendedFolder.value = ''
    return
  }

  recommendedFolders.value.push(name)
  newRecommendedFolder.value = ''
}

function removeRecommendedFolder(folder: string) {
  recommendedFolders.value = recommendedFolders.value.filter((item) => item !== folder)
}

async function handleOneClickCreate() {
  const names = recommendedFolders.value
    .map((item) => normalizeGroupName(item))
    .filter(Boolean)

  if (names.length === 0) {
    await alert({
      title: t('starList.ai.alerts.noFolders.title'),
      message: t('starList.ai.alerts.noFolders.message'),
      icon: 'ℹ️',
      buttonClass: 'bg-gray-800 hover:bg-gray-700',
    })
    return
  }

  const created: string[] = []
  const skipped: string[] = []
  const failed: string[] = []

  for (const name of names) {
    if (starStore.groups.includes(name)) {
      skipped.push(name)
      continue
    }

    try {
      await Promise.resolve(starStore.createGroup(name))
      created.push(name)
    } catch (error) {
      failed.push(name)
      console.error('[StarList] Failed to create group', name, error)
    }
  }

  const parts: string[] = []
  parts.push(
    created.length
      ? t('starList.ai.alerts.createSummary.createdWithList', {
        count: created.length,
        list: formatNameList(created),
      })
      : t('starList.ai.alerts.createSummary.created', { count: created.length })
  )
  parts.push(
    skipped.length
      ? t('starList.ai.alerts.createSummary.skippedWithList', {
        count: skipped.length,
        list: formatNameList(skipped),
      })
      : t('starList.ai.alerts.createSummary.skipped', { count: skipped.length })
  )
  if (failed.length) {
    parts.push(
      t('starList.ai.alerts.createSummary.failedWithList', {
        count: failed.length,
        list: formatNameList(failed),
      })
    )
  }

  await alert({
    title: t('starList.ai.alerts.createSummary.title'),
    message: parts.join('\n'),
    icon: '📁',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
  })
}

type GroupPreviewNode = {
  name: string
  fullPath: string
  level: number
  repoCount: number
  children: GroupPreviewNode[]
}

const FolderPreviewNode = defineComponent({
  name: 'FolderPreviewNode',
  props: {
    node: {
      type: Object as PropType<GroupPreviewNode>,
      required: true,
    },
  },
  setup(props): () => VNode {
    return () =>
      h('div', { class: 'space-y-2' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'text-sm font-semibold text-gray-900 dark:text-gray-100' }, props.node.name),
          // h('span', { class: 'text-xs text-gray-500 dark:text-gray-400' }, props.node.fullPath),
          h(
            'span',
            {
              class: 'ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
            },
            t('starList.preview.nodeCount', { count: props.node.repoCount })
          ),
        ]),
        props.node.children.length
          ? h(
            'div',
            { class: 'pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1' },
            props.node.children.map((child) =>
              h(FolderPreviewNode, { node: child, key: child.fullPath })
            )
          )
          : null,
      ])
  },
})

const folderPreviewStats = computed(() => {
  if (previewResults.value.size === 0) {
    return { levelCounts: [], roots: [] as GroupPreviewNode[] }
  }

  const normalizePath = (path: string) => path.trim().replace(/^\/+|\/+$/g, '')
  const levelGroups = new Map<number, Set<string>>()
  const nodeMap = new Map<string, GroupPreviewNode>()
  const rootMap = new Map<string, GroupPreviewNode>()

  previewResults.value.forEach((groupPath) => {
    const normalized = normalizePath(groupPath || '')
    const parts = normalized ? normalized.split('/').filter(Boolean) : [untitledGroupName.value]

    let currentPath = ''
    let parentNode: GroupPreviewNode | null = null

    parts.forEach((segment, idx) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const level = idx + 1

      if (!levelGroups.has(level)) {
        levelGroups.set(level, new Set())
      }
      levelGroups.get(level)!.add(currentPath)

      let node = nodeMap.get(currentPath)
      if (!node) {
        node = {
          name: segment,
          fullPath: currentPath,
          level,
          repoCount: 0,
          children: [],
        }
        nodeMap.set(currentPath, node)
        if (parentNode) {
          parentNode.children.push(node)
        } else {
          rootMap.set(currentPath, node)
        }
      }

      node.repoCount += 1
      parentNode = node
    })
  })

  const sortNodes = (nodes: GroupPreviewNode[]) => {
    nodes.sort((a, b) => b.repoCount - a.repoCount || a.name.localeCompare(b.name))
    nodes.forEach((child) => sortNodes(child.children))
  }

  const roots = Array.from(rootMap.values())
  sortNodes(roots)

  const levelCounts = Array.from(levelGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([level, set]) => ({ level, count: set.size }))

  return { levelCounts, roots }
})

watch(hasPreviewResults, (present) => {
  if (!present) {
    showFolderPreview.value = false
  }
})

watch(
  () => starStore.groups.slice(),
  (groups) => {
    if (!moveTargetGroup.value) {
      return
    }
    const validTargets = new Set<string>([...groups, '新增未分类', '特别关注'])
    if (!validTargets.has(moveTargetGroup.value)) {
      moveTargetGroup.value = ''
      closeMoveDropdown()
    }
  }
)

watch(hasSelection, (active) => {
  if (!active) {
    moveTargetGroup.value = ''
    closeMoveDropdown()
  }
})

// 处理 AI 分类（只生成预览，不直接应用）
async function handleAIClassify() {
  if (isClassifying.value) {
    return
  }

  // 新一轮开始，清除用户取消标记
  userCancelled.value = false

  const uncategorizedStars = starStore.getUncategorizedStars()
  if (uncategorizedStars.length === 0) {
    return
  }

  // 可编辑确认弹窗（并发与提示词）
  const confirmed = await openAIConfigDialog()

  if (!confirmed) {
    return
  }

  try {
    // 获取现有分组列表
    const existingGroups = starStore.groups.filter(
      (g) => g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标'
    )

    // 执行批量分类（只获取结果，不应用）
    const results = await classifyStars(starStore.stars, existingGroups)

    // 若已取消，直接退出，不提示失败
    if (isCancelling.value || userCancelled.value) {
      previewResults.value.clear()
      previewSelections.value.clear()
      showContinueClassify.value = false
      return
    }

    if (results.size === 0) {
      await alert({
        title: t('starList.ai.alerts.noResult.title'),
        message: t('starList.ai.alerts.noResult.message'),
        icon: '⚠️',
        buttonClass: 'bg-orange-600 hover:bg-orange-700',
      })
      return
    }

    // 检查分组数量
    const topLevelCount = countTopLevelGroups(results)
    // const MAX_GROUPS = 15 // 阈值

    // if (uniqueGroups.size > MAX_GROUPS) {
    if (topLevelCount > MAX_TOP_LEVEL_GROUPS) {
      if (userCancelled.value) {
        previewResults.value.clear()
        previewSelections.value.clear()
        showContinueClassify.value = false
        return
      }
      const proceed = await confirm({
        title: t('starList.ai.prompts.excessGroups.title'),
        message: t('starList.ai.prompts.excessGroups.message', { count: topLevelCount }),
        confirmText: t('starList.ai.prompts.excessGroups.confirm'),
        cancelText: t('starList.ai.prompts.excessGroups.cancel'),
      })

      if (proceed) {
        // 用户选择确认，直接进行文件夹分类
        // 先保存当前结果作为基础
        previewResults.value = results
        // 默认全选所有预览结果
        selectAllPreviews(true)
        await handleRefineClassification()
        return
      } else {
        // 用户选择先预览，显示"继续分类"按钮
        showContinueClassify.value = true
      }
    } else {
      showContinueClassify.value = false
    }

    // 保存预览结果，不直接应用
    previewResults.value = results
    // 默认全选所有预览结果
    selectAllPreviews(true)

    // 显示预览提示
    const previewNotice = [
      t('starList.ai.alerts.preview.message', { count: results.size }),
      showContinueClassify.value ? t('starList.ai.alerts.preview.refineHint') : '',
      t('starList.ai.alerts.preview.acceptHint'),
    ]
      .filter(Boolean)
      .join('\n')

    await alert({
      title: t('starList.ai.alerts.preview.title'),
      message: previewNotice,
      icon: '👀',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    })
  } catch (error) {
    // 取消分类不提示失败
    if (error instanceof Error && error.message === 'CLASSIFICATION_CANCELLED') {
      return
    }
    const errorMessage = error instanceof Error ? error.message : t('starList.ai.errors.generic')
    await alert({
      title: t('starList.ai.alerts.error.title'),
      message: t('starList.ai.alerts.error.message', { error: errorMessage }),
      icon: '❌',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
    console.error('[StarList] AI classification failed', error)
  }
}

// 继续分类（文件夹归纳）
async function handleRefineClassification() {
  if (previewResults.value.size === 0) return

  isFolderAggregating.value = true
  folderAggregationCount.value = countTopLevelGroups(previewResults.value)

  try {
    const results = await refineClassification(previewResults.value)

    if (isCancelling.value || userCancelled.value) {
      previewResults.value.clear()
      previewSelections.value.clear()
      showContinueClassify.value = false
      await alert({
        title: t('starList.ai.alerts.cancelled.title'),
        message: t('starList.ai.alerts.cancelled.message'),
        icon: 'ℹ️',
        buttonClass: 'bg-gray-800 hover:bg-gray-700',
      })
      return
    }

    const overLimit = refineLimitReached.value
    const currentTopLevelCount = results.size > 0
      ? countTopLevelGroups(results)
      : countTopLevelGroups(previewResults.value)

    // 达到分类次数上限：直接提示结束，不再引导继续分类
    if (overLimit) {
      if (results.size > 0) {
        previewResults.value = results
        // 默认全选所有预览结果
        selectAllPreviews(true)
      }
      showContinueClassify.value = false
      await alert({
        title: t('starList.ai.alerts.limitReached.title'),
        message: t('starList.ai.alerts.limitReached.message', {
          reason: classificationError.value || t('starList.ai.errors.limitReached'),
          count: currentTopLevelCount,
        }),
        icon: '⚠️',
        buttonClass: 'bg-blue-600 hover:bg-blue-700',
      })
      return
    }

    if (results.size > 0) {
      previewResults.value = results
      // 默认全选所有预览结果
      selectAllPreviews(true)

      const topLevelCount = countTopLevelGroups(results)
      if (topLevelCount > MAX_TOP_LEVEL_GROUPS) {
        const remainingRefine = Math.max(0, maxRefineRounds.value - refineAttempts.value)
        // 若没有剩余次数，直接提示结束，避免继续分类后立刻触发上限弹窗
        if (remainingRefine === 0) {
          showContinueClassify.value = false
          await alert({
            title: t('starList.ai.alerts.limitReached.title'),
            message: t('starList.ai.alerts.limitReached.message', {
              reason: classificationError.value || t('starList.ai.errors.limitReached'),
              count: topLevelCount,
            }),
            icon: '⚠️',
            buttonClass: 'bg-blue-600 hover:bg-blue-700',
          })
          return
        }

        const proceed = await confirm({
          title: t('starList.ai.prompts.refineMore.title'),
          message: t('starList.ai.prompts.refineMore.message', { count: topLevelCount }),
          confirmText: t('starList.ai.prompts.refineMore.confirm'),
          cancelText: t('starList.ai.prompts.refineMore.cancel'),
        })

        if (proceed) {
          // 继续对当前结果再次进行文件夹分类
          return await handleRefineClassification()
        }

        // 用户选择先预览，提供再次分类入口
        showContinueClassify.value = true
      } else {
        showContinueClassify.value = false
      }

      await alert({
        title: t('starList.ai.alerts.optimizeDone.title'),
        message: [
          t('starList.ai.alerts.optimizeDone.message'),
          topLevelCount > MAX_TOP_LEVEL_GROUPS ? t('starList.ai.alerts.optimizeDone.reminder') : '',
        ]
          .filter(Boolean)
          .join('\n'),
        icon: '✅',
        buttonClass: 'bg-green-600 hover:bg-green-700',
      })
    }
  } catch (error) {
    // 取消分类不提示失败
    if (error instanceof Error && error.message === 'CLASSIFICATION_CANCELLED') {
      previewResults.value.clear()
      previewSelections.value.clear()
      showContinueClassify.value = false
      if (!userCancelled.value) {
        userCancelled.value = true
      }
      await alert({
        title: t('starList.ai.alerts.cancelled.title'),
        message: t('starList.ai.alerts.cancelled.message'),
        icon: 'ℹ️',
        buttonClass: 'bg-gray-800 hover:bg-gray-700',
      })
      return
    }
    const errorMessage = error instanceof Error ? error.message : t('starList.ai.errors.optimizeFailed')
    await alert({
      title: t('starList.ai.alerts.optimizeFailed.title'),
      message: t('starList.ai.alerts.optimizeFailed.message', { error: errorMessage }),
      icon: '❌',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
  }
  finally {
    isFolderAggregating.value = false
    folderAggregationCount.value = null
  }
}

// 预览结果选择相关函数
function isPreviewSelected(starId: string): boolean {
  return previewSelections.value.get(starId) ?? false
}

function togglePreviewSelection(starId: string, selected: boolean): void {
  previewSelections.value.set(starId, selected)
}

function selectAllPreviews(select: boolean): void {
  for (const starId of previewResults.value.keys()) {
    previewSelections.value.set(starId, select)
  }
}

function handleToggleAllPreviews(): void {
  const newState = !isAllPreviewsSelected.value
  selectAllPreviews(newState)
}

// 接收分类结果（应用预览）
async function handleAcceptClassification() {
  if (previewResults.value.size === 0) {
    return
  }

  // 构建选中的预览结果
  const selectedResults = new Map<string, string>()
  for (const [starId, group] of previewResults.value) {
    if (previewSelections.value.get(starId) !== false) {
      selectedResults.set(starId, group)
    }
  }

  if (selectedResults.size === 0) {
    await alert({
      title: t('starList.ai.alerts.noSelection.title'),
      message: t('starList.ai.alerts.noSelection.message'),
      icon: '⚠️',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
    })
    return
  }

  try {
    // 应用选中的分类结果
    const { success, failed } = await starStore.applyClassificationResults(selectedResults)

    // 只移除已接收的预览结果，保留未选中的结果
    for (const starId of selectedResults.keys()) {
      previewResults.value.delete(starId)
      previewSelections.value.delete(starId)
    }
    
    // 如果没有剩余的预览结果，则清空相关状态
    if (previewResults.value.size === 0) {
      showContinueClassify.value = false
    }

    // 显示结果
    if (failed > 0) {
      await alert({
        title: t('starList.ai.alerts.applyMixed.title'),
        message: t('starList.ai.alerts.applyMixed.message', { success, failed }),
        icon: '✅',
        buttonClass: 'bg-blue-600 hover:bg-blue-700',
      })
    } else {
      await alert({
        title: t('starList.ai.alerts.applySuccess.title'),
        message: t('starList.ai.alerts.applySuccess.message', { count: success }),
        icon: '🎉',
        buttonClass: 'bg-green-600 hover:bg-green-700',
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('starList.ai.errors.applyFailed')
    await alert({
      title: t('starList.ai.alerts.applyFailed.title'),
      message: t('starList.ai.alerts.applyFailed.message', { error: errorMessage }),
      icon: '❌',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
    console.error('[StarList] Failed to apply classification results', error)
  }
}

// 取消预览
function handleCancelPreview() {
  previewResults.value.clear()
  previewSelections.value.clear()
  // 重置按钮文案
  showContinueClassify.value = false
}

// 缓存分组（包含其所有子孙分组）的仓库数量，便于右侧列表统计
const descendantGroupCountCache = computed(() => {
  const cache = new Map<string, number>()

  starStore.stars.forEach((star) => {
    if (!star.groups) return

    star.groups.forEach((groupPath: string) => {
      if (!groupPath) return
      const parts = groupPath.split('/').filter(Boolean)
      let path = ''
      parts.forEach((segment) => {
        path = path ? `${path}/${segment}` : segment
        cache.set(path, (cache.get(path) || 0) + 1)
      })
    })
  })

  return cache
})

// 获取子文件夹列表（当选中父分组时）
const childGroups = computed(() => {
  if (!uiStore.selectedGroup) {
    return []
  }

  const selectedGroup = uiStore.selectedGroup
  const prefix = `${selectedGroup}/`

  // 仅取当前选中分组的直接子分组（忽略更深层级）
  const immediateChildren = new Set<string>()
  starStore.groups.forEach((g) => {
    if (!g || !g.startsWith(prefix)) return
    const remainder = g.slice(prefix.length)
    const firstSegment = remainder.split('/')[0]
    if (firstSegment) {
      immediateChildren.add(`${selectedGroup}/${firstSegment}`)
    }
  })

  const groupOrder = starStore.groupOrder || {}
  const countCache = descendantGroupCountCache.value

  const mapped = Array.from(immediateChildren).map((fullPath) => {
    const name = fullPath.slice(prefix.length)
    const count = countCache.get(fullPath) || 0
    return { name, fullPath, count }
  })

  return mapped.sort((a, b) => {
    const orderA = groupOrder[a.fullPath] ?? 0
    const orderB = groupOrder[b.fullPath] ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
})

const childGroupsCount = computed(() => childGroups.value.length)

// 缓存子分组列表（避免重复计算）
const cachedChildGroupsForFilter = computed(() => {
  if (!uiStore.selectedGroup) {
    return null
  }
  return starStore.groups.filter((g) => g.startsWith(`${uiStore.selectedGroup}/`))
})

function getStarDeltaValue(star: StarItem): number {
  const previous = star.previous_stargazers_count ?? star.stargazers_count
  return star.stargazers_count - previous
}

function getStarCountValue(star: StarItem): number {
  return star.stargazers_count
}

function getStarredAtTimestamp(star: StarItem): number {
  if (!star.starred_at) {
    return 0
  }
  const timestamp = new Date(star.starred_at).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getSortMetric(star: StarItem, option: SortOption): number {
  switch (option) {
    case 'starDelta':
      return getStarDeltaValue(star)
    case 'starCount':
      return getStarCountValue(star)
    case 'starredAt':
      return getStarredAtTimestamp(star)
    default:
      return 0
  }
}

// 是否存在有效的搜索关键词
const hasSearchQuery = computed(() => uiStore.searchQuery.trim().length > 0)

// 根据搜索和筛选条件过滤 Stars
const filteredStars = computed(() => {
  let result = [...starStore.stars] as StarItem[]

  // 按分组筛选（支持父分组和子分组）
  if (uiStore.selectedGroup) {
    const childGroups = cachedChildGroupsForFilter.value
    result = result.filter((star) => {
      // 直接匹配当前选中的分组
      if (star.groups.includes(uiStore.selectedGroup!)) {
        return true
      }
      // 如果选中的是父分组，也显示包含其子分组的仓库
      if (childGroups && childGroups.length > 0) {
        return childGroups.some((childGroup) => star.groups.includes(childGroup))
      }
      return false
    })
  }

  // 按语言标签筛选（单选）
  if (uiStore.selectedTag) {
    result = result.filter((star) => {
      return star.language === uiStore.selectedTag
    })
  }

  // 按自建标签筛选（多选，AND 逻辑：必须包含所有选中的标签）
  if (uiStore.selectedTags.length > 0) {
    result = result.filter((star) => {
      return uiStore.selectedTags.every((tag) => star.tags.includes(tag))
    })
  }

  // 搜索（统一搜索所有字段）
  if (uiStore.searchQuery.trim()) {
    const index = getCachedSearchIndex(result)
    result = searchStars(index, uiStore.searchQuery)
  }

  const option = uiStore.sortOption as SortOption
  if (option !== 'default') {
    const direction = uiStore.sortOrder === 'desc' ? -1 : 1
    // 排序指标先每条算一次。原来在比较器里调用 getSortMetric，starredAt 会为每次比较
    // new Date(...).getTime()，5000 条约 6 万次 Date 构造；预先算好结果完全等价。
    const withMetric = result.map((star) => ({ star, metric: getSortMetric(star, option) }))
    withMetric.sort((a, b) => {
      const diff = a.metric - b.metric
      if (diff !== 0) {
        return diff * direction
      }
      return a.star.full_name.localeCompare(b.star.full_name)
    })
    result = withMetric.map((entry) => entry.star)
  }

  return result
})

// 当选择父分组且有子分组时，区分直接在该分组的仓库和子分组的仓库
type DisplayItem =
  | { type: 'childGroup'; key: string; name: string; fullPath: string; count: number }
  | { type: 'star'; key: string; star: any }

const displayItems = computed<DisplayItem[]>(() => {
  const items: DisplayItem[] = []

  // 搜索模式下直接展示匹配的仓库，避免被子文件夹列表覆盖
  if (hasSearchQuery.value) {
    filteredStars.value.forEach((star) => {
      items.push({
        type: 'star',
        key: `star-${star.id}`,
        star,
      })
    })

    return items
  }

  // 如果选中了父分组且有子分组，先显示子文件夹
  if (uiStore.selectedGroup && childGroups.value.length > 0) {
    // 添加子文件夹
    childGroups.value.forEach((childGroup) => {
      items.push({
        type: 'childGroup',
        key: `group-${childGroup.fullPath}`,
        name: childGroup.name,
        fullPath: childGroup.fullPath,
        count: childGroup.count,
      })
    })

    // 然后添加直接在该父分组下的仓库（不在子分组中的）
    const directStars = filteredStars.value.filter((star) => {
      if (!star.groups) return false

      const selected = uiStore.selectedGroup!
      const inSelected = star.groups.includes(selected)
      const inDescendant = star.groups.some((g) => g.startsWith(`${selected}/`))

      // 只展示直接挂载在当前分组的仓库（不包含仅在子孙分组的仓库）
      return inSelected && !inDescendant
    })

    directStars.forEach((star) => {
      items.push({
        type: 'star',
        key: `star-${star.id}`,
        star,
      })
    })
  } else {
    // 没有子分组或未选中分组，直接显示所有过滤后的仓库
    filteredStars.value.forEach((star) => {
      items.push({
        type: 'star',
        key: `star-${star.id}`,
        star,
      })
    })
  }

  return items
})

// 分页：保留子文件夹全部显示，仅对仓库项分页
const pageSize = computed(() => uiStore.pageSize)
const currentPage = computed({
  get: () => uiStore.currentPage,
  set: (val: number) => uiStore.setCurrentPage(val),
})

const starItems = computed(() => displayItems.value.filter((i) => i.type === 'star'))
const childGroupItems = computed(() => displayItems.value.filter((i) => i.type === 'childGroup'))
const totalPages = computed(() => Math.max(1, Math.ceil(starItems.value.length / pageSize.value)))

const displayItemsPaginated = computed<DisplayItem[]>(() => {
  // 只在本地钳制页码，不要在这里写 currentPage：
  // 在 computed 内部修改自己依赖的状态会造成自失效（多一次渲染），也是
  // "Maximum recursive updates exceeded in component <StarList>" 的经典触发点。
  // 越界时真正回写 uiStore 由下面监听 totalPages 的 watch 统一负责。
  const pages = totalPages.value
  const rawPage = currentPage.value
  const page = rawPage > pages ? pages : rawPage < 1 ? 1 : rawPage

  const start = (page - 1) * pageSize.value
  const end = start + pageSize.value
  const starsSlice = starItems.value.slice(start, end)
  return [...childGroupItems.value, ...starsSlice]
})

// 数据变少（删除/筛选/改每页条数）导致当前页越界时，把页码拉回有效范围。
// 放在 watch 里而不是在 computed 内写状态；挂载时的一次性校正见 onMounted 里的 clampCurrentPage()。
watch(totalPages, clampCurrentPage)

type DisplayStarItem = Extract<DisplayItem, { type: 'star' }>

const visibleStarIds = computed(() =>
  displayItemsPaginated.value
    .filter((item): item is DisplayStarItem => item.type === 'star')
    .map((item) => item.star.id)
)

watch(
  () => starStore.stars.map((star) => star.id),
  (ids) => {
    const idSet = new Set(ids)
    selectedStarIds.value = selectedStarIds.value.filter((id) => idSet.has(id))
  }
)

const isAllVisibleSelected = computed(() => {
  if (visibleStarIds.value.length === 0) {
    return false
  }
  return visibleStarIds.value.every((id) => selectedStarIds.value.includes(id))
})

function isStarSelected(starId: string): boolean {
  return selectedStarIds.value.includes(starId)
}

function addStarSelection(starId: string) {
  if (!isStarSelected(starId)) {
    selectedStarIds.value = [...selectedStarIds.value, starId]
  }
}

function removeStarSelection(starId: string) {
  if (isStarSelected(starId)) {
    selectedStarIds.value = selectedStarIds.value.filter((id) => id !== starId)
  }
}

function toggleStarSelection(starId: string, selected: boolean) {
  if (selected) {
    addStarSelection(starId)
  } else {
    removeStarSelection(starId)
  }
}

function toggleMoveDropdown() {
  showMoveDropdown.value = !showMoveDropdown.value
  if (!showMoveDropdown.value) {
    expandedMoveGroups.value = []
  }
}

function closeMoveDropdown() {
  if (!showMoveDropdown.value) {
    return
  }
  showMoveDropdown.value = false
  expandedMoveGroups.value = []
}

function toggleMoveGroupExpand(fullPath: string) {
  if (expandedMoveGroups.value.includes(fullPath)) {
    expandedMoveGroups.value = expandedMoveGroups.value.filter((item) => item !== fullPath)
  } else {
    expandedMoveGroups.value = [...expandedMoveGroups.value, fullPath]
  }
}

function handleSelectMoveTarget(group: string) {
  moveTargetGroup.value = group
  closeMoveDropdown()
}

function moveOptionButtonClasses(item: MoveGroupOption): string[] {
  const base = ['flex-1 text-left px-3 py-2 text-sm rounded-md transition-all duration-200 flex items-center gap-2.5']
  const isSelected = moveTargetGroup.value === item.fullPath

  if (item.isSpecial) {
    base.push(
      isSelected
        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200'
        : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
    )
    return base
  }

  if (item.systemType === 'uncategorized') {
    base.push(
      isSelected
        ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-200'
        : 'text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30'
    )
    return base
  }

  base.push(
    isSelected
      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
      : item.level === 0
        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
  )

  return base
}

function handleClickOutsideMove(event: MouseEvent) {
  if (!showMoveDropdown.value || !moveDropdownWrapper.value) {
    return
  }

  const target = event.target as Node | null
  if (target && !moveDropdownWrapper.value.contains(target)) {
    closeMoveDropdown()
  }
}

function handleToggleSelectAllVisible(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const ids = visibleStarIds.value
  if (checked) {
    const merged = new Set([...selectedStarIds.value, ...ids])
    selectedStarIds.value = Array.from(merged)
  } else {
    selectedStarIds.value = selectedStarIds.value.filter((id) => !ids.includes(id))
  }
}

function clearSelection() {
  if (selectedStarIds.value.length === 0 && !moveTargetGroup.value) {
    return
  }
  selectedStarIds.value = []
  moveTargetGroup.value = ''
  closeMoveDropdown()
}

async function handleBatchMove() {
  if (selectedStarIds.value.length === 0) {
    return
  }

  const target = moveTargetGroup.value.trim()
  if (!target) {
    await alert({
      title: t('starList.move.dialogs.selectTarget.title'),
      message: t('starList.move.dialogs.selectTarget.message'),
      icon: 'ℹ️',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    })
    return
  }

  try {
    const result = starStore.moveStarsToGroup(selectedStarIds.value, target, uiStore.selectedGroup || null)

    clearSelection()

    const parts: string[] = []
    parts.push(t('starList.move.summary.moved', { count: result.moved }))
    if (result.skipped > 0) {
      parts.push(t('starList.move.summary.skipped', { count: result.skipped }))
    }

    await alert({
      title: t('starList.move.summary.title'),
      message: parts.join('\n'),
      icon: '✅',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    })
  } catch (error) {
    await alert({
      title: t('starList.move.summary.errorTitle'),
      message: error instanceof Error
        ? error.message
        : t('starList.move.summary.errorMessage'),
      icon: '❌',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value -= 1
    resetListScroll()
  }
}
function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1
    resetListScroll()
  }
}
function goFirstPage() {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    resetListScroll()
  }
}
function goLastPage() {
  const last = totalPages.value
  if (currentPage.value !== last) {
    currentPage.value = last
    resetListScroll()
  }
}
function onPageSizeChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value)
  uiStore.setPageSize(val)
  resetListScroll()
}

// ===== 列表内直达顶部按钮（监听外层滚动容器） =====
const rootEl = ref<HTMLElement | null>(null)
const listScrollContainer = ref<HTMLElement | null>(null)
const showScrollToTop = ref(false)

function handleListScroll() {
  if (listScrollContainer.value) {
    showScrollToTop.value = listScrollContainer.value.scrollTop > 300
  }
}

function scrollToTop() {
  if (listScrollContainer.value) {
    listScrollContainer.value.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// 翻页或改筛选条件后立刻回到列表顶部。
// 不做这一步的话，前后两页内容高度相近时浏览器会保留 scrollTop，看到的是新一页的底部。
function resetListScroll() {
  if (listScrollContainer.value) {
    listScrollContainer.value.scrollTop = 0
  }
  showScrollToTop.value = false
}

// 当前页超出总页数时把 uiStore 里的页码拉回有效值（displayItemsPaginated 内部只做本地钳制）
function clampCurrentPage() {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value
    resetListScroll()
  }
}

onMounted(() => {
  // 寻找上层滚动容器（Home 中为 .overflow-y-auto）
  listScrollContainer.value = (rootEl.value?.closest('.overflow-y-auto') as HTMLElement | null) ?? null
  if (listScrollContainer.value) {
    listScrollContainer.value.addEventListener('scroll', handleListScroll)
    // 初始化显示状态
    handleListScroll()
  }
  // 挂载时若 uiStore 里的页码已越界（例如离开本页期间数据被删减）则校正一次
  clampCurrentPage()
  document.addEventListener('click', handleClickOutsideMove)
})

onUnmounted(() => {
  if (listScrollContainer.value) {
    listScrollContainer.value.removeEventListener('scroll', handleListScroll)
  }
  document.removeEventListener('click', handleClickOutsideMove)
})

// 当筛选条件或搜索变化时，重置到第一页
watch(
  () => [
    uiStore.searchQuery,
    uiStore.selectedGroup,
    uiStore.selectedTag,
    uiStore.selectedTags.slice(),
    filteredStars.value.length,
    uiStore.sortOption,
    uiStore.sortOrder,
  ],
  () => {
    uiStore.setCurrentPage(1)
    clearSelection()
    resetListScroll()
  }
)


function handleSortOptionChange(event: Event) {
  const newValue = (event.target as HTMLSelectElement).value as SortOption
  const previous = uiStore.sortOption as SortOption
  uiStore.setSortOption(newValue)
  if (newValue === 'default') {
    uiStore.setSortOrder('desc')
  } else if (newValue !== previous) {
    uiStore.setSortOrder('desc')
  }
  uiStore.setCurrentPage(1)
}

function handleToggleSortOrder() {
  if (uiStore.sortOption === 'default') {
    return
  }
  uiStore.toggleSortOrder()
  uiStore.setCurrentPage(1)
}

function handleTagClick(tag: string, isLanguage = false) {
  if (isLanguage) {
    // 语言标签：单选逻辑
    if (uiStore.selectedTag === tag) {
      uiStore.setSelectedTag(null)
    } else {
      uiStore.setSelectedTag(tag)
    }
  } else {
    // 自建标签：多选逻辑
    uiStore.toggleSelectedTag(tag)
  }
}

function handleGroupClick(group: string) {
  // 如果点击的是当前选中的分组，则取消筛选；否则设置为选中
  if (uiStore.selectedGroup === group) {
    uiStore.setSelectedGroup(null)
  } else {
    uiStore.setSelectedGroup(group)
  }
}

function handleAddTag(starId: string, tag: string) {
  starStore.addTag(starId, tag)
}

function handleRemoveTag(starId: string, tag: string) {
  starStore.removeTag(starId, tag)
  // 如果移除的标签是当前选中的，取消选择
  if (uiStore.selectedTag === tag) {
    uiStore.setSelectedTag(null)
  }
  // 如果移除的标签在自建标签选中列表中，移除
  const tagIndex = uiStore.selectedTags.indexOf(tag)
  if (tagIndex !== -1) {
    uiStore.selectedTags.splice(tagIndex, 1)
  }
}

function handleCreateTagForStar(starId: string, tag: string) {
  try {
    // 如果标签不存在，先创建（addTag 会自动添加到 tags 列表）
    starStore.addTag(starId, tag)
  } catch (error) {
    alert({
      title: t('starList.tags.alerts.addFailed.title'),
      message: error instanceof Error ? error.message : t('starList.tags.alerts.addFailed.message'),
      icon: '⚠️',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
  }
}

function handleAddToGroup(starId: string, group: string) {
  starStore.addToGroup(starId, group)
}

function handleRemoveFromGroup(starId: string, group: string) {
  starStore.removeFromGroup(starId, group)
}

function handleCreateGroupForStar(starId: string) {
  // 打开创建分组对话框，创建成功后自动添加到当前仓库
  const groupName = prompt(t('starList.groups.prompt.create'))
  if (groupName && groupName.trim()) {
    try {
      starStore.createGroup(groupName.trim())
      starStore.addToGroup(starId, groupName.trim())
    } catch (error) {
      alert({
        title: t('starList.groups.alerts.createFailed.title'),
        message: error instanceof Error ? error.message : t('starList.groups.alerts.createFailed.message'),
        icon: '⚠️',
        buttonClass: 'bg-red-600 hover:bg-red-700',
      })
    }
  }
}

function handleUpdateNotes(starId: string, notes: string) {
  starStore.updateStar(starId, { notes })
}

// 获取"已取消星标"文件夹中的仓库数量（读 store 的预计算值，避免模板每次渲染都全量 filter）
function getUnstarredCount(): number {
  return starStore.systemGroupCounts['已取消星标'] || 0
}

// 删除仓库
async function handleDeleteStar(starId: string) {
  try {
    await starStore.deleteStar(starId)
  } catch (error) {
    alert({
      title: t('starList.stars.alerts.deleteFailed.title'),
      message: error instanceof Error ? error.message : t('starList.stars.alerts.deleteFailed.message'),
      icon: '⚠️',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
  }
}

// 清空"已取消星标"文件夹
function handleClearUnstarred() {
  const count = getUnstarredCount()
  if (count === 0) {
    return
  }
  showClearUnstarredDialog.value = true
}

function cancelClearUnstarred() {
  showClearUnstarredDialog.value = false
}

async function confirmClearUnstarred() {
  showClearUnstarredDialog.value = false
  try {
    await starStore.clearUnstarredGroup()
  } catch (error) {
    alert({
      title: t('starList.unstarred.alerts.clearFailed.title'),
      message: error instanceof Error ? error.message : t('starList.unstarred.alerts.clearFailed.message'),
      icon: '⚠️',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    })
  }
}

// 取消 AI 分类
async function handleCancelClassification() {
  cancelClassification()
  userCancelled.value = true
  previewResults.value.clear()
  previewSelections.value.clear()
  showContinueClassify.value = false
  isFolderAggregating.value = false
  folderAggregationCount.value = null
  await alert({
    title: t('starList.ai.alerts.cancelled.title'),
    message: t('starList.ai.alerts.cancelled.message'),
    icon: 'ℹ️',
    buttonClass: 'bg-gray-800 hover:bg-gray-700',
  })
}
</script>

<style scoped>
/* 数字输入去掉默认的上下箭头（在某些浏览器） */
input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
