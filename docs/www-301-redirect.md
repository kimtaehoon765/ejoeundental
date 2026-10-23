# www → 대표 도메인 301 리디렉션 설정 (Cloudflare)

**상태 (2026-10-23, GitHub Actions 실제 HTTPS 확인)**

- `https://ejoeundental.com/`: HTTP 200, canonical URL도 대표 주소와 일치.
- `https://www.ejoeundental.com/`: HTTP 200. **301 리디렉션은 아직 설정되지 않음.**
- DNS는 Cloudflare 네임서버를 사용하며, 이 문서만으로 DNS나 Cloudflare 규칙이 바뀌지는 않음.
- GitHub `main`의 빌드·SEO 품질 검사는 통과. 다만 Cloudflare 계정·도메인 규칙 수정 권한은 GitHub 소스 수정과 별개.

## 가장 간단한 적용: Cloudflare 대시보드의 단일 리디렉션

1. Cloudflare 대시보드에서 **ejoeundental.com** 영역(Zone)을 선택.
2. **Rules → Redirect Rules**에서 **Create rule → Redirect Rule** 선택 (화면 이름은 달라질 수 있음).
3. 규칙 이름: `www-to-apex-301`.
4. **Wildcard pattern**:
   - Request URL: `https://www.ejoeundental.com/*`
   - Target URL: `https://ejoeundental.com/${1}`
   - Status code: **301**
   - **Preserve query string: On**
5. 저장·배포 후, 일반 주소와 하위 페이지 두 가지를 반드시 점검.

**주의:** `https://ejoeundental.com/*` 쪽에서 `www`로 다시 돌리는 규칙을 추가하지 말 것(무한 리디렉션 위험). 기존 `www` DNS 및 SSL을 함부로 삭제하지 말 것. 이미 DNS가 프록시되어 실제로 응답하는 상태이므로 이 단계에서 DNS 변경은 필요하지 않을 수 있음.

## 검증 (읽기 전용)

```bash
curl -I 'https://www.ejoeundental.com/'
curl -I 'https://www.ejoeundental.com/gum-treatment?utm_source=test'
curl -I 'https://ejoeundental.com/gum-treatment'
```

예상 결과:

- 첫 번째: **301**, `Location: https://ejoeundental.com/`
- 두 번째: **301**, `Location: https://ejoeundental.com/gum-treatment?utm_source=test`
- 세 번째: 실제 진료 페이지가 **200**. 최종 대표 주소는 비-www.
- 상기 응답과 다른 경우 규칙을 확인해야 하며, `www`를 통한 기존 접속이 깨지지 않도록 해야 함.

GitHub Actions의 **Public website build and quality verification** 작업에서도 대표 도메인 접속과 www 응답을 읽기 전용으로 점검함. 다만 웹사이트 빌드 성공만으로 리디렉션 성공을 의미하지는 않음.

## 왜 HTML 파일이나 `_redirects`만으로 고치지 않나요?

Cloudflare Pages의 정적 `_redirects` 파일은 **도메인(hostname) 수준의 리디렉션을 지원하지 않음**. 따라서 모든 www 경로를 비-www 도메인으로 보내려면 Cloudflare Zone의 리디렉션 규칙(또는 공식 안내의 Bulk Redirects)이 필요함. `index.html`의 canonical만 변경해서 HTTP 301이 되지는 않음.

Cloudflare 공식 안내:

- https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/
- https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/
- https://developers.cloudflare.com/pages/how-to/www-redirect/
- https://developers.cloudflare.com/pages/configuration/redirects/
