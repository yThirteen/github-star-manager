# GitHub Star Manager

极简、实用的 GitHub Stars 桌面管理器。使用 Tauri 2.9 + Vue3 + TypeScript 构建，支持本地持久化、分组/标签管理、AI 辅助分类与翻译。

## 功能特性

- ✅ 同步 GitHub Stars（支持新增、已取消星标归档）
- ✅ 分组管理：多级文件夹（新增/重命名/删除/拖拽排序，最多 3 级）
- ✅ 标签管理：新增/删除/筛选，支持语言标签快捷筛选
- ✅ 搜索与筛选：Fuse.js 模糊搜索 + 标签/语言筛选
- ✅ Release 追踪：显示最新 Release 提示徽标
- ✅ 备注与描述：支持为仓库添加“备注”；仓库描述支持折叠与展开
- ✅ AI 能力：
	- 仓库描述一键翻译为中文（可复制/重试）
	- 未分类仓库 AI 自动分组（预览、接收、继续分类）
- ✅ 特殊文件夹：
	- “新增未分类”：新同步的仓库自动进入该文件夹
	- “已取消星标”：同步后检测到取消星标的仓库会移动至此
	- “特别关注”：自定义收藏集
- ✅ 本地数据持久化：SQLite（Tauri 后端）优先，自动迁移 JSON/localStorage 旧数据
- ✅ 多语言支持：中文/英文界面切换
- ✅ 数据管理：支持数据导入/导出/清空，便于备份和迁移
- ✅ 用户管理：GitHub Token 安全存储与验证，包含详细获取指南

## 技术栈

- 前端：Vue3 + TypeScript + Vite + Tailwind CSS + Vue I18n
- 后端：Tauri 2.9 + Rust（SQLite 数据持久化）
- 搜索：Fuse.js
- 存储：SQLite（桌面端）+ JSON/localStorage 回退与迁移
- 国际化：Vue I18n（支持中文/英文）

## 本地部署与运行

详细的本地部署与运行指南请查看 [SETUP.md](./SETUP.md)

## 使用说明

1) 首次运行后，点击页面顶部“同步 Stars”按钮。
2) 按提示输入 GitHub Token（最低 `public_repo` 权限）。Token 将暂存于 localStorage。
3) 同步完成后：
	 - 新增的仓库会位于“新增未分类”文件夹；
	 - 若有取消星标的仓库，会移动到“已取消星标”文件夹；
	 - 可在左侧创建/拖拽/重命名文件夹进行分组管理。
4) 标签管理：在仓库卡片上添加、删除或点击筛选标签；语言标签可一键筛选。
5) AI 功能：
	 - 翻译：支持 Google、Microsoft、OpenAI（在设置页配置并启用对应 API 后可用）；
	 - 分类：仅支持兼容 OpenAI Chat Completions 接口规范的实现（在设置页为分类模块分配此类 API 后可用）。

## 数据与存储

- 桌面端使用 SQLite（由 Tauri/Rust 后端管理）；
- 在 SQLite 写入失败时会显示错误信息。

### 便携版与数据目录

- 便携构建（portable）运行时，应用会优先在可执行文件同目录下的 `data/` 文件夹存储数据库文件（`github_star_manager.db`），实现与系统环境隔离。
- 若无法获取或写入可执行目录，则会回退到系统用户数据目录（Windows 的 `%AppData%`）。
- 生成便携包：`pnpm tauri:build:portable`，产物位于 `dist/portable/`，可直接分发或压缩打包。
- 隐私与分发：打包脚本会忽略 `data/` 目录，避免将你的个人数据和 GitHub Token 打入便携包；首次运行将在同目录自动创建空的 `data/`。
- 放置位置建议：将便携包放置在具有写入权限的位置（例如 D 盘或用户目录），避免 `C:\\Program Files` 等可能需要管理员权限的路径。

## 项目结构

```
github-star-manage/
├── src/                    # Vue3 前端
│   ├── components/        # 组件（分组/列表/设置/对话框等）
│   ├── composables/       # 组合式函数（AI / 搜索 / Stars / Dialog）
│   ├── stores/            # Pinia 状态
│   ├── types/             # TypeScript 类型
│   └── utils/             # 工具（GitHub / 存储 / 搜索 / 排序 等）
├── src-tauri/             # Rust 后端（Tauri）
│   └── src/
│       └── commands/      # 后端命令（GitHub / AI / DB）
└── TECHNICAL_SPEC.md      # 技术文档
```

## 设置页

- **常规设置**：打开链接/删除标签/删除文件夹确认开关、语言切换
- **用户管理**：GitHub Token 安全存储与验证，包含详细的获取指南
- **AI API 管理**：
	- 维护多个 API 配置（兼容 OpenAI 风格，如 DeepSeek/硅基流动/ChatGPT 等）；
	- 为模块分配 API（翻译/自动分类等），并可启用/禁用；
	- 支持创建、编辑、删除 API 配置。
- **数据管理**：
	- 导出数据：支持选择性导出星标数据和/或API配置
	- 导入数据：从备份文件恢复数据
	- 清空数据：支持选择性清空星标数据和/或API配置
- **关于设置**：应用信息、版本号等

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=pollinations/pollinations,yThirteen/github-star-manage,github-star-manage/github-star-manage&type=date&legend=top-left)](https://www.star-history.com/#pollinations/pollinations&yThirteen/github-star-manage&github-star-manage/github-star-manage&type=date&legend=top-left)

## 许可证

MIT

