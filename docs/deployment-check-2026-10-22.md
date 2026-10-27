# 배포 전 점검 기록 (2026-10-22, 과거 자료)

> **현재 운영 지침이 아닙니다.** 당시 Netlify 검토 중 작성한 보존 기록입니다. 2026-10-27 점검에서 Cloudflare 서버의 대표 도메인 HTTP 200, www → 대표 도메인 HTTP 301, Pages 임시 주소 noindex가 확인되었습니다. 최신 내용은 [정식 도메인 검증](canonical-domain-redirect.md)을 따르세요. Netlify 관리 화면에서 추가 작업할 필요가 없습니다.

## 확인된 저장소 설정
- 저장소: kimtaehoon765/ejoeundental, 기본 브랜치 main.
- package.json: npm run build, npm run audit, npm run check:domain, npm run check:origin, npm run build:production:check 지원.
- netlify.toml: 빌드 명령 npm run build, 게시 디렉터리 dist, Node 20.
- index.html: 한국어 페이지 제목/설명, canonical, Open Graph, Naver/Google 소유 확인 태그, 치과 구조화 데이터 존재.
- 메인 설명에는 청천동·산곡동 및 잇몸치료·재신경치료·치경부마모증·건강보험 진료 반영.

## 컴퓨터 사용 전 자동으로 확정할 수 없는 항목
- 실제 Netlify 프로젝트의 GitHub 연동 상태 및 마지막 배포 성공 여부.
- ejoeundental.com의 DNS 등록업체, 이전 제한 해제 시각, 실제 연결 대상.
- 배포된 주소의 모바일 실기기 동작, 검색엔진 색인 여부.

## 컴퓨터 사용 가능 시 최소 확인 순서
1. Netlify 프로젝트에서 Site configuration > Build & deploy의 GitHub 저장소와 publish=dist 확인.
2. Deploys에서 최신 배포 상태 및 배포 URL 확인.
3. Domain management에서 ejoeundental.com 상태 및 안내된 DNS 값 확인. 기존 DNS는 확인 전 변경 금지.
4. 도메인 연결 후 https, www 리디렉션, 주요 페이지 및 모바일 메뉴 점검.
5. 네이버 서치어드바이저와 구글 서치콘솔에서 사이트맵/색인 확인.

## 안전 원칙
- 실제 DNS 변경, 결제, 서비스 이전은 현재 운영 상태와 대상 값 확인 후 수행.
- 환자 정보 및 원장 전용 비공개 자료를 공개 저장소에 올리지 않음.
- 검색 순위 상승은 보장할 수 없으며, 구조화 데이터와 검색 메타태그는 검색 노출을 돕는 요소임.
