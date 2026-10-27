# 이조은치과 정식 도메인 검색 주소 통일

## 2026-10-27 23:15 KST 마지막 자동 실서버 검증 (현재 확인된 상태)

GitHub Actions **Public website build and quality verification** 실행 40519319294의 읽기 전용 점검에서 아래 결과가 확인되었습니다. 날짜 이후 Cloudflare 대시보드 설정이 바뀌었을 가능성이 있으므로 영구 보장을 의미하지 않습니다.

- 대표 주소 `https://ejoeundental.com/`: **HTTP 200**, Cloudflare 서버, 검색엔진 차단 헤더 없음
- `https://www.ejoeundental.com/`: **HTTP 301** → `https://ejoeundental.com/` (설정 정상)
- `https://www.ejoeundental.com/gum-treatment?utm_source=redirect_check`: **HTTP 301**, 경로·쿼리를 그대로 보존해 비-www로 이동
- `/robots.txt` 및 `/sitemap.xml`: **HTTP 200**, 정식 도메인 사이트맵 안내 확인
- `ejoeundental.pages.dev`: **HTTP 200 + noindex**, 정식 주소를 canonical로 표시
- Cloudflare 네임서버 두 개가 확인됨

**따라서 www 리디렉션을 지금 다시 생성하거나 DNS·Cloudflare Pages 프로젝트를 재설정할 필요가 없습니다.** 아래는 과거 장애 재발 시에만 활용할 기록입니다. 실제 Google·Naver 검색 순위 및 색인 상태는 이 HTTP 검사만으로 판단할 수 없습니다.

## 2026-10-23 과거 점검 기록 (당시 www 301 미설정)
- 공식 대표 주소: `https://ejoeundental.com`.
- 2026-10-23 기준 GitHub Actions 라이브 검증에서 `https://www.ejoeundental.com/`은 HTTP 200으로 응답했고, 대표 도메인으로 301 이동하지 않았습니다.
- 루트 도메인과 www 도메인이 동시에 200으로 응답하면 검색엔진에 중복 URL 신호를 보낼 수 있습니다.
- 페이지 내 canonical은 공식 도메인으로 설정되어 있으나, 이것만으로 www 주소의 301 리디렉션이 완성되는 것은 아닙니다.
- GitHub 소스 수정이나 Pages `_redirects` 파일로 **호스트별(www→루트) 리디렉션을 보장할 수 없습니다.** Cloudflare 대시보드의 도메인 규칙이 필요합니다.

## 다시 301이 사라질 때만 적용하는 복구 방법 (Cloudflare 계정 권한 필요)
1. Cloudflare에서 `ejoeundental.com` 영역을 선택합니다.
2. **Rules → Redirect Rules → Create rule (Single Redirect)**를 선택합니다.
3. 규칙 이름: `www-to-apex-301`.
4. 일치 조건: **Hostname equals `www.ejoeundental.com`** 또는 Expression:
   ```
   (http.host eq "www.ejoeundental.com")
   ```
5. 동작: Dynamic URL redirect, Target URL expression:
   ```
   concat("https://ejoeundental.com", http.request.uri.path)
   ```
6. Status code: `301`. **Preserve query string** 활성화.
7. 저장/배포합니다. 설정 후 `https://www.ejoeundental.com/gum-treatment?q=test` 가 `https://ejoeundental.com/gum-treatment?q=test` 로 이동하는지 확인합니다.

**주의:** 기존 DNS, Netlify, Cloudflare Pages 배포를 삭제하거나 도메인 네임서버를 바꾸지 마세요. 특히 www는 현재 HTTPS로 접속되므로 확인 없이 DNS 레코드를 교체하지 않습니다. 신규 결제나 유료 업그레이드는 필요하지 않습니다.

## 확인 방법
GitHub 저장소 → Actions → **Public website build and quality verification** → 최신 실행 → **Check live domain, DNS and indexing entry points (read-only)** 항목을 확인합니다.
- `www HTTPS 연결: 대표 주소 통일`이면 리디렉션이 정상입니다.
- `www HTTPS 연결: 추가 설정 필요`이면 대시보드의 리디렉션 규칙을 다시 점검합니다.
- 그 외에 `검색엔진 sitemap`의 핵심 진료 최종 URL `4/4`와 각 진료 페이지의 canonical 일치 여부를 확인합니다.

## 공식 문서
- Cloudflare, Redirect from WWW to root: https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/
- Cloudflare, Create a Redirect Rule: https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/
- Cloudflare Pages `_redirects`는 도메인 단위 리디렉션을 지원하지 않음: https://developers.cloudflare.com/pages/configuration/redirects/

**검색 순위와 색인 여부:** 라이브 사이트에 접근 가능하다는 사실은 네이버·구글에 색인되었다는 의미가 아닙니다. 검색 클릭수·노출수와 실제 색인상태는 각각 네이버 서치어드바이저, 구글 서치콘솔에서 확인합니다.
