#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { platform } from 'os'

const projectRoot = process.cwd()
const distDir = join(projectRoot, 'dist')
const scriptsDir = join(projectRoot, 'scripts')

// 确保目录存在
if (!existsSync(scriptsDir)) {
  mkdirSync(scriptsDir, { recursive: true })
}

console.log('🚀 开始构建多语言安装程序...')

// 跨平台删除目录的函数
function removeDirectory(dirPath) {
  try {
    if (platform() === 'win32') {
      execSync(`if exist "${dirPath}" rmdir /s /q "${dirPath}"`, { stdio: 'inherit' })
    } else {
      execSync(`rm -rf "${dirPath}"`, { stdio: 'inherit' })
    }
  } catch (e) {
    // 忽略删除失败的错误
  }
}

try {
  // 1. 清理之前的构建
  console.log('🧹 清理之前的构建...')
  removeDirectory(join(projectRoot, 'src-tauri/target/release/bundle'))

  // 2. 构建前端
  console.log('📦 构建前端...')
  execSync('npm run build', { stdio: 'inherit' })

  // 3. 构建 Tauri 应用
  console.log('🔨 构建 Tauri 应用...')
  execSync('npm run tauri:build', { stdio: 'inherit' })

  // 4. 创建多语言安装程序信息
  const bundleInfo = {
    buildTime: new Date().toISOString(),
    supportedLanguages: [
      { code: 'zh-CN', name: '简体中文' },
      { code: 'en', name: 'English' }
    ],
    features: [
      '自动检测系统语言',
      '首次启动语言选择',
      '安装程序语言选择',
      '应用内语言切换'
    ]
  }

  const infoPath = join(distDir, 'bundle-info.json')
  writeFileSync(infoPath, JSON.stringify(bundleInfo, null, 2))
  console.log('📄 生成构建信息文件:', infoPath)

  // 5. 显示构建结果
  console.log('\n✅ 多语言安装程序构建完成！')
  console.log('\n📁 构建产物位置:')
  console.log('   Windows NSIS: src-tauri/target/release/bundle/nsis/')
  console.log('   Windows MSI:  src-tauri/target/release/bundle/msi/')
  console.log('   macOS DMG:    src-tauri/target/release/bundle/dmg/')
  console.log('   Linux DEB:    src-tauri/target/release/bundle/deb/')
  console.log('   Linux AppImage: src-tauri/target/release/bundle/appimage/')
  
  console.log('\n🌍 多语言功能:')
  console.log('   ✅ Windows 安装程序语言选择')
  console.log('   ✅ macOS 系统语言检测')
  console.log('   ✅ Linux 系统语言检测')
  console.log('   ✅ 应用首次启动语言选择')
  console.log('   ✅ 设置页面语言切换')

} catch (error) {
  console.error('❌ 构建失败:', error.message)
  process.exit(1)
}
