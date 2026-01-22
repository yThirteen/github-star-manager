<template>
  <div class="w-64 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
    <!-- 头部 -->
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ t('groupList.title') }}</h2>
        <button
          class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all duration-200"
          @click="handleAddGroup"
          :title="t('groupList.actions.createGroup')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 分组列表 -->
    <div 
      class="flex-1 overflow-y-auto px-2 py-3 space-y-0.5"
      @contextmenu.prevent="handleEmptyAreaContextMenu"
      @dragover.prevent="handleContainerDragOver"
      @drop.prevent="handleContainerDrop"
    >
      <!-- 全部 -->
      <button
        :class="[
          'group-item-base w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
          selectedGroup === null && route.path === '/'
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm border border-amber-200 dark:border-amber-800'
            : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        ]"
        @click="handleHomeClick"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span class="text-sm font-medium flex-1 truncate">{{ t('groupList.buttons.all') }}</span>
        <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">{{ starStore.stars?.length || 0 }}</span>
      </button>

      <!-- 特别关注（特殊文件夹） -->
      <button
        :class="[
          'group-item-base w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
          selectedGroup === '特别关注' && route.path === '/'
            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 shadow-sm border border-purple-200 dark:border-purple-800'
            : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
        ]"
        @click="handleGroupClick('特别关注')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span class="text-sm font-medium flex-1 truncate">{{ t('groupList.buttons.favorites') }}</span>
        <span class="text-xs text-purple-600 dark:text-purple-400 font-medium">{{ getStarredGroupCount() }}</span>
      </button>

      <!-- 新增未分类（特殊文件夹） -->
      <button
            :class="[
          'group-item-base w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
              selectedGroup === '新增未分类' && route.path === '/'
            ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 shadow-sm border border-cyan-200 dark:border-cyan-800'
            : 'text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
        ]"
        @click="handleGroupClick('新增未分类')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="text-sm font-medium flex-1 truncate">{{ t('groupList.buttons.uncategorized') }}</span>
        <span class="text-xs text-cyan-600 dark:text-cyan-400 font-medium">{{ getUncategorizedGroupCount() }}</span>
      </button>

      <!-- 已取消星标（特殊文件夹） -->
      <button
        :class="[
          'group-item-base w-full text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
          selectedGroup === '已取消星标' && route.path === '/'
            ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30'
        ]"
        @click="handleGroupClick('已取消星标')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span class="text-sm font-medium flex-1 truncate">{{ t('groupList.buttons.unstarred') }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ getUnstarredGroupCount() }}</span>
      </button>

      <!-- 分组项（支持层级显示） -->
      <template v-for="group in topLevelGroups" :key="group">
        <!-- 一级分组 -->
        <div
          class="group-item"
          :class="{
            'opacity-50': draggedGroup === group,
            'drag-over-before': dragOverGroup === group && dragPosition === 'before',
            'drag-over-after': dragOverGroup === group && dragPosition === 'after'
          }"
          :draggable="!isSystemGroup(group) && editingGroup !== group"
          @mouseenter="hoveredGroup = group"
          @mouseleave="hoveredGroup = null"
          @contextmenu.prevent="handleContextMenu($event, group, false)"
          @dragstart.stop="handleDragStart($event, group, false)"
          @dragenter.prevent.stop="handleDragOver($event, group, false)"
          @dragover.prevent.stop="handleDragOver($event, group, false)"
          @dragleave.stop="handleDragLeave($event, group)"
          @drop="handleDrop($event, group, false)"
          @dragend="handleDragEnd"
        >
          <div class="flex items-center gap-1">
            <!-- 展开/折叠按钮 -->
            <button
              v-if="getChildGroupsForDisplay(group).length > 0"
              class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-all duration-200 flex-shrink-0"
              @click.stop="toggleCollapseGroup(group)"
              :title="isCollapsed(group) ? t('groupList.tooltips.expand') : t('groupList.tooltips.collapse')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-[-90deg]': isCollapsed(group) }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <span v-else class="w-4 flex-shrink-0"></span>
            
             <button
               v-if="editingGroup !== group"
               :class="[
                'group-item-button flex-1 text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
                 selectedGroup === group && route.path === '/'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
               ]"
               @click="handleGroupClick(group)"
               draggable="false"
               @dragover.prevent="handleDragOver($event, group, false)"
               @drop.prevent="handleDrop($event, group, false)"
             >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span class="text-sm font-medium flex-1 truncate">{{ group }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ getGroupCount(group) }}</span>
             </button>
          
             <!-- 编辑模式：在原位置显示输入框 -->
             <div
               v-else
               v-click-outside="confirmEditGroup"
               class="group-item-button flex-1 px-3 py-2 rounded-md flex items-center gap-2.5"
             >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <input
                ref="editInputRef"
                v-model="editingGroupName"
                @keyup.enter="confirmEditGroup"
                @keyup.esc="cancelEditGroup"
                @mousedown.stop
                @click.stop
                class="flex-1 px-2 py-1 text-sm font-medium bg-blue-500 text-white border border-black rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                style="min-width: 0;"
              />
            </div>
          </div>
          
          <!-- 新建子文件夹（类似 Windows） -->
          <div
            v-if="creatingGroup && creatingGroup.parentGroup === group && creatingGroup.isChild"
            class="child-group-item relative is-last px-2 py-2 mb-1"
          >
            <div class="flex items-center">
              <span class="w-4"></span>
              <input
                ref="creatingGroupInput"
                v-model="creatingGroupName"
                @keyup.enter="confirmCreateNewGroup"
                @keyup.esc="cancelCreateNewGroup"
                @blur="handleBlurCreatingGroup"
                class="flex-1 px-2 py-1 text-sm border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autofocus
              />
            </div>
            <div v-if="errorMessage && creatingGroup" class="text-xs text-red-600 dark:text-red-400 mt-1 ml-6">
              {{ errorMessage }}
            </div>
          </div>
        </div>
        
        <!-- 子分组列表（支持折叠） -->
        <div 
          v-if="!isCollapsed(group)" 
          class="child-groups-container ml-4 mt-0.5"
          @dragover.prevent="handleChildContainerDragOver($event, group)"
          @drop.prevent="handleChildContainerDrop($event, group)"
        >
          <div
            v-for="(childGroup, index) in getChildGroupsForDisplay(group)"
            :key="childGroup.fullPath"
            class="child-group-item relative"
            :class="{
              'is-last': index === getChildGroupsForDisplay(group).length - 1,
              'opacity-50': draggedGroup === childGroup.fullPath,
              'drag-over-before': dragOverGroup === childGroup.fullPath && dragPosition === 'before',
              'drag-over-after': dragOverGroup === childGroup.fullPath && dragPosition === 'after'
            }"
            :draggable="editingGroup !== childGroup.fullPath"
            @mouseenter="hoveredGroup = childGroup.fullPath"
            @mouseleave="hoveredGroup = null"
            @contextmenu.prevent="handleContextMenu($event, childGroup.fullPath, true)"
            @dragstart.stop="handleDragStart($event, childGroup.fullPath, true)"
            @dragenter.prevent.stop="handleDragOver($event, childGroup.fullPath, true)"
            @dragover.prevent.stop="handleDragOver($event, childGroup.fullPath, true)"
            @dragleave.stop="handleDragLeave($event, childGroup.fullPath)"
            @drop="handleDrop($event, childGroup.fullPath, true)"
            @dragend="handleDragEnd"
          >
            <div class="flex items-center gap-1">
              <button
                v-if="getChildGroupsForDisplay(childGroup.fullPath).length > 0"
                class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-all duration-200 flex-shrink-0"
                @click.stop="toggleCollapseGroup(childGroup.fullPath)"
                :title="isCollapsed(childGroup.fullPath) ? t('groupList.tooltips.expand') : t('groupList.tooltips.collapse')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transition-transform duration-200" :class="{ 'rotate-[-90deg]': isCollapsed(childGroup.fullPath) }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span v-else class="w-4 flex-shrink-0"></span>
              <button
                v-if="editingGroup !== childGroup.fullPath"
                :class="[
                  'child-group-button flex-1 text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
                  selectedGroup === childGroup.fullPath && route.path === '/'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                ]"
                @click="handleGroupClick(childGroup.fullPath)"
                draggable="false"
                @dragover.prevent="handleDragOver($event, childGroup.fullPath, true)"
                @drop.prevent="handleDrop($event, childGroup.fullPath, true)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span class="text-sm font-medium flex-1 truncate">{{ childGroup.name }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ getGroupCount(childGroup.fullPath) }}</span>
              </button>
            
              <!-- 编辑模式：在原位置显示输入框 -->
              <div
                v-else
                v-click-outside="confirmEditGroup"
                class="child-group-button flex-1 px-3 py-2 rounded-md flex items-center gap-2.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <input
                  ref="editInputRef"
                  v-model="editingGroupName"
                  @keyup.enter="confirmEditGroup"
                  @keyup.esc="cancelEditGroup"
                  @mousedown.stop
                  @click.stop
                  class="flex-1 px-2 py-1 text-sm font-medium bg-blue-500 text-white border border-black rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style="min-width: 0;"
                />
              </div>
            </div>

            <GroupTree :parent-path="childGroup.fullPath" />
          </div>
        </div>
      </template>
      
      <!-- 新建文件夹（顶层，类似 Windows） -->
      <div
        v-if="creatingGroup && creatingGroup.parentGroup === null && !creatingGroup.isChild"
        class="mb-1"
      >
        <input
          ref="creatingGroupInput"
          v-model="creatingGroupName"
          @keyup.enter="confirmCreateNewGroup"
          @keyup.esc="cancelCreateNewGroup"
          @blur="handleBlurCreatingGroup"
          class="w-full px-3 py-2 text-sm border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          autofocus
        />
        <div v-if="errorMessage && creatingGroup" class="text-xs text-red-600 dark:text-red-400 mt-1 px-3">
          {{ errorMessage }}
        </div>
      </div>

      <!-- 创建分组对话框 -->
      <div v-if="showCreateDialog" class="px-3 py-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900">
        <input
          v-model="newGroupName"
          @keyup.enter="confirmCreateGroup"
          @keyup.esc="cancelCreateGroup"
          :placeholder="t('groupList.forms.groupNamePlaceholder')"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
          autofocus
        />
        <div v-if="errorMessage" class="text-xs text-red-600 dark:text-red-400 mb-2">
          {{ errorMessage }}
        </div>
        <div class="flex gap-1">
          <button
            @click="confirmCreateGroup"
            class="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {{ t('common.create') }}
          </button>
          <button
            @click="cancelCreateGroup"
            class="flex-1 px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
      
      <!-- 创建子分组对话框 -->
      <div v-if="showCreateChildDialog && parentGroupForChild" class="px-3 py-2 mt-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900">
        <div class="text-xs text-gray-600 dark:text-gray-400 mb-1">
          {{ t('groupList.forms.createChildUnder', { name: parentGroupForChild }) }}
        </div>
        <input
          v-model="newChildGroupName"
          @keyup.enter="confirmCreateChildGroup"
          @keyup.esc="cancelCreateChildGroup"
          :placeholder="t('groupList.forms.childGroupNamePlaceholder')"
          class="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
          autofocus
        />
        <div v-if="errorMessage" class="text-xs text-red-600 dark:text-red-400 mb-2">
          {{ errorMessage }}
        </div>
        <div class="flex gap-1">
          <button
            @click="confirmCreateChildGroup"
            class="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {{ t('common.create') }}
          </button>
          <button
            @click="cancelCreateChildGroup"
            class="flex-1 px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 标签区域 -->
    <div class="h-1/4 border-t border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <div class="p-4 overflow-y-auto flex-1">
        <!-- 语言标签 -->
        <div class="mb-4">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('groupList.labels.languageTags') }}</h3>
          <div class="flex flex-wrap gap-1">
            <div
              v-for="tag in displayedLanguageTags"
              :key="tag.name"
              class="inline-flex items-center gap-1"
            >
              <button
                :class="[
                  'px-2 py-1 text-xs rounded transition-colors inline-flex items-center gap-1',
                  selectedTag === tag.name
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                ]"
                @click="handleTagClick(tag.name, tag.isLanguage)"
              >
                {{ tag.name }}
                <span class="text-xs opacity-70">({{ tag.count }})</span>
              </button>
            </div>
            <button
              v-if="languageTags.length > 5"
              @click="showAllLanguages = !showAllLanguages"
              class="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
            >
              {{ showAllLanguages ? t('groupList.language.toggleCollapse') : t('groupList.language.toggleExpand', { count: languageTags.length - 5 }) }}
            </button>
          </div>
        </div>

        <!-- 自建标签 -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ t('groupList.labels.customTags') }}</h3>
          <div class="flex flex-wrap gap-1">
            <div
              v-for="tag in sortedCustomTags"
              :key="tag.name"
              class="inline-flex items-center gap-1"
            >
              <button
                :class="[
                  'px-2 py-1 text-xs rounded transition-colors inline-flex items-center gap-1',
                  selectedTags.includes(tag.name)
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                ]"
                @click="handleTagClick(tag.name, tag.isLanguage)"
              >
                #{{ tag.name }}
                <span class="text-xs opacity-70">({{ tag.count }})</span>
              </button>
              <span
                v-if="tag.count === 0"
                class="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:text-red-700 dark:hover:text-red-300 opacity-60 hover:opacity-100 transition-opacity"
                @click.stop="handleDeleteTag(tag.name)"
                :title="t('groupList.tooltips.deleteTag')"
              >
                ×
              </span>
              </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置按钮 -->
    <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <router-link
        to="/settings"
        :class="[
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200',
          route.path === '/settings'
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
        ]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-sm font-medium">{{ t('groupList.settings') }}</span>
      </router-link>
    </div>

    <!-- 删除标签确认对话框 -->
    <div
      v-if="showDeleteTagDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {{ t('groupList.dialogs.deleteTag.title') }}
        </h3>
        <div class="text-sm text-gray-700 dark:text-gray-300 mb-4">
          <template v-if="tagToDelete">
            <span
              v-if="getTagCount(tagToDelete) > 0"
              v-html="t('groupList.dialogs.deleteTag.withUsage', { tag: `#${tagToDelete}`, count: getTagCount(tagToDelete) })"
            />
            <span
              v-else
              v-html="t('groupList.dialogs.deleteTag.confirm', { tag: `#${tagToDelete}` })"
            />
          </template>
        </div>
        <div class="flex items-center mb-4">
          <input
            id="dontAskTagDelete"
            v-model="dontAskTagDelete"
            type="checkbox"
            class="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            for="dontAskTagDelete"
            class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {{ t('common.dontAskAgain') }}
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="cancelDeleteTag"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            @click="confirmDeleteTag"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除分组确认对话框 -->
    <div
      v-if="showDeleteGroupDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {{ t('groupList.dialogs.deleteGroup.title') }}
        </h3>
        <div class="text-sm text-gray-700 dark:text-gray-300 mb-4">
          <template v-if="groupToDelete">
            <span
              v-if="getGroupCount(groupToDelete) > 0"
              v-html="t('groupList.dialogs.deleteGroup.withUsage', { group: groupToDelete, count: getGroupCount(groupToDelete) })"
            />
            <span
              v-else
              v-html="t('groupList.dialogs.deleteGroup.confirm', { group: groupToDelete })"
            />
          </template>
        </div>
        <div class="flex items-center mb-4">
          <input
            id="dontAskGroupDelete"
            v-model="dontAskGroupDelete"
            type="checkbox"
            class="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            for="dontAskGroupDelete"
            class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {{ t('common.dontAskAgain') }}
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="cancelDeleteGroup"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            @click="confirmDeleteGroup"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]"
      :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      @click.stop
      v-click-outside="closeContextMenu"
    >
      <div class="py-1">
        <!-- 空白区域右键菜单：只显示新建文件夹 -->
        <template v-if="isContextMenuInEmptyArea">
          <button
            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="handleEmptyAreaNewFolder"
          >
            {{ t('groupList.context.createFolder') }}
          </button>
        </template>
        <!-- 文件夹右键菜单 -->
        <template v-else-if="contextMenuTargetGroup && !isSystemGroup(contextMenuTargetGroup)">
          <button
            v-if="canCreateChildGroup(contextMenuTargetGroup)"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="handleContextMenuNewFolder"
          >
            {{ t('groupList.context.createFolder') }}
          </button>
          <button
            class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="handleContextMenuRename"
          >
            {{ t('groupList.context.rename') }}
          </button>
          <button
            class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="handleContextMenuDelete"
          >
            {{ t('common.delete') }}
          </button>
        </template>
        <div v-else class="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
          {{ t('groupList.context.systemGroupDisabled') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, ref, withDirectives, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useStarStore } from '../stores/starStore'
import { useUIStore } from '../stores/uiStore'
import { useSettingsStore } from '../stores/settingsStore'

const route = useRoute()
const router = useRouter()

const starStore = useStarStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()

const selectedGroup = computed(() => uiStore.selectedGroup)
const selectedTag = computed(() => uiStore.selectedTag)
const selectedTags = computed(() => uiStore.selectedTags || [])

// 新建分组相关状态
const showCreateDialog = ref(false)
const newGroupName = ref('')
const errorMessage = ref('')

// 编辑分组相关状态
const hoveredGroup = ref<string | null>(null)
const editingGroup = ref<string | null>(null)
const editingGroupName = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// 创建子分组相关状态（已废弃，改用新的创建方式）
const showCreateChildDialog = ref(false)
const parentGroupForChild = ref<string | null>(null)
const newChildGroupName = ref('')

// 右键菜单相关状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTargetGroup = ref<string | null>(null)
const contextMenuTargetIsChild = ref(false)
const isContextMenuInEmptyArea = ref(false) // 是否在空白区域右键

// 新建文件夹状态（类似 Windows 的创建方式）
const creatingGroup = ref<{ parentGroup: string | null; isChild: boolean } | null>(null)
const creatingGroupName = ref('')
const creatingGroupInput = ref<HTMLInputElement | HTMLInputElement[] | null>(null)

// 折叠状态
const collapsedGroups = ref<string[]>([])
// 初始化折叠只执行一次
const collapsedInitDone = ref(false)

// 当分组数据就绪后，默认将所有“有子分组的父分组”设为折叠
watch(
  () => starStore.groups,
  (groups) => {
    if (collapsedInitDone.value) return
    if (!groups || groups.length === 0) return
    const parents = new Set<string>()
    for (const g of groups as string[]) {
      const idx = g.lastIndexOf('/')
      if (idx !== -1) {
        parents.add(g.slice(0, idx))
      }
    }
    collapsedGroups.value = Array.from(parents)
    collapsedInitDone.value = true
  },
  { immediate: true }
)

// 删除标签对话框相关状态
const showDeleteTagDialog = ref(false)
const tagToDelete = ref<string | null>(null)
const dontAskTagDelete = ref(false)

// 删除分组对话框相关状态
const showDeleteGroupDialog = ref(false)
const groupToDelete = ref<string | null>(null)
const dontAskGroupDelete = ref(false)

// 语言标签展开/收起状态
const showAllLanguages = ref(false)

// 默认新建文件夹名称（跟随语言）
const defaultGroupName = computed(() => t('groupList.defaults.newFolder'))

watch(defaultGroupName, (newValue, oldValue) => {
  if (!creatingGroup.value) return
  if (oldValue && creatingGroupName.value !== oldValue) return
  creatingGroupName.value = newValue
  nextTick(() => {
    const input = getCreatingInputElement()
    if (input) {
      input.focus()
      input.select()
    }
  })
})

// 拖拽相关状态
const draggedGroup = ref<string | null>(null)
const dragOverGroup = ref<string | null>(null)
const dragPosition = ref<'before' | 'after' | null>(null) // 拖拽放置位置：之前、之后

// 获取一级分组列表（排除系统分组"新增未分类"，按排序显示）
const topLevelGroups = computed(() => {
  try {
    let groups: string[] = []
    if (typeof starStore.getTopLevelGroups === 'function') {
      groups = starStore.getTopLevelGroups()
    } else if (starStore.groups && Array.isArray(starStore.groups)) {
      // 如果方法不存在，回退到直接过滤
      groups = starStore.groups.filter((g: string) => g && !g.includes('/'))
      // 排除系统分组"新增未分类"、"特别关注"和"已取消星标"
      groups = groups.filter((g: string) => g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标')
      
      // 按排序值排序
      const groupOrder = starStore.groupOrder || {}
      groups.sort((a, b) => {
        const orderA = groupOrder[a] ?? 0
        const orderB = groupOrder[b] ?? 0
        return orderA - orderB
      })
    } else {
      // 排除系统分组"新增未分类"、"特别关注"和"已取消星标"
      groups = groups.filter((g: string) => g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标')
    }
    return groups
  } catch (error) {
    console.error('Error getting top level groups:', error)
    return []
  }
})

// 获取新增未分类文件夹的项目数量
function getUncategorizedGroupCount(): number {
  if (!starStore.stars || starStore.stars.length === 0) {
    return 0
  }
  return starStore.stars.filter((star) => star.groups && star.groups.includes('新增未分类')).length
}

// 获取特别关注文件夹的项目数量
function getStarredGroupCount(): number {
  if (!starStore.stars || starStore.stars.length === 0) {
    return 0
  }
  return starStore.stars.filter((star) => star.groups && star.groups.includes('特别关注')).length
}

// 获取已取消星标文件夹的项目数量
function getUnstarredGroupCount(): number {
  if (!starStore.stars || starStore.stars.length === 0) {
    return 0
  }
  return starStore.stars.filter((star) => star.groups && star.groups.includes('已取消星标')).length
}

// 获取指定分组下的子分组（用于显示，已按排序显示）
function getChildGroupsForDisplay(parentGroup: string) {
  try {
    const prefix = `${parentGroup}/`
    const groupOrder = starStore.groupOrder || {}

    const childMap = new Map<string, { name: string; fullPath: string; order: number }>()

    starStore.groups
      ?.filter((g: string) => g && g.startsWith(prefix))
      ?.forEach((g: string) => {
        const remainder = g.slice(prefix.length)
        if (!remainder) return
        const firstSegment = remainder.split('/')[0]
        const fullPath = `${parentGroup}/${firstSegment}`
        if (!childMap.has(fullPath)) {
          childMap.set(fullPath, {
            name: firstSegment,
            fullPath,
            order: groupOrder[fullPath] ?? 0,
          })
        }
      })

    return Array.from(childMap.values()).sort((a, b) => a.order - b.order)
  } catch (error) {
    console.error('Error getting child groups:', error)
    return []
  }
}

// 获取父分组路径（无父级则返回 null）
function getParentPath(groupPath: string): string | null {
  const idx = groupPath.lastIndexOf('/')
  if (idx === -1) return null
  return groupPath.slice(0, idx)
}

function getDepth(groupPath: string): number {
  if (!groupPath) return 0
  return groupPath.split('/').filter(Boolean).length
}

const isCreatingForParent = (parentPath: string) => {
  return (
    !!creatingGroup.value &&
    creatingGroup.value.parentGroup === parentPath &&
    creatingGroup.value.isChild
  )
}

// 递归渲染子分组，避免模板重复
const GroupTree = defineComponent({
  name: 'GroupTree',
  props: {
    parentPath: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const renderCreateInput = (parentPath: string) => {
      if (!isCreatingForParent(parentPath)) return null

      return h(
        'div',
        { class: 'child-group-item relative px-2 py-2 mb-1' },
        [
          h('div', { class: 'flex items-center' }, [
            h('span', { class: 'w-4' }),
            h('input', {
              ref: creatingGroupInput,
              value: creatingGroupName.value,
              class: 'flex-1 px-2 py-1 text-sm border border-blue-400 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
              autofocus: true,
              onInput: (event: Event) => {
                const target = event.target as HTMLInputElement
                creatingGroupName.value = target.value
              },
              onKeyup: (event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                  confirmCreateNewGroup()
                } else if (event.key === 'Escape') {
                  cancelCreateNewGroup()
                }
              },
              onBlur: handleBlurCreatingGroup,
            }),
          ]),
          errorMessage.value && creatingGroup.value
            ? h(
                'div',
                { class: 'text-xs text-red-600 dark:text-red-400 mt-1 ml-6' },
                errorMessage.value
              )
            : null,
        ]
      )
    }

    const renderRow = (group: { fullPath: string; name: string }, index: number, siblings: { fullPath: string }[]) => {
      const children = getChildGroupsForDisplay(group.fullPath)
      const isLast = index === siblings.length - 1

      return h(
        'div',
        {
          class: [
            'child-group-item relative',
            {
              'is-last': isLast,
              'opacity-50': draggedGroup.value === group.fullPath,
              'drag-over-before': dragOverGroup.value === group.fullPath && dragPosition.value === 'before',
              'drag-over-after': dragOverGroup.value === group.fullPath && dragPosition.value === 'after',
            },
          ],
          draggable: editingGroup.value !== group.fullPath,
          onMouseenter: () => (hoveredGroup.value = group.fullPath),
          onMouseleave: () => (hoveredGroup.value = null),
          onContextmenu: (event: MouseEvent) => {
            event.preventDefault()
            handleContextMenu(event, group.fullPath, true)
          },
          onDragstart: (event: DragEvent) => {
            event.stopPropagation()
            handleDragStart(event, group.fullPath, true)
          },
          onDragenter: (event: DragEvent) => {
            event.preventDefault()
            event.stopPropagation()
            handleDragOver(event, group.fullPath, true)
          },
          onDragover: (event: DragEvent) => {
            event.preventDefault()
            event.stopPropagation()
            handleDragOver(event, group.fullPath, true)
          },
          onDragleave: (event: DragEvent) => {
            event.stopPropagation()
            handleDragLeave(event, group.fullPath)
          },
          onDrop: (event: DragEvent) => handleDrop(event, group.fullPath, true),
          onDragend: handleDragEnd,
        },
        [
          h('div', { class: 'flex items-center gap-1' }, [
            children.length > 0
              ? h(
                  'button',
                  {
                    class: 'p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-all duration-200 flex-shrink-0',
                    title: isCollapsed(group.fullPath) ? t('groupList.tooltips.expand') : t('groupList.tooltips.collapse'),
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation()
                      toggleCollapseGroup(group.fullPath)
                    },
                  },
                  [
                    h('svg', {
                      xmlns: 'http://www.w3.org/2000/svg',
                      class: ['h-3 w-3 transition-transform duration-200', { 'rotate-[-90deg]': isCollapsed(group.fullPath) }],
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      stroke: 'currentColor',
                      'stroke-width': '2.5',
                    }, [
                      h('path', {
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        d: 'M19 9l-7 7-7-7',
                      }),
                    ]),
                  ]
                )
              : h('span', { class: 'w-4 flex-shrink-0' }),
            editingGroup.value !== group.fullPath
              ? h(
                  'button',
                  {
                    class: [
                      'child-group-button flex-1 text-left px-3 py-2 rounded-md transition-all duration-200 flex items-center gap-2.5',
                      selectedGroup.value === group.fullPath && route.path === '/'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50',
                    ],
                    draggable: false,
                    onClick: () => handleGroupClick(group.fullPath),
                    onDragover: (event: DragEvent) => {
                      event.preventDefault()
                      handleDragOver(event, group.fullPath, true)
                    },
                    onDrop: (event: DragEvent) => {
                      event.preventDefault()
                      handleDrop(event, group.fullPath, true)
                    },
                  },
                  [
                    h('svg', {
                      xmlns: 'http://www.w3.org/2000/svg',
                      class: 'h-3.5 w-3.5 flex-shrink-0',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      stroke: 'currentColor',
                      'stroke-width': '2',
                    }, [
                      h('path', {
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
                      }),
                    ]),
                    h('span', { class: 'text-sm font-medium flex-1 truncate' }, group.name),
                    h('span', { class: 'text-xs text-gray-500 dark:text-gray-400 font-medium' }, getGroupCount(group.fullPath)),
                  ]
                )
              : withDirectives(
                  h('div', { class: 'child-group-button flex-1 px-3 py-2 rounded-md flex items-center gap-2.5' }, [
                    h('svg', {
                      xmlns: 'http://www.w3.org/2000/svg',
                      class: 'h-3.5 w-3.5 flex-shrink-0',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      stroke: 'currentColor',
                      'stroke-width': '2',
                    }, [
                      h('path', {
                        'stroke-linecap': 'round',
                        'stroke-linejoin': 'round',
                        d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
                      }),
                    ]),
                    h('input', {
                      ref: editInputRef,
                      value: editingGroupName.value,
                      class: 'flex-1 px-2 py-1 text-sm font-medium bg-blue-500 text-white border border-black rounded focus:outline-none focus:ring-2 focus:ring-blue-300',
                      style: 'min-width: 0;',
                      onInput: (event: Event) => {
                        const target = event.target as HTMLInputElement
                        editingGroupName.value = target.value
                      },
                      onKeyup: (event: KeyboardEvent) => {
                        if (event.key === 'Enter') {
                          confirmEditGroup()
                        } else if (event.key === 'Escape') {
                          cancelEditGroup()
                        }
                      },
                      onMousedown: (event: MouseEvent) => event.stopPropagation(),
                      onClick: (event: MouseEvent) => event.stopPropagation(),
                    }),
                  ]),
                  [[vClickOutside, confirmEditGroup]]
                ),
          ]),

          h(GroupTree, { parentPath: group.fullPath, key: `${group.fullPath}-children` }),
        ]
      )
    }

    return () => {
      const children = getChildGroupsForDisplay(props.parentPath)
      const shouldShow = (!isCollapsed(props.parentPath) && children.length > 0) || isCreatingForParent(props.parentPath)
      if (!shouldShow) return null

      const nodes = [] as any[]

      const inlineCreate = renderCreateInput(props.parentPath)
      if (inlineCreate) nodes.push(inlineCreate)

      children.forEach((child, index) => {
        nodes.push(renderRow(child, index, children))
      })

      return h(
        'div',
        {
          class: 'child-groups-container ml-4 mt-0.5',
          onDragover: (event: DragEvent) => {
            event.preventDefault()
            handleChildContainerDragOver(event, props.parentPath)
          },
          onDrop: (event: DragEvent) => {
            event.preventDefault()
            handleChildContainerDrop(event, props.parentPath)
          },
        },
        nodes
      )
    }
  },
})

// 检查是否是系统分组（不能删除）
function isSystemGroup(group: string): boolean {
  return group === '新增未分类' || group === '特别关注'
}

// 检查是否可以创建子分组（一级分组才能创建子分组）
function canCreateChildGroup(group: string | null): boolean {
  if (!group) return false
  if (isSystemGroup(group)) return false
  const depth = group.split('/').filter(Boolean).length
  const maxDepth = starStore.maxFolderDepth ?? 3
  return depth < maxDepth
}

function getGroupCount(group: string): number {
  if (!group || !starStore.stars || starStore.stars.length === 0) {
    return 0
  }

  // 统计当前分组及所有子孙分组的仓库数量（去重）
  const allGroupPaths = [group, ...starStore.groups.filter((g) => g && g.startsWith(`${group}/`))]

  const uniqueStars = new Set<string>()
  starStore.stars.forEach((star) => {
    if (!star.groups) return
    for (const groupPath of allGroupPaths) {
      if (star.groups.includes(groupPath)) {
        uniqueStars.add(star.id)
        break
      }
    }
  })

  return uniqueStars.size
}

// 获取标签使用次数（普通标签）
function getTagCount(tag: string): number {
  if (!starStore.stars || starStore.stars.length === 0) {
    return 0
  }
  return starStore.stars.filter((star) => star.tags && star.tags.includes(tag)).length
}

// 获取所有语言（去重并统计）
const languageTags = computed(() => {
  if (!starStore.stars || starStore.stars.length === 0) {
    return []
  }
  const languageMap = new Map<string, number>()
  starStore.stars.forEach((star) => {
    if (star.language) {
      const count = languageMap.get(star.language) || 0
      languageMap.set(star.language, count + 1)
    }
  })
  return Array.from(languageMap.entries())
    .map(([language, count]) => ({
      name: language,
      count,
      isLanguage: true,
    }))
    .sort((a, b) => b.count - a.count) // 语言标签按次数降序排序
})

// 显示的语言标签（默认前5个，或全部）
const displayedLanguageTags = computed(() => {
  if (showAllLanguages.value) {
    return languageTags.value
  }
  return languageTags.value.slice(0, 5)
})

// 排序后的自建标签列表（按次数降序）
const sortedCustomTags = computed(() => {
  if (!starStore.tags || starStore.tags.length === 0) {
    return []
  }
  return starStore.tags
    .map((tag) => ({
      name: tag,
      count: getTagCount(tag),
      isLanguage: false,
    }))
    .sort((a, b) => b.count - a.count)
})

function handleHomeClick() {
  // 如果不在首页，先跳转到首页
  if (route.path !== '/') {
    router.push('/')
  }
  // 清除分组选择
  uiStore.setSelectedGroup(null)
}

function handleGroupClick(group: string) {
  // 如果不在首页，先跳转到首页
  if (route.path !== '/') {
    router.push('/')
  }
  // 如果点击的是当前选中的分组，则取消筛选；否则设置为选中
  if (uiStore.selectedGroup === group) {
    uiStore.setSelectedGroup(null)
  } else {
    uiStore.setSelectedGroup(group)
  }

  // 如果该分组有子分组，则在点击时展开
  try {
    const hasChildren = getChildGroupsForDisplay(group).length > 0
    if (hasChildren && isCollapsed(group)) {
      toggleCollapseGroup(group)
    }
  } catch (e) {
    // 忽略异常，避免点击失败影响选择行为
    console.warn('expand-on-click failed:', e)
  }
}

function handleTagClick(tag: string, isLanguage = false) {
  // 如果不在首页，先跳转到首页
  if (route.path !== '/') {
    router.push('/')
  }
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

// 检查是否设置了"不再询问"删除标签
function shouldSkipTagDeleteConfirm(): boolean {
  return settingsStore.shouldSkipTagDeleteConfirm()
}

// 删除标签（从所有仓库和标签列表中移除）
function handleDeleteTag(tag: string) {
  // 如果设置了"不再询问"，直接删除
  if (shouldSkipTagDeleteConfirm()) {
    confirmDeleteTagImmediate(tag)
    return
  }
  
  tagToDelete.value = tag
  dontAskTagDelete.value = false
  showDeleteTagDialog.value = true
}

function cancelDeleteTag() {
  showDeleteTagDialog.value = false
  tagToDelete.value = null
  dontAskTagDelete.value = false
}

function confirmDeleteTag() {
  if (!tagToDelete.value) return
  
  // 如果选择了"不再询问"，保存到设置 store
  if (dontAskTagDelete.value) {
    settingsStore.setSkipTagDeleteConfirm(true)
  }
  
  confirmDeleteTagImmediate(tagToDelete.value)
  
  // 关闭对话框
  showDeleteTagDialog.value = false
  tagToDelete.value = null
  dontAskTagDelete.value = false
}

function confirmDeleteTagImmediate(tag: string) {
  // 从所有仓库中移除该标签
  starStore.stars.forEach((star) => {
    if (star.tags.includes(tag)) {
      starStore.removeTag(star.id, tag)
    }
  })
  
  // 从标签列表中移除
  starStore.tags = starStore.tags.filter((t) => t !== tag)
  starStore.saveToLocal()
  
  // 如果删除的标签是当前选中的，取消选择
  if (uiStore.selectedTag === tag) {
    uiStore.setSelectedTag(null)
  }
  // 如果删除的标签在自建标签选中列表中，移除
  const tagIndex = uiStore.selectedTags.indexOf(tag)
  if (tagIndex !== -1) {
    uiStore.selectedTags.splice(tagIndex, 1)
  }
}

// 获取当前创建输入框的引用
function getCreatingInputElement(): HTMLInputElement | null {
  const input = creatingGroupInput.value
  if (!input) return null
  
  // 如果是数组，取第一个
  if (Array.isArray(input)) {
    return input.length > 0 ? input[0] : null
  }
  
  // 如果是单个元素
  return input as HTMLInputElement
}

// 创建一级分组（新的 Windows 风格方式）
function handleAddGroup() {
  // 取消之前的创建状态
  cancelCreateNewGroup()
  // 设置新的创建状态（顶层分组）
  creatingGroup.value = { parentGroup: null, isChild: false }
  creatingGroupName.value = defaultGroupName.value
  // 聚焦并选中输入框（使用 nextTick 确保 DOM 更新）
  nextTick(() => {
    const input = getCreatingInputElement()
    if (input) {
      input.focus()
      input.select()
    }
  })
}

// 创建子分组（新的 Windows 风格方式）
function handleAddChildGroup(parentGroup: string) {
  // 取消之前的创建状态
  cancelCreateNewGroup()
  // 设置新的创建状态（子分组）
  creatingGroup.value = { parentGroup, isChild: true }
  creatingGroupName.value = defaultGroupName.value
  // 确保父分组展开
  if (isCollapsed(parentGroup)) {
    toggleCollapseGroup(parentGroup)
  }
  // 聚焦并选中输入框（使用 nextTick 确保 DOM 更新）
  nextTick(() => {
    const input = getCreatingInputElement()
    if (input) {
      input.focus()
      input.select()
    }
  })
}

function confirmCreateGroup() {
  errorMessage.value = ''
  if (!newGroupName.value.trim()) {
    errorMessage.value = '分组名称不能为空'
    return
  }
  
  try {
    starStore.createGroup(newGroupName.value.trim())
    showCreateDialog.value = false
    newGroupName.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建分组失败'
  }
}

function cancelCreateGroup() {
  showCreateDialog.value = false
  newGroupName.value = ''
  errorMessage.value = ''
}

function confirmCreateChildGroup() {
  errorMessage.value = ''
  if (!newChildGroupName.value.trim()) {
    errorMessage.value = '子分组名称不能为空'
    return
  }
  
  if (!parentGroupForChild.value) {
    errorMessage.value = '父分组不存在'
    return
  }
  
  try {
    starStore.createGroup(newChildGroupName.value.trim(), parentGroupForChild.value)
    showCreateChildDialog.value = false
    newChildGroupName.value = ''
    parentGroupForChild.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建子分组失败'
  }
}

function cancelCreateChildGroup() {
  showCreateChildDialog.value = false
  newChildGroupName.value = ''
  parentGroupForChild.value = null
  errorMessage.value = ''
}

// 编辑分组
function handleEditGroup(group: string) {
  editingGroup.value = group
  // 只显示分组名称部分（不含父路径）
  editingGroupName.value = group.includes('/') ? group.split('/').pop()! : group
  
  // 使用 nextTick 确保输入框渲染后立即获得焦点
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus()
      editInputRef.value.select() // 选中所有文本，方便直接输入新名称
    }
  })
}

