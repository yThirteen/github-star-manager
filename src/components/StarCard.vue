<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow relative">
    <!-- 头部：名称和星数 -->
    <div class="flex items-start justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <a
            href="javascript:void(0)"
            target="_blank"
            class="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            @click="handleLinkClick"
          >
            {{ star.full_name }}
          </a>
          <span
            v-if="pushedAtText"
            class="text-xs text-gray-500 dark:text-gray-400"
          >
            {{ t('starCard.labels.lastPush') }} {{ pushedAtText }}
          </span>
        </div>
        <div v-if="star.description" class="mt-1 space-y-1">
          <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {{ displayDescription }}
          </p>
          <button
            v-if="shouldTruncateDescription"
            @click.stop="toggleDescription"
            class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {{ showFullDescription ? t('starCard.labels.collapse') : t('starCard.labels.expand') }}
          </button>
          <!-- 翻译按钮和结果 -->
          <div class="mt-1 flex items-start gap-2">
            <!-- 如果有保存的翻译，直接显示 -->
            <div
              v-if="star.translated_description && !ai.isTranslating.value && !ai.translatedText.value"
              class="flex-1 text-xs text-gray-500 dark:text-gray-400 italic border-l-2 border-blue-200 dark:border-blue-700 pl-2 py-1"
            >
              <div class="flex items-start justify-between gap-2">
                <span>{{ star.translated_description }}</span>
                <div class="flex gap-1 flex-shrink-0">
                  <button
                    @click.stop="copySavedTranslation"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                    :title="t('starCard.actions.copyTranslation')"
                  >
                    📋
                  </button>
                  <button
                    @click.stop="handleRetranslate"
                    class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                    :title="t('starCard.actions.retranslate')"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>
            <!-- 翻译按钮（只在没有保存的翻译时显示） -->
            <button
              v-if="!star.translated_description && !ai.isTranslating.value && !ai.translatedText.value"
              @click.stop="handleTranslateDescription"
              class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              :title="t('starCard.tooltips.translateToAppLanguage')"
            >
              🌐 {{ t('starCard.actions.translate') }}
            </button>
            <div
              v-if="ai.isTranslating.value"
              class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
            >
              <svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('starCard.status.translating') }}
              <button
                @click.stop="ai.cancelTranslation()"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
                :title="t('starCard.actions.cancelTranslate')"
              >
                ✕
              </button>
            </div>
            
            <div
              v-if="ai.translationError.value"
              class="text-xs text-red-500 dark:text-red-400 flex items-center gap-1"
            >
              ⚠️ {{ ai.translationError.value }}
              <button
                @click.stop="ai.clearTranslation"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1 ml-4">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          ⭐ {{ star.stargazers_count.toLocaleString() }}
        </span>
            <!-- 显示星星数量增减 -->
            <span
              v-if="starCountChange !== null"
              :class="[
                'text-xs font-medium px-1.5 py-0.5 rounded',
                starCountChange > 0
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                  : starCountChange < 0
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
              ]"
              :title="`同步前: ${star.previous_stargazers_count?.toLocaleString() || '未知'}`"
            >
              {{ starCountChange > 0 ? '+' : '' }}{{ starCountChange.toLocaleString() }}
            </span>
          </div>
        <ReleaseBadge v-if="star.last_release" :release="star.last_release" />
        </div>
        <!-- 删除按钮（只在"已取消星标"文件夹中显示，放在星标数量下方） -->
        <button
          v-if="isInUnstarredGroup"
          @click.stop.prevent="handleDeleteStar"
          class="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          :title="t('starCard.actions.deleteRepo')"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 描述 -->
    <div class="mt-3">
      <!-- 显示模式 -->
      <div
        v-if="!isEditingNotes && star.notes"
        class="text-sm text-gray-600 dark:text-gray-400 italic cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
        @click.stop="(e) => startEditNotes(e)"
      >
        💬 {{ star.notes }}
      </div>
      
      <!-- 编辑模式 -->
      <div
        v-if="isEditingNotes"
        v-click-outside="saveNotesOnBlur"
        class="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700"
        @click.stop
      >
        <textarea
          ref="notesTextarea"
          v-model="notesText"
          @keydown.ctrl.enter="saveNotes"
          @keydown.esc="cancelEditNotes"
          :placeholder="t('starCard.placeholders.note')"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
          rows="3"
          autofocus
        ></textarea>
        <div class="flex items-center justify-between mt-2">
          <span class="text-xs text-gray-500 dark:text-gray-400 flex-1">
            {{ t('starCard.notes.noteShortcuts') }}
          </span>
          <div class="flex gap-2 flex-shrink-0">
            <button
              @click="saveNotes"
              class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {{ t('common.save') }}
            </button>
            <button
              @click="cancelEditNotes"
              class="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 添加笔记按钮 -->
      <button
        v-if="!isEditingNotes && !star.notes"
        @click.stop="(e) => startEditNotes(e)"
        class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
      >
        💬 {{ t('starCard.actions.addNote') }}
      </button>
    </div>

    <!-- 标签和语言 -->
    <div class="flex items-center gap-2 flex-wrap mt-3">
      <span
        v-if="star.language"
        :class="[
          'inline-flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors',
          uiStore.selectedTag === star.language
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        @click.stop="$emit('tag-click', star.language, true)"
          :title="uiStore.selectedTag === star.language ? t('starCard.tooltips.filterOff') : t('starCard.tooltips.filterOn')"
      >
        {{ star.language }}
      </span>
      <span
        v-for="tag in star.tags"
        :key="tag"
        :class="[
          'inline-flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors tag-item',
          uiStore.selectedTags.includes(tag)
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        @click.stop="$emit('tag-click', tag, false)"
          :title="uiStore.selectedTags.includes(tag) ? t('starCard.tooltips.filterOff') : t('starCard.tooltips.filterOn')"
      >
        #{{ tag }}
        <span
          class="opacity-60 tag-item:hover:opacity-100 text-xs cursor-pointer hover:text-red-600 dark:hover:text-red-400 transition-opacity"
          @click.stop="$emit('remove-tag', tag)"
          :title="t('starCard.actions.deleteTag')"
        >×</span>
      </span>
      
      <!-- 添加标签按钮/输入框和标签选择框 -->
      <div class="relative inline-flex">
        <!-- 添加标签按钮 -->
        <button
          v-if="!isAddingTag"
          class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          @click.stop="startAddingTag"
        >
          + {{ t('starCard.actions.addTag') }}
        </button>
        
        <!-- 添加标签输入框 -->
        <input
          v-else
          ref="tagInputRef"
          v-model="newTagName"
          @keyup.enter="handleCreateNewTag"
          @keyup.esc="cancelAddingTag"
          @blur="handleTagInputBlur"
          :placeholder="t('starCard.placeholders.tagInput')"
          class="text-xs px-2 py-1 border border-blue-500 dark:border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[120px]"
          autofocus
        />
        
        <!-- 标签选择框（与输入框同时显示） -->
        <div
          v-if="isAddingTag && showTagDropdown"
          v-click-outside="closeTagDropdown"
          class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto"
        >
          <div class="p-3">
            <!-- 标题栏：选择标签 + 切换按钮 -->
            <div class="flex items-center justify-between mb-3">
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ t('starCard.labels.selectTags') }}</div>
              <button
                @click.stop="toggleTagGroupMode"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                :title="showTagGroups ? t('starCard.tooltips.toggleTagCompact') : t('starCard.tooltips.toggleTagGroup')"
              >
                <span v-if="showTagGroups" class="text-xs">📋</span>
                <span v-else class="text-xs">🔤</span>
              </button>
            </div>
            
            <!-- 已有标签列表 -->
            <div v-if="availableTags.length > 0">
              <!-- 按首字母分组显示模式 -->
              <template v-if="showTagGroups">
                <div v-for="letter in sortedLetters" :key="letter" class="mb-4 last:mb-0">
                  <!-- 首字母标题 -->
                  <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">
                    {{ letter }}
                  </div>
                  
                  <!-- 该首字母下的标签 -->
                  <div class="flex flex-wrap gap-1.5">
            <button
                      v-for="tag in groupedTags[letter]"
              :key="tag"
                      class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300"
              @click="handleAddTag(tag)"
            >
              #{{ tag }}
            </button>
            </div>
                </div>
              </template>
            
              <!-- 紧凑模式：不显示 A-Z 划分 -->
              <template v-else>
                <div class="flex flex-wrap gap-1.5">
              <button
                    v-for="tag in availableTags"
                    :key="tag"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300"
                    @click="handleAddTag(tag)"
              >
                    #{{ tag }}
              </button>
            </div>
              </template>
            </div>
            
            <!-- 如果没有可用标签 -->
            <div v-if="availableTags.length === 0" class="text-xs text-gray-500 dark:text-gray-400">
              没有可用标签
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分组 -->
    <div class="mt-2 flex items-center gap-2 flex-wrap">
      <span
        v-for="group in star.groups"
        :key="group"
        :class="[
          'inline-flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors group-tag',
          uiStore.selectedGroup === group
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
        @click.stop="$emit('group-click', group)"
        :title="uiStore.selectedGroup === group ? t('starCard.tooltips.filterOff') : t('starCard.tooltips.filterOn')"
      >
        📁 {{ displayGroupName(group) }}
        <span
          v-if="group !== GROUP_UNCATEGORIZED"
          class="opacity-60 group-tag:hover:opacity-100 text-xs cursor-pointer hover:text-red-600 dark:hover:text-red-400 transition-opacity"
          @click.stop="group === GROUP_FAVORITES ? handleRemoveSpecialGroup(group) : $emit('remove-group', group)"
          :title="group === GROUP_FAVORITES ? t('starCard.tooltips.removeSpecial') : t('starCard.tooltips.removeGroup')"
        >×</span>
      </span>
      
      <!-- 预览分组（如果存在且不在现有分组中） -->
      <span
        v-if="props.previewGroup && !star.groups.includes(props.previewGroup)"
        :class="[
          'inline-flex items-center gap-1 px-2 py-1 text-xs rounded border-2 border-dashed transition-colors',
          'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
          'opacity-75'
        ]"
        :title="t('starCard.tooltips.previewGroup')"
      >
        👁️ {{ displayGroupName(props.previewGroup) }}
        <span class="text-xs text-purple-500 dark:text-purple-400">{{ t('starCard.labels.previewBadge') }}</span>
      </span>
      
      <!-- 添加分组按钮/下拉 -->
      <div class="relative">
        <button
          class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2.5 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 flex items-center gap-1.5"
          @click.stop="toggleGroupDropdown"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('starCard.actions.addToGroup') }}</span>
        </button>
        
        <!-- 分组下拉菜单 -->
        <div
          v-if="showGroupDropdown"
          v-click-outside="closeGroupDropdown"
          class="absolute top-full left-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-10 min-w-[200px] max-h-64 overflow-y-auto"
        >
          <div class="p-1.5 space-y-0.5">
            <!-- 可用分组列表（支持层级显示） -->
            <template v-for="item in organizedGroups" :key="item.fullPath">
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
                  class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-all duration-200 flex-shrink-0"
                  @click.stop="toggleExpandGroup(item.fullPath)"
                  :title="expandedGroups.includes(item.fullPath) ? t('starCard.tooltips.collapseChildren') : t('starCard.tooltips.expandChildren')"
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5 transition-transform duration-200"
                    :class="{ 'rotate-[-90deg]': !expandedGroups.includes(item.fullPath) }"
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
                  :class="groupOptionButtonClasses(item)"
                  :disabled="item.disabled"
                  @click.stop="item.disabled ? null : handleAddToGroup(item.fullPath)"
                  :title="getGroupOptionTooltip(item)"
                  type="button"
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
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
                  <span class="font-medium flex-1 truncate">{{ displayGroupName(item.name) }}</span>
                  <span
                    v-if="!item.hasChildren && item.alreadyJoined"
                    :class="[
                      'text-xs font-medium',
                      item.isSpecial ? 'text-purple-400 dark:text-purple-500' : 'text-gray-400 dark:text-gray-500'
                    ]"
                  >
                    {{ t('starCard.groups.alreadyJoined') }}
                  </span>
                </button>
              </div>
            </template>
            
            <!-- 如果没有可用分组 -->
            <div v-if="organizedGroups.length === 0" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
              {{ t('starCard.groups.empty') }}
            </div>
            
            <!-- 分割线 -->
            <div v-if="organizedGroups.length > 0" class="border-t border-gray-200 dark:border-gray-700 my-1.5"></div>
            
            <!-- 创建新分组选项 -->
            <button
              class="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all duration-200 flex items-center gap-2.5 font-medium"
              @click="handleCreateNewGroup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{{ t('starCard.groups.create') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认打开链接对话框 -->
    <div
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {{ t('starCard.dialogs.openLink.title') }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {{ t('starCard.dialogs.openLink.message') }}
        </p>
        <p class="text-xs text-blue-600 dark:text-blue-400 mb-6 break-all">
          {{ pendingUrl }}
        </p>
        <div class="flex items-center mb-4">
          <input
            id="dontAskAgain"
            v-model="dontAskAgain"
            type="checkbox"
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            for="dontAskAgain"
            class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {{ t('common.dontAskAgain') }}
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            @click="cancelOpenLink"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="confirmOpenLink"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {{ t('common.open') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除仓库确认对话框 -->
    <div
      v-if="showDeleteStarDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          {{ t('starCard.dialogs.delete.title') }}
        </h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4" v-html="t('starCard.dialogs.delete.message', { name: star.full_name })"></p>
        <p class="text-sm text-red-600 dark:text-red-400 font-semibold mb-4">
          {{ t('starCard.dialogs.delete.warning') }}
        </p>
        <div class="flex gap-2 justify-end">
          <button
            @click.stop="cancelDeleteStar"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            type="button"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click.stop="confirmDeleteStar"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            type="button"
          >
            {{ t('starCard.dialogs.delete.confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 移出特别关注分组确认对话框 -->
    <div
      v-if="showRemoveSpecialGroupDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4">
          {{ t('starCard.dialogs.removeSpecial.title') }}
        </h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4" v-html="t('starCard.dialogs.removeSpecial.message', { name: star.full_name })"></p>
        <div class="flex gap-2 justify-end">
          <button
            @click.stop="cancelRemoveSpecialGroup"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            type="button"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click.stop="confirmRemoveSpecialGroup"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            type="button"
          >
            {{ t('starCard.dialogs.removeSpecial.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { open as openUrl } from '@tauri-apps/plugin-shell'
import type { StarItem } from '../types/star'
import { useStarStore } from '../stores/starStore'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useAI } from '../composables/useAI'
import { sortMixed, groupTagsByFirstLetter } from '../utils/sort'
import { formatDate, formatRelativeTime } from '../utils/date'
import ReleaseBadge from './ReleaseBadge.vue'

interface Props {
  star: StarItem
  previewGroup?: string | null // AI 分类预览的分组名称
}

const props = defineProps<Props>()
const starStore = useStarStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const ai = useAI()
const { t, locale } = useI18n()

const GROUP_UNCATEGORIZED = '新增未分类'
const GROUP_FAVORITES = '特别关注'
const GROUP_UNSTARRED = '已取消星标'

const showGroupDropdown = ref(false)
const showTagDropdown = ref(false)
const newTagName = ref('')
const isAddingTag = ref(false) // 是否正在添加标签（显示输入框）
const tagInputRef = ref<HTMLInputElement | null>(null) // 标签输入框引用
const showTagGroups = ref(true) // 是否显示 A-Z 分组（true: 分组模式，false: 紧凑模式）
const expandedGroups = ref<string[]>([]) // 记录已展开的父分组
const allowSelectingParentWithChildren = ref(true) // 控制父分组在存在子分组时是否可选

// 确认对话框相关状态
const showConfirmDialog = ref(false)
const dontAskAgain = ref(false)
const pendingUrl = ref<string | null>(null)

// 删除仓库确认对话框
const showDeleteStarDialog = ref(false)

// 移出特别关注分组确认对话框
const showRemoveSpecialGroupDialog = ref(false)
const groupToRemove = ref<string | null>(null)

// 描述编辑相关状态
const isEditingNotes = ref(false)
const notesText = ref('')
const notesTextarea = ref<HTMLTextAreaElement | null>(null)
const isStartingEdit = ref(false) // 标记是否正在启动编辑模式

// 检查是否在"已取消星标"文件夹中
const isInUnstarredGroup = computed(() => {
  return uiStore.selectedGroup === GROUP_UNSTARRED && props.star.groups.includes(GROUP_UNSTARRED)
})

const pushedAtText = computed(() => {
  const pushed = props.star.pushed_at
  if (!pushed) return ''
  try {
    const absolute = formatDate(pushed)
    const relative = formatRelativeTime(pushed, locale.value)
    return `${absolute} · ${relative}`
  } catch (_error) {
    return pushed
  }
})

// 描述折叠控制
const DESCRIPTION_PREVIEW_LEN = 180
const showFullDescription = ref(false)
const shouldTruncateDescription = computed(() => (props.star.description?.length || 0) > DESCRIPTION_PREVIEW_LEN)
const displayDescription = computed(() => {
  const desc = props.star.description || ''
  if (!shouldTruncateDescription.value || showFullDescription.value) {
    return desc
  }
  return `${desc.slice(0, DESCRIPTION_PREVIEW_LEN)}...`
})

function toggleDescription() {
  showFullDescription.value = !showFullDescription.value
}

watch(
  () => props.star.id,
  () => {
    showFullDescription.value = false
  }
)

type GroupOption = {
  name: string
  fullPath: string
  level: number
  hasChildren: boolean
  isSpecial?: boolean
  disabled: boolean
  alreadyJoined: boolean
}

// 组织分组为层级结构（与左侧区域顺序一致，排除"新增未分类"，并使用展开按钮显示子分组）
const organizedGroups = computed<GroupOption[]>(() => {
  const result: GroupOption[] = []
  const groupOrder = starStore.groupOrder || {}
  const expandedSet = new Set(expandedGroups.value)
  const starGroupsSet = new Set(props.star.groups || [])
  const allowParentSelection = allowSelectingParentWithChildren.value

  const allGroups = starStore.groups || []

  const selectableSet = new Set<string>()
  allGroups.forEach((group) => {
    if (!group || group === GROUP_UNCATEGORIZED || group === GROUP_UNSTARRED) {
      return
    }
    if (!starGroupsSet.has(group)) {
      selectableSet.add(group)
    }
  })

  if (!starGroupsSet.has(GROUP_FAVORITES)) {
    selectableSet.add(GROUP_FAVORITES)
  }

  const nameMap = new Map<string, string>()
  const childMap = new Map<string, Set<string>>()
  const rootSet = new Set<string>()

  const ensureHierarchy = (path: string) => {
    if (!path) return
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) return

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath = index === 0 ? segment : `${currentPath}/${segment}`
      if (!nameMap.has(currentPath)) {
        nameMap.set(currentPath, segment)
      }
      if (index === 0) {
        rootSet.add(currentPath)
      } else {
        const parentPath = currentPath.slice(0, currentPath.lastIndexOf('/'))
        if (!childMap.has(parentPath)) {
          childMap.set(parentPath, new Set())
        }
        childMap.get(parentPath)!.add(currentPath)
      }
    })
  }

  ensureHierarchy(GROUP_FAVORITES)

  allGroups.forEach((group) => {
    if (!group || group === GROUP_UNCATEGORIZED || group === GROUP_UNSTARRED) {
      return
    }
    ensureHierarchy(group)
  })

  selectableSet.forEach((group) => {
    ensureHierarchy(group)
  })

  const visibleSet = new Set<string>()
  selectableSet.forEach((group) => {
    let currentPath = group
    while (currentPath) {
      visibleSet.add(currentPath)
      const idx = currentPath.lastIndexOf('/')
      if (idx === -1) break
      currentPath = currentPath.slice(0, idx)
    }
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
      if (!visibleSet.has(path)) {
        return
      }

      const rawChildren = Array.from(childMap.get(path) ?? [])
      const children = sortPaths(rawChildren.filter((child) => visibleSet.has(child)))
      const hasChildren = children.length > 0
      const alreadyJoined = starGroupsSet.has(path)
      const isSpecial = path === GROUP_FAVORITES
      const isSelectable = selectableSet.has(path)

      const shouldRender = isSpecial ? isSelectable : hasChildren || isSelectable
      if (!shouldRender) {
        return
      }

      result.push({
        name: isSpecial ? GROUP_FAVORITES : nameMap.get(path) ?? path.split('/').pop() ?? path,
        fullPath: path,
        level,
        hasChildren,
        isSpecial,
        disabled: !isSelectable || (hasChildren && !allowParentSelection && !isSpecial),
        alreadyJoined,
      })

      if (hasChildren && expandedSet.has(path)) {
        visit(children, level + 1)
      }
    })
  }

  if (visibleSet.has(GROUP_FAVORITES)) {
    visit([GROUP_FAVORITES], 0)
  }

  const rootPaths = sortPaths(Array.from(rootSet).filter((path) => path !== GROUP_FAVORITES && visibleSet.has(path)))
  visit(rootPaths, 0)

  return result
})

// 计算可用的标签（排除当前仓库已有的标签，按首字母排序，中文按拼音首字母）
const availableTags = computed(() => {
  const filtered = starStore.tags.filter((tag) => !props.star.tags.includes(tag))
  
  // 使用混合排序函数进行排序（中文按拼音首字母，英文按字母，混合排序）
  return sortMixed(filtered)
})

// 按首字母分组的标签
const groupedTags = computed(() => {
  return groupTagsByFirstLetter(availableTags.value)
})

// 获取排序后的首字母列表
const sortedLetters = computed(() => {
  return Object.keys(groupedTags.value).sort((a, b) => {
    // 数字排在前面
    if (/[0-9]/.test(a) && !/[0-9]/.test(b)) return -1
    if (!/[0-9]/.test(a) && /[0-9]/.test(b)) return 1
    // 字母按顺序排序
    return a.localeCompare(b, 'en', { sensitivity: 'base' })
  })
})

// 计算星星数量变化
const starCountChange = computed(() => {
  if (uiStore.sortOption !== 'starDelta') {
    return null
  }
  const previous = props.star.previous_stargazers_count
  if (previous == null) {
    return null // 没有之前的数据，不显示变化
  }
  const change = props.star.stargazers_count - previous
  // 如果变化为0，也不显示
  return change === 0 ? null : change
})

function displayGroupName(name: string): string {
  if (name === GROUP_UNCATEGORIZED) return t('groups.uncategorized')
  if (name === GROUP_FAVORITES) return t('groups.favorites')
  if (name === GROUP_UNSTARRED) return t('groups.unstarred')
  return name
}

// 点击外部关闭下拉菜单的指令
interface ClickOutsideElement extends HTMLElement {
  clickOutsideEvent?: (event: MouseEvent) => void
}

const vClickOutside = {
  mounted(el: ClickOutsideElement, binding: { value: () => void }) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      // 检查点击是否在元素外部
      const target = event.target as Node
      if (target && !(el === target || el.contains(target))) {
        // 使用 setTimeout 延迟执行，确保点击事件处理完成后再执行
        setTimeout(() => {
          binding.value()
        }, 10)
      }
    }
    // 使用冒泡阶段，确保在元素的点击事件处理之后
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: ClickOutsideElement) {
    if (el.clickOutsideEvent) {
      document.removeEventListener('click', el.clickOutsideEvent)
    }
  }
}

function toggleGroupDropdown() {
  showGroupDropdown.value = !showGroupDropdown.value
  if (showGroupDropdown.value) {
    // 打开下拉菜单时，重置展开状态
    expandedGroups.value = []
  }
}

function closeGroupDropdown() {
  showGroupDropdown.value = false
  expandedGroups.value = []
}

// 切换分组展开状态
function toggleExpandGroup(groupPath: string) {
  const index = expandedGroups.value.indexOf(groupPath)
  if (index === -1) {
    expandedGroups.value.push(groupPath)
  } else {
    expandedGroups.value.splice(index, 1)
  }
}

function groupOptionButtonClasses(item: GroupOption): string[] {
  const base = ['flex-1 text-left px-3 py-2 text-sm rounded-md transition-all duration-200 flex items-center gap-2.5']

  if (item.isSpecial) {
    base.push(
      item.disabled
        ? 'text-purple-400 dark:text-purple-500 cursor-not-allowed bg-purple-50 dark:bg-purple-900/30'
        : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
    )
    return base
  }

  if (item.disabled) {
    base.push('text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50')
  } else {
    base.push(
      item.level === 0
        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
    )
  }

  return base
}

function getGroupOptionTooltip(item: GroupOption): string {
  if (item.hasChildren && !item.isSpecial && !allowSelectingParentWithChildren.value) {
    return t('starCard.tooltips.selectChild')
  }

  if (item.alreadyJoined) {
    return item.isSpecial ? t('starCard.tooltips.alreadyInSpecial') : t('starCard.tooltips.alreadyJoined')
  }

  return item.isSpecial ? t('starCard.tooltips.addToSpecial') : t('starCard.tooltips.addToGroup')
}

function handleAddToGroup(group: string) {
  emit('add-group', group)
  closeGroupDropdown()
}

function handleCreateNewGroup() {
  emit('create-group')
  closeGroupDropdown()
}

// 标签相关函数
function startAddingTag() {
  isAddingTag.value = true
  showTagDropdown.value = true // 同时显示标签选择框
    newTagName.value = ''
  // 使用 nextTick 确保 DOM 更新后再聚焦
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

function cancelAddingTag() {
  isAddingTag.value = false
  showTagDropdown.value = false // 同时关闭标签选择框
  newTagName.value = ''
}

function handleTagInputBlur() {
  // 延迟执行，以便点击其他元素时能正常响应
  setTimeout(() => {
    // 如果输入框为空，关闭输入框和标签选择框
    if (!newTagName.value.trim()) {
      cancelAddingTag()
    }
  }, 200)
}

function closeTagDropdown() {
  showTagDropdown.value = false
}

function toggleTagGroupMode() {
  showTagGroups.value = !showTagGroups.value
}

function handleAddTag(tag: string) {
  emit('add-tag', tag)
  // 添加标签后，关闭输入框和标签选择框
  cancelAddingTag()
}

function handleCreateNewTag() {
  const trimmedTag = newTagName.value.trim()
  if (!trimmedTag) {
    cancelAddingTag()
    return
  }
  emit('create-tag', trimmedTag)
  cancelAddingTag()
}

function handleDeleteStar(event?: MouseEvent) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  showDeleteStarDialog.value = true
}

function confirmDeleteStar(event?: MouseEvent) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  showDeleteStarDialog.value = false
  emit('delete-star')
}

function cancelDeleteStar(event?: MouseEvent) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  showDeleteStarDialog.value = false
}

