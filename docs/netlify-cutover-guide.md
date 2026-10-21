# Netlify 배포·도메인 연결 확인 가이드

> 2026-10-22 GitHub 소스 설정 기준. 이 문서는 **설정값 안내**이며 Netlify 실서비스 상태를 확인했다는 뜻은 아닙니다.

## 확인된 소스 설정
- GitHub 저장소: `kimtaehoon765/ejoeundental`, 배포 브랜치 후보: `main`
- `netlify.toml`: `npm run build` / `dist` / Node.js 22
- 정식 도메인 목표: `ejoeundental.com`
- `package.json`의 사전 점검: `npm run build:check`, `npm run check:domain`, `npm run build:production:check`

## 배포 확인 순서
1. Netlify 사이트 대시보드에서 연결된 GitHub 저장소와 브랜치 확인.
2. 최근 Deploys 상태가 Published인지 확인. 실패했다면 배포 로그에서 첫 오류부터 점검.
3. Deploy settings의 build command가 `npm run build`, publish directory가 `dist`인지 확인.
4. Netlify 기본 서브도메인에서 홈페이지와 핵심 진료 페이지를 확인.
5. Domain management에서 정식 도메인의 DNS 지시값 확인. **실제 화면에 표시된 값만** DNS 관리 업체에 입력. 추정 IP/CNAME 사용 금지.
6. HTTPS 인증서 발급 완료와 apex/www 중 대표 주소 리디렉션을 확인.
7. 정식 도메인 연결 후, 배포 빌드가 `SITE_PUBLIC_ORIGIN=https://ejoeundental.com` 기준으로 canonical, sitemap, robots 및 구조화 데이터를 출력하는지 검증.
8. 마지막으로 네이버 서치어드바이저와 구글 서치콘솔에서 사이트맵 제출·색인 확인.

## 주의할 차이
- 기존 README에는 Cloudflare Pages 설정과 `pages.dev` 미리보기 주소가 기록되어 있음. 이는 **Netlify 실제 연결 상태의 증거가 아님**.
- `scripts/domain-readiness.mjs`의 안내문에도 Cloudflare라는 표현이 남아 있으므로 배포 플랫폼을 판단할 때 그대로 믿지 말 것.
- 정식 도메인으로 빌드할 경우 `SITE_PUBLIC_ORIGIN` 환경변수를 확인해야 함. 도메인 DNS 연결만으로 메타태그와 사이트맵이 자동으로 올바르게 바뀐다고 가정하지 말 것.
- 기존 사이트가 정상 동작하는 동안 DNS를 임의로 변경하지 말 것.
- 원장 전용 자료의 비공개 여부는 로그인과 직접 URL 접근 차단을 별도로 검증할 것.

## 원장님이 컴퓨터를 쓸 때 필요한 최소 정보
Netlify **Deploys 화면**과 **Domain management 화면**의 상태만 확인하면 다음 단계로 진행할 수 있음. 비밀번호나 인증 코드는 공유하지 않아도 됨.
