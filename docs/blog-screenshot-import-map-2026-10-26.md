# 2026-10-26 원장 블로그 화면 11편 · 홈페이지 반영 기록

자료: 원장이 이번 대화에서 제공한 네이버 블로그 캡처 **11개 원고 / 57장 사진**. 기존 공개 글·진료 안내와 주제 중복을 비교함. 모든 원문을 기계적으로 복제하지 않고, 환자 질문에 따라 기존 글 보완 + 독립 검색 의도가 분명한 새 글 발행.

| 순서 | 제공된 네이버 블로그 제목 | 정리·반영 대상 | 처리 |
|---|---|---|---|
| 1 | 인천 부평구 청천동 잇몸치료 잇몸에 통증이 있어요 | `2026-10-24-bupyeong-gum-pain-gingivitis-periodontitis.json` · `gum-treatment.html` | 기존 잇몸 통증 진단 글로 통합. 불특정 통증을 치주염으로 단정하지 않음 |
| 2 | 인천잇몸치료 양치할 때 피가 나요 | `2026-10-24-bupyeong-swollen-bleeding-gums-visit-dentist.json` · `health/gum-bleeding.html` | 출혈의 감별·관리 이미 설명된 기존 글 활용 |
| 3 | 청천동 치과 잇몸치료 잘하는 곳 잇몸이 안 아픈데도 심각하다네요 | `2026-10-25-incheon-choosing-periodontal-clinic-what-to-check.json` | 통증 없이 진행하는 치주염·검사 기준과 합침. 진료기관에 대한 단정적 비난 제외 |
| 4 | 청천동 잇몸치료 치아는 좀 흔들리지만 아프지는 않습니다. 치료해야 될까요? | `2026-10-25-incheon-loose-tooth-suddenly-periodontal-exam.json` | **기존 글에 무통성 치아 흔들림과 감별·보존 판단 문단 보완** |
| 5 | 산곡동잇몸치료 치과의사가 해야 하는 잇몸치료 | `2026-10-25-incheon-choosing-periodontal-clinic-what-to-check.json` | 치주낭 검사·치근면 치료·시행자 역할 설명으로 통합 |
| 6 | 청천동잇몸치료 치과의사가 해야 하는 잇몸치료 | 위의 잇몸치료 선택 글 · `gum-treatment.html` | 5번과 대체로 중복. **원장 직접 진료 원칙을 사실 중심으로 보완** |
| 7 | 부평 치아 스케일링 잇몸치료 | `2026-10-25-incheon-choosing-periodontal-clinic-what-to-check.json` · `scaling.html` | 스케일링과 치근활택술 차이·설명 질문으로 통합 |
| 8 | 부평잇몸치료 치주질환 | `2026-10-26-bupyeong-periodontitis-diabetes-heart-link-evidence.json` | **새 글 발행**. 당뇨와 치주염 상호 영향·심혈관질환 관찰 관련성. 2025 AHA 과학적 성명 및 CDC 확인하여 인과관계 단정 제거 |
| 9 | 인천 부평스케일링 잘하는 곳 치과의사 잇몸치료 | `2026-10-24-sangok-scaling-gargle-anesthesia-pain-control.json` | 가글마취·치아 시림과 진료기술은 기존 상세 글로 통합. 마취제 효능·안전성 과장 제외 |
| 10 | 인천 부평 잇몸치료 치과 스케일링 | `2026-10-25-incheon-periodontal-maintenance-after-treatment.json` | **연말 보험 스케일링과 치료 필요성 차이 추가**, 유지관리 문단 보완 |
| 11 | 청천동스케일링 치과의사 직접 잇몸치료 | `2026-10-26-bupyeong-scaling-teeth-gaps-look-wider.json` | **새 글 발행**. 스케일링 뒤 치아 사이 공간이 커져 보이는 문제를 독립 환자 질문으로 구성 |

## 반영 방식과 품질 원칙

- 직접 게시: **새 환자 교육 글 2편** (`published:true`). 빌드가 `/stories/<파일명>/` 경로, `stories.html`, 메인 최신 글, 검색 색인과 XML 사이트맵에 통합.
- 보완: 기존 교육 글 **3편**(`updated:2026-10-26`). 잇몸 건강정보 허브 `gum-health.html`, `scaling.html`, `gum-treatment.html`에서 새 글·연관 글에 내부 링크 추가.
- 반복되는 '스케일링 vs 잇몸치료', '잇몸 출혈', '원장 직접 치주치료' 내용을 별도 게시글 11개로 중복 발행하지 않음.
- 사용자 제공 57장 파일은 **블로그 화면 캡처**이므로 공개 환자교육 삽화로 직접 업로드하지 않음. 휴대전화 메뉴·다른 웹사이트 UI를 홈페이지에 게시하지 않는다. 그림이 필요하면 환자 설명에 맞는 별도 제작/원본 사용.
- 출처가 확인되지 않은 Naver 원문 URL은 **생성하지 않음**; 두 새 글의 `source_url`은 빈 문자열로 유지. 확보한 원문 링크는 기존 `clinical-archive.html`에 보존.
- 타 의료기관의 경력·수익·직원 업무에 대한 일률적 비난 삭제; 보험 적용은 실제 진단과 당시 급여 기준에 따름.
- 치주질환과 심혈관질환의 **연관성을 인과관계로 바꾸지 않음**. 참고: American Heart Association 2025-12 과학적 성명, CDC 2024 diabetes and oral health 안내.
- 검증: GitHub CI 상태 확인 및 실제 운영 사이트 배포·새 URL의 응답 상태 확인이 별도로 필요. CI 성공이 Google 색인 또는 검색 순위 상승을 의미하지 않는다.
