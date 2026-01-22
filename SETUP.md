# 本地部署启动指南

## 前置要求

1. **Node.js** 18+ 和 npm/pnpm
   ```bash
   推荐用 nvm 装，方便切版本。
   node --version  # 应显示 v18 或更高
   ```

2. **Rust** 1.70+ 和 Cargo
   ```bash
   rustc --version  # 应显示 rustc 1.70 或更高
   cargo --version
   ```
   
   如果未安装，访问 https://rustup.rs/

3. **系统依赖**
   - **Windows**: 需要 Visual Studio Build Tools（安装 Rust 时会提示）
   - **macOS**: `xcode-select --install`
   - **Linux**: `sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libayatana-appindicator3-dev librsvg2-dev`

4. **验证**
   ```bash
   node -v && pnpm -v && rustc --version && cargo -V
   ```
   Win 用户再在 PowerShell 跑：
   ```powershell
   Get-Command cl.exe | Select-Object -ExpandProperty Source
   ```

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
npm install
# 或
pnpm install
```

### 2. 首次开发运行

```bash
npm run tauri:dev
# 或
pnpm tauri:dev
```

首次运行会：
- 下载 Rust 依赖（可能需要几分钟）
- 编译 Rust 代码
- 启动开发服务器和 Tauri 窗口

### 3. 构建生产版本

```bash
npm run tauri:build
```

构建产物位于：`src-tauri/target/release/bundle/`

## 常见问题

### Rust 编译错误

如果遇到 `octocrab` API 相关的编译错误，可能是版本不兼容。检查：
1. `Cargo.toml` 中的 `octocrab = "0.37"`
2. 如果 API 已变更，可能需要更新代码或使用不同版本

### 端口被占用

开发服务器默认使用端口 `1420`，如果被占用：
- 修改 `vite.config.ts` 中的 `server.port`
- 或停止占用端口的进程

### GitHub Token 获取

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 至少勾选 `public_repo` 权限
4. 复制生成的 Token（格式：`ghp_xxxxxxxxxxxx`）
5. 首次同步时在应用中输入

## 下一步

- 查看 `TECHNICAL_SPEC.md` 了解完整技术文档
- 查看 `README.md` 了解项目功能

