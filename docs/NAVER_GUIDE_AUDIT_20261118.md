# 동네핀 네이버 미노출 점검 — 2026-11-18

## 결론과 근거의 범위

네이버가 미노출 사유를 확정해 제공한 상태는 아니다. 현재 확인된 것은 **실시간 접속·검색 허용은 정상이고, 저장된 수집/색인 자료는 아직 확인되지 않는 상태**라는 점이다. 서버가 정상 응답했다는 사실을 색인·목표 검색어 노출 성공으로 바꾸어 보고하지 않는다.

- 공식 사이트맵에 있는 웹마스터 가이드 54개 문서의 본문을 검토하고, 아래 표로 적용 여부를 기록했다. 코드 예제는 관련 기능의 형식과 대조했다. 교육 PDF 2개(46쪽·27쪽)의 텍스트도 확인했다. 외부 모든 연결 사이트나 네이버 내부 알고리즘을 열람한 것은 아니다.
- 11/18 로그인한 소유 사이트에서 등록일 **26.11.17**과 기존 수집 요청 7개를 확인했다. 120의 네이버 실시간 URL 검사에서 접속 200·robots·메타·제목·설명이 정상이다. 메인과 120의 색인 상태 확인은 결과가 없다. 진단·수집 리포트도 정보가 없다.
- 진단 보고서의 최소 약 일주일 조건은 **보고서 생성 조건**이다. 색인이 반드시 일주일 안에 된다는 뜻이 아니며, 등록 시점만으로 미노출 원인을 확정하지 않았다.
- 현재 도메인 전체가 제재됐다는 근거, 특정 실제 Yeti IP가 차단됐다는 과거 방화벽 기록, 노출 50개 달성 증거는 없다. .xyz 또는 예전 숫자 주소 자체가 원인이라고 단정하지 않는다.

## 직접 발견하고 수정한 항목

1. **자료 없는 게시판 67개를 200으로 제공하며 내부에서 연결**하고 있었다. 공개 글이 있는 업종·지역 게시판만 고정 탐색에 연결하고, 빈 게시판 직접 접근은 404+noindex로 변경했다. 관리 업종·전체 업종 필터는 삭제하지 않았다.
2. **117·118의 지역 소개·상담 준비·마무리 문단이 반복**됐고 일부 설명은 사진으로 확인할 수 없는 판단을 포함했다. 실제 사진 8장을 눈으로 확인하여 두 글을 각각 다시 편집했다. 촬영 장소·완료·원인·전후 사진 여부는 생성하지 않았다. 최초 URL·원본 사진·이전 내용은 유지했다.
3. **본문을 고쳐도 별도로 생성한 상단 진단 문구·사진 캡션이 남는 문제**를 고쳤다. 상단은 확인한 요약을 사용하며 독립적인 추가 진단 문구는 출력하지 않는다. 사진 옆 본문의 설명을 고치면 공개 캡션·alt·썸네일/OG 설명도 일치시킨다. 원본 저장값은 보존한다.
4. **지역을 바꾸며 직접 수정한 제목 뒷부분이 저장 과정에서 사라지는 문제**를 고쳤다. 새 지역+업무 접두부에 맞게 쓴 고유 제목은 보존한다. 관련 없는 오래된 제목은 새 접두부로 재설정한다.
5. 관리자의 검색 준비 화면에서 같은 업체 공개 글의 반복 문단을 비교해 안내한다. 이는 편집상의 확인 사항이며 네이버 제재·중복 판정 점수나 노출 보장이 아니다. 생성 지침도 모든 구성 문구에 사진 사실 확인 규칙을 적용하도록 보강했다.
6. 구조화된 이동 경로의 일반명 홈 대신 실제 사이트명 동네핀을 사용한다. 현재 대표 주소와 검색 등록 경로는 유지한다.

이 문제들은 **직접 확인한 개선 항목**이다. 네이버가 이 이유로 사이트를 제외했다고 확정한 것은 아니다. 공통 메뉴·전화 버튼 같은 정상적인 사이트 공통 부분까지 무작위로 바꾸지 않는다.

## 운영 검증

