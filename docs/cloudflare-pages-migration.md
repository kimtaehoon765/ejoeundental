# Cloudflare Pages 무료 이전 실행 안내 (과거 이전 문서)

> **최신 운영 확인 (2026-10-27, GitHub Actions 점검):** 정식 홈페이지는 Cloudflare 네임서버에서 HTTP 200으로 응답하고, www → 비-www HTTP 301 및 경로·쿼리 유지도 확인되었습니다. Pages 임시 주소는 noindex 응답을 보냈습니다. 아래 마이그레이션/Netlify 관련 절차는 **과거 이관 기록**이며 현재 진행할 작업이 아닙니다. 기존 DNS나 프로젝트를 임의 변경하지 마세요. 상세 결과는 [정식 도메인 통일 검증](canonical-domain-redirect.md)을 확인하세요. 검색엔진 색인 여부는 별도 확인 대상입니다.

> 목표: Netlify의 배포 크레딧 소진에 영향받지 않고 GitHub의 이조은치과 홈페이지를 Cloudflare Pages에서 빌드·배포한다. 기존 Netlify/DNS는 새 사이트 검증 전 변경하지 않는다.

## 확정된 소스 정보
- GitHub: `kimtaehoon765/ejoeundental` (기본 브랜치 `main`)
- 프레임워크: 정적 Node.js 빌드 (프레임워크 프리셋: None)
- 빌드 명령: `npm run build`
- 빌드 결과 디렉터리: `dist`
- Node.js 버전: **22** (Cloudflare Pages 환경변수 `NODE_VERSION=22`)
- 정식 주소: `https://ejoeundental.com`

## 중단 없이 옮기는 순서
1. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git에서 GitHub 저장소 연결. 기존 프로젝트가 있다면 새로 만들지 말고 먼저 해당 프로젝트의 Git 연결·배포 상태 확인.
2. 위 빌드 설정으로 `*.pages.dev` 임시 주소에 먼저 배포. `SITE_PUBLIC_ORIGIN`은 **현 빌드 코드가 이를 실제로 사용하도록 수정·검증하기 전에는** 설정만으로 효과가 있다고 가정하지 않는다.
3. 임시 주소에서 첫 화면, 진료 페이지, 모바일 메뉴, 내부 링크, sitemap.xml, robots.txt, HTTPS를 검사한다.
4. SEO 주의: 현재 `build.mjs`는 생성 게시글·구조화 데이터·사이트맵에 `https://ejoeundental.pages.dev`를 직접 사용하는 코드가 있다. 실제 Pages 주소가 다르면 배포 전에 빌드 호스트 로직을 수정해야 한다. 정식 도메인 전환 때 canonical, og:url, JSON-LD, sitemap, robots가 `ejoeundental.com`으로 일치해야 한다.
5. Cloudflare Pages → Custom domains에서 `ejoeundental.com` 및 필요한 경우 `www.ejoeundental.com` 추가. **화면에 표시되는 실제 DNS 값만** 반영한다. Cloudflare DNS에 등록된 기존 레코드를 미리 삭제하지 않는다.
6. 인증서/도메인 상태가 Active인지 확인하고 사이트 접속·대표 주소 리디렉션·진료 페이지를 테스트한 뒤 이전 완료로 판정한다.
7. 네이버 서치어드바이저와 구글 서치콘솔에 정식 주소의 sitemap.xml을 확인·제출한다. Netlify는 새 사이트가 안정적으로 운영될 때까지 유지한다.

## 2026-10-23 과거 운영 확인 결과 (2026-10-27 검증이 우선)

GitHub Actions에서 **Cloudflare 네임서버와 정식 도메인 접속**을 실측함:
- `ejoeundental.com`: HTTP 200, HTTPS 정상, 홈페이지 및 공개 진료·건강정보·검색·사이트맵 접속. canonical이 비-www 대표 주소와 일치함.
- `www.ejoeundental.com`: HTTP 200으로 열리지만 **www → 비-www 301 리디렉션이 미설정**. Cloudflare Rules 대시보드의 영구 리디렉션 필요. **[www 301 설정 안내](www-301-redirect.md)**.
- 공개 건강정보 글·검색 기능의 최신 반영이 확인되었고, GitHub 정식 도메인 기준 빌드·SEO 감사가 통과함.

**여전히 계정 확인이 필요한 사항:** Cloudflare Pages 프로젝트 Git 연동 내역·배포의 정확한 소유 프로젝트, 이전 Netlify 서비스 잔존 여부, 실제 네이버·구글 검색엔진 색인 및 검색 순위. DNS·클라우드 설정은 수정하지 않았음.

### 과거 이전 단계의 주의점

위 1~7번 절차는 초기 마이그레이션용 기록입니다. 이미 정식 도메인이 정상 운영되고 있으므로 **Pages 프로젝트 재생성·네임서버 재교체·기존 DNS 일괄 삭제를 수행하지 마세요.** 2026-10-27 자동 점검에서 `www` 301 및 경로·쿼리 유지가 확인되었으므로 현재는 추가 설정하지 않습니다. 실제 운영에 장애가 발생했을 때만 최신 상태를 다시 검사하세요.

## 금지 사항
- 무료 이전을 위해 유료 업그레이드/결제 진행하지 않음.
- Netlify 사이트 삭제, 기존 DNS 삭제·교체, 도메인 이전을 검증 전에 진행하지 않음.
- `noindex`나 메뉴 숨김을 원장 전용 자료의 접근 통제로 간주하지 않음.
- 비밀번호·인증코드·환자정보를 공유하지 않음.
