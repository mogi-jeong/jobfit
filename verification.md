# 잡핏 v0.10 검증 리포트 (ultrathink)

**검증 대상**: 커밋 `c49dcbd` — 운영 3대 기능 (취소 승인 · 포인트 회수 · 문의 채팅 하이브리드)
**검증 일자**: 2026-04-27
**검증 방법**: 단일 모델 ultrathink + grep 기반 정적 분석 (의존성/참조/상태 전이 추적)
**검증 범위**: 새 기능 + 기존 코드와의 상호작용 + 데이터 정합성

---

## 종합 결과

| 등급 | 발견 건수 | 의미 |
|---|---|---|
| 🔴 **HIGH** | 1 | 사용자가 즉시 만날 가능성 높은 UX 버그 |
| 🟡 **MED** | 3 | 특정 조건/타이밍에서 데이터/UX 일관성 깨짐 |
| 🟢 **LOW** | 5 | 마이너 정합성 / 정책 결정 사항 |
| ✅ **검증 통과** | 11 | 명확히 OK라고 판단된 항목 |

**JS 구문**: ✓ OK
**기존 코드 호환성**: ✓ legacy 필드(`it.body`/`it.answer`/`it.submittedAt`/`it.urgent`) 참조 잔존 없음

---

## 🔴 HIGH — 1건

### H1. `inqState.detailId` 페이지 이동 후에도 유지되는 버그
**위치**: `js/app.js:676`, `js/app.js:10526`

**증상 재현**
1. 사이드바 [문의] → 임의 문의 카드 클릭 → 상세(채팅 스레드) 진입
2. 사이드바 [근무자 관리] 클릭 → 근무자 페이지로 이동
3. 사이드바 [문의] 다시 클릭

**예상**: 문의 게시판 리스트
**실제**: 마지막에 봤던 문의 상세 화면이 곧장 뜸

**원인**:
```js
// renderInquiries() 첫 줄
if (inqState.detailId) { renderInquiryDetail(inqState.detailId); return; }

// 라우터 (다른 페이지는 state 명시적 초기화하는데 inquiry만 빠짐)
points: () => { pointState.tab = 'request'; renderPoints(); },
jobs:   () => { jobsState.tab = 'list'; renderJobs(); },
inquiry: renderInquiries,  // ← detailId 초기화 없음
```

**제안 수정**
```js
inquiry: () => { inqState.detailId = null; renderInquiries(); },
```

---

## 🟡 MED — 3건

### M1. 회수 + 출금 대기 동시 존재 시 데이터 모순 가능
**위치**: `js/data.js:1349-1379` (recoverWorkerPoints), `js/app.js:3036-3041` (출금 처리완료)

**시나리오**
- w007: 보유 30,000P, 출금 신청 30,000P pending 상태
- 마스터가 [⛔ 포인트 회수] 10,000P 실행 → w.points = 20,000
- 출금 처리완료 클릭 → `w.points = Math.max(20000 - 30000, 0) = 0`
- 알바생 실제 받은 금액: 회수가 알바생에게 통보되었지만, 출금 트랜잭션은 30,000으로 기록되어 영수 차이 발생

**영향**: 운영자가 회수 직전 출금 대기 잔액 확인 안 하면 알바생에게 더 송금됨

**제안 수정** (둘 중 하나)
- A안: 회수 모달에서 `pending withdraw` 합계가 잔액에 잠겨있다고 경고 표시
- B안: 회수 시 가용 잔액 = `w.points - sum(pending withdraw amount)` 으로 강제 캡

### M2. 동일 알바생의 buddy 페어가 cancel_pending 상태일 때 시각 정보 부재
**위치**: `js/app.js:4263+` (renderCancelApproval)

**증상**: 신청 승인(`renderApproval`)은 buddy 짝꿎 정보를 카드에 같이 보여주지만, 취소 승인(`renderCancelApproval`)은 buddy 정보 미표시

**시나리오**
- a021 (w035, approved, 짝꿎=a022) — 진행 중
- 만약 a021이 cancel_pending이 되면, 운영자는 짝꿎(a022)이 이미 자유 취소된 상태인지 모름 → 보너스 자격 소멸 여부 판단 어려움

**영향**: 같이하기 기능과 취소 승인 페이지의 동선 단절 (현재 시드에는 buddy를 가진 cancel_pending 케이스 없음 — 하지만 실제 운영에선 발생)

**제안 수정**: cancel 카드에도 buddy 뱃지 추가 + buddy 상태 표시(approved/cancelled)

