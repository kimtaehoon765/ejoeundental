# 이조은치과 홈페이지

이 저장소는 이조은치과의 정적 홈페이지와 건강정보, 게시글을 관리합니다.

## 콘텐츠 편집
- 글 관리: Pages CMS (https://pagescms.org/)에서 GitHub 로그인 후 `kimtaehoon765/ejoeundental` 저장소 선택
- 홈페이지 기본 정보: `content/site.json`
- 치과 이야기: `content/posts/*.json`
- 글 대표 이미지: `assets/cms-images/`
- `published: true`인 글만 공개 페이지와 사이트맵에 포함됩니다.

## 빌드
- Node.js 20 이상
- 빌드 명령: `npm run build`
- 결과 폴더: `dist`
- 빌드 스크립트: `build.mjs`
- 생성 결과: 정적 페이지, 건강정보, 공개 게시글 상세 페이지, 게시글 목록 JSON, 사이트맵

## Netlify 배포 설정 (소스 기준)
현재 확인된 `netlify.toml` 설정은 다음과 같습니다. 실제 Netlify 프로젝트의 연결·배포 성공 여부는 별도로 확인해야 합니다.

| 항목 | 소스 기준 설정 |
| --- | --- |
| GitHub 저장소 | `kimtaehoon765/ejoeundental` |
| 브랜치 | `main` (저장소 기본 브랜치, Netlify 연결 확인 필요) |
| 빌드 명령 | `npm run build` |
| 배포 디렉터리 | `dist` |
| Node.js | 20 |

Netlify 연결 및 도메인 이전 절차는 [Netlify 점검 안내](docs/netlify-cutover-guide.md)를 참고하세요.

## 도메인 이전
목표 정식 주소는 `https://ejoeundental.com`입니다. 일부 빌드 스크립트에는 과거 Cloudflare 미리보기 주소 `https://ejoeundental.pages.dev`가 기본값으로 남아 있습니다. 이 주소를 현재 Netlify 배포 주소로 간주하지 마세요. 정식 도메인 연결 전에 Netlify 실제 배포 주소와 `SITE_PUBLIC_ORIGIN` 값을 확인해야 합니다. DNS 설정은 기존 서비스 상태를 검증하기 전 변경하지 않습니다.

## 참고
- `/admin/`은 외부 Pages CMS 안내 페이지이며 자체 로그인 시스템이 아닙니다.
- 사진이나 글에 환자 개인정보를 게시하지 마세요.
- `netlify.toml`은 현재 저장소의 Netlify 배포 설정 파일입니다. 실제 Netlify 사이트와 연동되었는지는 별도 확인이 필요합니다.

## 원장 전용 자료 공개 주의
- 현재 `OWNER_LIBRARY_PRIVATE_READY`가 활성화되지 않은 빌드에서는 치과 기구·재료 및 장비 관리 HTML 파일이 `dist`에 복사되어 **공개 웹주소로 접근 가능**합니다. 메뉴에서 숨기거나 `noindex`를 설정하는 것은 비공개 보호가 아닙니다.
- 따라서 해당 페이지에는 환자 개인정보, 비밀번호, 계정정보, 내부 원가·계약정보 등 비공개 자료를 입력하지 마세요.
- 비공개 전환은 별도의 인증된 저장 공간에 자료를 이전하고, 로그인·직접 URL 접근 차단·백업을 검증한 후 진행해야 합니다. 확인 전에는 `OWNER_LIBRARY_PRIVATE_READY=1`을 설정하지 마세요.
- `OWNER_LIBRARY_MIGRATION_VERIFIED=YES_PRIVATE_COPY_AND_LOGIN_TESTED`는 실제 검증을 마친 경우에만 설정해야 합니다. 환경변수 자체는 보안을 제공하지 않습니다.