// 处理移出特别关注分组
function handleRemoveSpecialGroup(group: string) {
  groupToRemove.value = group
  showRemoveSpecialGroupDialog.value = true
}

function confirmRemoveSpecialGroup(event?: MouseEvent) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  if (groupToRemove.value) {
    emit('remove-group', groupToRemove.value)
    groupToRemove.value = null
  }
  showRemoveSpecialGroupDialog.value = false
}

function cancelRemoveSpecialGroup(event?: MouseEvent) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  showRemoveSpecialGroupDialog.value = false
  groupToRemove.value = null
}

// 描述相关函数
function startEditNotes(event?: MouseEvent) {
  // 阻止事件冒泡，防止触发外部的点击外部检测
  if (event) {
    event.stopPropagation()
    event.preventDefault()
  }
  // 设置标记，防止点击外部检测误触发
  isStartingEdit.value = true
  // 立即设置状态，防止外部点击检测干扰
  isEditingNotes.value = true
  notesText.value = props.star.notes || ''
  // 延迟聚焦，确保元素已渲染
  setTimeout(() => {
    notesTextarea.value?.focus()
    // 延迟清除标记，确保所有事件处理完成
    setTimeout(() => {
      isStartingEdit.value = false
    }, 100)
  }, 10)
}

function saveNotes() {
  const trimmedNotes = notesText.value.trim()
  emit('update-notes', trimmedNotes)
  isEditingNotes.value = false
  notesText.value = ''
}

