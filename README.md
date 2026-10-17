# 이조은치과 홈페이지 (편집 가능한 버전)

- 공식 주소: https://ejoeundental.com
- 글 관리: https://pagescms.org/ (GitHub 로그인 후 `kimtaehoon765/ejoeundental` 선택)
- 홈페이지 첫 화면 및 기본 정보: `content/site.json`
- 치과 이야기: `content/posts/*.json`
- Netlify 빌드: `npm run build`, 배포 폴더: `dist`

## 최초 연결 순서
1. GitHub 저장소에 **압축을 푼 폴더 안의 파일/폴더들**을 업로드합니다. ZIP 파일 자체를 올리지 마세요.
2. Netlify에서 새 **테스트 사이트**를 GitHub 저장소와 연결해 먼저 작동을 확인합니다. 기존 ejoeundental.com 사이트는 바로 변경하지 않습니다.
3. 테스트 후 기존 사이트의 Git 배포 연결을 설정하거나 도메인을 신중히 이전합니다. Netlify에서 사이트를 삭제하거나 도메인을 해제하지 마세요.
4. Pages CMS에 GitHub로 로그인해 저장소를 선택합니다. GitHub 접근 권한 승인이 필요할 수 있습니다.
5. 글을 수정해 저장하면 GitHub에 커밋되고 Netlify가 자동 배포합니다.

## 참고
- Pages CMS는 **외부 관리 서비스**입니다. 이 프로젝트의 `/admin/`은 Pages CMS로 안내하는 페이지이며 자체 로그인 시스템은 아닙니다.
- 치과 사진은 아직 추가하지 않았습니다. 화면을 촬영한 사진 대신 원본을 준비하면 교체할 수 있습니다.
- 관리자에 등록된 새 글은 빌드할 때 개별 페이지와 목록에 자동 반영됩니다.
- 글/이미지에 환자 개인정보를 게시하지 마세요.
