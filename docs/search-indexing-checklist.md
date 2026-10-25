# 이조은치과 정식 도메인 검색 등록·색인 확인표
최종 정리: **2026-10-25**. 이 문서는 운영자 확인 순서를 안내하며, 실제 검색 등록·색인 완료를 주장하지 않습니다. 소스 빌드 통과와 운영 홈페이지에 최신 글이 배포된 상태는 구분합니다.

## 현재 운영 주소와 확인된 점
- **대표 주소:** `https://ejoeundental.com/`
- **정식 사이트맵:** `https://ejoeundental.com/sitemap.xml`
- **정식 robots:** `https://ejoeundental.com/robots.txt`
- GitHub Actions의 2026-10-25 읽기 전용 실사이트 검사는 정식 주소 HTTP 200, robots·사이트맵 접속, 주요 페이지 canonical을 확인했습니다.
- **www 대표주소 통일 확인:** 2026-10-25 확인 시점에 `https://www.ejoeundental.com/`과 하위 경로의 비-www **301 리디렉션이 정상 동작**했습니다. 과거 작업 안내([이전 설정 안내](www-301-redirect.md))를 다시 실행하지 마세요. 실제 DNS·호스팅 설정은 사용자 계정에서만 변경합니다.
- `https://ejoeundental.pages.dev/`는 **배포 점검용 임시 주소**입니다. 새 검색 등록과 사이트맵 제출은 정식 도메인 기준으로 통일합니다. 임시 주소의 색인 제외(noindex) 헤더는 배포 응답에서 별도 점검해야 합니다.
- 정식 주소의 HTTP 200과 소스 품질검사 통과는 **네이버·구글 실제 색인·검색 순위·검색 유입을 증명하지 않습니다.**

