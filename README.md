# 이조은치과 홈페이지

이 저장소는 이조은치과의 정적 홈페이지와 건강정보, 게시글을 관리합니다.

## 콘텐츠 편집
- 글 관리: Pages CMS (https://pagescms.org/)에서 GitHub 로그인 후 `kimtaehoon765/ejoeundental` 저장소 선택
- 홈페이지 기본 정보: `content/site.json`
- 치과 이야기: `content/posts/*.json`
- 글 대표 이미지: `assets/cms-images/`
- `published: true`인 글만 공개 페이지와 사이트맵에 포함됩니다.

## 빌드
- Node.js 22 권장
- 빌드 명령: `npm run build`
- 결과 폴더: `dist`
- 빌드 스크립트: `build.mjs`
- 생성 결과: 정적 페이지, 건강정보, 공개 게시글 상세 페이지, 게시글 목록 JSON, 사이트맵

## 정식 도메인 운영 및 남은 www 301 작업 (2026-10-23 검증)

GitHub Actions가 실제 `https://ejoeundental.com/`을 읽기 전용으로 검사해 **HTTP 200 / Cloudflare 응답 / canonical 일치 / 공개 페이지 및 검색·사이트맵 접속**을 확인했습니다. 최신 `main`의 미리보기·정식 도메인 기준 빌드 및 소스 품질 검사도 통과했습니다. 이 사실은 **실제 도메인이 온라인**이라는 뜻이지, Cloudflare Pages 프로젝트의 Git 연동이나 Netlify의 폐쇄 여부를 직접 확인했다는 뜻은 아닙니다.

**남은 항목:** `https://www.ejoeundental.com/`이 **HTTP 200으로 별도 열리고 301 이동하지 않음**. Cloudflare 영역의 리디렉션 규칙을 통해 `www` → `https://ejoeundental.com`으로 통일할 필요가 있습니다. GitHub의 HTML 또는 `_redirects` 편집만으로는 도메인 수준 규칙을 적용할 수 없습니다. 추가 과금 없이 적용 가능한 대시보드 절차 및 하위 경로·쿼리 검증은 **[www 301 설정 안내](docs/www-301-redirect.md)**를 참고하세요. **아직 Cloudflare 설정은 변경되지 않았습니다.**

Cloudflare Pages 빌드 설정(확인이 필요한 경우): `main`, 프레임워크 `None`, `npm run build`, 출력 폴더 `dist`, `NODE_VERSION=22`. [과거 이전 절차](docs/cloudflare-pages-migration.md)는 신규 프로젝트를 중복으로 만드는 용도가 아닙니다.

## Netlify 배포 설정 (소스 기준)
현재 확인된 `netlify.toml` 설정은 다음과 같습니다. 실제 Netlify 프로젝트의 연결·배포 성공 여부는 별도로 확인해야 합니다.

| 항목 | 소스 기준 설정 |
| --- | --- |
| GitHub 저장소 | `kimtaehoon765/ejoeundental` |
| 브랜치 | `main` (저장소 기본 브랜치, Netlify 연결 확인 필요) |
| 빌드 명령 | `npm run build` |
| 배포 디렉터리 | `dist` |
| Node.js | 22 |

Netlify 연결 및 도메인 이전 절차는 [Netlify 점검 안내](docs/netlify-cutover-guide.md)를 참고하세요.

## 정식 도메인·미리보기 주소 구분
정식 홈페이지 `https://ejoeundental.com`은 **이미 HTTPS로 서비스 중**이며, `build.mjs`의 기본 `SITE_PUBLIC_ORIGIN`도 정식 주소입니다. 별도 미리보기 빌드에서는 `SITE_PUBLIC_ORIGIN=https://ejoeundental.pages.dev`를 사용하며, 두 빌드의 SEO 메타데이터와 사이트맵은 각각 검사합니다.

도메인 관련 남은 작업은 **www → 비-www 301 통일**입니다. 이는 GitHub의 HTML이나 Pages `_redirects`로는 적용할 수 없고 Cloudflare 영역의 Redirect Rule에서 설정해야 합니다. [2026-10-23 도메인 실측과 운영 점검표](DOMAIN-MIGRATION-CHECKLIST.md) 및 [무료 www 301 안내](docs/www-301-redirect.md)와 [정식 도메인 네이버·구글 색인 점검표](docs/search-indexing-checklist.md)를 참고하세요. 변경 전 원본 Netlify 연결 상태를 확인하고 기존 DNS나 호스팅을 삭제하지 않습니다.

## 참고
- `/admin/`은 외부 Pages CMS 안내 페이지이며 자체 로그인 시스템이 아닙니다.
- 사진이나 글에 환자 개인정보를 게시하지 마세요.
- `netlify.toml`은 현재 저장소의 Netlify 배포 설정 파일입니다. 실제 Netlify 사이트와 연동되었는지는 별도 확인이 필요합니다.

## 원장 전용 자료 공개 주의
- 현재 `OWNER_LIBRARY_PRIVATE_READY`가 활성화되지 않은 빌드에서는 치과 기구·재료 및 장비 관리 HTML 파일이 `dist`에 복사되어 **공개 웹주소로 접근 가능**합니다. 메뉴에서 숨기거나 `noindex`를 설정하는 것은 비공개 보호가 아닙니다.
- 따라서 해당 페이지에는 환자 개인정보, 비밀번호, 계정정보, 내부 원가·계약정보 등 비공개 자료를 입력하지 마세요.
- 비공개 전환은 별도의 인증된 저장 공간에 자료를 이전하고, 로그인·직접 URL 접근 차단·백업을 검증한 후 진행해야 합니다. 확인 전에는 `OWNER_LIBRARY_PRIVATE_READY=1`을 설정하지 마세요.
- `OWNER_LIBRARY_MIGRATION_VERIFIED=YES_PRIVATE_COPY_AND_LOGIN_TESTED`는 실제 검증을 마친 경우에만 설정해야 합니다. 환경변수 자체는 보안을 제공하지 않습니다.
