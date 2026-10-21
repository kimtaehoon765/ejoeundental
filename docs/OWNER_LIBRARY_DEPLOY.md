# 원장 전용 자료실 배포 안내

## 준비된 코드

`node scripts/build-owner-library.mjs`를 실행하면 `.private-dist/`에 장비·재료 참고자료 20개, 목록·파일명 검색, 색인 차단 설정이 생성됩니다. 공개 환자용 `npm run build`와는 별개입니다.

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
