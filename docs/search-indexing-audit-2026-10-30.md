# 이조은치과 정식 홈페이지 검색 수집·색인 점검

기록일: 2026-10-30 (한국시간)
정식 사이트: https://ejoeundental.com
범위: 네이버·구글 검색 발견 가능성, 공식 사이트 수집 상태와 소유자 도구 후속 점검

## 현재 확인된 사실

- 사이트 운영: GitHub `kimtaehoon765/ejoeundental` → Cloudflare Pages → 정식 도메인 `ejoeundental.com`. Netlify로 오인하지 않는다.
- 2026-10-30 저장소 점검: `robots.txt`에 모든 공개 경로 `Allow: /`, `/admin/` 제외, 정식 사이트맵 `https://ejoeundental.com/sitemap.xml` 지정.
- 2026-10-29 GitHub Actions 실사이트 확인: 대표 URL·사이트맵 HTTP 200, 주요 진료 최종 경로 12/12, FAQ·의료안전·정보 경로 16/16, 원장 블로그 RSS 20편. 10월 29일 실제 수정한 12개 안내 페이지의 수정일도 공개 사이트맵에 반영 확인. 출처는 저장소 GitHub Actions 실행 결과.
- 2026-10-30 공개 검색 표본: `site:ejoeundental.com`, 정확한 도메인과 치과 이름 조합에 대한 제한된 검색에서는 정식 도메인 결과를 확인하지 못함. **이는 구글·네이버 색인 미완료의 증거가 아니며**, 실제 소유자 계정의 URL 검사/색인 보고서가 필요함.
- 외부 의료기관 비교 사이트 `local-dent.com/incheon/bupyeong/cheongcheon`에는 동일 주소(인천 부평구 세월천로 34, 305호) 및 전화번호(032-513-2875)의 **이-조은치과의원**이 있으나, 홈페이지 필드가 구 네이버 블로그 `https://blog.naver.com/kook765`로 표시됨. 이 내용은 네이버 스마트플레이스 등록 오류의 증거가 아니며, 비교 사이트 자체의 외부 기재 정보 문제.

## 우선 확인할 8개 대표 URL

아래 주소는 Cloudflare 정식 대표 경로(확장자 없는 canonical)를 사용한다. 등록 완료나 색인을 단정하지 않는다.

1. https://ejoeundental.com/
2. https://ejoeundental.com/doctor
3. https://ejoeundental.com/visit-guide
4. https://ejoeundental.com/gum-treatment
5. https://ejoeundental.com/retreatment
6. https://ejoeundental.com/insured-care
7. https://ejoeundental.com/pediatric-dentistry
8. https://ejoeundental.com/gallery

추가: https://ejoeundental.com/sitemap.xml (사이트맵, 개별 검색결과 페이지가 아님)

## 소유자 도구에서만 확인 가능한 상태

- **Google Search Console**: URL 검사에서 홈페이지 → 잇몸치료 → 재신경치료 순으로 `색인 생성 여부`, `Google이 선택한 표준 URL`, `마지막 크롤링 일자`, `차단/발견 상태`를 확인한다. 새로 등록했거나 실질적으로 바뀐 페이지에만 개별 색인 생성 요청을 사용하고 동일 URL을 반복 요청하지 않는다.
- **네이버 서치어드바이저**: `웹마스터도구 > 사이트 > 검증 > URL 검사`에서 `수집/색인`과 `Meta/SEO`를 확인한다. 이미 공식 도메인이 스마트플레이스에 등록된 이력을 재질문하거나 재등록하지 않는다. 최초 수집이 안 된 핵심 URL만 수집 요청을 검토한다.
- 검색 성과: 실제 검색 클릭·노출수·검색어는 각 소유자 도구의 성과 보고서가 필요하다. 공개 검색 표본으로 순위나 클릭수를 추정하지 않는다.

## 이번에 하지 않은 작업과 이유

- robots.txt, DNS, Cloudflare, canonical 재설정: 실사이트 검증에서 장애 증거가 없음.
- 동일 사이트맵 반복 제출, 85개+ 콘텐츠의 일괄 개별 재수집 요청: 검색엔진 공식 정책상 효과 보장 없고 불필요한 중복 조치.
- 외부 업체 로컬 치과 목록의 홈페이지 링크 변경: 외부 서비스의 관리 권한이 없으므로 임의 수정 또는 수정 완료 주장 불가.
- 블로그 원문 509편, 환자 안내, 지역명 및 건강정보, 그림 갤러리 23점: 보존.

## 공식 문서

- Google 재크롤링 및 URL 검사: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Google 사이트맵: https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- 네이버 URL 검사: https://searchadvisor.naver.com/guide/url-inspection
- 네이버 수집 요청 정책: https://searchadvisor.naver.com/guide/request-crawl
- 네이버 RSS·사이트맵 제출: https://searchadvisor.naver.com/guide/request-feed

*이 기록은 검색 준비도와 외부 검색 표본의 상태 기록이며 색인 완료 또는 검색 순위 보장이 아니다.*
