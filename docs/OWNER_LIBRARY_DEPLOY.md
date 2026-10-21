# 원장 전용 자료실 배포 안내

## 준비된 코드

`node scripts/build-owner-library.mjs`를 실행하면 `.private-dist/`에 장비·재료 참고자료 20개, 목록·파일명 검색, 색인 차단 설정이 생성됩니다. 공개 환자용 `npm run build`와는 별개입니다.


## 무료 서버 측 비밀번호 보호 구현 (2026-10)

빌드 결과의 `_worker.js`는 Cloudflare Pages Functions 고급 모드에서 **모든 요청을 검사**합니다. 인증 전에는 HTML, JSON 검색 색인, 점검대장 등 어떤 파일도 반환하지 않습니다. 비밀번호가 설정되지 않았거나 16자 미만이면 HTTP 503으로 전체 차단됩니다.

- **별도의 Cloudflare Pages 프로젝트**를 만들고 빌드 명령을 `npm run build:owner`, 출력 폴더를 `.private-dist`로 설정합니다. **기존 환자용 Pages 프로젝트를 변경하지 마세요.**
- 새 프로젝트의 환경 변수에서 `OWNER_USERNAME`(예: `owner`)을 설정하고, `OWNER_PASSWORD`는 **암호화된 Secret**으로 설정합니다. **16자 이상 고유 비밀번호**를 사용하고 GitHub 파일이나 채팅에 쓰지 마세요.
- 실제 배포 전에는 프로젝트의 무료 사용량 한도와 Cloudflare 계정에 결제 수단이 필요한지 확인하세요. 유료 옵션은 선택하지 않습니다.
- HTTPS에서만 사용하세요. 기본 인증(Basic Auth)은 브라우저가 로그인 정보를 보관할 수 있으며 명시적인 로그아웃 기능이 없습니다. 공용 PC에서 사용하지 마세요.
- 비로그인 상태에서 `/`, `/search-index.json`, `/equipment-log.html` 각각 HTTP 401인지 검사하세요. 비밀번호 없이 200 응답이 나오면 **즉시 배포 중단**하세요.
- **주의:** 기존 공개 Git 저장소의 원본 파일과 이전 커밋은 여전히 공개되어 있습니다. 새 프로젝트의 비밀번호는 새 URL을 보호할 뿐 과거 공개 이력을 지우지 않습니다. 민감한 환자정보는 넣지 마세요.

## 공개 금지 — 반드시 먼저 인증 설정

생성된 파일은 **아직 비밀번호 보호가 없습니다**. `.private-dist`를 기존 공개 사이트나 공개 Pages 프로젝트에 업로드하지 마세요.

1. Cloudflare 등에서 **별도 비공개 호스팅 프로젝트**를 만듭니다.
2. Cloudflare Access 등의 **서버 측 접근 제어**를 사이트의 모든 경로(`/*`)에 적용하고 원장 이메일만 허용합니다. 비밀번호 또는 이메일 일회용 코드 인증을 사용합니다.
3. 로그아웃 브라우저에서 홈페이지뿐 아니라 `dental-equipment.html`, `equipment-log.html` 직접 접근도 차단되는지 검사합니다.
4. `node scripts/build-owner-library.mjs`를 실행하고 `.private-dist`를 **인증된 프로젝트에만** 배포합니다.
5. 내부 검색과 20개 자료 링크를 검사합니다. 기존 `equipment-log.html`의 브라우저 로컬 데이터는 새 도메인으로 자동 이전되지 않으므로 기존 주소에서 CSV를 백업합니다.
6. 검증을 마친 뒤에만 공개 사이트 배포 환경의 `OWNER_LIBRARY_PRIVATE_READY=1` 및 `OWNER_LIBRARY_MIGRATION_VERIFIED=YES_PRIVATE_COPY_AND_LOGIN_TESTED`를 설정합니다.

> 참고: 현재 검색은 문서 **제목/파일명** 검색입니다. 본문 전체 검색은 아직 지원하지 않습니다. 임상 참고자료의 전체 분류도 아직 진행 중입니다.

> `noindex`, `robots.txt`, `_headers`는 검색 노출 방지 수단이지 로그인 보안이 아닙니다. 공개 Git 기록에 있는 과거 내용은 남을 수 있습니다.
