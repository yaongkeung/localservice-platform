# Data Model

현행 스키마는 migration 0017 기준입니다. 아래 0001~0016 설명은 단계별 변경 기록이며 계약 제약·3단계 검수는 현행 UI/발행 조건에 적용하지 않습니다.

## migration 0016 (업체·업종 삭제 보관함)

companies와 services에 nullable deleted_at을 추가합니다. 삭제 시 시각을 기록하고 version을 증가시키며 행·사진·게시글·기존 관계는 유지합니다. 업체는 DISABLED 상태로 바꾸고 복원 시에도 비활성 상태를 유지합니다. 공개 조회의 기존 ACTIVE 조건으로 메인/게시판/프로필/피드/사진 접근에서 제외됩니다. 업종 선택/공개 목록은 deleted_at IS NULL만 사용합니다.

catalog_events는 operation_id UNIQUE, kind, item_id, user_id, action, item_version, snapshot(JSON), created_at을 보관합니다. 현재 관리자 상태/역할/credential_version·대상 버전·연결 조건을 확인한 INSERT SELECT와 대상 UPDATE를 한 D1 batch로 처리합니다. 중간 실패 시 작업 기록과 변경을 함께 롤백하며 경쟁 요청에서는 하나만 성공합니다. 저장된 snapshot은 삭제/복원 이전 행이며 고객명을 포함할 수 있으므로 관리 DB와 백업 안에만 보관합니다.

DB trigger로 삭제 업체의 ACTIVE 전환, 게시글/활성 자식이 있는 업종 삭제, 삭제 부모 아래의 자식 복원/활성 연결, 삭제 업종에 새 글 연결을 차단합니다. 기존 모든 행은 deleted_at NULL로 유지하며 보관함을 일괄 채우거나 기존 항목을 삭제하지 않습니다.

## migration 0015 (자동 연관 키워드·글별 구성)

posts.related_keyword는 사진·대표 업무·업체 정보로 자동 작성한 연관 키워드입니다. page_copy는 JSON 유효성/18,000자 제한을 둔 글별 구성 메타이며 제목 뒷문장, 상단/업무/지역/사진/FAQ/마무리/진행 순서의 제목·안내를 저장합니다. 서비스 세부 설명은 기존 content에 보관하고 렌더러가 카드로 한 번만 표시합니다. 관리자의 임의 POST 값은 page_copy/related_keyword로 저장하지 않으며 자동 작성 결과만 원자적으로 기록합니다. 대상 업체·지역·업무 변경 시 이전 구성은 초기화합니다.

기존 글에는 빈 값/빈 객체를 추가하며 본문·주소·발행 상태·기록을 일괄 재작성하지 않습니다. 이후 공개 해제 시 snapshot에 두 필드를 함께 보관합니다. 기존 snapshot은 변경하지 않습니다. 자동 작성 전 기록에도 이전 구성/연관 키워드를 보관합니다.

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

## migration 0009

- posts.search_region/search_keyword: 제목 앞부분에 사용할 지역명과 대표 업무 키워드. 선택한 지역 범위를 벗어나는 이름은 저장·생성 시 검사합니다.
- posts.generation_reviewed: 자동 초안은 0이며 작성자 확인 저장 후 1. 0인 글은 앱 및 DB trigger가 검수·승인·공개 상태 전환을 막습니다. 기존 수동 글은 1로 유지합니다.
- draft_generations: 글·요청자·모델·시각·입력 사진 ID·이전 제목/요약/본문·RUNNING/SAVED/FAILED/CONFLICT 상태. 비공개 권한으로 최근 20개 기록을 조회합니다.
- 자동 작성 저장은 글 버전·사용자 인증 세대/역할·업체 활성 상태/버전·배정을 다시 검사하는 CAS입니다. 임의 토큰을 사용한 batch에서 기본 사진 설명만 보완하며 사용자가 입력한 설명은 유지합니다.
- 전체/글별 일일 시도 상한은 INSERT SELECT 조건으로 원자적 예약합니다. 실패도 횟수에 포함합니다. 기존 계약 발행 수량은 실제 네이버 노출 수나 결제 조건으로 바꾸지 않습니다.

## migration 0010

regions.group_key와 고유 인덱스를 추가했습니다. 응암동 묶음은 `11380:응암동`처럼 별도 키를 저장하고 admin_code는 NULL입니다. 원본 응암1·2·3동의 실제 코드는 보존합니다. 묶음 선택 시 원본 코드와 같은 묶음의 새 게시물을 모두 포함하며 시·도/시·군·구 조건도 함께 적용합니다. 묶음 URL은 parent.slug + /town- + 이름의 URL 인코딩을 사용합니다. 기존 URL은 덮어쓰지 않습니다.

전국 원본 3,559개 선택 항목을 2,867개 항목으로 묶었습니다. 읍 238개·면 1,165개는 이름과 코드를 유지하며 동 표시 항목은 1,464개입니다. 숫자로 끝나는 분동 접미사만 합치며 `성수1가`처럼 가 이름에 속하는 숫자는 일괄 삭제하지 않습니다.

## migration 0011