### M3. `__apInqDraftCat` 카테고리 변경 시 textarea 값 보존 — setTimeout 30ms 의존
**위치**: `js/app.js:8748-8761`

**원리**
1. 사용자가 본문 입력 중
2. 카테고리 칩 클릭 → 전체 화면 재렌더 (textarea도 새로 생성됨)
3. 30ms 뒤 setTimeout으로 이전 값 복구

**문제**
- 30ms는 임의의 값 — 느린 기기/디바이스에서 새 textarea가 30ms 안에 mount 안 되면 값 복구 실패
- 한글 IME 입력 중 카테고리 변경 시 IME 깨질 가능성 (compositionstart/end 보호 없음)

**제안 수정** (둘 중 하나)
- A안: 카테고리 칩을 별도 fragment로 만들어 카테고리만 갱신 (textarea 보존)
- B안: appPreviewState에 inqDraftBody/inqDraftTitle 추가 → 카테고리 칩 onclick에서 vals 캡처 후 state에 저장 → 재렌더 시 state.value로 초기화

---

## 🟢 LOW — 5건

### L1. 잔액 0P 워커 회수 시 의미 없는 0P 트랜잭션 생성
**위치**: `js/data.js:1349`, `js/app.js:3580-3590`

w.points = 0 + amount=1000 회수 → `actual = min(1000, 0) = 0` → tx에 amount=-0 기록.
회수 로그 탭에 `0P 차감` 표시되어 노이즈.

**제안**: 근무자 상세의 [⛔ 포인트 회수] 버튼을 `w.points === 0`이면 `disabled` 처리.

### L2. `createInquiry`의 `uid('q')` 형식이 시드의 `q001`/`q002`와 불일치
**위치**: `js/data.js:670` — `const id = uid('q')`

알바생 앱 미리보기에서 새 문의 작성 시 `q-1730000000000-a4f` 같은 timestamp 기반 ID. 시드 ID는 `q001`. 정렬/검색에 영향 없음 — 단순 일관성 결여.

**제안**: createInquiry에서 `'q' + String(inquiries.length+1).padStart(3,'0')` 형식 유지.

### L3. 회수 권한 미체크 — admin2도 회수 가능
**위치**: `js/data.js:1349` — recoverWorkerPoints는 byRole 받지만 권한 분기 없음

보너스 지급도 동일 패턴이라 일관성은 OK. 그러나 정책상 회수는 마스터/1급 전용이 합당.

**제안**: 정책 결정 후 `if (byRole === 'admin2') return { error: '권한 부족' }` 추가.

### L4. `auditState.category` 주석에 `'inquiry'` 누락
**위치**: `js/app.js:1010`

```js
// '' / application / warning / negotiation / gps / point / job / site / admin / notification / external
```

코드는 `Object.keys(AUDIT_CATEGORIES)`로 동적 생성하므로 동작 OK. 주석만 stale.

**제안**: 주석에 `inquiry / attendance` 추가하거나 주석 삭제.

### L5. cancel_pending 상태 알바생이 [근무자 관리] → 최근 근무 이력에 표시되지 않음
**위치**: `js/app.js:5502`

```js
const myApp = myApps.find(ap => ap.workerId === a.worker.id && (ap.status === 'approved' || ap.status === 'cancelled'));
```

`cancel_pending`은 빠짐 → 출결 카드에 buddy 뱃지/상태 표시 안 됨. 단, cancel_pending은 transient 상태(곧 cancelled or approved 됨)라 운영상 영향 미미.

**제안**: 필요 시 `'cancel_pending'` 추가.

---

## ✅ 검증 통과 — 명확히 OK인 항목

### 데이터 정합성
- ✅ **legacy inquiry 필드(`it.body`/`it.answer`/`it.submittedAt`/`it.urgent`) 참조 없음** — grep 전체 검색 후 잔존 없음 확인
- ✅ **`_seedInquiries` 24건이 새 messages 배열 형식으로 마이그레이션** — `hasMessages: true` 확인
- ✅ **inquiry 32건 status 분포** — pending 12 / in_progress 1 / closed 19 (정상)
- ✅ **회수/취소 차감 트랜잭션 정합성** — `w.points -= amount`와 `pointTxs.unshift({type:'deduct'})` 동시 갱신
- ✅ **`Math.max(0, w.points - amount)` 음수 방지** — 잔액 부족 안전장치 작동
- ✅ **취소 승인 차감(p-cnl-*)과 수동 회수(p-recover-*) 동일 [회수 로그] 탭에 모임** — `pointTxs.filter(t => t.type === 'deduct')` 둘 다 매칭

