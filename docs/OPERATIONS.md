# 계정 복구·실행 검증·백업·시험 배포 준비

## 계정 변경과 재발급

로그인 후 ‘내 계정’에서 현재 비밀번호를 확인하고 새 비밀번호(15~128자)로 변경합니다. 변경 시 다른 기기를 포함한 모든 기존 세션을 폐기하고 다시 로그인하도록 합니다. 관리자도 자기 비밀번호를 이 화면에서 변경할 수 있습니다.

관리자는 작업자 수정 화면에서 자신의 현재 비밀번호를 재확인하여 EDITOR 임시 비밀번호를 재발급할 수 있습니다. 비활성 작업자나 다른 관리자 계정은 재발급하지 않습니다. 무작위 임시 비밀번호는 응답에 한 번만 표시하고 로그·URL·DB 원문에는 저장하지 않습니다. 기존 로그인은 끊기며 작업자는 로그인 후 비밀번호를 변경하기 전까지 관리 기능과 미공개 사진에 접근할 수 없습니다. 새 작업자 발급에도 이 규칙을 적용합니다. 비밀번호를 다른 사람에게 자동 전송하는 기능은 없습니다.

로그인/재확인 시도 제한은 DB UPSERT로 원자적으로 적용합니다. 인증 세대 번호(credential_version)를 세션에 연결하여 재발급 직전에 진행 중이던 예전 비밀번호 로그인도 이후 권한을 얻지 못하게 합니다. 자격증명 변경/재발급은 버전·활성 상태·실행자의 인증 세대를 다시 확인하는 batch로 처리하고 비밀값 없는 이력을 남깁니다. 변경과 재발급은 출처/CSRF 검사 후 실행합니다. [OWASP 인증 안내](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)를 참고했습니다. 유출 비밀번호 목록 검사, MFA와 이메일 자동 복구는 구현하지 않았습니다.

최초 로컬 SUPER_ADMIN 계정의 비밀번호를 잊으면 `npm run admin:recover -- 아이디 --confirm`으로 재발급할 수 있습니다. 이 명령은 로컬 파일에 접근 가능한 운영자가 **로컬 DB의 활성 SUPER_ADMIN만** 복구하며 기존 세션을 모두 종료합니다. 원격 D1·Cloudflare 로그인·계정 자체를 복구하지 않습니다. 원격 운영 계정의 부트스트랩/복구는 실제 시험 환경과 관리자의 신원을 확인한 후 별도 절차로 마련해야 합니다.

## 실제 Workers 엔진 검증

`npm run build:check` 후 `npm run test:runtime`을 실행합니다. Miniflare 5.20261113.0-beta(현재 Wrangler가 사용하는 버전)를 직접 고정했습니다. 이 검사는 번들 Worker를 실제 workerd 엔진에서 실행하고 로컬 D1/R2 에뮬레이터로 migrations·인증·글쓰기·전국 지역·JPEG 처리·미공개 사진 차단·공개/공개 해제·기록·계약 수량·비밀번호 변경·재시작 후 DB/사진 유지를 확인합니다. ASSETS는 로컬 파일 어댑터를 서비스 바인딩으로 제공합니다. 외부 Cloudflare 자원이나 계정은 사용하지 않습니다.

