// Read-only live website visibility probe for ejoeundental.com.
// This intentionally never changes DNS, hosting, indexing settings, or website files.
// A missing live domain must NOT turn a passing source build into a failure.
import dns from 'node:dns/promises';
import { appendFileSync } from 'node:fs';

const apex = 'ejoeundental.com';
const origin = 'https://' + apex;
const rows = [];
const add = (item, status, detail) => {
  rows.push({ item, status, detail: String(detail || '').replace(/[\r\n|]/g, ' ').slice(0, 240) });
  console.log('[LIVE CHECK]', item + ':', status, detail || '');
};
const shortError = e => e?.code || e?.cause?.code || e?.name || String(e);

for (const [label, host, method] of [
  ['DNS nameservers', apex, 'resolveNs'],
  ['DNS apex IPv4', apex, 'resolve4'],
  ['DNS www CNAME', 'www.' + apex, 'resolveCname']
]) {
  try {
    const records = await Promise.race([
      dns[method](host),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 6000))
    ]);
    add(label, '확인', records.join(', '));
  } catch (e) {
    add(label, '확인 불가', shortError(e));
  }
}

const urls = [
  { label: '정식 도메인 첫 화면', url: origin + '/' },
  { label: 'www HTTPS 연결', url: 'https://www.' + apex + '/' },
  { label: '검색엔진 robots', url: origin + '/robots.txt' },
  { label: '검색엔진 sitemap', url: origin + '/sitemap.xml' },
  { label: '잇몸치료 상세 페이지', url: origin + '/gum-treatment.html' }
];

await Promise.all(urls.map(async ({label,url}) => {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'EjoeunDentalReadOnlyHealthCheck/1.0' }
    });
    const body = await response.text();
    const info = ['HTTP ' + response.status, '최종 주소: ' + response.url];
    if (label === '정식 도메인 첫 화면') {
      const hasCanonical = body.includes('<link rel="canonical" href="' + origin + '/">');
      const hasClinic = body.includes('이조은치과');
      const hasCompactJournal = body.includes('owner-stories-more');
      info.push('치과명: ' + (hasClinic?'있음':'없음'));
      info.push('대표주소: ' + (hasCanonical?'일치':'불일치'));
      info.push('8+22 글목록: ' + (hasCompactJournal?'확인':'미확인'));
    } else if (label === '검색엔진 robots') {
      info.push('사이트맵: ' + (body.includes('Sitemap: ' + origin + '/sitemap.xml')?'정상':'확인 필요'));
    } else if (label === '검색엔진 sitemap') {
      info.push('정식 도메인 홈페이지: ' + (body.includes('<loc>' + origin + '/</loc>')?'포함':'확인 필요'));
    } else if (label === '잇몸치료 상세 페이지') {
      info.push('치료정보: ' + (body.includes('잇몸치료')?'있음':'미확인'));
    }
    add(label, response.ok?'접속':'응답 점검 필요', info.join(' · '));
  } catch (e) {
    add(label, '접속 확인 불가', shortError(e));
  }
}));

if (process.env.GITHUB_STEP_SUMMARY) {
  const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const lines = [
    '## 이조은치과 정식 도메인 공개 상태 (읽기 전용)',
    '',
    '| 점검 대상 | 결과 | 세부 내용 |',
    '|---|---|---|',
    ...rows.map(r=>'| '+escape(r.item)+' | '+escape(r.status)+' | '+escape(r.detail)+' |'),
    '',
    '> 이번 점검은 도메인 DNS/HTTPS/페이지 응답만 확인합니다. 네이버·구글의 실제 색인 여부, Netlify/Cloudflare 계정 연결 여부를 보장하지 않습니다.',
    '> DNS/호스팅 설정을 변경하지 않았으며 이 점검이 실패해도 소스 빌드 검사는 계속됩니다.',
    ''
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n')+'\n');
}
