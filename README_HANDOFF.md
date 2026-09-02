# 잡핏 현장 관리자 앱 — 인계 문서 (Flutter 목업 → Supabase 연동)

**작성 2026-09-02** · 대상: 백엔드/앱 개발 담당자 (worker_app · admin_app · web 스택 보유)

---

## 1. 개요

이 저장소는 **현장 관리자 앱(2급/1급 폰 화면)의 완성된 화면·로직 명세**입니다.
Flutter 3.x, Supabase 연결 없는 목업 — 하지만 출결·승인·대기열·포인트의 **비즈니스 로직은 전부 코드로 구현**되어 있고, 다수의 사장님 미확정 안건이 이번 작업에서 **확정**됐습니다(4장).

기존 admin_app에 **이식할지, 이 앱으로 대체할지는 담당자(개발자) 판단에 맡깁니다.** 어느 쪽이든 이 코드가 화면·정책의 기준(reference)입니다.

**파일 구조 (3파일):**

| 파일 | 내용 |
|---|---|
| `lib/main.dart` (~5,600줄) | 전체 화면 + 전역 상태 + 로직 헬퍼 |
| `lib/mock_data.dart` | 더미 데이터 생성 — **파일 전체가 교체 지점.** `rosterOf / gpsReqsOf / pendingAppsFor / cancelReqsFor / waitlistFor / inquiriesFor / lateReportsFor / buildTodayJobs / buildPastJobs` 를 같은 시그니처의 Supabase 조회로 바꾸면 화면 코드는 그대로 동작 |
| `lib/policy.dart` | 정책 상수 + 출결 상태 문자열 + `pointEligible()` — **알바생 앱·DB 트리거와 값을 공유해야 하는 계약** |

**실행:**
```
flutter pub get
flutter run -d chrome --web-port 5500
```
데모 로그인 = 이름 카드 탭 (김운영 1급 · 김현장 2급). 테스트: `flutter test`.
브랜치: GitHub `mogi-jeong/jobfit` 의 **`admin-app`** 브랜치.

---

## 2. 화면 지도

**하단 5탭:**

| 탭 | 내용 |
|---|---|
| **공고** | 4분할(공고 등록·진행중·예정·종료) + 오늘 브리핑 + 알림 수신함(승인 필요·대기열 등 할 일 피드) |
| **일정** | 주간/월간 공고 일정 |
| **승인** | 신청 승인 · 취소 검토 · 대기열 — 처리 시 하단 탭 배지 갱신(`gPendingTick`) |
| **소통** | 1:1 문의 · 늦어요 보고 · 단체 공지 |
| **내정보** | 관리자 정보 · 권한 · 로그아웃 |

**공고 상세** (핵심 화면): 요약 카드 → 신청 대기(홀드) → 대기열 → GPS 퇴근 사유 → 명단(서명 근로/안전 O·X · 출근+관리자 확인 · 퇴근+퇴근 확인 · 포인트) → 공지 + 알림 로그.
**근무자 프로필**: 경고 이력 · 포인트 회수/지급 · 개별 안내(`gWorkerNotes`).

---

## 3. 전역 상태 → Supabase 교체 지점

main.dart의 전역 스토어가 곧 서버 상태입니다. 키는 대부분 `jobKey(j)` (id 있으면 id, 없으면 `근무지|시작시각`) + 이름.

| 변수 | 무엇 | 제안 테이블/컬럼 |
|---|---|---|
| `gOverrides` | 출결 정정값 (jobKey → 이름 → 상태) | `attendance.status` (정정 = update + 감사) |
| `gOut` / `outOf()` | 퇴근 기록 (자동 퇴근 합성 포함) | `attendance.checkout_at` / `checkout_source` |
| `gGpsDone` / `gpsReqs` | 영역 밖 퇴근 사유 처리 | `gps_requests` (pending/approved/rejected) |
| `gDecided` + `appKey()` | 신청·취소 결정 여부 (`app\|이름\|jobId`) | `applications.status` |
| `gApprovedByJob` | 앱 승인으로 확정된 신청자 | `assignments` (또는 applications approved) |
| `gInvitedByJob` | 직접 추가로 합류한 가입 알바생 | `assignments` (source=manual) |
| `gExtByJob` | 외부인력 (소속·전화 메모) | `assignments` (source=external) |
| `gForceCancelled` | 관리자 강제 취소 | `applications` (cancelled_by_admin + 사유) |
| `gWarnings` | 경고 부여 이력 | `warnings` |
| `gRecoveries` / `gGrants` / `gCancelDecisions` | 포인트 회수·보너스 지급·취소 차감/면제 | `point_txs` |
| `gAudit` | 감사로그 (verify, reminder, app_cancel_admin, gps_early …) | `audit_log` |
| `gNotices` + `noticeLogOf()` | 공고별 공지 + 단체 발송 로그 | `notifications` 로그 (§9 보존 항목 참조) |
| `gWorkerNotes` | 알바생별 개별 안내 (조퇴·회수 메시지) | `worker_notices` |
| `gReminderOff` | 시작 1시간 전 자동 푸시 끈 공고 | `jobs.reminder_off` |
| `gContractSigned` / `gSafetySigned` | 근로계약·안전교육 서명자 | `attendance.contract_signed_at` / `safety_signed_at` |
| `gVerifiedIn` / `gVerifiedOut` | 관리자 더블체크 (기록용, 포인트 무관) | `attendance.verified_in_by/at`, `verified_out_by/at` |
| `waitlistOf()` | 대기열 (순번·제안·타이머) | `waitlist` |
| `heldOf()` | 승인 대기 = 1자리 홀드 | `applications` pending 집계 (별도 테이블 불필요) |
| `gInboxRead` | 알림 수신함 읽음 | 클라이언트 로컬 (서버 불필요) |

