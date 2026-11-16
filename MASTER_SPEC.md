# MASTER SPEC

서비스 브랜드: **이웃핀**
브랜드 문구: **우리 동네 전문가를 콕.**

## 1. 제품 목표
고객별 독립 홈페이지를 대량 생성하는 방식이 아니라 하나의 포털에 업체별 고유 콘텐츠를 지속적으로 축적한다.

## 2. 핵심 객체
- User: SUPER_ADMIN / ADMIN / EDITOR
- Company: 광고주/출장업체
- Contract: 업체별 계약 게시물 수량과 진행상태
- Region: 시도 > 시군구 > 읍면동
- Service: 업종 > 세부서비스
- Post: 작업사례/서비스안내/지역정보/작업팁
- PostImage: 게시글 이미지
- CompanyAssignment: 작업자-업체 배정

## 3. 공개 URL
- /
- /region/{...}/
- /service/{slug}/
- /post/{id}/
- /company/{id}/

게시글의 영구 URL은 숫자 ID 기반으로 유지한다.

## 4. 게시 흐름
DRAFT -> REVIEW -> APPROVED -> PUBLISHED
게시 전 중복 제목/본문/사진, 지역·서비스·업체 정보 누락을 검사한다.

제목·본문·사진은 하나의 포스팅 단위로 관리한다. 본문 사이에 사진을 배치하여 블로그처럼 연속해서 읽는다. 메인·지역·업종 게시판과 업체 프로필의 글 목록은 모두 같은 `/post/{id}/`로 연결한다. 업체 프로필에 별도 사진 갤러리나 사진 게시판을 만들지 않는다.

## 5. 자동화
게시 시 title, description, canonical, OG, breadcrumb, 구조화데이터, 내부링크, sitemap, RSS를 자동 갱신한다.

## 6. 기술 방향
- Cloudflare Workers 기반
- Cloudflare D1 데이터베이스 우선 검토
- Cloudflare R2 이미지 저장소 우선 검토
- 모바일 우선 반응형 UI
- 검색로봇이 핵심 콘텐츠를 표준 HTML로 확인 가능해야 함

## 7. MVP 완료 기준
관리자가 업체/계약/작업자를 관리하고, 작업자가 글을 작성하여 승인 후 공개하면 메인·지역·업종·업체 화면에 자동 반영되는 것.