function confirmEditGroup() {
  if (!editingGroup.value) return
  
  const oldFullPath = editingGroup.value
  const newName = editingGroupName.value.trim()
  
  if (!newName) {
    errorMessage.value = '分组名称不能为空'
    return
  }
  
  try {
    // 检查是否是子分组
    const isChildGroup = oldFullPath.includes('/')
    let newFullPath: string
    
    if (isChildGroup) {
      // 子分组重命名：只修改子分组名称，保持父路径不变
      const parentPath = oldFullPath.split('/').slice(0, -1).join('/')
      newFullPath = `${parentPath}/${newName}`
    } else {
      // 一级分组重命名：直接使用新名称
      newFullPath = newName
    }
    
    starStore.renameGroup(oldFullPath, newFullPath)
    editingGroup.value = null
    editingGroupName.value = ''
    errorMessage.value = ''
    
    // 如果正在编辑的分组被选中，更新选中状态
    if (uiStore.selectedGroup === oldFullPath) {
      uiStore.setSelectedGroup(newFullPath)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '重命名失败'
  }
}

function cancelEditGroup() {
  editingGroup.value = null
  editingGroupName.value = ''
  errorMessage.value = ''
}

// 检查是否设置了"不再询问"删除分组
function shouldSkipGroupDeleteConfirm(): boolean {
  return settingsStore.shouldSkipGroupDeleteConfirm()
}

// 删除分组
function handleDeleteGroup(group: string) {
  // 系统分组不能被删除
  if (isSystemGroup(group)) {
    alert('系统文件夹不能删除')
    return
  }
  
  // 先获取分组中的项目数量
  const count = getGroupCount(group)
  
  // 如果分组不为空，不允许删除
  if (count > 0) {
    alert(`不能删除非空文件夹！该文件夹中有 ${count} 个项目，请先移除其中的仓库。`)
    return
  }
  
  // 双重检查：使用 isGroupEmpty 再次确认
  const isEmpty = starStore.isGroupEmpty?.(group) ?? true
  
  if (!isEmpty) {
    alert(`不能删除非空文件夹，请先移除其中的仓库。`)
    return
  }
  
  // 如果设置了"不再询问"，直接删除
  if (shouldSkipGroupDeleteConfirm()) {
    confirmDeleteGroupImmediate(group)
    return
  }
  
  // 显示确认对话框
  groupToDelete.value = group
  dontAskGroupDelete.value = false
  showDeleteGroupDialog.value = true
}

function cancelDeleteGroup() {
  showDeleteGroupDialog.value = false
  groupToDelete.value = null
  dontAskGroupDelete.value = false
}

function confirmDeleteGroup() {
  if (!groupToDelete.value) return
  
  // 如果选择了"不再询问"，保存到设置 store
  if (dontAskGroupDelete.value) {
    settingsStore.setSkipGroupDeleteConfirm(true)
  }
  
  confirmDeleteGroupImmediate(groupToDelete.value)
  
  // 关闭对话框
  showDeleteGroupDialog.value = false
  groupToDelete.value = null
  dontAskGroupDelete.value = false
}

function confirmDeleteGroupImmediate(group: string) {
  try {
    starStore.deleteGroup(group)
    
    // 如果删除的分组是当前选中的，重置选择
    if (uiStore.selectedGroup === group) {
      uiStore.setSelectedGroup(null)
    }
    
    // 从折叠列表中移除（如果存在）
    const index = collapsedGroups.value.indexOf(group)
    if (index !== -1) {
      collapsedGroups.value.splice(index, 1)
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : '删除失败')
  }
}

// 折叠/展开功能
function isCollapsed(group: string): boolean {
  return collapsedGroups.value.includes(group)
}

function toggleCollapseGroup(group: string) {
  const index = collapsedGroups.value.indexOf(group)
  if (index === -1) {
    collapsedGroups.value.push(group)
  } else {
    collapsedGroups.value.splice(index, 1)
  }
}

// 右键菜单功能
function handleContextMenu(event: MouseEvent, group: string, isChild: boolean) {
  event.preventDefault()
  event.stopPropagation()
  
  if (!group) {
    console.error('handleContextMenu: group is null or empty')
    return
  }
  
  contextMenuTargetGroup.value = group
  contextMenuTargetIsChild.value = isChild
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
}

function closeContextMenu() {
  contextMenuVisible.value = false
  contextMenuTargetGroup.value = null
  isContextMenuInEmptyArea.value = false
}

// 处理空白区域的右键菜单
function handleEmptyAreaContextMenu(event: MouseEvent) {
  // 检查是否点击在空白区域（不是在文件夹、按钮或其他元素上）
  const target = event.target as HTMLElement
  
  // 如果点击在以下元素上，不显示空白区域菜单
  if (
    target.closest('.group-item') || 
    target.closest('.child-group-item') || 
    target.closest('button') ||
    target.closest('input') ||
    target.tagName === 'BUTTON' ||
    target.tagName === 'INPUT'
  ) {
    return
  }
  
  event.preventDefault()
  event.stopPropagation()
  
  isContextMenuInEmptyArea.value = true
  contextMenuTargetGroup.value = null
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuVisible.value = true
}

// 空白区域新建文件夹
function handleEmptyAreaNewFolder() {
  closeContextMenu()
  handleAddGroup()
}

function handleContextMenuNewFolder() {
  const group = contextMenuTargetGroup.value
  if (!group) {
    console.error('handleContextMenuNewFolder: contextMenuTargetGroup is null')
    closeContextMenu()
    return
  }
  
  closeContextMenu()

  if (!canCreateChildGroup(group)) {
    alert('该文件夹不支持创建子文件夹')
    return
  }

  handleAddChildGroup(group)
}

function handleContextMenuRename() {
  const group = contextMenuTargetGroup.value
  if (!group) {
    console.error('handleContextMenuRename: contextMenuTargetGroup is null')
    closeContextMenu()
    return
  }
  
  closeContextMenu()
  
  // 系统分组不能重命名
  if (isSystemGroup(group)) {
    alert('系统文件夹不能重命名')
    return
  }
  
  handleEditGroup(group)
}

function handleContextMenuDelete() {
  const group = contextMenuTargetGroup.value
  if (!group) {
    console.error('handleContextMenuDelete: contextMenuTargetGroup is null')
    closeContextMenu()
    return
  }
  
  closeContextMenu()
  handleDeleteGroup(group)
}

// 新的创建分组确认（Windows 风格）
function confirmCreateNewGroup() {
  if (!creatingGroup.value) return
  
  const name = creatingGroupName.value.trim()
  if (!name) {
    // 如果名称为空，取消创建
    cancelCreateNewGroup()
    return
  }
  
  errorMessage.value = ''
  
  try {
    if (creatingGroup.value.isChild && creatingGroup.value.parentGroup) {
      // 创建子分组
      starStore.createGroup(name, creatingGroup.value.parentGroup)
    } else {
      // 创建一级分组
      starStore.createGroup(name)
    }
    cancelCreateNewGroup()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建分组失败'
    // 创建失败时不清除创建状态，让用户可以修改名称重试
    // 重新聚焦输入框
    import('vue').then(({ nextTick }) => {
      nextTick(() => {
        const input = getCreatingInputElement()
        if (input) {
          input.focus()
          input.select()
        }
      })
    })
  }
}

function handleBlurCreatingGroup() {
  // 延迟处理，以便点击其他按钮时能正常响应
  setTimeout(() => {
    if (creatingGroup.value) {
      confirmCreateNewGroup()
    }
  }, 200)
}

function cancelCreateNewGroup() {
  creatingGroup.value = null
  creatingGroupName.value = ''
  errorMessage.value = ''
}


// 拖拽开始
function handleDragStart(event: DragEvent, group: string, _isChild: boolean) {
  if (isSystemGroup(group)) {
    event.preventDefault()
    return
  }
  
  draggedGroup.value = group
  
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', group)
  }
}

