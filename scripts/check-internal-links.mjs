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
const stylesheets = files.filter(file => file.endsWith('.css'));
const failures = new Map();
let checked = 0;

function resolveBuiltDestination(pathname) {
  const candidate = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  if (built.has(candidate)) return candidate;
  // On the published domain .html pages also have extensionless addresses.
  if (!pathname.endsWith('/') && !/\.[a-z0-9]{1,8}$/i.test(pathname)) {
    if (built.has(pathname + '.html')) return pathname + '.html';
    if (built.has(pathname + '/index.html')) return pathname + '/index.html';
  }
  return null;
}

// Read target IDs only once; checking the fragment protects the many
// diagnosis > treatment > visit links from silently landing at page top.
const fragmentTargets = new Map();
function hasFragment(target, fragment) {
  if (!target.endsWith('.html')) return true; // SVG fragments aren't HTML IDs.
  if (!fragmentTargets.has(target)) {
    const html = readFileSync(join(root, target.slice(1)), 'utf8');
    const ids = new Set();
    for (const match of html.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      ids.add(match[1] ?? match[2] ?? match[3]);
    }
    for (const match of html.matchAll(/<a\b[^>]*\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      ids.add(match[1] ?? match[2]);
    }
    fragmentTargets.set(target, ids);
  }
  return fragmentTargets.get(target).has(fragment);
}

for (const file of pages) {
  const from = '/' + relative(root, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  // Check static HTML links and loaded resources. External URLs, telephone
  // and email links are outside the offline audit; same-page anchors are checked.
  const tags = html.match(/<(?:a|area|img|script|link|source)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attr = tag.match(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/i);
    if (!attr) continue;
    const raw = attr[2].trim().replace(/&amp;/g, '&');
    if (!raw || raw.startsWith('//') ||
        /^(?:mailto:|tel:|data:|blob:|javascript:)/i.test(raw)) continue;
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
    const target = resolveBuiltDestination(pathname);
    if (!target) {
      failures.set(from + ' -> ' + raw, 'No matching file in dist');
      continue;
    }
    // Fragments apply to links only (not CSS/image resources) and must refer
    // to an ID or named anchor in the destination's built HTML.
    if (/^<(?:a|area)\b/i.test(tag) && dest.hash.length > 1) {
      let fragment;
      try {
        fragment = decodeURIComponent(dest.hash.slice(1));
      } catch {
        failures.set(from + ' -> ' + raw, 'Invalid fragment escaping');
        continue;
      }
      if (!hasFragment(target, fragment)) {
        failures.set(from + ' -> ' + raw, 'Missing HTML anchor #' + fragment);
      }
    }
  }
}

// CSS image backgrounds, fonts and @import files may not be mentioned in HTML.
// Validate every built stylesheet so a removed Monet image or local font fails
// CI rather than silently disappearing on patient phones.
let cssChecked = 0;
for (const file of stylesheets) {
  const from = '/' + relative(root, file).split(sep).join('/');
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const references = [
    ...[...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)]
      .map(match => match[1] ?? match[2] ?? (match[3] ?? '').trim()),
    ...[...css.matchAll(/@import\s+(["'])([^"']+)\1/gi)]
      .map(match => match[2])
  ];
  for (const rawValue of references) {
    const raw = rawValue.trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('//') ||
        /^(?:data:|blob:|javascript:)/i.test(raw)) continue;
    let destination;
    try {
      destination = new URL(raw, 'https://ejoeundental.com' + from);
    } catch {
      failures.set(from + ' -> ' + raw, 'Invalid stylesheet URL');
      continue;
    }
    if (destination.origin !== 'https://ejoeundental.com') continue;
    let pathname;
    try {
      pathname = decodeURIComponent(destination.pathname);
    } catch {
      failures.set(from + ' -> ' + raw, 'Invalid stylesheet URL escaping');
      continue;
    }
    cssChecked++;
    if (!resolveBuiltDestination(pathname)) {
      failures.set(from + ' -> ' + raw, 'Missing local CSS image/font/import');
    }
  }
}

if (failures.size) {
  console.error('Broken internal links, CSS assets or resources: ' + failures.size);
  for (const [link, reason] of [...failures].slice(0, 40)) {
    console.error(' - ' + link + ': ' + reason);
  }
  if (failures.size > 40) console.error(' ... and ' + (failures.size - 40) + ' more');
  process.exit(1);
}
console.log('Internal link audit passed: ' + checked + ' HTML references across ' +
            pages.length + ' HTML pages, plus ' + cssChecked + ' CSS asset references across ' +
            stylesheets.length + ' stylesheets.');
