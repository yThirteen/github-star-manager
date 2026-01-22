import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(projectRoot, 'src-tauri', 'target', 'release');
const portableDir = path.join(projectRoot, 'dist', 'portable');

// 跳过不应随便携包分发的目录（包括数据目录）
const skipDirs = new Set(['build', 'deps', 'examples', 'incremental', 'bundle', 'data']);

async function exists(dir) {
  try {
    await fs.access(dir);
    return true;
  } catch {
    return false;
  }
}

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const from = path.join(src, entry.name);
      const to = path.join(dest, entry.name);
      await copyRecursive(from, to);
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }
}

async function main() {
  if (!(await exists(releaseDir))) {
    throw new Error(`Release directory not found: ${releaseDir}`);
  }

  await fs.rm(portableDir, { recursive: true, force: true });
  await fs.mkdir(portableDir, { recursive: true });

  const entries = await fs.readdir(releaseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    // 如为单个文件且位于 data 目录（极端情况），也跳过
    if (!entry.isDirectory() && entry.name.toLowerCase().includes('github_star_manager.db')) continue;

    const src = path.join(releaseDir, entry.name);
    const dest = path.join(portableDir, entry.name);
    await copyRecursive(src, dest);
  }

  console.log(`Portable payload prepared in ${portableDir}`);
  console.log('Zip that folder or ship it directly as the portable build.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