// 拖拽悬停
function handleDragOver(event: DragEvent, group: string, isChild: boolean) {
  if (!draggedGroup.value || draggedGroup.value === group) {
    return
  }
  
  // 检查是否是同级分组
  const draggedIsChild = draggedGroup.value.includes('/')
  if (draggedIsChild !== isChild) {
    dragOverGroup.value = null
    dragPosition.value = null
    return // 不能在不同层级之间拖拽
  }
  
  // 如果是子分组，检查是否是同一父分组
  if (isChild) {
    // 只允许同一深度的子分组互换位置
    if (getDepth(draggedGroup.value) !== getDepth(group)) {
      dragOverGroup.value = null
      dragPosition.value = null
      return
    }

    const draggedParent = getParentPath(draggedGroup.value)
    const targetParent = getParentPath(group)
    if (!draggedParent || !targetParent || draggedParent !== targetParent) {
      dragOverGroup.value = null
      dragPosition.value = null
      return // 不能在不同父分组之间拖拽子分组
    }
  }
  
  dragOverGroup.value = group
  
  // 根据鼠标位置判断是放在之前还是之后
  let target = event.currentTarget as HTMLElement
  if (target.tagName === 'BUTTON') {
    target = target.closest('.group-item, .child-group-item') as HTMLElement || target
  }
  
  if (target) {
    const rect = target.getBoundingClientRect()
    const mouseY = event.clientY
    const middleY = rect.top + rect.height / 2
    dragPosition.value = mouseY < middleY ? 'before' : 'after'
  }
}

