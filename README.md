# LocalService Platform

전국 출장서비스 업체의 작업사례와 지역·업종 정보를 하나의 도메인에 축적하는 콘텐츠 플랫폼입니다.

## MVP
- 메인 포털
- 지역/업종 게시판
- 게시글 상세
- 업체 프로필
- 관리자/작업자 CMS
- 게시글 작성·검수·승인·게시
- SEO 메타데이터, 사이트맵, RSS 자동화

개발/시험 도메인: gongsa8282.xyz

## 1차 공개 화면 구현

Node.js 22 이상에서 외부 패키지 설치 없이 실행합니다.

```sh
npm run dev
# http://localhost:8787
npm run check
npm test
```

- 모바일 우선 메인, 지역 게시판, 업종 게시판, 숫자 ID 게시글 상세, 업체 프로필
- 지도 없는 게시판형 메인: 상단 검색, 글 종류 메뉴, 전국 시·도 → 시·군·구 → 읍·면·동 선택, 중앙 최신 글 목록, 업종/지역 바로가기. 지도 SDK·경계 파일·지도 설정 응답과 외부 지도 호출을 제거했습니다. [지역 목록 출처와 동작](docs/REGION_DATA.md)
- 게시글 대표 사진 썸네일, ‘오늘의 업종 한 컷’ 사진 영역, 상세 사진을 같은 `postImages` 데이터에 연결했습니다. 현재 사진 3장은 AI 생성 샘플로 표시합니다. 한국 날짜 기준으로 공개 글의 사진에서 업종별 한 장을 선택하며, 각 업종에 후보가 하나뿐이면 날짜가 바뀌어도 같은 사진을 표시합니다. 실제 업로드 사진을 등록하면 같은 구조로 대체할 수 있습니다.
- 사진은 Cloudflare Static Assets의 `ASSETS` 바인딩(`public/media/`)으로 제공합니다. 지도 API/바인딩은 사용하지 않습니다. Node 로컬 어댑터에서도 같은 경로로 제공합니다.
- 지역 상위/하위 조회, 업종 및 키워드 검색, 빈 검색 결과, 404
- 서버 렌더링 HTML, 페이지별 title/description/canonical/OG 및 게시글 Article 구조화데이터
- 샘플 업체 3개, 게시글 3개. 실제 연락처가 없어 전화 CTA는 준비 중으로 표시합니다. 검증된 `phone`을 등록하면 게시글과 프로필에서 `tel:` 링크가 활성화됩니다.
- 쿼리 검색 결과는 중복 색인을 피하도록 noindex 처리합니다.

### 파일 구성

- `src/data.js`: 스키마의 관계 ID를 따르는 샘플 데이터 (PUBLISHED만 공개)
- `src/worker.js`: Cloudflare Workers Fetch 핸들러, 라우팅, HTML 렌더링
- `src/styles.js`: 반응형 스타일
- `src/home.js`: 게시판형 메인, 검색·글 종류·업종 메뉴, 바로가기
- `src/photos.js`, `public/media/`: 게시글 사진 관계와 대표 사진 선택, 날짜별 업종 사진, 최적화된 커버/썸네일 샘플
- `src/regions.js`, `src/regions-data.js`, `src/client.js`: 전국 지역 선택 HTML, 이름·코드, 단계 선택 동작
- `scripts/dev.mjs`: 로컬 HTTP 어댑터
- `test/worker.test.js`: 실제 Fetch 핸들러 통합 테스트
- `.github/workflows/check.yml`: push/PR 문법 검사 및 테스트. 자동 배포 없음

### 배포 전 확인

`wrangler.jsonc`는 신규 `localservice-platform` Worker용 설정 초안이며, routes/custom domain을 지정하지 않습니다. 기존 Worker명/계정과 도메인 연결을 먼저 확인한 뒤 해당 설정을 맞춰야 합니다. `localsite-platform` 저장소와 기존 Worker는 이 구현에서 변경하지 않습니다.

현재 로컬 Node 어댑터와 브라우저에서 검증했습니다. Wrangler/workerd 환경 검증과 Cloudflare 시험 배포는 아직 수행하지 않았습니다. 배포 전 Wrangler 버전을 고정하고 dry-run 및 프리뷰 배포를 검증하세요. 외부 DB·이미지 저장소·비밀키는 사용하지 않습니다.

## 전체 운영 목표와 남은 작업

명세의 전체 운영 가능 목표 기준 추정 **45%** (기능 단계 기반 추정이며 실측 일정 비율 아님).

| 단계 | 비중 | 현재 |
| --- | ---: | --- |
| 명세·데이터 관계·프로젝트 분리 | 15% | 완료 |
| 공개 화면·탐색·반응형·샘플 데이터 | 25% | 완료 |
| 자동 검증·SEO·배포 준비 | 15% | 5% 반영 (기본 메타와 테스트) |
| D1/R2·인증·권한 | 15% | 미구현 |
| 업체·계약·작업자 CMS | 15% | 미구현 |
| 글쓰기·중복 검사·검수·승인·공개 흐름 | 10% | 미구현 |
| 실제 배포·운영 점검 | 5% | 미수행 |

남은 SEO 작업에는 breadcrumb 구조화데이터, 이미지 OG, sitemap/RSS 자동화가 포함됩니다. 실데이터 등록, 전화 연결, 사진 업로드, 계약 수량 집계, 관리자 계정 관리도 운영 전 필요합니다. DB 도입 시 스키마 변경은 migration으로 관리합니다.