정원 계산은 `liveCounts` / `seatsOf` — **filled = 확정 + 홀드**, 시작 후엔 홀드 제외·현장 도착자 기준. 자리 개방 후 대기 1번 자동 제안은 `afterSeatOpened()` 한 곳으로 통일되어 있으니 서버 함수도 동일하게 한 경로로 권장.

---

## 4. 이번에 확정된 정책 (기존 미확정 안건 해소)

세부 규칙·근거는 `ATTENDANCE_RULES.md`가 원본입니다. 요약:

1. **대기열 수락 제한** — 근무 24h 전 1시간 / 24h 이내 30분 (웹과 통일, 2026-08-30). 대기 정원 = 모집 × 2. **시작 시각 이후 대기열 제안 중단**.
2. **신청 홀드 B안 (전원)** — 승인 대기 1건 = 1자리 홀드, 협의대상 포함 (같이하기 짝 = 2자리). 반려·철회·**서버 6h 만료** 시 해제 → 대기 1번 자동 제안. 앱에는 타이머 없음 — 6h 초과 해제는 서버 몫.
3. **시작 시각 경과 → 공고 자동 내림** — 알바생 앱 신청·대기 불가, 부족해도 진행 (현장 직접 추가·외부인력만, 2026-08-31).
4. **주휴수당 v1.1** — 동일 근무지(siteId) 기준 만근: 컨벤션 2일 / CJ·롯데 4일 (+ 주 15h).
5. **경고 앱 부여 가능** — 5사유(12h취소·지각·무단결근·무응답·GPS미검증), 관리자 재량, 3회 누적 자동 협의대상, 2회 시 예고 표시.
6. **출결 정정 = 1·2급 모두 즉시 반영** (2급 현장 확인용) + 감사로그. 포인트는 멱등·가역.
7. **조퇴 = 알바비·포인트 없음** (파트너사 확정 2026-08-30) + 알바생 앱 경고 안내 팝업.
8. **지각 = 포인트 자동 지급** (문제 시 관리자가 사후 회수 — 메시지 필수).
9. **종료+6h 자동 퇴근 = 정상 퇴근 인정, 포인트 지급** (`checkout_source=auto`).
10. **퇴근 버튼은 종료 시각 이후에만 활성** (`Policy.checkoutOpenAfterEnd`) — 조퇴는 관리자 표시로만.
11. **서명은 출근 흐름의 일부** — 공고 토글이 켜진 항목(근로+안전)은 **둘 다 O여야 출근 시작**. 알바생 앱이 강제, 관리자 수동 출근은 확인 다이얼로그.
12. **같이하기 = 근무 포인트 1,000P + 짝 보너스 3,000P 별도 (각자)**.
13. **관리자 더블체크** — 출근/퇴근 [확인]은 기록용, 포인트와 무관.
14. **GPS 사유를 종료 전에 제출** → 관리자가 [조퇴로 인정](기본) / [정상 퇴근 인정] / [반려] 선택.

포인트 자동 지급 최종식 (`policy.dart pointEligible`):
```
status ∈ {ok, late} AND checkout_at != null AND checkout_source != rejected
```

---

## 5. 담당자 판단으로 넘긴 것

- **취소 사유 분류 코드** — `CancelCategory`(normal/sick/family/transport/weather/other)는 **제안**입니다. DB·양쪽 앱 동일 키로 확정만 해주시면 됩니다.
- **알림 읽음 수 집계** — 선택. 알바생 앱이 `notifications.read_at`을 갱신해야 관리자 앱 로그에 '확인 N' 표시 (0이면 표시 안 함).
- **단일 세션 / 점검 모드 / 정정 남용 감지 / 보너스 일일 한도** — 훅만 열려 있고 서버 정책은 자유.
- **로그인 방식** — 현재 데모(이름 탭). 아이디/비번 공유 계정 방향이나 최종 방식은 담당자 판단.
- **포인트 회수 알림의 야간 규칙 적용 여부** (22:00–08:00 발송 금지의 예외로 볼지).

---

## 6. 주의

- **용어**: "블랙리스트" 금지 → **"협의대상"** (노조 이슈). DB 컬럼명도 negotiation 계열 권장.
- **애플 로그인 인증서 2026-10-23 만료** — 갱신 일정 확인.
- 앱의 **공고 등록 화면은 '테스트용'** — 실제 공고 등록은 웹(마스터/1급)에서. 앱 등록은 현장 시연·긴급 용도.
- mock_data.dart의 모든 날짜는 **`DateTime.now()` 상대 생성** (지난주~다음주 3주) — 언제 열어도 "오늘" 기준 데이터. 고정 날짜 테스트 케이스 없음.
- 출결 상태·checkout_source **문자열은 policy.dart가 계약** — 알바생 앱·DB 함수에서 같은 값 사용 필수.

---

## 7. 읽는 순서 추천

1. `ATTENDANCE_RULES.md` — 출퇴근·포인트·대기열·홀드의 전체 계약 (가장 촘촘함)
2. `lib/policy.dart` — 상수·상태값·지급식 (그대로 복사/공유)
3. 이 문서 **3장 표** — 전역 상태 ↔ 테이블 매핑
4. `lib/main.dart` — 해당 화면 위젯 (전역 스토어는 상단 ~250줄 + grep `g[A-Z]`)
