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

## company_images (migration 0007, 이전 데이터 보존용)

id, company_id, storage_key, thumbnail_key, alt_text, sort_order, content_hash, width, height, excluded, created_at

현행 작성·공개 경로는 `posts`/`post_images` 하나로 통합했습니다. 이 테이블과 companies.photo_mutation_token은 이미 적용된 0007 및 이전 백업의 호환을 위해 보존하며 독립 갤러리·업로드 UI·공개 조회는 제공하지 않습니다. 이전 사진 5개를 post_images로 연결하고 원래 행은 제외 상태로 보존했습니다. 기존 `/company-photos/` 주소도 post_images의 소속 글·공개 상태·권한을 확인한 뒤에만 제공합니다. 이 테이블만 등록된 사진은 공개하지 않습니다.

## 포스팅 본문과 사진 순서

posts.content의 기존 JSON 문단 문자열 배열을 유지합니다. 문단 사이의 `[사진:이미지ID]`는 글쓰기의 ‘본문에 넣기’ 버튼으로 배치하며, 렌더러는 **해당 글의 활성 post_images**만 사진으로 출력합니다. 다른 글·제외 사진·없는 이미지 참조는 출력하지 않고 중복 삽입은 한 번만 보여줍니다. HTML 본문 문자열은 이스케이프합니다. 위치를 지정하지 않은 기존 사진은 본문 끝에 표시하여 이전 글도 유지합니다. 대표 이미지와 본문 배치는 별개이며 공개 주소는 숫자 게시글 ID 하나입니다.

## 저장 구현 (migration 0001)

기본 관계는 위 명세를 유지합니다. 실제 SQL 정의는 `migrations/0001_cms.sql`을 기준으로 합니다.

- companies: `area`, `hours`, `sample`을 추가하여 기존 공개 화면 정보를 보존합니다.
- regions: `admin_code`, services: `description`, `icon`, `tone`을 추가합니다.
- posts: `summary`, `sample`, `version`, `title_hash`, `content_hash`, `last_actor_id`를 추가합니다. content는 문단 문자열 배열의 JSON TEXT입니다. published_at은 한국 기준 YYYY-MM-DD 날짜이며 공개일이 지난 PUBLISHED만 조회합니다.
- post_images: `thumbnail_key`, `sample`, `content_hash`를 추가합니다. 업로드·중복 해시·제외/복원은 아래 0002 확장 사항을 따릅니다.
- sessions: 토큰 해시, 사용자, CSRF 토큰, 만료 시각을 저장합니다.
- login_attempts: IP 해시별 15분 로그인 실패 제한용입니다. 원문 IP를 저장하지 않습니다.
- post_events: 상태 변경 시 사용자와 이전/다음 상태·버전을 DB trigger로 기록합니다.
- DB CHECK/외래키, 공개 제목·본문 해시 고유 인덱스, 상태 전이 trigger를 사용합니다. 계약 수량 자동 집계와 공개 제약은 아래 0002·0003에서 추가했습니다.

## migration 0002·0003

- companies: phone_verified/version, services: version, users: version/mutation_token, contracts: version을 추가합니다.
- posts: contract_id/mutation_token을 추가합니다. post_images: excluded/width/height를 추가하고 활성 content_hash 고유 인덱스와 사진 수량/상태 제약을 적용합니다.
- 사진 등록·대표/제외/복원은 게시글 버전과 무작위 변경 토큰을 한 batch에서 비교합니다. 제외는 물리 삭제가 아닙니다.
- 계약 기간/상태/업체/잔여 수량을 공개 전에 확인하고, 공개 시 published_quantity와 계약 version을 원자적으로 갱신합니다. 회사의 현재 sample 설정으로 계약 면제 여부를 판단합니다.
- 최초 샘플 데이터와 기존 글은 migration으로 삭제하거나 덮어쓰지 않습니다.

## migration 0004

- regions.admin_code 고유 인덱스로 선택 경로의 중복 등록을 막습니다. 전국 지역 전체를 선등록하지 않습니다.
- posts.published_once와 기존 공개 이벤트를 통해 최초 공개 이력을 보존하고 재공개를 중복 집계하지 않습니다. 최초 업체·계약은 공개 이력이 있으면 불변입니다.
- post_snapshots에 공개 해제 직전 본문과 사진 메타데이터를 보관합니다. PUBLISHED → DRAFT를 허용하되 앱에서 관리자만 실행할 수 있습니다.
- 공개 해제는 기존 계약 사용 수량을 환급하지 않고, 기존 글의 수정 재공개도 추가 차감하지 않습니다.

## migration 0005·0006

- users: credential_version/must_change_password/password_changed_at, sessions: credential_version을 추가합니다.
- credential_events에는 자격증명 변경·재발급·로컬 복구의 주체/세대/시각만 저장합니다. 비밀번호나 토큰을 기록하지 않습니다.
- login_attempts 만료 인덱스와 원자적 UPSERT로 시도 제한을 적용하고 만료 행을 정리합니다.
- 재발급과 세션 폐기·이력은 사용자/실행자 인증 세대와 버전을 검사하는 한 batch에서 처리합니다.

## migration 0008

companies에 `naver_place_url`, `naver_place_name`, `naver_place_address`, `naver_place_hours`를 추가합니다. 주소가 없으면 카드를 숨기고, 있으면 같은 업체의 포스팅과 프로필이 현재 회사 정보를 공통 조회합니다. 기본 업체명·상담 전화·서비스 지역·본문·게시일은 변경하지 않습니다.

HTTPS 네이버 공유 주소와 네이버 지도/플레이스의 업체 주소만 허용합니다. 자격증명·비표준 포트·다른 호스트·제어문자를 거부하고 긴 주소의 쿼리/프래그먼트는 제거하여 업체 기본 주소로 정규화합니다. 렌더링에서도 주소를 재검사하고 등록 정보 문자열을 이스케이프합니다. 서버가 공유 주소를 따라가거나 정보를 자동 수집하지 않습니다. 같은 업체 여부와 등록 정보의 정확성은 운영자가 확인합니다. 이전 화면에서 새 필드를 누락해 저장하면 기존 플레이스 정보를 보존하고, 주소를 명시적으로 비우면 연결을 해제합니다.
