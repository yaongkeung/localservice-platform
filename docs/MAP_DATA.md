# 전국 지역 탐색 지도

## 구현 범위

메인 검색 아래에서 전국 → 시·도 → 시·군·구 → 읍·면·동을 탐색합니다. 네이버 배경지도와 JavaScript 선택란, 네이버 연결 실패 시 사용할 SVG 지도를 제공합니다. 지도 위 이름 버튼과 선택란 모두 같은 지역을 선택합니다. 상위 지역/전국으로 돌아갈 수 있습니다.

2026-10-01 자료에 포함된 **16개 시·도, 256개 시·군·구 경계 단위, 3,559개 읍·면·동**을 사용합니다. 일반시 내부의 비자치구도 독립 경계 단위입니다. 시·도 개수를 코드에 17개로 고정하지 않고 원자료의 편제를 따릅니다. 행정구역 변경이 반영된 가공 자료이며, 실제 업무에 필요한 현행 행정구역은 별도로 확인해야 합니다.

기존 서울 전용 2023년 경계는 전국 자료로 대체했습니다. 광역 지역 선택은 기존 샘플 글에도 연결됩니다. 읍·면·동이 지정되지 않은 글을 임의로 특정 동네에 배정하지 않습니다. 글이 없는 지역은 빈 검색 결과만 제공하며 빈 게시판 URL을 대량 생성하지 않습니다.

## 색상과 이름 표시

- 하늘색/청록색 경계, 흰 바탕의 짙은 청록색 이름 버튼.
- 채움 불투명도: 시·도 0.8–2.5%, 시·군·구 0.8–3.5%, 읍·면·동 기본 4.5%, 선택 13%, 호버 13%. 상위 레이어 채움을 낮춰 겹침을 줄입니다.
- 읍·면·동 이름은 각 경계의 가장 큰 폴리곤 내부점(polylabel)에 배치합니다. 이름이 겹치면 일부 라벨을 숨기고, 확대 시 다시 배치합니다. 선택한 이름을 우선 표시하며 선택란에는 모든 이름을 유지합니다.
- SVG 보조 지도에도 읍/면/동의 원래 이름을 표시합니다. 배경지도의 지리 경계를 임의 확대하지 않으며, 호버로 강조하고 클릭으로 선택·확대를 확정합니다.
- 마우스 이동만으로 선택 상태나 검색 조건을 바꾸지 않습니다. 비동기 지역 로딩에는 순번 검사를 적용해 늦게 도착한 이전 요청이 새 선택을 덮어쓰지 않도록 했습니다.

## 데이터 출처와 라이선스

본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다.

- 원본: [admdongkor ver20261001](https://github.com/vuski/admdongkor/tree/d5d5a821c8de6cc337d47eeca604d7af76271c9b/ver20261001)
- 저장소 고정 커밋: `d5d5a821c8de6cc337d47eeca604d7af76271c9b`
- 파일: `HangJeongDong_ver20261001.geojson`, EPSG:4326, UTF-8.
- 기준일: 2026-10-01. 확보일: 2026-11-13.
- 원자료: SGIS, 공공누리 제1유형. 가공물: vuski/admdongkor, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- 원본 이용 조건은 `public/maps/LICENSE-DATA.txt`에 보존합니다. 화면에도 출처·링크·기준일·가공 사실을 표시합니다.
- 이 프로젝트의 추가 가공: mapshaper 8% 단순화(keep-shapes), 시군구/시도별 경계 합집합, 좌표 소수 5자리, SVG 변환, 내부 라벨점 추가, 지역별 파일 분할. 단순화 과정에서 세부 해안선과 경계가 달라질 수 있으며 법적 경계 확인/측량용이 아닙니다.
- 행정기관코드 `adm_cd2`에서 시·도/시·군·구/읍·면·동을 연결합니다. 원자료의 통계청 `adm_cd`와 섞지 않습니다. 읍·면·동은 행정기관코드 앞 8자리, 시군구는 `sgg`, 시도는 `sido`를 사용합니다.

## 파일 구조와 성능

- `src/map-index.js`: 전국 목록, 시도 SVG, 경계 범위만 포함한 작은 색인.
- `public/maps/provinces.json`: 전국 시·도 경계.
- `public/maps/province/{code}.json`: 선택 시·도의 시·군·구.
- `public/maps/district/{code}.json`: 선택 시·군·구의 읍·면·동.
- 전국 상세 경계를 Worker 코드에 한꺼번에 import하지 않습니다. Cloudflare Static Assets의 `ASSETS` 바인딩에서 선택한 지역만 제공합니다. 지역 응답을 브라우저 메모리에 캐시합니다.
- `wrangler.jsonc`에서 `public/`과 `ASSETS`를 설정했습니다. 로컬은 `scripts/local-assets.mjs`로 같은 경로를 제공합니다. 서버는 정해진 지도 파일 경로만 허용합니다.

### 데이터 재생성

빌드 도구는 실행 시에만 필요하며 앱 실행/테스트의 필수 의존성은 아닙니다. mapshaper **0.7.101**, polylabel **2.1.0**을 사용했습니다.

1. 위 고정 커밋의 GeoJSON과 LICENSE-DATA를 작업 폴더에 `nation-original.geojson`, `nation-license.txt`로 저장하고 커밋 문자열을 `nation-commit.txt`에 저장합니다.
2. mapshaper로 다음 중간 파일을 생성합니다.

```sh
mapshaper -i nation-original.geojson -simplify 8% keep-shapes -o format=geojson precision=0.00001 nation-simple.geojson
mapshaper -i nation-simple.geojson -dissolve sgg copy-fields=sido,sidonm,sggnm -o format=geojson precision=0.00001 nation-districts.geojson
mapshaper -i nation-simple.geojson -dissolve sido copy-fields=sidonm -o format=geojson precision=0.00001 nation-provinces.geojson
```

3. 프로젝트에서 polylabel을 이용할 수 있도록 준비한 뒤 `node scripts/build-map-assets.mjs <중간 파일 폴더>`를 실행합니다. 이 명령은 추적 중인 지도 색인과 정적 지도 파일을 갱신하므로 별도 브랜치에서 실행합니다.
4. 데이터 완전성/코드/좌표 테스트와 실제 도시 동·지방 읍·면·도서 지역을 확인합니다.

## 네이버 연결과 검증

- `NAVER_MAP_CLIENT_ID`가 있으면 지도 영역 근처에 왔을 때 공식 SDK를 로드합니다. ID는 `.dev.vars` 또는 배포 환경 변수로 설정하며 소스에 커밋하지 않습니다. Client Secret은 사용하지 않습니다.
- 네이버 Maps Application의 서비스 URL은 운영용 `https://gongsa8282.xyz`, 로컬용 `http://localhost`를 각각 등록합니다.
- SDK 인증/네트워크/초기화 실패 시 안내와 SVG 지도로 전환합니다. 네이버 로고·출처·축척은 기본 표시를 유지합니다.
- Naver Data 레이어는 `init` 이후 `setMap`으로 연결합니다. 라벨 충돌 검사는 지도 이동/확대/화면 크기 변경 후 적용합니다.
- HTTP loopback 환경에만 필요한 네이버 HTTP 요청을 허용합니다. 운영 도메인의 CSP는 HTTPS만 허용합니다.
- Node 자동 검증에 전국 분할 파일 완전성, 행정코드/좌표, 읍·면·동 포함 여부, 지역 검색, HEAD/404 처리를 포함합니다. Cloudflare 배포 및 운영 도메인 검증은 별도 단계입니다.
