# 이웃핀 — LocalService Platform

전국 출장서비스 업체의 작업사례와 지역·업종 정보를 하나의 도메인에 축적하는 콘텐츠 플랫폼입니다.

브랜드: **이웃핀** · **우리 동네 전문가를 콕.** 공개/관리 로고·페이지 제목·공유 메타·WebSite 구조화데이터·RSS·푸터는 `src/brand.js`의 이름을 사용합니다. 개발/시험 도메인과 저장소·Worker·DB 식별자는 유지합니다.

로고는 빨간 압정 심벌과 먹색/빨간색 글자 조합입니다. Gmarket Sans Bold의 세 글자를 작은 SVG 그래픽으로 사용해 기기별 글꼴 차이와 추가 웹폰트 로딩을 줄였습니다. [브랜드·서체 출처](docs/BRAND.md)

## MVP
- 메인 포털
- 지역/업종 게시판
- 게시글 상세
- 업체 프로필
- 관리자/작업자 CMS
- 게시글 작성·검수·승인·게시
- SEO 메타데이터, 사이트맵, RSS 자동화

개발/시험 도메인: gongsa8282.xyz

별도 시험 주소: https://localservice-platform-staging.ogog7401.workers.dev (검색 제외, 샘플 데이터)

## 1차 공개 화면 구현

Node.js 24 이상에서 의존성을 설치하고 실행합니다.

```sh
npm ci
npm run dev
# http://localhost:8787
npm run check
npm test
npm run build:check # 실제 배포 없는 빌드 검사
npm run test:runtime # 로컬 실제 workerd + D1/R2 검증
# 최초 1회: 로컬 관리자 발급 (생성된 비밀번호를 안전하게 보관)
npm run admin:create -- myadmin
# http://localhost:8787/admin/
```

- 모바일 우선 메인, 지역 게시판, 업종 게시판, 숫자 ID 게시글 상세, 업체 프로필
- 지도 없는 게시판형 메인: 상단 검색, 글 종류 메뉴, 전국 시·도 → 시·군·구 → 읍·면·동 선택, 중앙 최신 글 목록, 업종/지역 바로가기. 지도 SDK·경계 파일·지도 설정 응답과 외부 지도 호출을 제거했습니다. [지역 목록 출처와 동작](docs/REGION_DATA.md)
- 게시글 대표 사진 썸네일, ‘오늘의 업종 한 컷’ 사진 영역, 상세 사진을 같은 `postImages` 데이터에 연결했습니다. 현재 사진 3장은 AI 생성 샘플로 표시합니다. 한국 날짜 기준으로 공개 글의 사진에서 업종별 한 장을 선택하며, 각 업종에 후보가 하나뿐이면 날짜가 바뀌어도 같은 사진을 표시합니다. 실제 업로드 사진을 등록하면 같은 구조로 대체할 수 있습니다.
- 메인 안내 카드에는 사용자의 ‘출장 전문가 캐릭터 제작’ 대화에서 완성한 하수구 전문가 캐릭터 투명 PNG 원본 한 장을 사용합니다. PC에서는 오른쪽 안내 카드, 모바일에서는 게시글 아래의 가로형 카드로 표시합니다. 장식용 이미지이며 작업 사진 데이터·업종 등록과 별개입니다. 원본은 `public/media/expert-mascot.png`(1254×1254, 투명 배경)이고 지연 로딩합니다.
- 기본 샘플 사진은 Cloudflare Static Assets의 `ASSETS` 바인딩(`public/media/`)으로 제공합니다. 지도 API/바인딩은 사용하지 않습니다. Node 로컬 어댑터에서도 같은 경로로 제공합니다.
- 지역 상위/하위 조회, 업종 및 키워드 검색, 빈 검색 결과, 404
- 서버 렌더링 HTML, 페이지별 title/description/canonical/OG 및 게시글 Article 구조화데이터
- 샘플 업체 3개, 게시글 3개. 실제 연락처가 없어 전화 CTA는 준비 중으로 표시합니다. 검증된 `phone`을 등록하면 게시글과 프로필에서 `tel:` 링크가 활성화됩니다.
- 쿼리 검색 결과는 중복 색인을 피하도록 noindex 처리합니다.
- 공개 상태 기반 sitemap.xml/RSS/robots와 BreadcrumbList·Article 수정일·대표 사진 OG를 자동 생성합니다. 빈 지역은 미리 생성하지 않으며 공개 글 없는 새 지역은 404, 빈 업종 게시판은 noindex입니다.

### 관리자·저장 기능

