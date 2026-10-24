// Verify patient-facing internal destinations after the static site is built.
// This is an offline check: it never follows external URLs or changes DNS.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve('dist');
if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/index.html is missing. Run npm run build first.');
  process.exit(1);
}

function walk(dir, result = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file, result);
    else result.push(file);
  }
  return result;
}

const files = walk(root);
const built = new Set(files.map(file => '/' + relative(root, file).split(sep).join('/')));
const pages = files.filter(file => file.endsWith('.html'));
const failures = new Map();
let checked = 0;

function isBuiltDestination(pathname) {
  const candidate = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  if (built.has(candidate)) return true;
  // Published pages can have clean links, while the static file is .html.
  if (!pathname.endsWith('/') && !/\.[a-z0-9]{1,8}$/i.test(pathname)) {
    if (built.has(pathname + '.html') || built.has(pathname + '/index.html')) return true;
  }
  return false;
}

for (const file of pages) {
  const from = '/' + relative(root, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  // Check static HTML links and loaded resources. External URLs, telephone,
  // email and same-page anchors are intentionally outside this offline audit.
  const tags = html.match(/<(?:a|area|img|script|link|source)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attr = tag.match(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/i);
    if (!attr) continue;
    const raw = attr[2].trim().replace(/&amp;/g, '&');
    if (!raw || raw.startsWith('#') || raw.startsWith('//') ||
        /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(raw)) continue;
    let dest;
    try {
      dest = new URL(raw, 'https://ejoeundental.com' + from);
    } catch {
      failures.set(from + ' -> ' + raw, 'Invalid internal URL');
      continue;
    }
    if (dest.origin !== 'https://ejoeundental.com') continue;
    let pathname;
    try {
      pathname = decodeURIComponent(dest.pathname);
    } catch {
      failures.set(from + ' -> ' + raw, 'Invalid URL escaping');
      continue;
    }
    // URL.pathname is normalized by the browser; check for the final file.
    checked++;
    if (!isBuiltDestination(pathname)) {
      failures.set(from + ' -> ' + raw, 'No matching file in dist');
    }
  }
}

if (failures.size) {
  console.error('Broken internal links or resources: ' + failures.size);
  for (const [link, reason] of [...failures].slice(0, 40)) {
    console.error(' - ' + link + ': ' + reason);
  }
  if (failures.size > 40) console.error(' ... and ' + (failures.size - 40) + ' more');
  process.exit(1);
}
console.log('Internal link audit passed: ' + checked + ' references across ' +
            pages.length + ' HTML pages.');
