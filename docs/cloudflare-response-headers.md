# Cloudflare Pages 응답 헤더 관리 (2026-10-23)

정식 홈페이지 주소: `https://ejoeundental.com/`. 공개 HTML·검색·치과 진료 페이지의 안전한 브라우저 동작과 검색 주소 일관성을 위해 GitHub 원본 `_headers` 파일을 `build.mjs`가 빌드 출력 `dist/_headers`로 복사합니다.

- **실제 서비스 도메인** `ejoeundental.com`은 공개 검색 대상이며 `X-Robots-Tag: noindex`를 적용하지 않습니다.
- **Cloudflare Pages 임시 주소** `ejoeundental.pages.dev` 및 브랜치 프리뷰 `<branch>.ejoeundental.pages.dev`는 `X-Robots-Tag: noindex`를 전달하도록 설정합니다. 공식 사이트 URL의 중복 색인을 막기 위한 조치로, 환자 콘텐츠의 공개 접근을 막는 기능은 아닙니다.
- 전체 정적 응답은 `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`를 선언합니다.
- `/sitemap.xml`, `/robots.txt`, `/content/*`는 재검증 캐시를 적용하고, `/assets/*`는 1시간 이내 새 파일 확인을 위한 캐시 정책을 설정합니다. 정적 HTML은 Pages 기본 재검증 정책을 유지합니다.
- Netlify에 별도로 배포한다면 기존 `netlify.toml`의 헤더 설정도 그대로 유지됩니다. Cloudflare의 `_headers`가 Netlify 설정을 자동 변경하지는 않습니다.

참고: Cloudflare Pages의 `_headers` 규칙은 **정적 파일 응답**에 적용되고 Pages Functions에서 직접 생성한 응답에는 적용되지 않습니다. 브라우저의 실제 응답 헤더는 배포 후 확인해야 합니다. `_headers`는 **www → non-www 301 리디렉션을 수행하지 못합니다.** 그 문제는 Cloudflare Redirect Rules에서 별도로 해결해야 합니다.

공식 문서: https://developers.cloudflare.com/pages/configuration/headers/

보안 주의: 위 응답 헤더는 `noindex`나 인증 기능을 대신하지 않습니다. 원장 전용 자료는 공개 저장소·정적 사이트가 아닌 별도의 인증된 공간에 보관해야 합니다.

2026-10-23 보강: `_headers`의 임시 주소 조건은 Cloudflare 공식 안내에 따른 `https://:project.pages.dev/*` 및 `https://:version.:project.pages.dev/*`로 지정했습니다. 이 규칙은 프로젝트 이름과 브랜치·배포 ID의 변화에도 적용되며, 일반 정식 도메인에는 매칭되지 않습니다. https://developers.cloudflare.com/pages/configuration/headers/