- 공개 해제 후 수정·재검수를 지원합니다. 이전 공개 내용을 보관하고 같은 글 주소·최초 게시일·계약 사용 수량을 유지합니다. [전국 지역·재공개·검색 자동화 안내](docs/PUBLISHING_SEO.md)
- `/admin/`에서 로그인 → 초안 작성·수정 → 검수 요청 → 승인 → 공개를 처리합니다. 반려 시 초안으로 돌아갑니다. 공개 글은 메인·지역·업종·업체 화면에 자동 반영됩니다.
- 관리자는 전체 글을, 작업자는 배정된 업체의 자기 글을 관리합니다. 승인·공개·반려는 관리자만 처리합니다. 최초 관리자 발급 도구는 로컬 전용입니다. 업체·계약·작업자/배정·업종 등록/수정은 관리자 화면에서 처리합니다.
- D1의 `env.DB` 인터페이스로 저장하고 조회합니다. 로컬 실행에서는 같은 SQL을 Node SQLite에 실행하며 `.local/portal.sqlite`에 영구 보관합니다. 최초 빈 로컬 DB에만 기존 샘플을 넣고 이후 실행에서는 덮어쓰지 않습니다. DB 파일·계정·세션은 Git에서 제외합니다.
- 제목·본문 정확 중복, 관계 누락, 글 길이, 상태 전이와 편집 버전을 검사합니다. 비밀번호는 솔트와 PBKDF2 해시로, 세션 토큰은 SHA-256 해시로 저장합니다. 세션 만료·로그아웃·로그인 실패 제한·요청 출처/CSRF 검사와 관리 화면 no-store/noindex를 적용합니다.
- 사진 업로드·대표 지정·제외/복원·동일 사진 검사를 지원합니다. 업체·업종은 관리 화면에서 추가할 수 있고, 기본 샘플은 3업체·5지역·3업종입니다. 글쓰기에서 전국 시·도/시·군·구/읍·면·동을 고르면 선택한 경로만 등록합니다. 기존 지역 URL과 집계 지역도 보존합니다. [관리자 사용 안내](docs/CMS.md) · [관리·사진·계약의 동작과 검증 범위](docs/MANAGEMENT_MEDIA.md)

### 계정과 운영 준비

- 내 계정의 비밀번호 변경, 관리자의 작업자 임시 비밀번호 재발급, 첫 로그인 변경과 기존 세션 종료를 제공합니다. 로컬 최고 관리자 복구 명령도 추가했습니다.
- `npm run backup:local`, `backup:verify`, `backup:restore`는 로컬 DB와 등록 사진을 검증하며 복원은 새 폴더에만 준비합니다. 원본 데이터와 원격 자원을 덮어쓰지 않습니다.
- staging/production 저장 바인딩 누락은 503으로 닫고 `/healthz`로 migration 상태를 확인합니다. staging은 noindex입니다.
- [계정·백업·workerd·배포 전 준비](docs/OPERATIONS.md)를 참고하세요. 2026-11-16 시험 전용 D1/R2와 별도 Worker 배포를 완료했습니다. 실제 HTTPS에서 로그인·전국 글쓰기·사진·검수/공개·공개 해제/재공개를 검증했습니다. 최초 원격 관리자는 `npm run admin:create:staging -- 아이디`를 본인 터미널에서 실행하여 비밀번호를 직접 설정합니다. 기존 활성 관리자가 있으면 이 도구는 중단하며 계정을 변경하지 않습니다.

### 파일 구성

- `src/data.js`: 스키마의 관계 ID를 따르는 샘플 데이터 (PUBLISHED만 공개)
- `src/worker.js`: Cloudflare Workers Fetch 핸들러, 라우팅, HTML 렌더링
- `src/styles.js`: 반응형 스타일
- `src/home.js`: 게시판형 메인, 검색·글 종류·업종 메뉴, 바로가기
- `src/photos.js`, `public/media/`: 게시글 사진 관계와 대표 사진 선택, 날짜별 업종 사진, 최적화된 커버/썸네일 샘플
- `src/regions.js`, `src/regions-data.js`, `src/client.js`: 전국 지역 선택 HTML, 이름·코드, 단계 선택 동작
- `scripts/dev.mjs`: 로컬 HTTP 어댑터
- `test/worker.test.js`: 실제 Fetch 핸들러 통합 테스트
- `src/cms.js`, `src/auth.js`, `src/store.js`: 관리자 화면·세션·권한·저장/공개 조회
- `migrations/0001_cms.sql`: 기본 관계, 인증·감사 이력, 상태/중복 제약
- `scripts/sqlite.mjs`, `scripts/local-db.mjs`, `scripts/seed.mjs`: 로컬 영구 저장·migration·샘플 초기화
- `test/cms.test.js`: 로그인·권한·게시 흐름·재시작 유지·중복·충돌 통합 검증
- `src/uploads.js`, `src/image-processing.js`, `src/upload-client.js`, `scripts/local-bucket.mjs`: 비공개 사진 저장·권한·썸네일·업로드 변환
- `src/management.js`, `src/admin-ui.js`: 업체·작업자/배정·업종·계약 관리
- `migrations/0002_management_media.sql`, `0003_company_contract_guard.sql`: 사진/관리 버전·계약 연결·수량/기간 제약
- `src/cms-regions.js`: 전국 지역 단계 선택과 선택 경로 등록
- `src/seo.js`, `src/public-shell.js`: sitemap/RSS/robots·페이지 메타/구조화데이터
- `migrations/0004_editing_regions.sql`: 지역 코드 고유 제약·공개 이력/보관·재공개 수량 제약
- `src/account.js`, `src/readiness.js`, `migrations/0005_credentials.sql`, `0006_attempt_expiry.sql`: 자격증명 복구·인증 세대·시도 제한·상태 확인
- `scripts/runtime-check.mjs`, `scripts/backups.mjs`, `scripts/recover-admin.mjs`, `scripts/deploy-check.mjs`: 실제 엔진 검사·백업/복원·복구·시험 배포 검사
- `scripts/create-staging-admin.mjs`: 시험 전용 DB의 최초 관리자 직접 설정 (비밀번호 숨김 입력, 기존 계정 재발급 없음)
- `.github/workflows/check.yml`: push/PR 문법 검사 및 테스트. 자동 배포 없음