## 1. 네이버 서치어드바이저 (무료)
1. [네이버 서치어드바이저](https://searchadvisor.naver.com/)의 웹마스터도구에서 **`https://ejoeundental.com`** 등록 여부와 소유권 확인 상태를 확인합니다.
2. 기존에 `ejoeundental.pages.dev`만 등록했다면 임시 사이트를 새 대표 사이트로 계속 사용하지 말고 **정식 도메인** 등록·소유 확인을 진행합니다. 소유확인용 메타 값은 현재 네이버에서 발급한 값만 사용합니다.
3. 정식 사이트를 선택해 **요청 → 사이트맵 제출**에 `https://ejoeundental.com/sitemap.xml`을 제출하고 처리 결과를 확인합니다. 이미 등록되어 있다면 중복 제출보다 기존 결과부터 점검합니다.
4. **요청 → 웹페이지 수집**, 사이트 진단 등에서 아래 URL의 수집·처리 상태와 오류를 확인합니다.
5. 네이버 플레이스의 병원명·주소·전화번호·진료시간이 실제 이조은치과 정보와 일치하는지도 별도 점검합니다. 일반 웹검색과 플레이스 노출 순위는 별도 시스템입니다.

## 2. Google Search Console (무료)
1. [Google Search Console](https://search.google.com/search-console/)에서 `ejoeundental.com` **도메인 속성** 또는 `https://ejoeundental.com/` URL 접두어 속성의 소유권을 확인합니다.
2. **색인 생성 → Sitemaps**에서 `https://ejoeundental.com/sitemap.xml` 등록·처리 상태를 확인합니다. 페이지 단위로는 **URL 검사**에서 실제 색인 여부·크롤링·Google이 선택한 표준 URL을 확인합니다.
3. `www`와 비-www의 차이는 301 리디렉션 및 canonical으로 정리합니다. **동일 도메인의 www ↔ 비-www 변경에는 '주소 변경' 도구를 사용하지 않습니다.**
4. 검색 실적에서는 노출·클릭·CTR·검색어를 추적하되, 특정 검색어 순위 상승이나 즉시 색인을 보장하지 않습니다.

## 3. 우선 확인할 공식 진료 URL
- 홈페이지: `https://ejoeundental.com/` — 부평치과·청천동 실제 진료 위치
- 잇몸치료: `https://ejoeundental.com/gum-treatment.html` — 인천·부평 잇몸치료
- 신경치료 건강정보: `https://ejoeundental.com/root-canal-health.html` — 인천·부평 신경치료
- 재신경치료: `https://ejoeundental.com/retreatment.html` — 재신경치료·신경치료 후 통증
- 치경부마모증: `https://ejoeundental.com/cervical-abrasion.html`
- 건강보험 진료: `https://ejoeundental.com/insured-care.html`
- 진료시간·길찾기: `https://ejoeundental.com/visit-guide.html`

## 4. 실제 확인 결과 (계정 조회 전까지 미확인)
| 점검 항목 | 상태 | 실제 확인일·근거 |
|---|---|---|
| 정식 도메인 HTTPS 접속·canonical | 2026-10-25 실사이트 검사 통과 | GitHub Actions 읽기 전용 검사 |
| `www` → 정식 주소 301 | 2026-10-25 정상 확인 | 첫 화면·하위 경로·검색 매개변수 301 유지 |
| 네이버 정식 사이트 소유 확인 | 미확인 | 계정 내 확인 필요 |
| 네이버 정식 사이트맵 제출·처리 | 미확인 | 계정 내 확인 필요 |
| 네이버 핵심 URL 수집·색인 | 미확인 | 계정 내 확인 필요 |
| Google 정식 속성 소유 확인 | 미확인 | 계정 내 확인 필요 |
| Google 정식 사이트맵 제출·처리 | 미확인 | 계정 내 확인 필요 |
| Google 핵심 URL의 색인·표준 URL | 미확인 | 계정 내 확인 필요 |
| 임시 Pages 주소 noindex 응답 | 재확인 필요 | 최신 배포의 응답 헤더 검사 |

## 5. 최신 환자 교육 게시글 배포 점검
- **2026-10-25 재검사 결과:** 정식 도메인의 게시글 목록에서 **93/93편**이 중복 없이 노출되고, 대표 최신 글들의 제목·canonical·HTTP 200을 확인했습니다. 과거 실사이트 검사에서 집계한 **79편**은 당시 스냅샷입니다. 이 결과로 네이버·구글의 검색 색인을 단정할 수는 없습니다.
- `content/posts/*.json` 글이 바뀌면 GitHub Actions의 읽기 전용 `Public website build and quality verification` 검사를 자동으로 실행하여 **소스 게시글 수 대 실사이트 글 수**와 **최근 글 3편의 제목·canonical·HTTP 상태**를 비교합니다.
- 이 검사는 호스팅으로 파일을 직접 배포하거나 검색엔진에 수집 요청하지 않습니다. 실제 배포가 늦을 때는 Netlify 또는 현재 호스팅 연결과 배포 이력을 확인해야 합니다.

## 6. 운영 원칙
- 진료 사실에 근거한 **부평치과·인천/부평 잇몸치료·인천/부평 신경치료·재신경치료** 안내를 유지하되, 지역명을 나열한 유사 페이지를 대량 생산하지 않습니다.
- 홈페이지 내용 수정 → GitHub 빌드 → 실제 정식 주소 반영 확인 → 검색엔진 수집·색인 확인 순으로 평가합니다.
- 검색 색인은 완료 여부와 날짜를 기록할 때만 **완료**라고 적습니다.
- 도메인·DNS·Netlify 삭제, 유료 플랜 결제는 이 체크리스트로 실행하지 않습니다.

공식 참고: [네이버 사이트맵 제출 안내](https://help.naver.com/service/30010/contents/17705) · [Google 주소 변경 도구의 적용 제외 사례](https://support.google.com/webmasters/answer/9370220) · [Cloudflare www 리디렉션](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).