function cancelEditNotes() {
  isEditingNotes.value = false
  notesText.value = ''
}

// 点击外部区域时保存描述
function saveNotesOnBlur() {
  // 如果正在启动编辑模式，不保存
  if (isStartingEdit.value) {
    return
  }
  // 延迟检查，确保点击事件已处理完成
  setTimeout(() => {
    // 再次检查状态和标记，防止在 startEditNotes 调用时误触发
    if (isEditingNotes.value && !isStartingEdit.value) {
      // 自动保存（不做空值检查，允许清空描述）
      saveNotes()
    }
  }, 100)
}

const emit = defineEmits<{
  'tag-click': [tag: string, isLanguage?: boolean]
  'add-tag': [tag: string]
  'remove-tag': [tag: string]
  'create-tag': [tag: string]
  'group-click': [group: string]
  'add-group': [group: string]
  'remove-group': [group: string]
  'create-group': []
  'update-notes': [notes: string]
  'delete-star': []
}>()

// 检查是否设置了"不再询问"
function shouldSkipConfirmation(): boolean {
  return settingsStore.shouldSkipLinkConfirm()
}

// 打开链接
async function openLink(url: string) {
  try {
    // 确保 URL 格式正确
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      throw new Error('无效的 URL 格式')
    }
    
    console.log('尝试打开 URL:', url)
    
    // 检查是否在 Tauri 环境中
    const isTauri = typeof window !== 'undefined' && 
                    (window.__TAURI__ || window.__TAURI_INTERNALS__)
    
    if (isTauri) {
      console.log('Tauri 环境检测成功')
      
      // 优先尝试使用系统命令（更可靠）
      try {
        console.log('尝试使用系统命令打开 URL')
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('open_url', { url })
        console.log('通过系统命令打开 URL 成功')
        return
      } catch (systemError: any) {
        console.error('系统命令失败:', systemError)
        // 如果系统命令失败，尝试使用 shell 插件
        console.log('尝试使用 Tauri shell.open 插件')
      }
      
      // 备用方案：使用 Tauri shell 插件
      try {
        await openUrl(url)
        console.log('通过 shell.open 打开 URL 成功')
        return
      } catch (tauriError: any) {
        console.error('Tauri shell.open 失败:', tauriError)
        console.error('错误详情:', JSON.stringify(tauriError, null, 2))
      }
    } else {
      console.warn('Tauri 环境未检测到，使用浏览器原生方法')
    }
    
    // 最后的降级方案：使用 window.open
    if (typeof window !== 'undefined') {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (newWindow) {
        console.log('URL 打开成功（通过浏览器原生方法）')
      } else {
        console.warn('window.open 返回 null，可能被浏览器阻止')
        throw new Error('浏览器阻止了弹窗，请在浏览器设置中允许此网站的弹窗')
      }
    } else {
      throw new Error('无法确定运行环境')
    }
  } catch (error: any) {
    console.error('Failed to open URL - 详细错误信息:', error)
    console.error('错误类型:', typeof error, error)
    
    // 尝试获取更详细的错误信息
    let errorMessage = '未知错误'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error, null, 2)
      } catch {
        errorMessage = String(error)
      }
    }
    
    // 显示详细的错误信息
    alert(`无法打开链接：${errorMessage}\n\nURL: ${url}\n\n请确保：\n1. 已安装并设置了默认浏览器\n2. URL 格式正确\n3. Tauri 应用正常运行\n\n如果问题持续，请查看控制台获取更多信息。`)
  }
}

