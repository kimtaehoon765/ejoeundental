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

## Cloudflare Pages 배포 설정 (확인용)
Cloudflare Pages에서 이 GitHub 저장소를 연결해 배포하는 경우 다음 설정을 사용합니다.

| 항목 | 값 |
| --- | --- |
| GitHub 저장소 | `kimtaehoon765/ejoeundental` |
| 프로덕션 브랜치 | `main` |
| 프레임워크 프리셋 | None |
| 빌드 명령 | `npm run build` |
| 빌드 출력 디렉터리 | `dist` |
| 루트 디렉터리 | 저장소 루트 |
| Node.js | 20 이상 |

**주의:** 이 문서는 필요한 설정값을 기록한 것이며, Cloudflare 계정에서 실제로 연결되었거나 배포가 성공했다는 뜻은 아닙니다. 실제 배포 상태는 Cloudflare Pages의 Deployments에서 확인해야 합니다.

## 도메인 이전
현재 코드의 미리보기 기준 주소는 `https://ejoeundental.pages.dev`입니다. 이 주소가 실제로 열리는지는 별도로 검증해야 합니다. 정식 도메인 `ejoeundental.com`의 DNS와 연결은 **사이트 기능 및 배포 검증을 마친 뒤 마지막 단계에서** 진행합니다. 배포 확인 전에는 기존 도메인 설정을 변경하지 않습니다.

## 참고
- `/admin/`은 외부 Pages CMS 안내 페이지이며 자체 로그인 시스템이 아닙니다.
- 사진이나 글에 환자 개인정보를 게시하지 마세요.
- `netlify.toml`은 이전 배포 방식의 설정 파일이며, Cloudflare Pages의 빌드 설정은 위 표를 기준으로 확인합니다.

## 원장 전용 자료 공개 주의
- 현재 `OWNER_LIBRARY_PRIVATE_READY`가 활성화되지 않은 빌드에서는 치과 기구·재료 및 장비 관리 HTML 파일이 `dist`에 복사되어 **공개 웹주소로 접근 가능**합니다. 메뉴에서 숨기거나 `noindex`를 설정하는 것은 비공개 보호가 아닙니다.
- 따라서 해당 페이지에는 환자 개인정보, 비밀번호, 계정정보, 내부 원가·계약정보 등 비공개 자료를 입력하지 마세요.
- 비공개 전환은 별도의 인증된 저장 공간에 자료를 이전하고, 로그인·직접 URL 접근 차단·백업을 검증한 후 진행해야 합니다. 확인 전에는 `OWNER_LIBRARY_PRIVATE_READY=1`을 설정하지 마세요.
- `OWNER_LIBRARY_MIGRATION_VERIFIED=YES_PRIVATE_COPY_AND_LOGIN_TESTED`는 실제 검증을 마친 경우에만 설정해야 합니다. 환경변수 자체는 보안을 제공하지 않습니다.