- Worker 코드 버전: 1936bbf1-4e9f-4130-a922-87bd8d0082b6. DB 구조 변경 없음. 코드 배포 자체는 DB 데이터를 쓰지 않았으며, 117·118의 내용은 정상 관리자 수정·발행 경로로 변경했다.
- 공개 재검사 2026-11-18T07:13:31.371Z: 사이트맵 21개, 공개 리소스 27개, 오류 0개. 검사 로그는 로컬 비공개 폴더에 저장한다. 검사는 읽기 전용이다.
- Node 검사 127개, 실제 Worker/D1/R2 실행 검사 28개, 문법·배포 묶음 빌드 통과. 공개 5개 글의 숫자 이전 주소 301 및 비공개 글 404는 별도 재확인한다.
- 사진 재사용은 같은 글의 다른 글 추천 썸네일과 실제 소유 사진을 구분했다. 기존 공개 5개 글의 소유 사진에는 같은 저장 해시의 중복이 없었다. 다른 글 추천 사진이 여러 페이지에 나타난 것을 같은 현장 사진의 중복 발행으로 오판하지 않았다.
- 관리 인증·시험 사이트 noindex·소유 확인 태그·기존 URL은 유지했다. main 자동 병합은 하지 않는다.

## 남은 판단과 다음 기준

서치어드바이저에서 실제 수집 자료가 생기면 수집 실패/색인 제외/중복 대표/SEO 경고를 각각 확인한다. 11/24 이후는 등록 후 약 일주일이 되는 **다음 점검 기준일**이며 노출 보장일이나 이 보고서가 만든 자동 예약이 아니다. 계속 메인까지 수집 정보가 없다면 현재 증거 화면·접속 검사·robots·피드 주소를 첨부해 네이버 고객센터에 확인을 요청할 수 있다. 실제 Yeti 방문 이력이 확보되면 공식 IP 목록 또는 정·역 DNS로 검증하고 당시 상태·차단 기록을 대조한다. 방화벽을 추측으로 해제하지 않는다.

고객마다 50~300개의 독립적인 공개 문서를 만들려면 사진 외에도 요청 증상·작업자가 확인한 과정·자재·조건·결과 등 실제 근거가 글마다 필요하다. 같은 사진 설명에 동네 유래와 동의어만 붙이는 방법은 대안이 아니다. 확인되지 않은 현장 이력을 채우지 않고 서비스 안내와 실제 시공사례를 구분한다. 실제 목표 검색어 결과에서 해당 URL이 확인되고 고객도 확인해야 사업상 노출 증빙으로 사용할 수 있다.

## 공식 가이드 전 항목 대조

상태의 ‘확인’은 해당 기술/운영 기준을 점검했다는 뜻이며, 네이버의 색인 승인 표시는 아니다. 조건부·해당 없음 항목은 내용을 만들어 채우지 않는다.