Miniflare 5의 `resourcePersistencePath`를 사용해 두 인스턴스 사이의 실제 저장 유지를 검사합니다. 이전 v4 개별 저장 옵션에 의존하지 않습니다. 시험은 임시 전용 폴더만 생성·정리하며 실제 `.local/portal.sqlite`와 업로드는 변경하지 않습니다. CI도 Node 통합 테스트 → dry-run 빌드 → workerd 검사를 실행합니다. [Cloudflare Miniflare 안내](https://developers.cloudflare.com/workers/testing/miniflare/get-started/)를 기준으로 합니다.

업로드 왕복 시간은 로컬 관찰값이며 원격 CPU 사용량/응답시간을 보장하지 않습니다. 소규모 기능 검증이며 원격 지연·쿼터·최대 크기 사진/동시 부하·운영 플랜 CPU 제한을 검증한 것은 아닙니다.

## 로컬 백업과 복원 검증

`npm run backup:local`은 원본 DB를 읽기 전용으로 열고 [Node SQLite 온라인 백업 API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)를 사용합니다. WAL 파일을 빠뜨린 단순 DB 파일 복사로 대신하지 않습니다. 스냅샷에 등록된 업로드 사진(제외 사진 포함)과 DB를 `.local/backups/새폴더`에 저장하고 파일별 SHA-256, DB quick_check와 외래키, 사진 참조를 확인합니다. 기존 백업을 덮어쓰지 않습니다. 정적 AI 샘플은 Git에 있으므로 복사하지 않습니다.

`npm run backup:verify -- .local/backups/백업폴더`로 다시 확인합니다. `npm run backup:restore -- .local/backups/백업폴더 .local/restores/새복원폴더`는 **새 폴더에만** 복원하고 세션/로그인 시도 기록을 비웁니다. 원래 DB와 사진을 덮어쓰거나 실행 데이터로 자동 전환하지 않습니다. 기존 목적지·경로 이탈·심볼릭 링크·손상 파일·누락 참조는 거부합니다. 원본 활성화나 원격 DB 복원은 서비스 중지/현재 상태 백업과 별도 검토 후 진행해야 합니다.

백업에는 계정 해시와 운영 데이터가 포함되므로 공개 공유·Git 커밋하지 말고 접근을 제한해 보관합니다. 체크섬은 우발적 손상 탐지용이며 신뢰할 수 없는 백업의 진위를 증명하지 않습니다. 복원으로 과거 비밀번호가 돌아올 수 있으므로 운영 활성화 전 관리자 복구와 작업자 자격증명을 재확인해야 합니다. 이 도구는 로컬 SQLite/사진용이며 원격 D1/R2 백업·보존 정책을 대신하지 않습니다.

## 상태 확인과 첫 시험 배포

`/healthz`는 저장 바인딩과 최신 migration 기록이 있으면 `{status:"ok"}`, 아니면 503/not_ready만 응답합니다. 계정/DB/버킷 식별자는 노출하지 않습니다. `APP_ENV=staging` 또는 `production`에서 DB/PHOTOS/ASSETS가 누락되면 공개 샘플로 조용히 대체하지 않고 503으로 닫힙니다. 예상하지 못한 오류는 민감한 내용 없이 일반 503으로 응답합니다. staging 응답에는 noindex/nofollow를 추가합니다.

`wrangler.staging.example.jsonc`는 **배포 가능한 실제 설정이 아닌 예시**입니다. 실제 확인한 계정 ID, 새 프로젝트 전용 D1 ID/이름, 비공개 R2 버킷을 넣은 `wrangler.staging.jsonc`는 Git에서 제외합니다. `npm run deploy:check -- wrangler.staging.jsonc`는 placeholder·다른 Worker·기존 도메인 route·바인딩 누락을 차단하는 정적 검사입니다. 통과해도 소유권·권한·버킷 비공개 상태나 실제 연결까지 검증한 것은 아닙니다.

첫 시험 Worker는 `localservice-platform-staging`과 별도 workers.dev 주소를 사용합니다. `gongsa8282.xyz`와 기존 localsite-platform의 Worker/DB/버킷은 이 단계에서 연결하거나 변경하지 않습니다. 실제 배포 순서는 Cloudflare 로그인 확인 → 실제 자원/소유권 확인 → 새 시험 자원과 운영 계정 준비 → migration 적용 → 전용 주소 배포 → health/인증/업로드/게시·부하/백업 복구 확인 → 도메인 전환 검토입니다. 현재 원격 작업은 아직 수행하지 않았습니다.