### 통계/리포트 비충돌
- ✅ **`apThisMonthEarnings`는 reward만 합산** (line 8282 `if (...t.type !== 'reward') return`) — 회수가 적립 통계에 잘못 포함되지 않음
- ✅ **포인트 페이지 메트릭은 `withdraw + pending` 기준** — 회수와 분리

### 상태 전이
- ✅ **취소 승인 mutation은 `cancel_pending` 검증 후 동작** — 이중 처리 방지
- ✅ **inquiry 상태 자동 전환 — admin 응답=in_progress / worker 추가 메시지=pending / closed 후 worker 메시지=재오픈** — 합리적 흐름
- ✅ **`addInquiryMessage` 트림 검증 + 빈 메시지 거부**

---

## 의존성 그래프

```
취소 승인
├── data.js: applications[].status='cancel_pending', priorStatus, cancelReasonType, cancelReason, cancelDecision, cancelDeduct, cancelReviewedAt, cancelReviewedBy
├── data.js: CANCEL_REASON_TYPES, approveCancelDeduct, approveCancelExempt, rejectCancelRequest
├── app.js: cnclState, renderCancelApproval, updateCancelBadge, __cnclDeduct/Exempt/Reject/History
├── index.html: 사이드바 [취소 승인 N] 항목 (data-page="cancelapv")
└── 라우터: pageRouters.cancelapv = renderCancelApproval

포인트 회수
├── data.js: recoverWorkerPoints({workerId, amount, memo, by, byRole})
├── app.js: __wrkRecover (근무자 상세 [⛔ 포인트 회수])
├── app.js: 근무자 상세 포인트 이력 패널 (지급/출금/회수 통합 테이블)
└── 포인트 페이지 [회수 로그] 탭은 기존 코드 재활용 (pointTxs.filter(t => t.type === 'deduct'))

문의 채팅 하이브리드
├── data.js: inquiries[].messages[], status, priority, createdAt, updatedAt, closedAt, closedBy
├── data.js: addInquiryMessage, closeInquiry, createInquiry
├── data.js: AUDIT_CATEGORIES.inquiry 추가
├── app.js: inqState.{detailId, priority}, INQ_STATUS_META, inqLastWorkerWaitMin, inqWaitLabel
├── app.js: renderInquiries (board), renderInquiryDetail (chat thread + sidebar)
├── app.js: __inqDetail/Reply/Close/Reopen/SetPriority/GoWorker
├── app.js: appPreviewState.{inqDetailId, inqCompose, inqDraftCategory}
├── app.js: renderApInquiry, renderApInquiryList, renderApInquiryChat, renderApInquiryCompose
└── app.js: __apInqOpen/Close/Detail/BackToList/Compose/CancelCompose/DraftCat/Submit/Send
```

---

## 권장 우선순위

1. **즉시 수정** (5분) — H1 detailId 초기화 (라우터 한 줄)
2. **다음 세션 검토** — M1/M2/M3 (정책 결정 + 작은 코드 변경)
3. **선택 적용** — L1~L5 (정책 결정 사항)

H1만 단독으로 수정해도 운영 흐름 안정성 크게 개선. M1은 실제 운영 시 데이터 무결성 위험 있어 정책 결정 후 빠른 적용 권장.

---

## 검증 한계 (정직한 자기평가)

- **단일 모델 ultrathink** — 여러 관점 동시 검토는 `/ultrareview`(미설치) 또는 멀티-에이전트만 가능. 같은 사고 패턴의 사각지대는 못 봄.
- **정적 분석** — 실제 브라우저 동작은 보지 않음 (UI/UX 깨짐, 카카오맵 로딩 등은 수동 테스트 필요).
- **시나리오 커버리지** — 주요 경로만 검증. 엣지 케이스(예: 동시 수정 race condition, 한글 IME 복합 시나리오)는 미커버.
- **데이터 시드 의존성** — `_seedHistoricalJobs` + `_seedApplicationsForJobs` 등의 기존 시드 코드와 새 cancel_pending 데이터의 상호작용은 부분 검증.

권장: H1 수정 후 브라우저에서 다음 시나리오 수동 테스트
1. 사이드바 [문의] → 카드 클릭 → 다른 페이지 이동 → 다시 [문의] (목록이 떠야 함)
2. 알바생 앱 [💬 1:1 문의] → 새 문의 작성 → 관리자 페이지 즉시 반영 확인
3. 취소 승인 차감 → 포인트 페이지 [회수 로그] / 근무자 상세 [포인트 이력] 모두 표시 확인
4. 포인트 회수 → 잔액 갱신 + 알바생 앱 미리보기에서 보유 포인트 즉시 반영 확인
