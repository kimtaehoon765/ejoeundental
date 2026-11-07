// Verify the built patient safety guide network before a batched release.
// Run after npm run build. Checks only local artifacts: no web, deployment or API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

const root = resolve('dist');
const booking = 'https://booking.naver.com/booking/13/bizes/1162931';
const guides = new Map([
  ['osteoporosis-medication-dental.html', 'osteoporosis-treatment-decision-20261107'],
  ['blood-thinners-dental.html', 'antithrombotic-decision-guide-20261107'],
  ['heart-disease-dental-care.html', 'heart-ie-risk-explanation-20261107'],
  ['hypertension-dental-care.html', 'bp-patient-questions-20261107'],
  ['kidney-disease-dental-care.html', 'kidney-dialysis-treatment-guide-20261107'],
  ['liver-disease-dental-care.html', 'liver-personalized-dental-care-20261107'],
  ['cancer-immunosuppression-dental-care.html', 'oncology-treatment-timing-guide-20261107'],
  ['pregnancy-dental-care.html', 'pregnancy-dental-treatment-questions-20261107'],
  ['asthma-allergy-dental-care.html', 'asthma-allergy-dental-questions-20261107'],
  ['steroid-rheumatic-dental-care.html', 'steroid-rheumatic-practical-guide-20261107'],
  ['epilepsy-syncope-dental-care.html', 'epilepsy-syncope-safety-guide-20261107'],
  ['diabetes-dental-care.html', 'diabetes-gum-lowglucose-guide-20261107']
]);
const supportingPages = [
  'medical-safety-guide.html', 'previsit-checklist.html', 'medical-history.html'
];
const allPages = [...guides.keys(), ...supportingPages];

function load(page) {
  const file = join(root, page);
  assert.ok(existsSync(file), 'Missing built medical guide: ' + page);
  return readFileSync(file, 'utf8');
}
function idsOf(markup) {
  return [...markup.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
}
function assertIDsUnique(page, markup) {
  const ids = idsOf(markup);
  assert.equal(new Set(ids).size, ids.length, page + ': repeated HTML id');
}
function internalFragmentTargets(markup) {
  return [...markup.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*#[^"']+)["']/gi)]
    .map(m => m[1]);
}

test('all twelve updated patient safety guides survive the static build with navigation and a booking route', () => {
  for (const [page, id] of guides) {
    const markup = load(page);
    assert.ok(markup.includes('id="' + id + '"'), page + ': missing revised education section');
    assert.ok(markup.includes(booking), page + ': clinic booking link missing');
    assert.ok(markup.includes('rel="canonical"') || markup.includes('rel="canonical"'),
      page + ': search canonical missing');
    const canonical = markup.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
    assert.ok(canonical, page + ': canonical missing');
    assert.equal(new URL(canonical).pathname, '/' + page, page + ': wrong canonical path');
    const visibleMain = markup.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
    const introduction = visibleMain.slice(0, 850);
    for (const detail of ['김태훈 원장', '고려대학교 의학박사(치과학 전공)',
      '통합치의학과 전문의', 'href="/doctor.html"']) {
      assert.ok(introduction.includes(detail),
        page + ': clinic clinician information/link absent near the heading: ' + detail);
    }
    assertIDsUnique(page, markup);
  }
});

test('safety hub keeps sixteen unique topic cards and four destination groups', () => {
  const page = load('medical-safety-guide.html');
  const links = [...page.matchAll(/<a\b[^>]*class="card"[^>]*href="(\/[^"]+)"/g)]
    .map(m => m[1]);
  assert.equal(links.length, 16, 'medical hub card count changed');
  assert.equal(new Set(links).size, 16, 'medical hub has duplicate cards');
  for (const item of [
    'safety-group-links-20261107', 'safety-group-first-20261107',
    'safety-group-medicines-20261107', 'safety-group-conditions-20261107',
    'safety-group-timing-20261107'
  ]) assert.ok(page.includes('id="' + item + '"'), 'hub lost anchor #' + item);
  for (const item of guides.keys()) {
    assert.ok(links.includes('/' + item), 'hub is missing medical topic: ' + item);
  }
  assertIDsUnique('medical-safety-guide.html', page);
});

test('medical history keeps twelve distinct topic links in three accessible groups', () => {
  const page = load('medical-history.html');
  const nav = page.match(/<nav class="card history-guide-navigation"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.ok(nav, 'medical history grouped navigation is missing');
  const routes = [...nav.matchAll(/<li><a href="(\/[^"]+)"/g)].map(m => m[1]);
  assert.equal(routes.length, 12);
  assert.equal(new Set(routes).size, 12);
  for (const item of guides.keys()) {
    assert.ok(routes.includes('/' + item), 'medical history is missing ' + item);
  }
  for (const id of [
    'history-guide-groups-20261107','history-medications-20261107',
    'history-conditions-20261107','history-special-20261107','visit-checklist'
  ]) assert.ok(page.includes('id="' + id + '"'), 'history missing #' + id);
  assert.ok(page.includes('window.print()'), 'medical history printable form missing');
  assert.ok(page.includes(booking), 'medical history booking action missing');
  assertIDsUnique('medical-history.html', page);
});

test('visit checklist retains fourteen checkbox items, reset script and patient-specific links', () => {
  const page = load('previsit-checklist.html');
  assert.equal((page.match(/<input type="checkbox"/g) || []).length, 14);
  assert.ok(page.includes('id="previsit-special-conditions-20261107"'));
  assert.ok(page.includes('src="/assets/previsit-checklist-progress.js'));
  assert.ok(page.includes(booking));
  assertIDsUnique('previsit-checklist.html', page);
});

test('cross-page deep links on all updated medical pages resolve to a real built HTML anchor', () => {
  const cache = new Map();
  let count = 0;
  for (const page of allPages) {
    const markup = load(page);
    assertIDsUnique(page, markup);
    for (const raw of internalFragmentTargets(markup)) {
      const targetUrl = new URL(raw, 'https://ejoeundental.com/' + page);
      if (targetUrl.origin !== 'https://ejoeundental.com' || !targetUrl.hash) continue;
      const targetPath = targetUrl.pathname === '/' ? 'index.html' : targetUrl.pathname.slice(1);
      if (!targetPath.endsWith('.html')) continue;
      const fragment = decodeURIComponent(targetUrl.hash.slice(1));
      if (!cache.has(targetPath)) cache.set(targetPath, new Set(idsOf(load(targetPath))));
      assert.ok(cache.get(targetPath).has(fragment),
        page + ': broken anchor ' + raw + ' (target ' + targetPath + ')');
      count++;
    }
  }
  assert.ok(count >= 20, 'too few cross-page deep links were checked: ' + count);
});
