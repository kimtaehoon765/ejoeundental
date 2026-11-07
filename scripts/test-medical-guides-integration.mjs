// Verify the built patient safety guide network before a batched release.
// Run after npm run build. Checks only local artifacts: no web, deployment or API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {extractSearchText} from './search-content-extractor.mjs';

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
  const clinicianCssFile = join(root, 'assets/medical-guide-clinician.css');
  assert.ok(existsSync(clinicianCssFile), 'Shared clinician-credit CSS missing from built assets');
  const clinicianCssVersion = createHash('sha256')
    .update(readFileSync(clinicianCssFile)).digest('hex').slice(0, 12);
  let newlyStyledClinicianCredits = 0;
  for (const [page, id] of guides) {
    const markup = load(page);
    assert.ok(markup.includes('id="' + id + '"'), page + ': missing revised education section');
    assert.ok(markup.includes(booking), page + ': clinic booking link missing');
    assert.ok(!/<meta\s+name=["']robots["'][^>]*\bnoindex\b/i.test(markup),
      page + ': patient guide unexpectedly noindexed');
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
    if (markup.includes('class="guide-clinician-credit"')) {
      newlyStyledClinicianCredits++;
      assert.ok(
        markup.includes('/assets/medical-guide-clinician.css?v=' + clinicianCssVersion),
        page + ': clinician credentials visible but fingerprinted CSS missing'
      );
    }
    assertIDsUnique(page, markup);
  }
  assert.equal(newlyStyledClinicianCredits, 8,
    'Eight original-format patient guides should share the clinician identity styling');
});

// Protect the actual original clinical answers in the on-site search corpus.
// The title and description alone are not enough: patients must find the body.
test('onsiteSearchIndexMirrorsBody20261107: all revised medical answers are discoverable as actual article text', () => {
  const index = JSON.parse(readFileSync(join(root, 'content/search-index.json'), 'utf8'));
  assert.ok(Array.isArray(index), 'Public site search index must be a JSON list');
  const sampleHeadings = new Map([
    ['osteoporosis-medication-dental.html', '골다공증 약을 쓰는 환자의 발치·임플란트 상담'],
    ['blood-thinners-dental.html', '복용 중인 약에 따라 발치 준비가 달라집니다'],
    ['heart-disease-dental-care.html', '심내막염 예방 항생제는 누가 검토하나요?'],
    ['hypertension-dental-care.html', '고혈압 환자가 자주 묻는 세 가지 질문'],
    ['kidney-disease-dental-care.html', '신장질환·투석 환자의 발치와 잇몸치료는 어떻게 준비하나요?'],
    ['liver-disease-dental-care.html', '간염·간경변 환자의 발치와 잇몸치료, 무엇이 달라질까요?'],
    ['cancer-immunosuppression-dental-care.html', '항암치료 전·중·후, 치과 진료는 어떻게 달라질까요?'],
    ['pregnancy-dental-care.html', '임신 중 치과치료, 시기와 주의사항을 자세히 알아보세요'],
    ['asthma-allergy-dental-care.html', '천식·약물 알레르기 환자가 치과에서 궁금해하는 질문'],
    ['steroid-rheumatic-dental-care.html', '류마티스질환·스테로이드 복용 중 치과진료, 무엇을 준비할까요?'],
    ['epilepsy-syncope-dental-care.html', '뇌전증·실신 경험 환자의 치과진료, 안전하게 준비하는 방법'],
    ['diabetes-dental-care.html', '당뇨병 환자의 잇몸치료·발치 전후, 무엇을 확인하나요?']
  ]);
  assert.equal(sampleHeadings.size, guides.size, 'Clinical search coverage has drifted');
  for (const page of [...guides.keys(), ...supportingPages]) {
    const markup = load(page);
    const path = '/' + page;
    const entries = index.filter(item => item.url === path);
    assert.equal(entries.length, 1, page + ': missing or duplicated in public site search');
    const item = entries[0];
    const title = markup.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = markup.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    assert.ok(title && description, page + ': source search metadata is missing');
    assert.equal(item.title, title, page + ': indexed title is outdated');
    assert.equal(item.description, description, page + ': indexed summary is outdated');
    assert.equal(item.body, extractSearchText(markup),
      page + ': indexed main text differs from published HTML');
    assert.ok(item.body.length >= 100, page + ': indexed patient information too short');
    if (sampleHeadings.has(page)) {
      const phrase = sampleHeadings.get(page);
      assert.ok(markup.includes(phrase), page + ': revised medical heading missing from page');
      assert.ok(item.body.includes(phrase), page + ': revised clinical answer not indexed');
    }
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

test('search page keeps six direct medical guide answers near the search field', () => {
  const markup = load('search.html');
  const block = markup.match(/<section class="search-medical-shortcuts"[\s\S]*?<\/section>/)?.[0] || '';
  assert.ok(block, 'Missing visible medical patient questions on search page');
  const searchResults = markup.indexOf('<section id="results"');
  const panel = markup.indexOf('<section class="search-medical-shortcuts"');
  const topicNavigation = markup.indexOf('<nav class="search-reading-routes"');
  assert.ok(searchResults >= 0 && searchResults < panel && panel < topicNavigation,
    'Patient medical links should appear immediately after primary search');
  const links = [...block.matchAll(/<a href="(\/[^"#?]+\.html)">/g)].map(m => m[1]);
  const expected = [
    '/blood-thinners-dental.html', '/osteoporosis-medication-dental.html',
    '/diabetes-dental-care.html', '/asthma-allergy-dental-care.html',
    '/pregnancy-dental-care.html', '/kidney-disease-dental-care.html'
  ];
  assert.deepEqual(links, expected, 'Keep six distinct direct links to approved guide pages');
  for (const route of links) {
    assert.ok(existsSync(join(root, route.slice(1))), 'Medical guide target absent: ' + route);
  }
  for (const text of ['약을 임의로 중단하지 말고', '복용약·전신질환 안내 16개 주제 더 보기',
    '방문 전 준비사항 확인']) {
    assert.ok(block.includes(text), 'Required patient safety context missing: ' + text);
  }
  assert.ok(markup.includes('href="/medical-safety-guide.html#safety-group-links-20261107"'));
  assert.ok(markup.includes('href="/previsit-checklist.html#previsit-special-conditions-20261107"'));
  assert.ok(markup.includes('name="robots" content="noindex,follow"'),
    'Search results page should not become an indexable search URL');
  const styles = readFileSync(join(root,'assets/search-page.css'),'utf8');
  assert.ok(styles.includes('.search-medical-shortcuts__grid'), 'New reading grid CSS not shipped');
  assert.ok(styles.includes('grid-template-columns:minmax(0,1fr)'), 'Mobile single-column layout missing');
  assertIDsUnique('search.html', markup);
});