### 배포 전 확인

`wrangler.jsonc`는 신규 `localservice-platform` Worker용 설정 초안이며, routes/custom domain을 지정하지 않습니다. 기존 Worker명/계정과 도메인 연결을 먼저 확인한 뒤 해당 설정을 맞춰야 합니다. `localsite-platform` 저장소와 기존 Worker는 이 구현에서 변경하지 않습니다.

Node SQLite/브라우저 검증, Wrangler 4.162.0 dry-run과 실제 workerd 엔진의 로컬 D1/R2 검증을 통과했습니다. 2026-11-16 별도 Worker를 배포하여 원격 HTTPS에서 공개 화면·검색·인증·전국 글 저장·JPEG 업로드·미공개 사진 차단·검수/승인/공개·피드·공개 해제/이력/동일 주소 재공개를 확인했습니다. 임시 검증 계정은 비활성화하고 세션을 폐기했으며 시험 글은 비공개입니다. R2의 직접 공개 주소는 비활성화되어 있고 연결된 도메인도 없습니다. 원격 D1 SQL과 업로드 사진 4개 객체를 백업하고 별도 로컬 SQLite 복원·무결성·사진 해시를 확인했습니다. 원격 DB/R2 되돌리기와 동시 부하·최대 크기 업로드는 미검증입니다. 실제 자원 설정은 Git에서 제외한 `wrangler.staging.jsonc`에만 보관합니다. `gongsa8282.xyz`와 기존 프로젝트는 변경하지 않았습니다.

## 전체 운영 목표와 남은 작업

명세의 전체 운영 가능 목표 기준 추정 **95%** (기능 단계 기반 추정이며 실측 일정 비율 아님).

| 단계 | 비중 | 현재 |
| --- | ---: | --- |
| 명세·데이터 관계·프로젝트 분리 | 15% | 완료 |
| 공개 화면·탐색·반응형·샘플 데이터 | 25% | 완료 |
| 자동 검증·SEO·배포 준비 | 15% | 13% 반영 (사이트맵/RSS·메타/구조화데이터·통합 테스트·dry-run, 실제 검색엔진 검증 미수행) |
| D1/R2·인증·권한 | 15% | 14% 반영 (원격 D1/R2·실제 인증·비공개 사진·영속 저장 검증, 최대 크기/부하 미검증) |
| 업체·계약·작업자 CMS | 15% | 15% 반영 (업체·업종·작업자/배정·계약·전국 지역·계정 복구) |
| 글쓰기·중복 검사·검수·승인·공개 흐름 | 10% | 9% 반영 (본문·사진·정확 중복·검수/공개·수정/보관, 의미 유사도/운영 검증 미수행) |
| 실제 배포·운영 점검 | 5% | 4% 반영 (별도 시험 주소 배포·실제 HTTP·원격 DB/사진 백업·별도 로컬 복원, 도메인 전환/원격 되돌리기 미수행) |

시험 관리자 계정 생성과 실제 브라우저 로그인을 확인했습니다. 비밀번호는 7~128자로 설정할 수 있습니다. 실데이터/전화번호 확인, 동시 부하·최대 사진 크기·원격 복구/보존 정책, 도메인 전환과 검색엔진 검증이 운영 전 필요합니다. 자동 메타/피드 생성이 실제 검색 노출을 보장하지는 않습니다. 스키마 변경은 migration으로 관리합니다.
