# 이조은치과 정식 도메인 운영·최종 정리 점검표

기준: **2026-10-23 13:58 (KST)**, GitHub Actions의 읽기 전용 실제 접속 검사
(워크플로 실행: https://github.com/kimtaehoon765/ejoeundental/actions/runs/39903168953).

이 문서는 운영 상태를 기록하고 남은 작업을 안내합니다. 문서 수정이나 GitHub 커밋은 **DNS·Cloudflare 설정을 변경하지 않습니다.**

## 1. 실제 확인된 상태

- 대표 홈페이지 `https://ejoeundental.com/`: **HTTP 200**, HTTPS 접속 가능, 응답 서버 표시 `cloudflare`.
- 네임서버: `raina.ns.cloudflare.com`, `coen.ns.cloudflare.com`.
- `https://ejoeundental.com/robots.txt` 및 `/sitemap.xml`: **HTTP 200**, 정식 도메인 주소 기재.
- 주요 진료 페이지와 환자 FAQ: HTTPS 접속 및 canonical 경로 일치 확인.
- `/gum-treatment` 검색 제목·설명에 **인천 잇몸치료 / 부평 잇몸치료** 반영 확인.
- 홈페이지 **원장 네이버 블로그 30편(첫 8편 + 펼쳐보는 22편)**, 하단 의료기관 정보와 비급여 안내 링크 반영 확인.
- 없는 주소의 오류 응답: **HTTP 404** 확인.
- 최신 GitHub 빌드·품질 검증 워크플로: **통과**.

**구분:** 응답 헤더의 `cloudflare` 표시는 Cloudflare 경유를 의미합니다. 이것만으로 원본 호스팅 서비스가 Cloudflare Pages인지 Netlify인지까지 증명되지는 않습니다. 또한 기술적 접속 확인은 네이버·구글 검색 순위 보장을 의미하지 않습니다.

## 2. 남은 중요 작업: www 주소를 대표 주소로 301 이동

읽기 전용 검사에서 아래 둘 다 **HTTP 200**으로 열립니다.

- `https://ejoeundental.com/` — 대표 주소
- `https://www.ejoeundental.com/` — 별도 응답, **301 리디렉션 없음**
- `https://www.ejoeundental.com/gum-treatment?utm_source=redirect_check` — **301 리디렉션 없음**

**권장:** `www` 요청만 대표 주소 `ejoeundental.com`으로 301 전환하고, 기존 경로와 검색 파라미터는 보존합니다. 검색엔진용 canonical은 이미 대표 주소로 통일되어 있지만, 방문자·외부 링크 처리까지 일치시키는 마지막 작업입니다.

### Cloudflare 무료 Single Redirect 1개로 처리

Cloudflare 계정에서 **ejoeundental.com → Rules → Redirect Rules → Create rule**로 이동한 다음 다음 값을 사용합니다.

| 항목 | 설정 |
|---|---|
| 규칙 이름 | `www → 대표주소` |
| 방식 | **Wildcard pattern** |
| Request URL | `https://www.ejoeundental.com/*` |
| Target URL | `https://ejoeundental.com/${1}` |
| Status code | `301` |
| Preserve query string | **Enabled** |

위 규칙은 HTTPS `www`에만 적용되며, 대표 주소에는 적용되지 않아 리디렉션 반복을 막습니다. `http://www...`는 기존 사이트의 HTTP→HTTPS 규칙이 처리하는지 별도로 확인합니다. **Cloudflare 무료 플랜에도 Single Redirect가 제공되므로 별도 유료 상품 신청은 필요하지 않습니다.**

공식 참고:
- https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/
- https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/
- https://developers.cloudflare.com/rules/url-forwarding/

### 설정 후 검증

1. `https://www.ejoeundental.com/` 요청에 **301**과 `Location: https://ejoeundental.com/`가 나오는지 확인합니다.
2. `https://www.ejoeundental.com/gum-treatment?utm_source=redirect_check`도 **301** 후 `https://ejoeundental.com/gum-treatment?utm_source=redirect_check`로 가는지 확인합니다.
3. `https://ejoeundental.com/`와 `/gum-treatment`는 이전과 같이 **200**이어야 합니다.
4. 이후 GitHub Actions의 **Check live domain, DNS and indexing entry points (read-only)** 결과에서 `www HTTPS 연결`과 `www 하위 경로·쿼리 리디렉션` 항목을 다시 확인합니다.

## 3. 기존 Netlify 정리는 원본 연결 확인 후

- Cloudflare Pages 대시보드의 해당 프로젝트 **Custom domains**에서 정식 도메인 연결이 `Active`인지 확인합니다.
- `ejoeundental.pages.dev`에서 최신 페이지와 이미지가 제공되는지 확인하고 정식 도메인의 콘텐츠와 대조합니다.
- 필요한 TXT/MX/DNS 레코드를 확인하지 않은 상태에서 네임서버·DNS를 새로 바꾸지 않습니다.
- 정식 도메인이 실제로 Cloudflare Pages에 연결되었다는 것을 확인하기 전까지 **Netlify를 임의로 해제하거나 삭제하지 않습니다.**
- 정식 도메인 아래에서 301/HTTPS/대표 주소·사이트맵을 검증한 후에만 불필요한 예전 호스팅 설정을 정리합니다.

## 4. 소스 품질 검사 명령

- `npm run build:production:check`: **정식 주소** `https://ejoeundental.com` 기준 빌드·SEO 품질 검사.
- `npm run build:preview:check`: **미리보기** `https://ejoeundental.pages.dev` 기준 빌드·SEO 품질 검사.
- `npm run check:domain`: 코드·주소 설정을 읽기 전용 점검.
- `node scripts/live-domain-check.mjs`: 실서비스의 HTTPS/DNS/검색 접근 경로를 **읽기 전용** 점검.

**변경 금지 원칙:** 검증 없이 DNS 전환, 호스팅 삭제, 유료 서비스 추가, 이미 제공 중인 대표 주소 변경을 진행하지 않습니다.
