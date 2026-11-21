# 검색 등록·노출 기준 점검 — 2026-11-18

대상은 동네핀 https://gongsa8282.xyz 이며 공식 네이버 서치어드바이저/검색 블로그, Google Search Central/상태 대시보드와 실제 로그인된 검색 도구를 확인했습니다. 이 문서는 확인일의 상태입니다. 등록 접수·수집 가능·색인·목표 검색어 노출·고객 확인을 각각 구분합니다. 검색 노출이나 순위를 보증하는 인증서는 아닙니다.

## 적용한 보완

| 발견한 항목 | 이번 적용 |
| --- | --- |
| 검색용 파비콘 없음 | 기존 빨간 p 핀 벡터로 정사각형 192px PNG를 제작하고 모든 공개 HTML head에 하나의 절대 주소 icon 링크 제공. 같은 이미지를 사이트 발행자 로고에 사용 |
| 긴 검색 설명과 반복되는 지역·업무 접두어 | HTML/Markdown/사진 표기를 제거하고 최대 두 문장, 내부 가독성 기준 180 Unicode 문자 안으로 정리. meta/OG/Article/관리자 검색 준비 화면을 일치시킴. 향후 자동 요약에는 지역·업무 접두어를 중복 추가하지 않음 |
| 사이트와 일반 문서를 모두 WebSite로 표시 | 홈페이지는 동네핀 WebSite, 일반 페이지는 WebPage, 포스팅은 기존 Article로 구분. 실제 사이트 이름·URL·로고의 Organization 발행자 연결, 한국어 표시 추가 |
| 이미지 검색 미리보기 설정 | 공개 페이지에 max-image-preview:large와 OG 지역/실제 이미지 크기 제공. 비공개·관리·검색 결과의 제외 정책 유지 |
| Google 실제 검사에서 날짜 선택 항목 경고 | 과거 글은 게시일만 저장되어 있으므로 정확한 시각을 추정하지 않고 Article의 선택 datePublished에서 제외. 화면의 게시일과 기존 DB 기록은 유지하며 실제 시각이 있는 수정일은 제공 |
| 플랫폼·작성 과정 설명 부족 | /about/에 사진 제공/자동 작성 보조/운영자 확인/지역 출처/실제 후기/업체 직접 상담 기준 공개. 푸터와 sitemap 연결 |
| 업체 제공 외부 링크의 성격 구분 부족 | 플레이스 링크에 nofollow, 제공 본문·후기 출처 링크에 ugc nofollow 적용. 외부 링크를 통한 광고/제공 콘텐츠의 순위 신호 전달 제한 |
| 새 발행·수정 알림 없음 | 네이버 공식 IndexNow 연결. 성공적으로 발행된 실제 공개 글의 대표 주소만 백그라운드 알림. 샘플·미공개·미래·비활성 업체 제외 재검사, 5초 제한, 알림/추가 조회 실패가 발행을 실패시키지 않도록 분리 |

180자는 사이트 내부 편집 기준이며 네이버·Google의 공식 글자 수 제한이 아닙니다. 기존 작성 본문·사진·제목·업체 데이터와 영구 URL, 최초 발행일, 감사 기록은 재작성하지 않았고 스키마 변경도 없습니다. 글쓰기 단계나 입력 칸을 늘리지 않았습니다.

이번에 실제 정보가 바뀐 메인·공개 포스팅 5개·새 소개 페이지 1개, 총 7개 주소를 한 번 알렸으며 네이버 IndexNow에서 HTTP 200 접수를 받았습니다. 변경 없는 과거 글을 소급 일괄 제출하거나 반복 요청하지 않습니다. 이 접수는 색인/노출 확인이 아니며 Google의 일반 글 색인 API도 아닙니다. 키 값은 비공개 운영 설정에만 보관하고 공개 루트의 검증 파일로 소유를 증명합니다.

## 현재 기준과 확인 결과

