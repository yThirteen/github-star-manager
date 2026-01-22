# GitHub Star Manager

极简、实用的 GitHub Stars 桌面管理器。使用 Tauri 2.9 + Vue3 + TypeScript 构建，支持本地持久化、分组/标签管理、AI 辅助分类与翻译。


## 使用说明
可以直接使用 [Releases](https://github.com/yThirteen/github-star-manage/releases) 中的便携版(portable)版本，或者使用可执行安装包。


1) 首次运行后，点击页面顶部“同步 Stars”按钮。
2) 按提示输入 GitHub Token（最低 `public_repo` 权限）
3) 同步完成后：
	 - 新增的仓库会位于“新增未分类”文件夹；
	 - 若有取消星标的仓库，会移动到“已取消星标”文件夹；
	 - 可在左侧创建/拖拽/重命名文件夹进行分组管理。
4) 标签管理：在仓库卡片上添加、删除或点击筛选标签；语言标签可一键筛选。
5) AI 功能：
	 - 翻译：支持 Google、Microsoft、OpenAI（在设置页配置并启用对应 API 后可用）；
	 - 分类：仅支持兼容 OpenAI Chat Completions 接口规范的实现（在设置页为分类模块分配此类 API 后可用）。


## 功能特性

- ✅ 同步 GitHub Stars（支持新增、已取消星标归档）
- ✅ 分组管理：多级文件夹（新增/重命名/删除/拖拽排序）
- ✅ 标签管理：新增/删除/筛选，支持语言标签快捷筛选
- ✅ 搜索与筛选：Fuse.js 模糊搜索 + 标签/语言筛选
- ✅ Release 追踪：显示最新 Release 提示徽标
- ✅ 备注与描述：支持为仓库添加“备注”
- ✅ AI 能力：
	- 仓库描述一键翻译为中文（可复制/重试）
	- 未分类仓库 AI 分组（预览、接收、继续分类）
- ✅ 特殊文件夹：
	- “新增未分类”：新同步的仓库自动进入该文件夹
	- “已取消星标”：同步后检测到取消星标的仓库会移动至此
	- “特别关注”：自定义收藏集
- ✅ 本地数据持久化：SQLite（Tauri 后端）
- ✅ 多语言支持：中文/英文界面切换
- ✅ 数据管理：支持数据导入/导出/清空，便于备份和迁移
- ✅ 用户管理：GitHub Token 安全存储与验证，包含详细获取指南

## 技术栈

- 前端：Vue3 + TypeScript + Vite + Tailwind CSS + Vue I18n
- 后端：Tauri 2.9 + Rust（SQLite 数据持久化）
- 搜索：Fuse.js
- 存储：SQLite（桌面端）
- 国际化：Vue I18n（支持中文/英文）



## 本地部署与运行

详细的本地部署与运行指南请查看 [SETUP.md](./SETUP.md)



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yThirteen/github-star-manage&type=date&legend=top-left)](https://www.star-history.com/#yThirteen/github-star-manage&type=date&legend=top-left)

## 许可证

MIT

