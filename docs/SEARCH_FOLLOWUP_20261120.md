# 검색·색인·파비콘 후속 점검 — 2026-11-20

## 실제 로그인 화면에서 확인한 상태

- Naver: 11월19일 수집 완료11, 수집 제한0. 11월20일 갱신 화면의 값이다. 메인 저장 문서는 수집 허용Yes·완료Yes·HTTP200·색인 허용Yes·색인 완료No이다. title/description도 읽었다. 따라서 확인한 메인의 현재 상태를 robots/HTTP 차단이라고 판단할 수 없다. 검색 대상으로 선택되지 않은 구체적인 사유는 공개되지 않아 확정하지 않았다. 사이트 진단·노출/클릭은 아직 정보가 없고 `site:gongsa8282.xyz` 검색도 결과가 없었다. 요약의 인증서 ‘확인중’을 인증서 실패로 해석하지 않았다.
- Google: 페이지 색인 보고서 최종 갱신일은11월16일이며 미색인9(크롤링됨6, noindex3)·색인0으로 보인다. 그러나 현재 개별 URL 검사에서는 메인·113김포·117청천동·118삼산동이 ‘Google에 등록되어 있음’이다. 메인은11월20일10:44:10 KST 스마트폰 Googlebot 수집, 가져오기 성공, 수집/색인 허용, Google 선택 canonical 일치이다. 이전 집계와 개별 검사 시점의 차이를 분리해야 한다.
- 실제 Google site 검색 첫 페이지10개에 메인/소개/업체/지역/분류와119송도·120원당 글이 보인다. 이것은 전체 색인 수나 ‘동+대표 업무’ 첫 페이지 순위의 증명이 아니다.
- Google이 저장한 메인 HTML에 기존192px PNG favicon 링크가 있다. PNG 누락/발견 불가가 파비콘 미표시 원인이라고 단정할 수 없다. `/favicon.ico`404는 별도 호환 보완 사항이다.
- 현재 Google Sitemaps에서 TXT는 성공21, RSS는 성공6(마지막 읽기11월18일), XML은 ‘가져올 수 없음’/상세 ‘사이트맵을 읽을 수 없음’(마지막 읽기11월18일)이다. 현재 공개 XML 응답·주소 감사는 정상이나 Google 재처리 성공을 확인하지 못해 미해결로 남긴다. TXT/RSS 성공은 XML 오류를 해결했다는 뜻이 아니며 색인 완료를 뜻하지도 않는다. 기존 제출을 삭제하거나 반복 재등록하지 않았다.
- `/?kind=guide&province=43|41|11`은 의도한 필터 화면 noindex이며 그대로 유지한다. 모든 제외 URL을 색인시키는 것이 목표가 아니다.

## 반영한 변경

1. 지역명이 빠진 실제 기존 글 제목에 확인된 제목 지역명을 표시한다. 김포113의 H1/title/목록/피드가 김포시로 시작한다. DB 원문·기록·날짜·대표 주소는 보존한다.
2. 메뉴·지역/업종 선택·하단 공통 안내에 Google data-nosnippet을 적용한다. 실제 글은 검색 설명 대상에 남긴다. 검색엔진이 최종 설명을 선택한다.
3. 기존192px PNG 파일·URL을 그대로 유지하면서32/48/64/192px 호환 ICO와 shortcut icon/Apple 링크를 추가한다. GET/HEAD·콘텐츠 형식·ICO 프레임을 검증했다.

운영 버전689b40ee-a916-4b9c-84c0-4a9b6966fec2. 스키마19 유지·DB 쓰기 없음·health200. 배포 전후 기본 PNG 해시와 대표 주소 목록 일치. Node155개·문법·번들·실제workerd/D1/R2검사37개 통과. 11:16 KST 읽기 전용 공개 감사는 sitemap34주소·리소스51개·추가 링크5개, 오류0이다. 감사 중 최신 발행 자료가 반영될 수 있으므로 이 수치는 검색 색인 수가 아니다.

실질 변경 후 Naver 메인11:17:33·김포113 11:18:04 KST 수집 요청 내역과 Google 메인/김포의 ‘색인 생성 요청됨’ 접수를 확인했다. 각 URL을 한 번만 요청했다. 접수는 새 수집 완료·색인 승인·아이콘 갱신 완료의 증명이 아니다.

## 기준과 해석

- [Google favicon](https://developers.google.com/search/docs/appearance/favicon-in-search): 사각형·크롤링 가능·안정된 URL. 갱신에는 수일~수주가 걸릴 수 있으며 표시 보장은 없다. ICO 추가 자체가 검색결과 아이콘 표시를 강제하지 않는다.
- [Naver favicon](https://searchadvisor.naver.com/guide/markup-favicon): PNG/ICO·절대 경로·크기와 캐시 지연을 확인한다.
- [Google 색인 보고서](https://support.google.com/webmasters/answer/7440203?hl=ko), [URL 검사](https://support.google.com/webmasters/answer/9012289?hl=ko): 집계 갱신과 개별 URL 상태를 구분한다.
- [Google 설명 제어](https://developers.google.com/search/docs/appearance/snippet?hl=ko): 공통 탐색의 data-nosnippet은 설명 제외를 위한 것이며 페이지 noindex가 아니다.
- [Naver 사이트 진단](https://searchadvisor.naver.com/guide/report-diagnosis): 최초 보고서는 수집 후 생성에 시간이 걸릴 수 있다. 대기만으로 미래 노출을 보장할 수 없다.
- [Naver 콘텐츠 기준](https://searchadvisor.naver.com/guide/content-abusing): 지역명·표현만 교체한 유사 대량 페이지보다 실제로 다른 작업 정보가 필요하다. 기존에 적용한 사진 원본 분석·이전 본문 비교·중복 문단 보강·미확인 작업 사실 추정 금지를 유지한다. 사진에 상호/번호를 붙였다고 새로운 작업 실적이나 고유 콘텐츠로 계산하지 않는다. 이 위험을 현재 전체 미노출의 확정 원인으로 단정하지 않았다.

도메인 .xyz 자체 제재, 인증서 실패, 사이트 전체 스팸 제재를 입증하는 화면은 확인되지 않았다. 주소 변경·소유 속성 재등록·사이트맵 반복 삭제/재등록·보안 기능 일괄 해제·허위 후기나 현장 사실 생성은 하지 않았다. 수집 접수·색인·목표 검색어 순위·고객 확인·과금은 계속 별도 기록한다.