| 구분 | 확인/유지한 내용 | 판정의 한계 |
| --- | --- | --- |
| 소유 확인 | HTTPS 대표 도메인, 네이버/Google 확인 태그 유지 | 소유 확인은 노출 승인 아님 |
| 수집 | 서버 HTML, HTTP 200, 공개 robots 허용, 관리자 경로 제외 | 접속 성공이 색인을 뜻하지 않음 |
| 주소 | 글당 하나의 대표 URL, 기존 숫자 주소 301, 내부 링크/OG/피드 일치 | 한글/키워드 URL만으로 스팸 판정 회피 불가 |
| sitemap/RSS | 공개·기한 도래 데이터, 같은 도메인/대표 주소, XML 형식, RSS 전체 본문·사진, 제한 용량 | 제출과 실제 엔진 읽기 성공은 별도 |
| 비공개 보호 | 작성 중 글/사진 보호, 샘플 제외, 관리자 noindex, 미리보기/보관 환경 제외 | robots를 인증 수단으로 사용하지 않음 |
| 이미지·전화 | 실제 공개 사진/대체 설명/크기, HTML 전화번호와 tel 연결 | 전화 이미지 안에만 중요한 정보를 넣지 않음 |
| 내용 | 실제 사진 관찰, 확인된 지역 출처, 업무별 안내·FAQ·과정, 운영자 확인 | 글자 수·사진 수·문장 변형만으로 품질/순위 판단 불가 |
| 대량 발행 | 제목/본문/사진 중복과 높은 유사도 차단 유지, 지역명만 바꾼 자동 대량 발행 안 함 | 50~300개를 모두 다르게 쓴다고 자동 적합해지는 것 아님. 각 페이지의 독립적인 이용 가치 필요 |
| 후기·사실 | 확인된 후기만 표시, 허위 평점/시공 날짜/가격/결과 생성 안 함 | 업체가 실제 사실을 확인할 책임과 운영 검토 필요 |
| 보안·접근 | 인증/CSRF/버전/권한 유지, Google 실제 검사와 네이버 실시간 검사에서 접근 가능 | User-Agent를 흉내 낸 접속만으로 실제 검색봇 접근을 확정하지 않음. 방화벽 전체 해제 안 함 |

## 최근 공식 공지와 적용 판단

### 네이버