- posts.contact_phone: 페이지별 선택 상담 번호. 형식을 검증해 저장하고, 미입력 시 확인된 업체 번호로 표시합니다. 기존 company.phone을 덮어쓰지 않습니다.
- companies.customer_reviews: 실제 후기 원문 배열 JSON, 기본 []. 최대 6개/각 1,200자. 빈 줄로 구분해 입력합니다.
- companies.review_source_url: 선택 HTTPS 출처 링크. 인증 정보가 들어간 URL과 다른 프로토콜은 거부합니다.
- companies.reviews_confirmed: 출처와 게시 가능 여부를 확인한 후기만 공개 렌더러에서 표시합니다. 평점·고객명·날짜를 자동 생성하지 않습니다.
- 생성 실패 기록의 previous_content.validation에는 처리 단계와 사진 필드의 타입/길이만 저장할 수 있습니다. 이전 제목·요약·본문을 수정하지 않으며 모델 원문/사진 바이트/비밀번호는 진단 정보에 넣지 않습니다.

## migration 0012

publish_contract_guard에서 이미 공개된 페이지의 원래 계약 결정을 보존하도록 조정했습니다. 기존 published_once=1 페이지의 재공개에는 계약을 새로 연결하거나 발행 수량을 다시 차감하지 않습니다. 공개 이력 없는 실제 업체 글은 계약 필수/기간/수량 제약을 유지합니다. 게시 상태 전환/원문 보관/공개 횟수 trigger와 계약 연결 불변 조건은 보존합니다. 열을 추가하거나 기존 원문·사진을 바꾸지 않습니다.

## migration 0013 (현행)

companies.customer_name은 80자 이하의 관리자 전용 고객 식별명입니다. 신규 업체는 입력이 필요하며 기존 업체의 값은 빈 문자열로 시작합니다. 기존 폼에서 필드를 누락한 저장은 값을 보존합니다. 공개 데이터 로더에서 이 필드를 제거하고 검색·메타·피드·업체/게시글 화면에는 사용하지 않습니다.

관리자 확인 버튼이 generation_reviewed=1 저장과 DRAFT→PUBLISHED 전환을 원자적 batch로 처리합니다. REVIEW/APPROVED는 이전 API/기록 호환을 위해 보존하지만 현행 작성 UI에 단계로 노출하지 않습니다. 공개 이벤트 하나를 실제 로그인 사용자로 기록하고 최초 발행 표시는 유지합니다.

publish_contract_guard/count를 업체 활성 검사와 최초 발행 표시로 대체했습니다. 새 글은 contract_id=NULL이며 기존 연결은 과거 메타데이터로 보존합니다. 계약 기간·수량·상태를 검사하거나 published_quantity를 변경하지 않습니다. 계약·배정·이벤트·스냅샷의 원본 행은 변경하거나 삭제하지 않습니다. 과거 공개 글의 업체/계약 연결 불변, 수정 전 스냅샷, 사진 권한, 중복·버전 검사는 유지합니다.

## migration 0014 (한글 대표 주소)

post_urls(post_id PRIMARY KEY/FK, path UNIQUE, created_at)는 작성 원문과 별도로 공개 주소를 보관합니다. path는 인코딩한 /업종/광역지역/작업지역/지역명-키워드.html 형식입니다. 중복 후보는 --게시글ID 접미사를 사용하고 입력 정규화에서 이 접미사를 예약하여 동시 발행 충돌을 막습니다. 최초 발행의 상태/변경 토큰 조건으로 같은 batch 안에서만 새 행을 만들며 주소 저장 실패 시 글/상태 이력도 함께 롤백합니다. UPDATE는 DB trigger로 차단합니다.

이전 공개 글은 별도 전환 도구가 공개 상태와 원래 버전을 비교하여 주소 행만 추가합니다. posts·본문·사진·시각·계약/사용자/감사 기록을 재작성하지 않습니다. 숫자 URL의 GET/HEAD는 공개 데이터에 포함된 글만 301 이동하며 비공개 글의 주소는 추측해도 노출하지 않습니다. 제목/업종/지역 수정·공개 해제/재발행에도 최초 주소를 유지합니다.

## migration 0017 (게시글 삭제 보관·직접 검색 확인)

posts.deleted_at/deleted_operation_id와 목록 인덱스를 추가합니다. 기존 자료의 값은 NULL이고 자동 삭제·발행·노출 확인은 하지 않습니다. post_archive_batches는 작업자·DELETE/RESTORE·건수·고객명·시각, post_archive_events는 해당 작업의 글 ID·이전 버전·상태/제목 요약을 기록합니다. 본문·사진·영구 주소와 기존 발행 스냅샷/감사 기록은 원본 테이블에 남습니다.

삭제/복원은 사용자 활성 상태·역할·인증 세대와 선택한 글/업체 버전, 고객 전체 범위를 재검사하는 단일 D1 batch입니다. 실제 변경된 대상 수를 SQL 제약으로 확인하여 일부만 변경되는 경우 전체를 되돌립니다. 삭제 글은 DRAFT여야 하며 복원 전에 수정·사진 추가·자동 작성이 차단됩니다. 복원도 DRAFT이며 명시적 재발행이 필요합니다.

post_search_checks는 post_id/user_id/post_version/query/public_path/result(FOUND/NOT_FOUND/FAILED)/device(PC/MOBILE)/method(MANUAL_BROWSER)/note/checked_at을 추가 기록합니다. 확인 시 글 버전·공개 상태·실제 활성 업체·사용자 권한을 재확인합니다. 관찰 결과 저장은 게시글 버전을 바꾸지 않습니다. 목록은 최신 기록을 읽고 글 버전·동+대표 키워드·대표 주소 일치와 경과 7일 기준으로 재확인을 표시합니다. 관리자 전용 기록으로 공개 데이터에는 넣지 않습니다.
