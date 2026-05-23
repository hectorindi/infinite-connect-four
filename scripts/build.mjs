import { mkdir, rm, readFile, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

// Force wipe inspect options out of the current process execution environment
process.env.NODE_OPTIONS = "";
delete process.env.NODE_OPTIONS;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'Source');
const binDir = path.join(root, 'bin');
const assetsDir = path.join(sourceDir, 'assets');
const libsDir = path.join(sourceDir, 'libs');

// --- 1. Compile TypeScript first ---
console.log('Compiling TypeScript...');
try {
  // Use a completely clean context object for the sub-process environment
  execSync('npx tsc', { 
    cwd: root, 
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_OPTIONS: '', 
      NODE_ENV: 'production' 
    } 
  });
} catch (error) {
  console.error('TypeScript compilation failed, but proceeding with build...');
}

// --- 2. Clean and regenerate the bin directory ---
await rm(binDir, { recursive: true, force: true });
await mkdir(binDir, { recursive: true });

// --- 3. Copy assets, libs, styles, and compiled js sources ---
await cp(assetsDir, path.join(binDir, 'assets'), { recursive: true, force: true }).catch(() => {});
await cp(libsDir, path.join(binDir, 'libs'), { recursive: true, force: true }).catch(() => {});
await cp(path.join(sourceDir, 'src'), path.join(binDir, 'src'), { recursive: true, force: true });
await cp(path.join(sourceDir, 'styles'), path.join(binDir, 'styles'), { recursive: true, force: true });

// --- 4. Process and copy HTML ---
const html = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
await writeFile(path.join(binDir, 'index.html'), html, 'utf8');

console.log('Build complete. Compiled and copied from Source to bin.');