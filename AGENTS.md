# 이조은치과 홈페이지 작업 기준 (AGENTS.md)

> 작업 전 반드시 읽기: 이 파일과 README.md 첫 부분을 확인한 뒤 변경할 것.

## 현행 운영 구조 · 2026-10-28 기준

- **원장 확인 운영 기준: GitHub `kimtaehoon765/ejoeundental` → Cloudflare Pages → 정식 홈페이지 `https://ejoeundental.com`.**
- 미리보기/Pages 관련 주소: `https://ejoeundental.pages.dev` (설정에 사용됨).
- `www.ejoeundental.com`은 대표 주소 `ejoeundental.com`으로 이동하도록 설정해 온 이력이 있음. 변경 전 실제 상태 확인.
- **Netlify는 이전 운영에 사용된 서비스**. 저장소에 `netlify.toml`과 Netlify 안내 문서가 남아 있어도, 이를 근거로 **현재 호스팅이 Netlify라고 단정하지 말 것**. 호스팅 이전을 새로 제안하거나 Netlify 설정을 수정하지 말 것.
- Cloudflare Pages 배포가 최신 커밋을 반영했는지는 GitHub 코드 변경이나 빌드 성공만으로 증명되지 않음. 배포 확인은 별도로 해야 함.
- DNS, 네임서버, Cloudflare Pages 프로젝트/도메인 연결을 원장 확인 없이 임의로 변경하지 말 것.

## 요청 처리 원칙

1. **기존에 완료한 이전 작업을 처음부터 다시 안내하지 말 것.** 이전 기록과 현재 설정을 먼저 확인.
2. GitHub의 코드 커밋, GitHub Actions 빌드 검사 통과, 실제 `ejoeundental.com` 배포 확인, 네이버/구글 검색 색인은 **각각 별개**로 보고.
3. 검색 최우선: 청천동/부평/인천 중심의 기존 지역 검색 문구, 진료 설명, 수백 편의 원장 블로그 링크, 사이트맵·canonical·SEO 정보를 임의 삭제하지 말 것.
4. 핵심 의료진 정보: **2003년부터 한자리에서, 고려대학교 의학박사(치과학 전공), 통합치의학과 전문의, 원장 직접 검진·진단 및 잇몸치료**, 자연치아 보존 우선.
5. 디자인은 미술관·모네풍, 흰 고양이 캐릭터 및 왼쪽 위 '이조은치과' 서명 선호. 모바일 예약·전화 버튼 가독성 유지.
6. 의료 내용은 실제 진료 기준을 벗어나지 않고, 과장이나 치료 결과 보장 문구 금지.
7. 작업 후 실제 바꾼 파일·검사 결과·실사이트 확인 여부를 정확히 구분하여 보고. '진행했다'고만 하지 말 것.

## 빠른 검증

- `npm run build:check` 및 관련 GitHub Actions 검사를 통해 코드와 산출물 확인.
- `scripts/test-museum-responsive.mjs`의 모바일 예약/FAQ/이미지 회귀 검사 유지.
- 정식 도메인/서비스 전환 이력은 README.md와 `scripts/live-domain-check.mjs` 참고.