- [10월 15일: 파비콘 및 구조화된 데이터 표시 변경](https://blog.naver.com/naver_webmaster/224442540254) — 32px 이상 아이콘 권장에 맞춰 192px를 추가했습니다. HowTo 전용 표시 종료는 본문의 진행 순서를 삭제하라는 뜻이 아니므로 유용한 본문은 유지합니다. 이 공지는 수집·색인·순위 변경을 뜻하지 않습니다.
- [10월 28일: 리포트 통계 시스템 변경](https://blog.naver.com/naver_webmaster/224456824688) — 통계 이관에 따른 진단/노출·클릭 수치 변화 안내입니다. 이를 우리 사이트의 미색인 원인으로 단정하지 않습니다.
- [7월 8일: FAQ 표시 종료 공지](https://blog.naver.com/naver_webmaster/224340385532) — 7월 9일부터 FAQ 전용 검색 표시 종료. 현재 코드는 FAQPage/HowTo 검색 마크업을 생성하지 않으며, 방문자에게 필요한 본문 질문·답변은 유지합니다.
- [11월 5일: 경험·후기 검색 블록](https://blog.naver.com/naver_search/224465697851) — 블로그·카페의 경험 글을 묶는 기능 안내입니다. 외부 웹사이트인 동네핀의 해당 블록 노출 자격이나 보장으로 해석하지 않습니다.
- [11월 16일: 증상 등으로 병원 찾기](https://blog.naver.com/naver_search/224475804807), [11월 3일: 반려동물 검색](https://blog.naver.com/naver_search/224457830934) — 특정 검색 서비스의 변경으로, 현재 출장서비스 포털에 별도 의료/동물 마크업을 추가할 근거가 아닙니다.
- 웹마스터 도구의 TLS 1.0/1.1 지원 종료 공지도 확인했습니다. 현재 HTTPS와 실제 네이버 접속 성공을 확인했으며 구형 TLS로 낮추지 않습니다.
- [IndexNow 공식 지원 안내](https://blog.naver.com/naver_webmaster/223165612654), [소유 키 규칙](https://searchadvisor.naver.com/guide/indexnow-api-key), [갱신 요청 방식](https://searchadvisor.naver.com/guide/indexnow-request), [FAQ](https://searchadvisor.naver.com/guide/indexnow-faq)에 따라 연결했습니다. sitemap/RSS는 유지합니다.

### Google

- [최신 문서 변경 기록](https://developers.google.com/search/updates)의 10월 1일 AI 콘텐츠·10월 26일 사용자 생성 스팸 안내를 검토했습니다. 자동 작성 자체보다 정확성·독창성·이용 가치·검토가 중요하므로 기존 확인/중복 검사를 유지하고 작성 과정 공개를 추가했습니다. [AI 콘텐츠 지침](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content), [스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies)
- 10월 23일 URL 구분자 안내에 따라 기존 하이픈과 고정 주소를 유지합니다. 10월 21일 검색 공유 제어 안내에 맞춰 비공개 noindex를 유지하고 공개 이미지의 큰 미리보기 허용을 추가했습니다.
- 8월 파비콘 형식 안내와 [파비콘 기준](https://developers.google.com/search/docs/appearance/favicon-in-search)을 확인해 PNG를 사용했습니다. 표시 여부는 Google이 결정합니다.
- FAQ 전용 검색 표시와 문서 변경을 확인했습니다. 본문 FAQ는 유지하며 불필요한 검색 마크업은 추가하지 않습니다. llms.txt나 일반 서비스 글에 맞지 않는 Indexing API도 추가하지 않습니다.
- [11월 11일 CDN/검색봇 공지](https://developers.google.com/search/blog/2026/11/crawling-cdn) — 포괄적인 보안 차단이 검색봇을 막을 수 있다는 안내입니다. 실시간 검사에서 접근 성공을 확인했고, 사이트맵 오류의 원인이라는 근거 없이 방화벽을 해제하지 않았습니다.
- [11월 16일 Search Analytics API 변경](https://developers.google.com/search/blog/2026/11/search-analytics-api-update) — 브랜드/다중 국가·기기/멀티모달 보고 기능입니다. 수집 등록 요건이 아니며 이용 데이터가 축적되기 전 별도 API 권한을 추가하지 않았습니다. 11월 12일 유입 식별 문서와 11월 9일 관광 관련 검색 기능도 일반 서비스 글의 신규 등록 의무가 아닙니다.
- [공식 상태 대시보드](https://status.search.google.com/)의 November 2026 core update는 확인 시점 진행 중이며 Ranking 영향으로 표시됩니다. Crawling/Indexing 장애로 표시되지 않았으므로 현재 사이트맵 읽기 오류의 원인으로 단정하지 않습니다.

## 실제 도구 상태 — 해결 여부를 분리

| 항목 | 2026-11-18 확인 상태 |
| --- | --- |
| 네이버 소유 확인/사이트맵/RSS | 기존 등록 유지 |
| 네이버 수정 후 실시간 URL 검사 (120번) | HTTP 200, robots 허용, HTML, 메타 수집/노출 허용, 제목/간결한 설명/OG 모두 정상 |
| 네이버 저장된 색인 상태 | 앞선 검사에서 메인·113·120 ‘URL 검사 결과 없음/수집 데이터 없음 또는 URL 이상’ 안내. 원인 미확정. 실제 목표 검색어 노출 미확인 |
| 네이버 요약 리포트 | 노출·클릭/진단/수집 정보 없음. 통계 지연과 실제 색인 여부를 별도로 해석 |
| 네이버 IndexNow | 변경한 7개 URL HTTP 200 접수. 색인/노출로 계산하지 않음 |
| Google 소유 확인 | 기존 URL 접두어 속성과 확인 태그 유지 |
| Google 개별 색인 | 11월 18일 메인과 120번 색인 확인. 113/117/118/119는 요청 접수 후 확인 대기 |
| Google sitemap.xml | 11월 18일 제출됨. 반영 후 보고서도 ‘알 수 없음/가져올 수 없음/발견 0’. **미해결** |
| Google 실시간 sitemap 접근 | 앞선 실제 URL 검사에서는 스마트폰 검사 도구의 가져오기 성공·수집/색인 허용. 이것을 sitemap 파서 성공으로 계산하지 않음 |
| Google 수정 후 리치 검색결과 테스트 (120번) | 11:36:56 KST 실제 크롤링, Article 1개와 Breadcrumb 1개 유효. 날짜 경고도 제거됨. 검색 노출 보장이 아님 |

Google 보고서 오류를 숨기려고 제출을 삭제하거나 이름을 바꾸지 않았습니다. 같은 날 추가 반복 재제출도 하지 않았습니다. [Google 사이트맵 보고서의 처리/오류 안내](https://support.google.com/webmasters/answer/7451001?hl=en)에 따라 실제 읽기 상태를 다시 확인해야 합니다. 메인/120 색인 성공은 네이버 노출이나 모든 글의 색인 성공을 뜻하지 않습니다.

## 검증과 남은 일

- Node 검사 104개, 문법 검사, 배포 번들 검증, 실제 workerd/D1/R2 검사 24개 통과. 공개 글의 알림 접수 거절과 백그라운드 조회 실패가 발행을 실패시키지 않는 경우도 검증했습니다.
- 운영 sitemap의 주소 21개 모두 HTTP 200·자기 canonical·검색 허용, 공개 글 5개, 사진 객체 23개 정상. 숫자 주소 5개 301과 비공개 글 114/116의 404 유지. 소유 확인 태그와 관리자 로그인 보호 유지.
- 실제 지역+업무 검색결과의 해당 URL 노출을 확인하고 날짜/화면을 기록해야 합니다. 공개 개수나 알림 접수 개수로 고객에게 노출 개수를 보고하지 않습니다.
- Google 사이트맵 처리와 네이버 색인·노출은 다음 확인이 필요합니다. 품질 보강에는 실제 작업 설명/확인 결과/고객 제공 사실이 필요하며, 출처 없는 지역 유래나 허위 후기를 자동으로 늘리지 않습니다.
- 전체 운영 준비도는 **약 80%**를 유지합니다. 실제 네이버 노출 축적·고객 확인/비용 지불·지속 운영 검증이 남아 있습니다.

추가 기준: [네이버 제목·설명](https://searchadvisor.naver.com/guide/markup-content), [콘텐츠 권장 사항](https://searchadvisor.naver.com/guide/content-basic), [콘텐츠 스팸 사례](https://searchadvisor.naver.com/guide/content-abusing), [Google 발행자 정보](https://developers.google.com/search/docs/appearance/structured-data/organization), [사이트 이름](https://developers.google.com/search/docs/appearance/site-names), [검색 설명](https://developers.google.com/search/docs/appearance/snippet).

## 17시 후속: Google 공식19개 자료와 전체 사이트맵 오류 대조

대상은 사이트맵 생성·전체 오류 목록, 크롤링/robots/HTTP/대표 주소, Search Essentials·스팸/AI, URL 검사/통계와 최근 문서 변경·상태입니다. Google의 모든 제품·언어·문서 전체를 열람했다는 뜻이 아닙니다. 공식자료19개(구글18개와 사이트맵 프로토콜1개)를 보관·대조했습니다.

| 공식 자료 | 동네핀 확인·적용 |
| --- | --- |
| [사이트맵 생성](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | UTF-8·같은 호스트의 절대 대표 주소·공개 내용만 포함. XML/텍스트가 같은21개 목록을 사용하도록 공통화. |
| [보고서·전체 오류 목록](https://support.google.com/webmasters/answer/7451001?hl=ko) | 가져오기 실패와 파싱 오류를 분리. XML 보고서는 구체적 파싱 오류 없이 가져오기 실패 상태. |
| [대형 사이트맵](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps) | 현재21개/2,318바이트로 분할 불필요. 자동 검사는50,000개·50MB 한도 초과를 보고. |
| [사이트맵 프로토콜](https://www.sitemaps.org/protocol.html) | 공식 XSD 검증 오류0개, URL 최대167자. 기존 XML 원문의 배포 전후 SHA-256 동일. |
| [검색 필수사항](https://developers.google.com/search/docs/essentials?hl=en) | 수집·색인·검색 노출을 분리하고 기술 검사 통과를 노출 보증으로 쓰지 않음. |
| [기술 요건](https://developers.google.com/search/docs/essentials/technical) | 공개21개 HTTP200·자기 canonical·본문/메타 확인. 관리자·비공개는 계속 제외. |
| [robots 규칙](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec?hl=en) | Google 저장본도 /admin/만 제한. 추가 사이트맵2개를 안내하고 변경 후 재크롤링 요청 접수. |
| [메타·HTTP 검색 지시](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) | 운영 sitemap XML/텍스트·RSS에 noindex 없음. 시험 주소·비공개 보호 유지. |
| [대표 주소](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) | 기존 한글 URL·301·내부 링크를 유지. 호스트/HTTPS/슬래시·대표 주소 충돌 없음. |
| [수집 오류 진단](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors?hl=en) | 사이트맵 실시간 가져오기 성공과 처리 실패가 함께 관찰됨. 크롤링 통계는 아직 데이터 없음. |
| [HTTP 응답](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes) | 일반/Googlebot 형식 GET의 XML 해시 동일, GET/HEAD200. 실제 Googlebot 방문 증명으로 계산하지 않음. |
| [검색봇 확인](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests?hl=en) | 실시간 검사 도구와 일반 검색봇을 구분. User-Agent 문자열만으로 실제 검색봇을 인증하지 않음. |
| [스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies?hl=en) | 지역명 치환 대량 페이지·키워드 나열·허위 후기·동의어 변형을 해결책으로 추가하지 않음. 직접 조치 보고서 문제 없음. |
| [생성형 AI](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=en) | 사진 관찰·사실 확인·검토/발행과 작성 과정 공개 유지. 자동 작성 자체를 순위 보장으로 해석하지 않음. |
| [수집 가능한 링크](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) | 서버 HTML의 실제 href와 공개 주소/사진 등27개 리소스 접근 정상. 빈 분류 제외 유지. |
| [URL 검사](https://support.google.com/webmasters/answer/9012289?hl=ko) | 기존17:14 스마트폰 검사에서 실제 XML200/application/xml·수집 허용 확인. XML 자체를 일반 글로 색인 요청하지 않음. |
| [크롤링 통계](https://support.google.com/webmasters/answer/9679690?hl=ko) | 등록11/17, 보고서에 사용 가능한 데이터 없음. 이를 차단/제재나 오류 원인으로 단정하지 않음. |
| [문서 최근 변경](https://developers.google.com/search/updates) | 11/12 유입 식별·10/23 URL 구분자·10/21 검색 공유 제어·10/1 AI 안내 등과 대조. XML 새 필수 태그 요구 없음. |
| [검색 상태](https://status.search.google.com/) | 확인 시 활성 core update는 Ranking 영향. Crawling/Indexing 장애로 표시되지 않아 이번 원인으로 단정하지 않음. |

### 원인 판단

XML 원문은 공식 XSD 검증 오류0개이며21개 URL, 최대167자,2,318바이트입니다. 일반/Googlebot 형식 GET은200·동일 해시이며 HTML 오류/챌린지/리디렉션/noindex가 없습니다. Google 실제 검사 도구도17:14에 XML을200/application/xml로 받았습니다. 저장 robots.txt도 가져옴/문제 없음이며 /admin/만 제한합니다. Google 직접 조치·보안 문제는 모두 감지된 문제 없음입니다. Cloudflare 최근24시간 보안 샘플의 차단5건은 /wp-json/batch/v1과 /wp-config.php.swp/.save/.old/.bak에 대한 공격 탐색으로, 사이트맵·RSS 경로는 없었습니다. 표본 조사이지 전체 과거 요청에서 검색봇 차단이 절대 없었다는 증명은 아닙니다.

현재 확인한 정보는 전체 사이트 접근 실패·XML 문법 오류·직접 조치가 원인이라는 가설을 뒷받침하지 않습니다. 기존 XML 경로의 가져오기 실패 원인을 확정할 실제 실패 요청 상태나 Google 내부 처리 사유는 제공되지 않았습니다. 이를 구글 버그·도메인 제재·콘텐츠 어뷰징·core update 때문이라고 단정하지 않습니다.

### 적용 및 실제 결과

Google 공식 지원 형식인 /sitemap.txt를 추가했습니다. 기존 XML과 같은 공통 공개 목록에서 생성해 최근 글만 담는 RSS와 달리 전체 주소를 제공합니다. robots.txt에 XML·텍스트·RSS를 함께 안내하고 Google의 robots 재크롤링 요청 접수를 확인했습니다. 검색 준비 자동 감사에 양쪽 목록 일치·호스트/절대 주소·공개 경로·개수/크기·중복·수정 날짜·noindex 검사를 추가했습니다. 문자열 감사와 별도의 공식 XSD 검증은 구분합니다.

정상 Search Console에 새 sitemap.txt를 한 번 제출해 **Sitemap/성공/마지막 읽기11월18일/발견된 페이지21개**를 확인했습니다. RSS도 성공6개이며 기존 XML의 가져올 수 없음/0은 그대로 남겨 두었습니다. 오래된 실패를 숨기려고 삭제하거나 동일 파일을 반복 제출하지 않았습니다. 발견21개는 글5개와 홈/소개·업체·지역·업종16개를 포함하며, 색인21개·검색 노출21건·판매 가능 글21개가 아닙니다.

운영 코드2cc98134-8a0d-474f-8d71-e5aade8a799d에 반영했고 DB/스키마/사진/글/대표 URL/보안 설정은 변경하지 않았습니다. 기존 XML은 원문 바이트까지 동일합니다. Node137개·문법·빌드·실제workerd/D1/R2 34개 통과, 운영 공개 감사21개 주소/27개 리소스/추가3개 링크 오류0입니다. 텍스트 사이트맵의 새 공개 경로도 시험 환경에서는 noindex를 유지합니다.