| 공식 문서 | 상태 | 동네핀 적용·판단 |
|---|---|---|
| [웹 콘텐츠 스팸사례](https://searchadvisor.naver.com/guide/content-abusing) | 개선·운영 지속 | 지역명 교체·문장 치환으로 대량 페이지를 만드는 방식은 제공하지 않음. 실제 경험·고유 정보가 필요하며 제재 여부는 확인되지 않음. |
| [콘텐츠 작성시 권장 사항](https://searchadvisor.naver.com/guide/content-basic) | 개선 | 사진에서 보이는 내용과 확인되지 않은 작업 사실을 구분. 청천동·삼산동 반복 본문을 실제 사진에 맞게 편집. |
| [수집요청 API 명세 및 연동](https://searchadvisor.naver.com/guide/crawl-request-api) | 해당 없음 | 제휴 승인 전용 API. 신청·접근권한을 임의로 만들지 않음. 일반 제출 및 기존 IndexNow 사용. |
| [사이트 간단 체크](https://searchadvisor.naver.com/guide/diagnose-site) | 확인 | 메인 제목 24자·설명 43자. 공개 글 실시간 네이버 검사에서 접속·로봇·메타 모두 정상. 글자 수는 권고이지 일률적인 합격선이 아님. |
| [네이버 웹 검색의 기초](https://searchadvisor.naver.com/guide/education-basic) | 검토 | 연결된 기초 PDF 46쪽의 텍스트와 체크리스트 검토. 오래된 UI·수치 권고는 현재 HTML 가이드를 우선함. |
| [웹마스터도구 활용 가이드](https://searchadvisor.naver.com/guide/education-wmt-advanced) | 검토 | 연결된 활용 PDF 27쪽의 텍스트 검토. 수집→정제·색인→노출과 품질 관리 항목 대조. |
| [사이트 브랜드 정보란](https://searchadvisor.naver.com/guide/faq-branding) | 확인 | 동네핀 이름·로고·사이트 메타 통일. 실제 검색의 브랜드명 선택은 네이버 판단. |
| [검색노출 제목 및 설명문 갱신](https://searchadvisor.naver.com/guide/faq-serpedit) | 확인 | HTML title·description·OG를 서버에서 제공. 수정은 재수집 후 반영되며 표시 문구를 강제하지 않음. |
| [웹 검색 미노출](https://searchadvisor.naver.com/guide/faq-serpmissing) | 확인 필요 | 접속·robots·noindex 차단은 이번 검사에서 발견되지 않음. 메인과 120의 저장된 수집/색인 결과는 없음. |
| [웹 검색 제외](https://searchadvisor.naver.com/guide/faq-serpremove) | 해당 없음 | 검색 제외를 신청하지 않음. 관리자·비공개 글은 계속 보호하고 공개 글을 임의 삭제하지 않음. |
| [사이트 등록 및 소유확인](https://searchadvisor.naver.com/guide/faq-start-register) | 확인 | 현재 소유 사이트에 접근 가능. 콘솔 등록일 26.11.17. 소유 확인 태그 보존. 등록은 검색 승인 절차가 아님. |
| [서브링크 노출](https://searchadvisor.naver.com/guide/faq-sublink) | 확인 | 의미 있는 앵커와 실제 URL 링크 유지. 서브링크 노출을 강제하지 않음. |
| [IndexNow 소개](https://searchadvisor.naver.com/guide/indexnow-about) | 기존 기능 유지 | 새 글·수정 알림은 검색 반영 보장이 아닌 변경 통지로 표시. |
| [API Key 생성하기](https://searchadvisor.naver.com/guide/indexnow-api-key) | 기존 기능 유지 | 운영 호스트의 검증 파일과 키 규칙 유지. 비공개 설정값은 보고서에 포함하지 않음. |
| [IndexNow - FAQ](https://searchadvisor.naver.com/guide/indexnow-faq) | 확인 | HTTP 200 접수와 색인 성공을 구분. 변경 없는 글을 반복 제출하지 않음. |
| [페이지 갱신 요청하기](https://searchadvisor.naver.com/guide/indexnow-request) | 기존 기능 유지 | CMS의 실제 발행·수정 경로에서 변경된 대표 주소 통지. 불필요한 전체 재전송 없음. |
| [콘텐츠 마크업](https://searchadvisor.naver.com/guide/markup-content) | 개선 | 제목과 본문 사실 일치, 사진 설명 동기화. 공개 제목·설명의 동일 값과 누락을 공개 검사로 확인. |
| [파비콘 (Favicon)](https://searchadvisor.naver.com/guide/markup-favicon) | 확인 | 절대 URL·192×192 PNG·고유 아이콘·같은 rel 중복 없음. 검색 표시 여부는 별도. |
| [모바일 사용성](https://searchadvisor.naver.com/guide/markup-mobile) | 확인 | 한 주소의 반응형 화면·viewport·읽을 수 있는 본문. 별도 모바일 도메인 없음. |
| [선호 URL 및 로봇 메타 태그](https://searchadvisor.naver.com/guide/markup-structure) | 확인 | 절대 canonical 하나, 공개 index/follow, 검색 필터 noindex, 관리자·시험 환경 검색 제외 유지. |
| [수집 현황](https://searchadvisor.naver.com/guide/report-crawl-refine) | 관찰 필요 | 콘솔 수집 리포트 정보 없음. 이 상태만으로 차단·제재라고 단정하지 않음. |
| [사이트 진단](https://searchadvisor.naver.com/guide/report-diagnosis) | 관찰 필요 | 진단 리포트 정보 없음. 공식 생성 조건에는 최소 약 일주일 및 수집 문서 등이 있음. 이것은 리포트 조건이지 색인 소요일 보장이 아님. |
| [콘텐츠 노출 및 클릭](https://searchadvisor.naver.com/guide/report-expose-ctr) | 관찰 필요 | 노출·클릭은 시차 있는 성과 자료. 미표시를 당일 노출 0건과 동일하게 취급하지 않음. |
| [사이트 최적화](https://searchadvisor.naver.com/guide/report-seo) | 개선 | HTTP·메타·링크·본문·이미지 설명을 대조. 기술 항목 정상과 검색 상위 노출은 다름. |
| [수집요청 및 검색제외](https://searchadvisor.naver.com/guide/request-crawl) | 확인 | 11/17의 메인·대표 게시글 수집 요청 내역 확인. 매일 같은 주소를 다시 요청하지 않음. |
| [RSS 및 사이트맵 제출](https://searchadvisor.naver.com/guide/request-feed) | 확인 | 사이트맵은 공개 대표 주소만, RSS는 본문 전체와 절대 링크. 기존 제출 경로 유지. |
| [리소스와 링크 관리](https://searchadvisor.naver.com/guide/resource-and-link) | 개선 | 비어 있는 게시판 67개로 연결하던 탐색을 제거. 실제 공개 콘텐츠가 있는 게시판만 고정 링크. 전체 업종 선택 기능은 유지. |
| [사이트의 색인 효율성 개선하기](https://searchadvisor.naver.com/guide/seo-advanced-indexing) | 개선 | 자료 없는 게시판은 정상 콘텐츠처럼 200을 내지 않고 404+noindex. 실제 글·공개 주소는 유지. |
| [자바스크립트 검색 최적화](https://searchadvisor.naver.com/guide/seo-advanced-javascript) | 확인 | 제목·본문·사진·전화·링크가 최초 HTML에 있음. JS 전용 빈 껍데기나 프레임 아님. |
| [검색 친화적인 URL 구축하기](https://searchadvisor.naver.com/guide/seo-advanced-url) | 확인 | 업종/지역/키워드 주소 유지, 숫자 이전 주소는 301. 한글 주소가 어뷰징 방지나 색인을 보장하지 않음. |
| [웹 사이트 운영을 그만둘 때](https://searchadvisor.naver.com/guide/seo-basic-close) | 해당 없음 | 서비스 종료 상태 아님. 도메인·운영 사이트 유지. |
| [웹 사이트를 만들 때](https://searchadvisor.naver.com/guide/seo-basic-create) | 개선 | 대표 URL·HTTPS·robots·사이트맵 유지, 빈 분류 404와 공개 링크 정리. |
| [검색로봇 확인 방법](https://searchadvisor.naver.com/guide/seo-basic-firewall) | 부분 확인 | 네이버 실시간 URL 검사 200·허용, Yeti 이름으로 보낸 공개 시험 요청도 200. 과거 실제 Yeti IP별 방화벽 로그까지 확인한 것은 아님. |
| [HTTP 규약(Protocol)](https://searchadvisor.naver.com/guide/seo-basic-http) | 개선 | 없는 자료 404, 이전 공개 주소 301, 저장 API·관리 인증 상태 유지. |
| [검색엔진 최적화의 목적](https://searchadvisor.naver.com/guide/seo-basic-intro) | 대조 | 기술 설정과 고유 콘텐츠를 함께 개선. 아직 실제 검색 노출 성공으로 판정하지 않음. |
| [웹 사이트 이전](https://searchadvisor.naver.com/guide/seo-basic-migration) | 해당 없음·호환 유지 | 도메인을 새로 바꾸지 않음. 기존 게시글 ID 주소는 동일 글의 저장된 대표 주소로 이동. |
| [웹 페이지의 이동](https://searchadvisor.naver.com/guide/seo-basic-redirect) | 확인 | HTTP 이동 사용. 새 URL의 재발급·검색 회피용 이동·오류 페이지로 위장 이동 없음. |
| [robots.txt 설정하기](https://searchadvisor.naver.com/guide/seo-basic-robots) | 확인 | 루트 text/plain 200. 공개 HTML·사진·필수 자원 허용, 관리자 제외. 기존 사이트맵 경로 유지. |
| [SEO 기본 가이드](https://searchadvisor.naver.com/guide/seo-help) | 개선 | 각 공개 HTML의 title·description·H1·canonical과 사진 alt 점검. 순위 점수로 환산하지 않음. |
| [사이트 상태](https://searchadvisor.naver.com/guide/site-summary) | 관찰 필요 | 콘솔에 통계·진단 자료 없음. 공개 검사 정상만으로 네이버의 과거 수집 이력을 만들지 않음. |
| [주소 (Address)](https://searchadvisor.naver.com/guide/structured-data-address) | 조건부 | 검증된 실제 주소만 사용. 서비스 지역을 사무실 주소처럼 생성하지 않음. |
| [사이트 이동 경로 (BreadcrumbList)](https://searchadvisor.naver.com/guide/structured-data-breadcrumb) | 개선 | 구조화 경로의 맨 앞 일반명 홈을 실제 사이트명 동네핀으로 수정. 절대 URL·순서 유지. |
| [캐러셀 (ListItem)](https://searchadvisor.naver.com/guide/structured-data-carousel) | 해당 없음 | 캐러셀 특수 노출용 마크업을 억지로 추가하지 않음. 현재 사진 목록과 일반 이동 경로는 별개. |
| [사이트 연관채널](https://searchadvisor.naver.com/guide/structured-data-channel) | 조건부 | 운영자가 소유하는 외부 채널이 확인될 때만 추가. 고객 업체의 플레이스를 플랫폼 소유 채널로 오인시키지 않음. |
| [구조화된 데이터 소개](https://searchadvisor.naver.com/guide/structured-data-intro) | 확인 | Organization·WebSite/WebPage·Article·Breadcrumb JSON-LD와 실제 내용 대조. 구조화 데이터는 노출 보장 아님. |
| [영화 (Movie)](https://searchadvisor.naver.com/guide/structured-data-movie) | 해당 없음 | 영화 정보 페이지가 아니므로 추가하지 않음. |
| [평점 (AggregateRating)](https://searchadvisor.naver.com/guide/structured-data-rating) | 해당 없음 | 검증된 평점 자료가 없어 임의 별점·평점 건수 생성 안 함. |
| [레시피 (Recipe)](https://searchadvisor.naver.com/guide/structured-data-recipe) | 해당 없음 | 레시피 페이지가 아니므로 추가하지 않음. |
| [식당 (Restaurant)](https://searchadvisor.naver.com/guide/structured-data-restaurant) | 해당 없음 | 식당 정보 페이지가 아니므로 추가하지 않음. |
| [리뷰 (Review)](https://searchadvisor.naver.com/guide/structured-data-review) | 조건부 | 실제 원문·출처·게시 가능 여부가 확인된 후기만 사용. 현재 가짜 후기 생성 없음. |
| [소프트웨어 (Software)](https://searchadvisor.naver.com/guide/structured-data-software) | 해당 없음 | 소프트웨어 소개 페이지가 아니므로 추가하지 않음. |
| [TV 시리즈 (TVSeries)](https://searchadvisor.naver.com/guide/structured-data-tvseries) | 해당 없음 | TV 프로그램 정보 페이지가 아니므로 추가하지 않음. |
| [동영상 검색 (Video Search)](https://searchadvisor.naver.com/guide/structured-data-video) | 해당 없음 | 현재 영상·영상 채널 제휴 콘텐츠가 아님. 전용 VideoObject/Person·제휴 규칙을 일반 업체 페이지에 적용하지 않음. |
| [URL 검사](https://searchadvisor.naver.com/guide/url-inspection) | 확인 필요 | 120의 실시간 접속 검사 정상. 저장된 색인 조회는 메인·120 모두 결과 없음/수집 데이터 없음 또는 URL 이상 안내. 두 검사를 구분하여 보관. |

## 추가 교육 원문

- [네이버 웹 검색 기초 PDF](https://searchadvisor.naver.com/doc/wmt_guide_ps_websearch.pdf): 발견·수집·노출 구분, 기본 점검, 지속적인 운영과 신뢰성.
- [사이트 품질향상을 위한 활용 PDF](https://searchadvisor.naver.com/doc/wmt_guide_ps_quality.pdf): HTTP·대표 주소·내부 탐색·구조화 데이터·품질 리포트. 오래된 예시보다 현재 웹 가이드를 우선한다.
