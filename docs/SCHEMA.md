# Initial Data Model

## users
id, name, login_id, password_hash, role, status, created_at

## companies
id, name, phone, description, status, created_at

## contracts
id, company_id, package_name, contract_quantity, published_quantity, start_date, end_date, price, status

## regions
id, parent_id, level, name, slug

## services
id, parent_id, name, slug

## posts
id, company_id, writer_id, region_id, service_id, post_type, title, content, status, published_at, created_at, updated_at, seo_title, seo_description, view_count, call_count

## post_images
id, post_id, storage_key, alt_text, sort_order

## company_assignments
id, user_id, company_id

## 저장 구현 (migration 0001)

기본 관계는 위 명세를 유지합니다. 실제 SQL 정의는 `migrations/0001_cms.sql`을 기준으로 합니다.

- companies: `area`, `hours`, `sample`을 추가하여 기존 공개 화면 정보를 보존합니다.
- regions: `admin_code`, services: `description`, `icon`, `tone`을 추가합니다.
- posts: `summary`, `sample`, `version`, `title_hash`, `content_hash`, `last_actor_id`를 추가합니다. content는 문단 문자열 배열의 JSON TEXT입니다. published_at은 한국 기준 YYYY-MM-DD 날짜이며 공개일이 지난 PUBLISHED만 조회합니다.
- post_images: `thumbnail_key`, `sample`, `content_hash`를 추가합니다. 업로드 기능은 아직 없으며 사진 중복 해시 생성은 후속 작업입니다.
- sessions: 토큰 해시, 사용자, CSRF 토큰, 만료 시각을 저장합니다.
- login_attempts: IP 해시별 15분 로그인 실패 제한용입니다. 원문 IP를 저장하지 않습니다.
- post_events: 상태 변경 시 사용자와 이전/다음 상태·버전을 DB trigger로 기록합니다.
- DB CHECK/외래키, 공개 제목·본문 해시 고유 인덱스, 상태 전이 trigger를 사용합니다. 기존 명세의 contracts.published_quantity는 아직 자동 집계하지 않습니다.