// 处理链接点击
function handleLinkClick(e: MouseEvent) {
  e.preventDefault()
  
  // 如果设置了"不再询问"，直接打开
  if (shouldSkipConfirmation()) {
    openLink(props.star.html_url)
    return
  }
  
  // 否则显示确认对话框
  pendingUrl.value = props.star.html_url
  dontAskAgain.value = false
  showConfirmDialog.value = true
}

// 确认打开链接
async function confirmOpenLink() {
  if (pendingUrl.value) {
    // 如果选择了"不再询问"，保存到设置 store
    if (dontAskAgain.value) {
      settingsStore.setSkipLinkConfirm(true)
    }
    
    await openLink(pendingUrl.value)
    showConfirmDialog.value = false
    pendingUrl.value = null
    dontAskAgain.value = false
  }
}

// 取消打开链接
function cancelOpenLink() {
  showConfirmDialog.value = false
  pendingUrl.value = null
  dontAskAgain.value = false
}

// 翻译描述
async function handleTranslateDescription() {
  if (!props.star.description) return
  
  const translated = await ai.translateToAppLanguage(props.star.description)
  
  // 如果翻译成功，保存到数据库
  if (translated) {
    starStore.updateStar(props.star.id, {
      translated_description: translated,
    })
    // 清理临时翻译结果，让界面切换到已保存的翻译展示（包含重新翻译按钮）
    ai.clearTranslation()
  }
}

// 重新翻译
async function handleRetranslate() {
  await handleTranslateDescription()
}

// 复制保存的翻译
async function copySavedTranslation() {
  if (!props.star.translated_description) return
  
  try {
    // 优先使用浏览器的 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(props.star.translated_description)
    } else {
      // 降级方案：使用传统的 document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = props.star.translated_description
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    console.log('翻译已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    prompt('复制翻译结果（按 Ctrl+C 复制）:', props.star.translated_description)
  }
}

// 保留：复制已保存翻译 copySavedTranslation（上方已存在）
</script>

<style scoped>
.group-tag:hover span {
  opacity: 1 !important;
}

.tag-item:hover span {
  opacity: 1 !important;
}

/* 分组下拉菜单项 */
.group-dropdown-item {
  position: relative;
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>

