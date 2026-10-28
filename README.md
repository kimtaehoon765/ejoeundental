# 이조은치과 홈페이지

## 현행 홈페이지 운영 기준 (원장 확인: 2026-10-28)

**현재 운영 기준은 GitHub → Cloudflare Pages → https://ejoeundental.com 입니다. Netlify가 아닙니다.**

- GitHub 저장소: `kimtaehoon765/ejoeundental`
- Pages 관련 주소: `https://ejoeundental.pages.dev` (미리보기 빌드 설정에 사용)
- 이전 서비스인 Netlify의 `netlify.toml` 파일과 가이드는 **과거 흔적**이며 현행 배포 서비스의 증거가 아닙니다.
- GitHub Actions에서 빌드가 성공해도 Cloudflare Pages 배포 성공과 실제 도메인 최신 반영은 별도 확인이 필요합니다.
- 이전 완료한 호스팅/도메인 작업을 반복하거나 네임서버·DNS를 임의 변경하지 않습니다.
- 프로젝트 작업 기준은 [AGENTS.md](AGENTS.md)를 먼저 확인해 주세요.

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

## 정식 도메인·검색용 사이트맵 운영 (2026-10-25 실서비스 확인)

GitHub Actions의 읽기 전용 실서비스 검사에서 `https://ejoeundental.com/`이 **HTTP 200**으로 응답하고 보안 헤더, 검색 대표주소(canonical), 로봇·사이트맵을 제공하는 것을 확인했습니다. 또한 `https://www.ejoeundental.com/` 요청은 현재 **HTTP 301**로 `https://ejoeundental.com/`으로 이동하고, 하위 경로와 검색 파라미터를 유지합니다. **www 301 작업은 확인 당시 이미 해결된 상태**이므로 추가 리디렉션 규칙을 중복 생성할 필요가 없습니다.

2026-10-25 검증에서 **홈페이지 내부 환자 교육 글 79/79편**, 원장 네이버 블로그 원문 링크 **333/333개**, 글 목록 `/stories.html`의 **79/79편**, 최근 충치치료 원고의 실제 URL과 작성자 표시를 확인했습니다. 검증 절차: `scripts/live-domain-check.mjs`, GitHub Actions `Public website build and quality verification`. 단, 실사이트 검사 결과는 그 시점의 상태이며 네이버·구글 색인 또는 검색 순위를 뜻하지 않습니다.

2026-10-25 최신 실사이트 재검사에서 환자 교육 게시글 **93/93편**이 정식 도메인 `/stories` 목록에 중복 없이 노출되고, 내부 글 3편의 제목·canonical·HTTP 200 응답을 확인했습니다. 이전 문단의 **79편**은 그 시각의 과거 실측 기록입니다. 이 실측은 네이버·구글 색인이나 순위가 아닌 **홈페이지 실제 공개 여부**를 뜻합니다. 새 글이 추가되면 GitHub Actions `Public website build and quality verification`에서 다시 점검합니다.

기존 `docs/www-301-redirect.md` 및 `DOMAIN-MIGRATION-CHECKLIST.md`는 **과거에 301이 미설정이던 상태의 기록**입니다. 현행 운영 상태보다 우선하여 적용하거나 DNS/호스팅을 임의로 변경하지 마세요. 당시에는 Cloudflare 네임서버와 중계 응답만으로 실제 원본 호스팅을 단정하지 않았으나, **현재 작업 기준은 원장이 이후 확인한 Cloudflare Pages 이전 기록**을 우선합니다. 단, 현재 시점의 실서비스 배포 여부는 별도로 확인해야 합니다.

## 과거 Netlify 설정 (현행 배포 서비스 아님)
아래는 이전 서비스 Netlify의 저장소 설정을 역사적 참고용으로 남긴 내용입니다. **현재 운영은 Cloudflare Pages 기준**이며, 파일이 존재한다는 이유로 Netlify에 재연결하거나 전환 작업을 다시 진행하지 마세요.

| 항목 | 소스 기준 설정 |
| --- | --- |
| GitHub 저장소 | `kimtaehoon765/ejoeundental` |
| 브랜치 | `main` (저장소 기본 브랜치, Netlify 연결 확인 필요) |
| 빌드 명령 | `npm run build` |
| 배포 디렉터리 | `dist` |
| Node.js | 22 |

과거 기록: [Netlify 점검 안내](docs/netlify-cutover-guide.md). 현재 작업에 적용하지 않습니다.

## 정식 도메인·미리보기 주소 구분
정식 홈페이지 `https://ejoeundental.com`은 **이미 HTTPS로 서비스 중**이며, `build.mjs`의 기본 `SITE_PUBLIC_ORIGIN`도 정식 주소입니다. 별도 미리보기 빌드에서는 `SITE_PUBLIC_ORIGIN=https://ejoeundental.pages.dev`를 사용하며, 두 빌드의 SEO 메타데이터와 사이트맵은 각각 검사합니다.

**www → 대표주소 301은 2026-10-25 실측에서 정상 확인**했습니다. 301 규칙을 다시 만들지 마세요. [이전 도메인 점검 기록](DOMAIN-MIGRATION-CHECKLIST.md)과 [정식 도메인 네이버·구글 색인 점검표](docs/search-indexing-checklist.md)를 참고하되, 색인 여부는 각 검색 서비스에서 별도로 확인해야 합니다. 원본 호스팅 설정과 DNS를 함부로 해제하지 않습니다.

## 참고
- `/admin/`은 외부 Pages CMS 안내 페이지이며 자체 로그인 시스템이 아닙니다.
- 사진이나 글에 환자 개인정보를 게시하지 마세요.
- `netlify.toml`은 **이전 Netlify 시절의 남은 설정**이며, 현행 Cloudflare Pages 운영을 대체하지 않습니다.

## 원장 전용 자료 공개 주의
- 현재 `OWNER_LIBRARY_PRIVATE_READY`가 활성화되지 않은 빌드에서는 치과 기구·재료 및 장비 관리 HTML 파일이 `dist`에 복사되어 **공개 웹주소로 접근 가능**합니다. 메뉴에서 숨기거나 `noindex`를 설정하는 것은 비공개 보호가 아닙니다.
- 따라서 해당 페이지에는 환자 개인정보, 비밀번호, 계정정보, 내부 원가·계약정보 등 비공개 자료를 입력하지 마세요.
- 비공개 전환은 별도의 인증된 저장 공간에 자료를 이전하고, 로그인·직접 URL 접근 차단·백업을 검증한 후 진행해야 합니다. 확인 전에는 `OWNER_LIBRARY_PRIVATE_READY=1`을 설정하지 마세요.
- `OWNER_LIBRARY_MIGRATION_VERIFIED=YES_PRIVATE_COPY_AND_LOGIN_TESTED`는 실제 검증을 마친 경우에만 설정해야 합니다. 환경변수 자체는 보안을 제공하지 않습니다.