// 拖拽离开
function handleDragLeave(event: DragEvent, group: string) {
  // 只有当鼠标真正离开元素时才清除状态
  const target = event.currentTarget as HTMLElement
  const relatedTarget = event.relatedTarget as HTMLElement
  // 注意：在某些浏览器（如 Chrome）拖拽时 relatedTarget 可能为 null，此时不应立即清除高亮，
  // 交由下一个有效的 dragenter/dragover 更新状态或在 dragend 时统一清空。
  if (relatedTarget && !target.contains(relatedTarget)) {
    if (dragOverGroup.value === group) {
      dragOverGroup.value = null
      dragPosition.value = null
    }
  }
}

// 拖拽放置
async function handleDrop(event: DragEvent, targetGroup: string, isChild: boolean) {
  event.preventDefault()
  event.stopPropagation() // 阻止事件冒泡，避免重复触发
  
  if (!draggedGroup.value || draggedGroup.value === targetGroup) {
    dragOverGroup.value = null
    dragPosition.value = null
    return
  }
  
  // 检查 dragPosition 是否有效
  if (!dragPosition.value) {
    console.warn('[拖拽排序] dragPosition 为空，使用默认值 "after"')
    dragPosition.value = 'after'
  }
  
  // 检查是否是同级分组
  const draggedIsChild = draggedGroup.value.includes('/')
  if (draggedIsChild !== isChild) {
    dragOverGroup.value = null
    dragPosition.value = null
    return
  }
  
  // 如果是子分组，检查是否是同一父分组
  if (isChild) {
    // 只允许同一深度的子分组互换位置
    if (getDepth(draggedGroup.value) !== getDepth(targetGroup)) {
      dragOverGroup.value = null
      dragPosition.value = null
      return
    }

    const draggedParent = getParentPath(draggedGroup.value)
    const targetParent = getParentPath(targetGroup)
    if (!draggedParent || !targetParent || draggedParent !== targetParent) {
      dragOverGroup.value = null
      dragPosition.value = null
      return
    }
  }
  
  try {
    // 获取同级分组列表
  let sameLevelGroups: string[] = []
  if (isChild) {
    const parentGroup = getParentPath(targetGroup)
    if (!parentGroup) {
      dragOverGroup.value = null
      dragPosition.value = null
      return
    }
    sameLevelGroups = getChildGroupsForDisplay(parentGroup).map((g) => g.fullPath)
  } else {
    sameLevelGroups = topLevelGroups.value.filter((g) => g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标')
  }
  
    // 按当前排序值排序
    const groupOrder = starStore.groupOrder || {}
    sameLevelGroups.sort((a, b) => {
      const orderA = groupOrder[a] ?? 0
      const orderB = groupOrder[b] ?? 0
      return orderA - orderB
    })
    
    const draggedIndex = sameLevelGroups.indexOf(draggedGroup.value)
    const targetIndex = sameLevelGroups.indexOf(targetGroup)
    
    if (draggedIndex < 0 || targetIndex < 0) {
      return
    }
    
    // 如果拖拽到自己，不需要移动
    if (draggedIndex === targetIndex) {
      return
    }
    
    // 计算新的位置
    // 先移除被拖拽的元素，再计算插入位置
    const newGroups = [...sameLevelGroups]
    const [dragged] = newGroups.splice(draggedIndex, 1)
    
    // 计算插入位置（在移除后的数组中）
    // 注意：此时 newGroups 已经移除了被拖拽的元素
    let newIndex: number
    
    if (dragPosition.value === 'before') {
      // 拖拽到目标之前
      if (draggedIndex < targetIndex) {
        // 被拖拽元素在目标之前，移除后目标索引减1
        // 例如：[A, B(拖), C(目), D] -> [A, C, D]，C 的索引从 2 变成 1
        newIndex = targetIndex - 1
  } else {
        // 被拖拽元素在目标之后，移除后目标索引不变
        // 例如：[A, C(目), D, B(拖)] -> [A, C, D]，C 的索引还是 1
        newIndex = targetIndex
      }
    } else {
      // 拖拽到目标之后
      if (draggedIndex < targetIndex) {
        // 被拖拽元素在目标之前，移除后目标索引减1，插入到目标之后
        // 例如：[A, B(拖), C(目), D] -> [A, C, D]，插入到 C 之后（索引 2）
        newIndex = targetIndex
      } else {
        // 被拖拽元素在目标之后，移除后目标索引不变，插入到目标之后
        // 例如：[A, C(目), D, B(拖)] -> [A, C, D]，插入到 C 之后（索引 2）
        newIndex = targetIndex + 1
      }
    }
    
    // 确保 newIndex 在有效范围内（允许插入到末尾）
    newIndex = Math.max(0, Math.min(newIndex, newGroups.length))
    
    // 插入到新位置
    newGroups.splice(newIndex, 0, dragged)
    
    // 调试：检查结果
    console.log('[拖拽排序]', {
      draggedGroup: draggedGroup.value,
      targetGroup,
      draggedIndex,
      targetIndex,
      dragPosition: dragPosition.value,
      newIndex,
      originalOrder: sameLevelGroups,
      newOrder: newGroups
    })
    
    // 更新排序值
    const updatedGroupOrder = { ...groupOrder }
    newGroups.forEach((g, index) => {
      updatedGroupOrder[g] = index
    })
    
    // 更新 store
    starStore.groupOrder = updatedGroupOrder
    
    // 保存到数据库（不调用 saveToLocal，避免事务嵌套）
    try {
      const { saveGroupOrderToDb } = await import('../utils/database')
      await saveGroupOrderToDb(updatedGroupOrder)
    } catch (error) {
      console.error('保存分组排序失败:', error)
    }
  } catch (error) {
    console.error('拖拽排序失败:', error)
  } finally {
    dragOverGroup.value = null
    dragPosition.value = null
  }
}

// 拖拽结束
function handleDragEnd() {
  draggedGroup.value = null
  dragOverGroup.value = null
  dragPosition.value = null
}

// 容器拖拽悬停（允许在整个容器区域内拖拽）
function handleContainerDragOver(event: DragEvent) {
  // 允许在整个容器区域内拖拽，但不设置具体的放置位置
  // 这样当鼠标在空白区域时，不会显示禁止图标
  if (draggedGroup.value) {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }
}

// 容器空白区域放置（拖拽到列表末尾）
async function handleContainerDrop(event: DragEvent) {
  event.preventDefault()
  
  if (!draggedGroup.value) {
    return
  }
  
  // 检查是否是子分组
  const draggedIsChild = draggedGroup.value.includes('/')
  if (draggedIsChild) {
    // 子分组不能拖拽到容器空白区域
    return
  }
  
  try {
    // 获取所有一级分组
    const sameLevelGroups = topLevelGroups.value.filter((g) => g !== '新增未分类' && g !== '特别关注' && g !== '已取消星标')
    
    // 按当前排序值排序
    const groupOrder = starStore.groupOrder || {}
    sameLevelGroups.sort((a, b) => {
      const orderA = groupOrder[a] ?? 0
      const orderB = groupOrder[b] ?? 0
      return orderA - orderB
    })
    
    const draggedIndex = sameLevelGroups.indexOf(draggedGroup.value)
    if (draggedIndex < 0) {
      return
    }
    
    // 移动到最后一个位置
    const newGroups = [...sameLevelGroups]
    const [dragged] = newGroups.splice(draggedIndex, 1)
    newGroups.push(dragged)
    
    // 更新排序值
    const updatedGroupOrder = { ...groupOrder }
    newGroups.forEach((g, index) => {
      updatedGroupOrder[g] = index
    })
    
    // 更新 store
    starStore.groupOrder = updatedGroupOrder
    
    // 保存到数据库（不调用 saveToLocal，避免事务嵌套）
    try {
      const { saveGroupOrderToDb } = await import('../utils/database')
      await saveGroupOrderToDb(updatedGroupOrder)
  } catch (error) {
      console.error('保存分组排序失败:', error)
    }
  } catch (error) {
    console.error('拖拽排序失败:', error)
  } finally {
    dragOverGroup.value = null
    dragPosition.value = null
  }
}

// 子分组容器拖拽悬停
function handleChildContainerDragOver(event: DragEvent, parentGroup: string) {
  // 只允许同一父分组下的子分组拖拽
  if (draggedGroup.value && draggedGroup.value.includes('/')) {
    const draggedParent = getParentPath(draggedGroup.value)
    if (draggedParent === parentGroup) {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }
  }
}

// 子分组容器空白区域放置（拖拽到子分组列表末尾）
async function handleChildContainerDrop(event: DragEvent, parentGroup: string) {
  event.preventDefault()
  
  if (!draggedGroup.value) {
    return
  }
  
  // 检查是否是子分组，且是同一父分组
  const draggedIsChild = draggedGroup.value.includes('/')
  if (!draggedIsChild) {
    return
  }
  
  const draggedParent = getParentPath(draggedGroup.value)
  if (draggedParent !== parentGroup) {
    return
  }
  
  try {
    // 获取同一父分组下的所有子分组
    const sameLevelGroups = getChildGroupsForDisplay(parentGroup).map((g) => g.fullPath)
    
    // 按当前排序值排序
    const groupOrder = starStore.groupOrder || {}
    sameLevelGroups.sort((a, b) => {
      const orderA = groupOrder[a] ?? 0
      const orderB = groupOrder[b] ?? 0
      return orderA - orderB
    })
    
    const draggedIndex = sameLevelGroups.indexOf(draggedGroup.value)
    if (draggedIndex < 0) {
      return
    }
    
    // 移动到最后一个位置
    const newGroups = [...sameLevelGroups]
    const [dragged] = newGroups.splice(draggedIndex, 1)
    newGroups.push(dragged)
    
    // 更新排序值
    const updatedGroupOrder = { ...groupOrder }
    newGroups.forEach((g, index) => {
      updatedGroupOrder[g] = index
    })
    
    // 更新 store
    starStore.groupOrder = updatedGroupOrder
    
    // 保存到数据库（不调用 saveToLocal，避免事务嵌套）
    try {
      const { saveGroupOrderToDb } = await import('../utils/database')
      await saveGroupOrderToDb(updatedGroupOrder)
  } catch (error) {
      console.error('保存分组排序失败:', error)
    }
  } catch (error) {
    console.error('拖拽排序失败:', error)
  } finally {
    dragOverGroup.value = null
    dragPosition.value = null
  }
}


// 点击外部关闭右键菜单的指令
interface ClickOutsideElement extends HTMLElement {
  clickOutsideEvent?: (event: MouseEvent) => void
}

const vClickOutside = {
  mounted(el: ClickOutsideElement, binding: { value: () => void }) {
    el.clickOutsideEvent = (event: MouseEvent) => {
      const target = event.target as Node
      if (target && !(el === target || el.contains(target))) {
        setTimeout(() => {
          binding.value()
        }, 10)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: ClickOutsideElement) {
    if (el.clickOutsideEvent) {
      document.removeEventListener('click', el.clickOutsideEvent)
    }
  }
}
</script>

<style scoped>
.group-item {
  position: relative;
  margin-bottom: 0.125rem;
}

/* 基础文件夹项样式 */
.group-item-base {
  font-size: 0.875rem;
}

/* 子分组容器 */
.child-groups-container {
  position: relative;
  padding-left: 1rem;
  border-left: 1.5px solid #e5e7eb;
  margin-left: 0.5rem;
}

.dark .child-groups-container {
  border-left-color: #374151;
}

/* 最后一个子项：覆盖竖线底部一半 */
.child-groups-container .child-group-item.is-last::before {
  content: '';
  position: absolute;
  left: -1rem;
  bottom: 0;
  width: 1.5px;
  height: 50%;
  background-color: #f9fafb;
  pointer-events: none;
}

.dark .child-groups-container .child-group-item.is-last::before {
  background-color: #111827;
}

/* 子分组项 */
.child-group-item {
  position: relative;
  margin-bottom: 0.125rem;
}

/* 子分组按钮样式 */
.child-group-button {
  font-size: 0.875rem;
  background: transparent;
}

/* 父分组按钮增强 */
.group-item-button {
  font-weight: 500;
}

/* 拖拽样式 */
.group-item[draggable="true"],
.child-group-item[draggable="true"] {
  cursor: move;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  touch-action: none;
}

.group-item[draggable="true"]:hover,
.child-group-item[draggable="true"]:hover {
  cursor: grab;
}

.group-item[draggable="true"]:active,
.child-group-item[draggable="true"]:active {
  cursor: grabbing;
}

/* 确保拖拽时按钮不会阻止事件 */
.group-item-button,
.child-group-button {
  pointer-events: auto;
}

/* 拖拽放置位置指示 */
.group-item.drag-over-before::before,
:deep(.child-group-item.drag-over-before)::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -2px;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
  z-index: 10;
}

.group-item.drag-over-after::after,
:deep(.child-group-item.drag-over-after)::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
  z-index: 10;
}

.dark .group-item.drag-over-before::before,
.dark :deep(.child-group-item.drag-over-before)::before,
.dark .group-item.drag-over-after::after,
.dark :deep(.child-group-item.drag-over-after)::after {
  background: #60a5fa;
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

