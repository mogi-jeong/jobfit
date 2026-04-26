# 잡핏(JobFit) 관리자 웹 — 개발자 인계 문서

**버전:** 프로토타입 v0.7
**최종 갱신:** 2026-04-26
**현재 코드:** [GitHub mogi-jeong/jobfit](https://github.com/mogi-jeong/jobfit) · [GitHub Pages 배포](https://mogi-jeong.github.io/jobfit/)

이 문서는 잡핏 관리자 웹 프로토타입을 **Flutter 알바생 앱 + Supabase 백엔드** 로 재구현하기 위한 인계 자료입니다.

---

## 1. 프로젝트 개요

### 비즈니스 모델
- **중계 플랫폼**: 알바비는 파트너사가 알바생에게 **직접 지급**, 잡핏은 **포인트만** 지급
- **타깃**: 웨딩홀 서빙 + 택배 물류 (CJ대한통운 6 / 롯데택배 3 / 컨벤션 2 = 11개 근무지)
- **현재 단계**: 마스터 1인 운영 가정 · 관리자 웹 프로토타입

### ⚠ 가장 중요한 규칙 — 잡핏 = 중계업체
| 구분 | 누가 지급 | 금액 | 코드 필드 |
|---|---|---|---|
| **알바비** (일급/시급) | 파트너사 → 알바생 직접 | 100,000~125,000원 | `j.wage` (단위: **원**) |
| **잡핏 포인트** | 잡핏 → 알바생 | 2,000~3,000P | `pointRewardFor(j)` (단위: **P**) |

UI/문구에서 "포인트 지급"은 반드시 `pointRewardFor(j)` 사용. `j.wage` 와 혼동 금지.

### 포인트 보상 체계 (시간대별)
| 시간대 | 포인트 | 시간 |
|---|---|---|
| 주간 | 2,000P | 07:00~ |
| 야간 | 2,500P | 22:00~ |
| 새벽 | 3,000P | 04:00~ |
| 웨딩 | 2,500P | 가변 |

---

## 2. 기술 스택 전환 가이드

### 현재 (프로토타입)
- 바닐라 JS · IIFE 스코프 격리
- 단일 페이지 SPA (`index.html` + `js/app.js`)
- 별도 창 관제 시스템 (`control.html` + `js/control.js`)
- 데이터: `js/data.js` 의 전역 `const` 배열 (런타임 mutation)
- 지도: Kakao Maps JavaScript API
- 배포: GitHub Pages

### 실제 운영 시 (재구현 권장)
| 영역 | 권장 스택 | 비고 |
|---|---|---|
| 알바생 앱 | Flutter 3.x | iOS/Android 단일 코드베이스 |
| 관리자 웹 | Next.js / Vite + React | 현재 prototype 흐름 그대로 이식 |
| 백엔드 | **Supabase** (PostgreSQL + Auth + Storage + Realtime) | RLS 로 권한 분리 |
| 지도 | `kakao_map_plugin` 1차, iOS 이슈 시 `flutter_naver_map` | |
| 푸시 | FCM | 야간 제한 22~08 |
| 출금 자동화 | 수동 → 추후 토스 자동화 (전자금융업 등록 후) | |

---

## 3. 데이터 모델 (Supabase 테이블 권장 매핑)

### 3.1 핵심 entity 11개

```sql
-- 파트너사
CREATE TABLE partners (
  key       TEXT PRIMARY KEY,    -- 'cj', 'lotte', 'convention'
  name      TEXT NOT NULL
);

-- 근무지
CREATE TABLE worksites (
  id          TEXT PRIMARY KEY,        -- 'gonjiam', 'yongin' ...
  partner_key TEXT REFERENCES partners(key),
  name        TEXT NOT NULL,
  addr        TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  bus         BOOLEAN DEFAULT FALSE,
  wage        INTEGER,                 -- 기본 일급 (원)
  holiday     TEXT,                    -- '주 4일 만근' 등
  gps         BOOLEAN DEFAULT FALSE,   -- GPS 영역 설정 여부
  polygon     JSONB,                   -- [[lat,lng], ...]
  area_m2     DOUBLE PRECISION,
  contact     TEXT,
  manager1    TEXT,
  manager2    TEXT
);

-- 알바생 (워커)
CREATE TABLE workers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  warnings     INTEGER DEFAULT 0,        -- 0~3
  total        INTEGER DEFAULT 0,        -- 누적 근무 횟수
  noshow       INTEGER DEFAULT 0,
  negotiation  BOOLEAN DEFAULT FALSE,    -- 협의대상 (전화 기반)
  points       INTEGER DEFAULT 0,
  last_worked  DATE,
  joined_at    DATE,
  fav_parts    TEXT[]                    -- 즐겨찾기 파트너사
);
CREATE TABLE worker_warnings (
  id         BIGSERIAL PRIMARY KEY,
  worker_id  TEXT REFERENCES workers(id),
  date       DATE,
  reason     TEXT,                       -- '12h 이내 취소' 등 5가지
  memo       TEXT,
  site_id    TEXT REFERENCES worksites(id),
  count      INTEGER,                    -- 부여 시점의 누적
  created_by TEXT
);

-- 공고
CREATE TABLE jobs (
  id              TEXT PRIMARY KEY,
  site_id         TEXT REFERENCES worksites(id),
  date            DATE NOT NULL,
  slot            TEXT,                  -- '주간'|'야간'|'새벽'|'웨딩'
  start           TIME,
  end             TIME,
  cap             INTEGER NOT NULL,      -- 모집 인원
  apply_count     INTEGER DEFAULT 0,     -- 신청자 수 (캐시)
  wage            INTEGER,
  wage_type       TEXT DEFAULT '일급',
  contact         TEXT,
  contract        BOOLEAN DEFAULT TRUE,
  safety          BOOLEAN DEFAULT TRUE,
  show_holiday_popup BOOLEAN DEFAULT TRUE,
  recruit_closed  BOOLEAN DEFAULT FALSE, -- 수동 구인 완료
  reopened        BOOLEAN DEFAULT FALSE  -- 대기열 소진 후 재모집
);
CREATE TABLE job_external_workers (    -- 외부 구인 인원 (앱 외부에서 등록)
  id        BIGSERIAL PRIMARY KEY,
  job_id    TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  phone     TEXT NOT NULL,
  note      TEXT,
  attended  BOOLEAN DEFAULT FALSE,    -- 현장 출석 확인
  added_by  TEXT,
  added_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 신청
CREATE TABLE applications (
  id            TEXT PRIMARY KEY,
  worker_id     TEXT REFERENCES workers(id),
  job_id        TEXT REFERENCES jobs(id),
  applied_at    TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT DEFAULT 'pending',   -- pending|approved|rejected
  reason        TEXT,                     -- normal|urgent|warn3|neg
  processed_at  TIMESTAMPTZ,
  processed_by  TEXT,
  reject_reason TEXT
);

-- 협의대상 (전화번호 기반 · 미가입 번호도 등록 가능)
CREATE TABLE negotiations (
  id            TEXT PRIMARY KEY,
  phone         TEXT NOT NULL,
  worker_id     TEXT REFERENCES workers(id),
  name          TEXT,
  registered_at DATE,
  reason        TEXT,                     -- 'auto_warn3'|'manual'
  sub           TEXT,                     -- 상세 사유
  registered_by TEXT
);

-- 포인트 트랜잭션
CREATE TABLE point_txs (
  id            TEXT PRIMARY KEY,
  worker_id     TEXT REFERENCES workers(id),
  type          TEXT,                     -- 'withdraw'|'deduct'|'reward'
  status        TEXT,                     -- 'pending'|'done'|'failed'
  amount        INTEGER,                  -- 차감은 음수
  bank          TEXT,
  account       TEXT,
  reason        TEXT,
  requested_at  TIMESTAMPTZ,
  processed_at  TIMESTAMPTZ,
  processed_by  TEXT,
  fail_reason   TEXT
);

-- GPS 미검증 퇴근 승인 요청
CREATE TABLE gps_requests (
  id            TEXT PRIMARY KEY,
  worker_id     TEXT REFERENCES workers(id),
  job_id        TEXT REFERENCES jobs(id),
  submitted_at  TIMESTAMPTZ,
  reason        TEXT,
  distance      INTEGER,                  -- 폴리곤 가장자리로부터 m
  status        TEXT DEFAULT 'pending',   -- 'pending'|'approved'|'denied'
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   TEXT,
  admin_note    TEXT
);

-- 대기열
CREATE TABLE waitlist (
  id              TEXT PRIMARY KEY,
  job_id          TEXT REFERENCES jobs(id),
  worker_id       TEXT REFERENCES workers(id),
  order           INTEGER,
  status          TEXT,                   -- 'waiting'|'pending_accept'|'accepted'|'declined'|'auto_rejected'
  joined_at       TIMESTAMPTZ,
  offered_at      TIMESTAMPTZ,
  offer_deadline  TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ
);

-- 관리자 계정
CREATE TABLE admins (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  phone       TEXT UNIQUE,
  role        TEXT,                       -- 'master'|'admin1'|'admin2'
  sites       TEXT[],                     -- admin2 의 담당 근무지 ID 배열
  active      BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  joined_at   DATE,
  created_by  TEXT
);

-- 문의
CREATE TABLE inquiries (
  id            TEXT PRIMARY KEY,
  worker_id     TEXT REFERENCES workers(id),
  category      TEXT,                     -- 'account'|'point'|'attendance'|'bug'|'etc'
  title         TEXT,
  body          TEXT,
  submitted_at  TIMESTAMPTZ,
  status        TEXT,                     -- 'pending'|'answered'
  urgent        BOOLEAN DEFAULT FALSE,
  answer        TEXT,
  answered_at   TIMESTAMPTZ,
  answered_by   TEXT
);

-- 템플릿 (계약서 / 안전교육 PDF)
CREATE TABLE templates (
  id            TEXT PRIMARY KEY,
  type          TEXT,                     -- 'contract'|'safety'
  name          TEXT,
  partner_keys  TEXT[],
  site_ids      TEXT[],                   -- 특정 근무지 한정 (optional)
  version       TEXT,                     -- 'v1.0'
  uploaded_at   DATE,
  file_name     TEXT,
  file_size     TEXT,
  in_use        INTEGER,                  -- 적용 중인 공고 수
  uploaded_by   TEXT
);

-- 시스템 설정 (점검 모드 / 강제 업데이트 — N6 안건)
CREATE TABLE system_settings (
  key   TEXT PRIMARY KEY,
  value JSONB
);
-- 예: maintenance_mode / maintenance_message / min_app_version / current_app_version
```

### 3.2 권한 (RLS) 정책 가이드
- **마스터 (`role='master'`)**: 모든 테이블 read/write
- **1등급 (`role='admin1'`)**: 모든 read/write — 단 `system_settings` 와 `admins` 의 master 계정 변경 X
- **2등급 (`role='admin2'`)**: 본인의 `sites` 배열에 포함된 `worksite_id` 와 관련된 데이터만 read/write
- 관제(전광판)는 등급 무관 전 근무지 read

---

## 4. 핵심 비즈니스 룰 (POLICY 객체와 매핑)

[`js/data.js`](js/data.js) 의 `POLICY` 객체와 1:1 매칭. 정책 변경 시 이 상수만 수정.

| 룰 | 값 | 코드 상수 | 영향 영역 |
|---|---|---|---|
| 출금 가능 최저 | 30,000P | `POLICY.POINT_MIN_WITHDRAW` | 포인트 페이지 / 알바생 앱 |
| 출금 단위 | 10,000P | `POLICY.POINT_WITHDRAW_UNIT` | `canWithdraw()` |
| 1일 출금 한도 | 100,000P | `POLICY.POINT_DAILY_MAX` | `canWithdraw()` |
| 단순 변심 차감 | 1,000P | `POLICY.POINT_CANCEL_DEDUCT` | 12h 이내 취소 시 자동 |
| 자동 퇴근 | 종료+6h | `POLICY.AUTO_CHECKOUT_MIN` | 퇴근 승인 페이지 |
| 신청 6h 초과 경고 | 6h | `POLICY.APPROVAL_LIMIT_MIN` | 신청 승인 페이지 (N19) |
| 12h 내 미충원 긴급 | 12h | `POLICY.URGENT_RECRUIT_MIN` | 관제 카드 펄스 경고 |
| 자유 취소 시한 | 12h | `POLICY.CANCEL_FREE_MIN` | 알바생 앱 |
| 경고 → 협의대상 | 3회 | `POLICY.WARN_LIMIT` | `addWorkerWarning()` |
| 대기열 24h前 수락 | 2h | `POLICY.WL_OFFER_FAR_MIN` | 대기열 타이머 |
| 대기열 24h이내 수락 | 30분 | `POLICY.WL_OFFER_NEAR_MIN` | 대기열 타이머 |
| 대기열 상한 배수 | cap × 2 | `POLICY.WL_FACTOR` | 대기열 등록 검증 |

### 4.1 신청 승인 플로우
```
알바생 신청
  ↓
[자동 분류]
- 12h 전 + 정상 워커 → status='approved' (자동)
- 12h 이내 + 정상 → status='pending' (관리자 검토)
- 협의대상 워커 → status='pending' (마스터 검토)
- 경고 3회 이상 → status='pending' (마스터 검토)
  ↓
[관리자 처리]
- 승인: processed_at + processed_by 기록 → 알바생 알림
- 거절: + reject_reason → 알바생 알림
  ↓
[6h 초과 미처리]
- 신청 승인 페이지 빨간 펄스 + 메트릭 카운트
- N19 이월: 자동 거절 vs 에스컬레이션 정책 미정
```

### 4.2 자동 퇴근 플로우 (퇴근 승인 페이지)
```
공고 종료 시각 도달
  ↓
[알바생 퇴근 처리 안 했을 때]
- 5분 단위 알람 (FCM)
- 종료 시각 ~ +6h: "자동퇴근 X:XX 후" 카운트다운 표시
  ↓
[종료 + 6h 경과]
- status='settled' → 자동으로 퇴근 처리됨
- 출근/지각 워커는 포인트 자동 지급
- 결근은 그대로 노쇼 카운트
```

### 4.3 GPS 미검증 퇴근 승인 (퇴근 승인 페이지)
```
알바생이 근무지 GPS 영역 밖에서 퇴근 시도
  ↓
앱이 사유 입력 강제 → gps_requests 생성 (status='pending')
  ↓
[관리자 승인]
- 승인: → 포인트 자동 지급 (point_tx type='reward')
- 반려: → 포인트 미지급 (퇴근 자체는 기록)
  ↓
거리(distance) 기준 시각 분류:
- ≤100m: 근접 (관대)
- ≤300m: 중간
- >300m: 과도 (검토 필요)
```

### 4.4 경고 → 협의대상 자동 등록
```
관리자가 경고 부여 (5가지 사유 중 1)
  ↓
worker.warnings += 1
worker_warnings 테이블에 로그 기록
  ↓
[warnings >= 3]
worker.negotiation = TRUE
negotiations 테이블에 자동 등록 (reason='auto_warn3')
  ↓
[해제]
마스터 권한만 가능 → negotiation=FALSE, warnings=0
```

### 4.5 대기열 (FULL 공고)
```
공고 정원 도달 (apply >= cap)
  ↓
이후 신청자 → 대기열 등록 (status='waiting', order 부여)
대기열 상한: cap × 2
  ↓
누군가 취소
  ↓
order=1 자에게 자리 제안 알림 (status='pending_accept')
수락 제한:
  - 근무 24h 전: 2시간
  - 24h 이내: 30분
  ↓
[수락] → application 자동 생성 (approved)
[거절/시간 초과] → status='auto_rejected' → 다음 order
  ↓
[모든 대기자 실패]
job.reopened = TRUE → 일반 모집 재개
```

### 4.6 같이하기 (Buddy / 친구 호출) — 정책 v1

같이하기는 알바생 1명이 친구 1명을 초대해 **같은 공고에 페어로 신청**하는 기능. 양쪽 모두 출퇴근 완료 시 각자 **+3,000P 추가 지급** (`POLICY.BUDDY_BONUS_AMOUNT`).

**기본 흐름:**
```
알바생A가 공고 X에 같이하기 신청
  ↓ 카카오/링크로 친구B에게 초대 발송
B가 링크 클릭 + 잡핏 앱에서 수락
  ↓ 양쪽 application 동시 생성 (buddyAppId 양방향 참조)
[자동 분류 — 일반 신청과 동일 룰 적용]
- 양쪽 모두 12h 전 + 정상 워커 + 자리 ≥ 2 → 양쪽 자동 승인
- 한쪽이라도 12h 이내/협의대상/경고3회 → 양쪽 모두 관리자 검토 (B 정상이어도 검토 대상)
  ↓
[관리자 처리 — A안: 묶음 처리]
- 승인: cascadeBuddyApprove() → 짝꿎 자동 승인 + 양쪽 알림
- 거절: cascadeBuddyReject() → 짝꿎 자동 거절 + "같이하기가 거절되었어요" 알림
  ↓
[근무 완료]
- 양쪽 모두 정시 출근 + 퇴근 → 자동 +3,000P × 2 지급
- 한쪽 지각/결근 정정 후 출근 인정 → 관리자 판단으로 [🤝 보너스 지급] 수동 버튼
- 한쪽 결근 → 보너스 자격 자동 소멸
```

**핵심 정책 결정 (8개):**

| # | 정책 | 결정 | 적용 영역 |
|---|---|---|---|
| 1 | 자리 부족 시 (자리 < 2) | **둘 다 신청 불가** + 알바생 앱에 "자리 부족" 안내 팝업 | 알바생 앱 (백엔드 검증) |
| 2 | 한쪽 협의대상/경고3회 페어 | 둘 다 관리자 검토 (정상 알바생까지) | 관리자 화면 ✅ 구현 |
| 3 | 한쪽 자유 취소 (12h 전) | 짝꿎에게 알림 + 본인 선택 (취소/유지) · 보너스 자격은 **양쪽 모두 자동 소멸** | 알바생 앱 (취소) + 관리자 화면 (소멸 표시) ✅ 구현 |
| 4 | 결근/지각 시 보너스 | **양쪽 정시 출근만 자동 지급** · 지각/결근 정정 인정 케이스는 **관리자 판단으로 수동 지급** | 관리자 화면 ✅ 구현 |
| 5 | 친구 응답 없음 | **10분 자동 취소** (알바생 앱에 타이머 표시) | 알바생 앱 |
| 6 | cascade reject 후 재신청 | **자리에 여유 있을 때만** 단독 재신청 가능 | 알바생 앱 (백엔드 검증) |
| 7 | 포인트 합산 | 시간대별(2,000~3,000P) + 같이하기(3,000P) **별도 합산** (예: 새벽 같이하기 = 6,000P) | `pointRewardFor()` + `tryGrantBuddyBonus()` ✅ 구현 |
| 8 | 그룹 크기 | **1:1 페어만** (다중 인원 같이하기는 향후 검토 — 기술 난이도) | 데이터 모델 ✅ 구현 |

**추가 규칙:**

- **미성년자 가입 차단**: 알바생 앱 회원가입 단계에서 차단 (생년월일 검증)
- **탈퇴자 재가입**: 탈퇴 후 30일간 재가입 불가 (전화번호 기준)
- **로그인 불가 시**: 카카오 인증 + SMS 인증 실패 시 10분 후 자동 취소
- **앱 미설치 시**: 같이하기 링크 클릭 → 앱 설치 + 가입 유도 페이지 (Universal Link / App Links)
- **결근 시 페널티 (정책 #4 보충)**:
  - 출근자: 페널티 없음 (단, 같이하기 보너스 자격 소멸)
  - 결근자: **관리자 판단**으로 경고 부여 가능 (기존 5사유 + 같이하기 결근 사유)
- **보너스 지급 시점**: 같이하기 양쪽 멤버가 **출근 + 퇴근** 모두 완료된 시점 (퇴근 시각 기록되는 즉시)

**알바생 앱 영역 vs 관리자 영역 구분:**

| 영역 | 책임 |
|---|---|
| **알바생 앱 (Flutter)** | 친구 호출 링크 발송 / 10분 타이머 / 자리 부족 검증 / 미설치 시 가입 유도 / 자유 취소 / 협의대상 본인 알림 |
| **관리자 웹 (현재 prototype)** | 페어 시각화 (핑크 카드/배경) / cascade 승인·거절 / 보너스 자동·수동 지급 / 정정 시 보너스 트리거 / 감사로그 |

**데이터 모델 추가 필드 (`applications` 테이블):**

```sql
ALTER TABLE applications ADD COLUMN buddy_app_id UUID REFERENCES applications(id);
ALTER TABLE applications ADD COLUMN buddy_role  TEXT CHECK (buddy_role IN ('inviter', 'invitee'));
ALTER TABLE applications ADD COLUMN buddy_bonus_given BOOLEAN DEFAULT FALSE;
-- buddy_app_id 양방향 참조 — 자기 참조 방지 CHECK 필요
ALTER TABLE applications ADD CONSTRAINT no_self_buddy CHECK (id <> buddy_app_id);
```

**Mutation 헬퍼 (`data.js`):**
- `findBuddy(appId)` — 짝꿎 application 조회
- `cascadeBuddyApprove(appId, by, byRole)` — 짝꿎 자동 승인 + 공고 인원 +1
- `cascadeBuddyReject(appId, primaryReason, by, byRole)` — 짝꿎 자동 거절 + 알림
- `tryGrantBuddyBonus(appId, by)` — 양쪽 정시 출근 검증 후 +3,000P × 2 지급

**Supabase 전환 시 주의 (이전 점검 결과):**
- `cascadeBuddyApprove`에서 `j.apply++`가 짝꿎 호출에서 다시 +1 → cap 초과 가능 (현재 P0 버그)
  - 해결: `UPDATE jobs SET apply_count = apply_count + 1 WHERE id = ? AND apply_count + 1 <= cap` 조건부 update
- `tryGrantBuddyBonus` 중복 호출 race → DB 단 `UNIQUE (application_id) ON buddy_bonus_grants` 제약
- 자기 참조 외래키 CHECK + 같은 페어가 동일 jobId여야 함 검증 (cross-job 페어 방지)

---

## 5. mutation 헬퍼 → API endpoint 매핑

[`js/data.js`](js/data.js) 의 mutation 헬퍼를 Supabase API 호출로 교체:

| 프로토타입 헬퍼 | 권장 endpoint | 트랜잭션 (한 트랜잭션으로 묶을 것) |
|---|---|---|
| `approveGpsRequest(id, note, by)` | `POST /api/gps-requests/:id/approve` | `gps_requests UPDATE` + `workers.points UPDATE` + `point_txs INSERT` |
| `denyGpsRequest(id, reason, by)` | `POST /api/gps-requests/:id/deny` | `gps_requests UPDATE` |
| `addExternalWorker(jobId, ...)` | `POST /api/jobs/:id/external-workers` | `job_external_workers INSERT` |
| `removeExternalWorker(jobId, extId)` | `DELETE /api/jobs/:id/external-workers/:extId` | |
| `toggleExternalAttended(jobId, extId)` | `PATCH /api/external-workers/:id` | |
| `setRecruitClosed(jobId, value)` | `PATCH /api/jobs/:id/recruit-closed` | |
| `addWorkerWarning(workerId, ...)` | `POST /api/workers/:id/warnings` | `worker_warnings INSERT` + `workers UPDATE` + (필요 시 `negotiations INSERT`) |
| `releaseNegotiation(workerId)` | `POST /api/workers/:id/release-negotiation` | `workers UPDATE` + `negotiations 처리` |
| `canWithdraw(points, amount)` | (클라이언트 검증, 서버 재검증 필수) | |

서버 측에선 이 헬퍼들이 **하나의 PostgreSQL 트랜잭션** 안에서 실행되어야 데이터 일관성 보장.

---

## 6. 화면 카탈로그 (13페이지 + 모달 N개)

### 사이드바 메뉴 구조
```
홈
공고 관리                  (탭: 리스트 / 등록 / 템플릿)
신청 승인                  ← 알바생 앱 → 관리자 검토
대기열 승인                ← FULL 공고 자리 제안 관리
퇴근 승인                  ← GPS 미검증 + 자동퇴근 미처리
근무자 관리
근무지 관리                (마스터 전용)
협의대상                   (해제는 마스터 전용)
포인트                     (탭: 출금 요청 / 이력 / 회수)
문의
앱 미리보기                (5탭: 홈/공고/내근무/포인트/프로필)
관제 시스템 ⧉             (별도 창 · 전광판 · 다크 테마)
통계 리포트                (탭: 일별 / 월별 / 연간)
관리자 계정                (시스템 설정 · 점검 모드)
```

### 핵심 모달
| 모달 | 위치 | 트리거 |
|---|---|---|
| 경고 부여 (5사유) | 근무자 상세 | "경고 부여 +" 버튼 |
| GPS 승인/반려 | 퇴근 승인 / 공고 상세 | 카드의 승인/반려 버튼 |
| 신청 거절 사유 | 신청 승인 | "거절" 버튼 |
| 협의대상 등록 | 협의대상 페이지 | "+ 수동 등록" |
| 외부 구인 인원 추가 | 공고 상세 | "+ 인원 추가" |
| 출금 처리 실패 | 포인트 페이지 | "실패 처리" |
| 주휴수당 팝업 미리보기 | 공고 등록 폼 | "📱 미리보기" |
| 점검 모드 미리보기 | 관리자 계정 | "📱 알바생 앱 미리보기" |
| 통근버스/지하철 가이드 | 근무지 상세 | "탑승 가이드" 링크 |
| 처리 이력 (신청/협의/포인트) | 다수 위치 | "처리 이력" 버튼 |

---

## 7. 알바생 앱 와이어프레임 매핑 (`잡핏 알바생 앱 · 와이어프레임 v1.pdf`)

| 와이어프레임 화면 | 관리자 웹 미리보기 탭 | 데이터 소스 |
|---|---|---|
| 1. 홈 | "앱 미리보기" → 홈 | `applications` + `pointTxs` + `workers` |
| 2. 알바찾기 | "앱 미리보기" → 공고 | `jobs` (open 상태) + `worksites` |
| 3. 공고 상세 | (관리자 웹 → 공고 관리 → 공고 상세) | 동일 |
| 4. 출근 | (관제 시스템에서 시뮬) | GPS 영역 + 시간 |
| 5. 포인트 | "앱 미리보기" → 포인트 | `pointTxs` |

알바생 앱 Flutter 재구현 시 이 5개 화면 + (스케줄 / 같이하기 / 내정보) 추가.

---

## 8. 이월 안건 (N1~N21)

### 미결정 (사장님 / 보안 검토 필요)
- **N1** 관리자 로그인/계정 인증 방식 최종 확정 (현재 카카오 + 전화번호 2FA)
- **N5** 기간 공고 정의 및 포인트 지급 방식
- **N6** 점검 모드 / 강제 업데이트 도입 여부 — UI는 구현됨, 정책 결정 대기
- **N8** 관리자 1등급 계정 수
- **N9** 관리자 2등급 계정 수 / 담당 근무지 배정안
- **N11** 관제 과거 데이터 보관 기간 (현재 6개월 가정)
- **N13** 토스 출금 실패 시 처리 방침
- **N14** 관리자 2등급 권한 세부 조정 (포인트 한도 등)
- **N18** 관리자 1·2등급 로그인 방식 (2FA 적용 여부)
- **N19** 신청 승인 6시간 초과 시 처리 방침 — UI는 구현됨, 자동 거절 vs 에스컬 결정 필요
- **N21** 관리자 앱 ↔ 웹 동시 로그인 허용 여부

### 구현 완료
- **N3** GPS 영역 설정 UI (다각형 편집)
- **N4** 대기열 (FULL·순번·자동거절·REOPENED)
- **N6** 점검모드/강제업데이트 UI (관리자 계정 페이지)
- **N10** 관제 시스템 필터 (날짜/파트너/근무지/시간대)
- **N12** 엑셀 업/다운로드 모달 (컨텍스트별 컬럼)
- **N15** *(다음 사이클)* 2등급 → 1급/마스터 내부 승인 요청 UI
- **N16** *(다음 사이클)* 템플릿 버전 관리 (현재 정적 표시)
- **N17** 통근버스/지하철 가이드 (모바일 프레임 시뮬)
- **N20** 시간대별 주휴수당 팝업 (5 시나리오 미리보기)

### 운영 후 검토
- 야간 알림 22~08 차단 정책 실제 동작
- GPS 권한 거부 시 대안 (사진 인증 등)
- 택배 조기퇴근 처리 방식
- 동시 접속 SQL 아토믹 체크인

---

## 9. 프로토타입 한계 (재구현 시 자연 해결)

| 한계 | 원인 | 재구현 시 |
|---|---|---|
| `TODAY` 고정 (`'2026-04-23'`) | 시뮬 일관성 위해 | 시스템 시각 사용 |
| 야간 공고 자정 넘긴 wall-clock 처리 | TODAY 고정 | TODAY 자동 갱신으로 자연 해결 |
| 외부 구인 인원 런타임 mutation (페이지 reload 시 초기화) | 백엔드 없음 | DB 영속화 |
| 관제 별도 창 ↔ 메인 창 데이터 동기화 안 됨 | 별도 IIFE | Supabase Realtime subscription |
| `getAttendance()` 결정적 시뮬 (실 출결 X) | 알바생 앱 미구현 | 실제 출결 테이블 |
| 알바생 앱 자체 미구현 | Flutter 재구현 예정 | Flutter 별도 |

---

## 10. 데모 시나리오 (개발자 확인용)

### 10.1 관제 시뮬 시각 추천
| 시각 입력 | 화면 변화 |
|---|---|
| `09:00` | 새벽 공고 종료 · 오전 진행중 多 · 오후/야간 모집 |
| `15:30` | 종료 6 / 진행 6 / 모집 4 균등 (기본 데모) |
| `22:30` | 야간 공고 진행 직후 · 자동 퇴근 카운트다운 시작 |

### 10.2 핵심 테스트 흐름
1. **공고 등록 → 신청 → 승인 → 근무 → 포인트**
   - 공고 관리 → 등록 폼 → 새 공고 → 모집중 표시 → (자동 신청자 채워짐) → 진행 → 종료 → 포인트 지급
2. **외부 구인 → 정원 자동 마감**
   - 공고 상세 → 외부 +N → `apply + ext >= cap` 시 jobStatus='closed' 자동
3. **GPS 승인 → 포인트 지급**
   - 퇴근 승인 페이지 → 카드 "승인" → 메모 입력 → 워커 포인트 +reward
4. **경고 부여 → 협의대상 자동**
   - 근무자 상세 → 경고 부여 3회 → 자동 협의대상 등록
5. **권한 시뮬 (관제 창)**
   - 관제 창 상단 드롭다운 → 박담당(2급) 선택 → 담당 근무지만 노출

### 10.3 데이터 풍부도 (현재)
- 공고 **151건** (현재 + 과거 12개월)
- 신청 **2,788건** (모든 공고에 채워짐)
- 포인트 트랜잭션 **150건** (적립/출금/차감)
- GPS 요청 **52건** (대기 10 / 승인 30 / 반려 12)
- 문의 **30건** (5 카테고리 × 답변 다양)
- 워커 **50명** (베테랑/신규/협의대상 mix)
- 관리자 **9명** (마스터 1 / 1급 3 / 2급 5)

---

## 11. 파일 구조

```
c:\jobpit\
├── index.html              # 관리자 SPA 뼈대 + 디자인 시스템 CSS (~613줄)
├── control.html            # 관제 시스템 별도 창 (다크 테마, ~153줄)
├── js/
│   ├── data.js             # 샘플 데이터 + POLICY + 헬퍼 + mutation API + 자동 시뮬 (~830줄)
│   ├── app.js              # 관리자 SPA 로직 · 13개 페이지 라우터 + 모달 (~7100줄)
│   └── control.js          # 관제 전광판 · 권한 필터 + 자동 갱신 (~460줄)
├── 잡핏_기획안_v1_3.docx
├── 잡핏_변경이력.md
├── 잡핏 알바생 앱 · 와이어프레임 v1.pdf
├── CLAUDE.md               # Claude Code 작업 지침
└── HANDOFF.md              # 이 문서
```

### 코드 진입점
- **관리자 웹**: `index.html` 로드 → `js/data.js` (전역 데이터 + seedFakeData) → `js/app.js` IIFE 실행 → 사이드바 click → `pageRouters[page]()` 호출
- **관제 시스템**: `control.html` 새 창 → 동일 `js/data.js` 다시 로드 (별도 인스턴스) → `js/control.js` IIFE → `render()` 30초 주기

---

## 12. 다음 단계 권장 순서

1. **Supabase 프로젝트 셋업** + 위 SQL 스키마 적용
2. **데이터 마이그레이션** — 현재 `js/data.js` 의 데이터를 SQL INSERT 로 변환
3. **mutation 헬퍼 → REST/RPC 매핑** — `data.js` 의 9개 헬퍼를 Supabase 클라이언트 호출로 교체
4. **관리자 웹 Next.js/Vite 재구현** — 현재 IIFE 코드를 컴포넌트로 분해 (페이지별 ~200줄 이하 권장)
5. **알바생 앱 Flutter 구현** — 와이어프레임 v1 기반
6. **RLS 정책 적용** — admin role + sites 기반
7. **실제 출결 테이블 도입** — `getAttendance()` 시뮬 제거
8. **운영 환경 배포** — Supabase + Vercel/Cloudflare

---

## 부록 A · 코드 컨벤션

- **네이밍**: `pageRouters` 의 페이지 키와 `data-page` 속성 일치
- **글로벌 핸들러**: `window.__xxxYyy` 패턴 (onclick 등 인라인)
- **상태 객체**: `xxxState` 패턴 (예: `jobsState`, `workerState`, `apvState` 등 22개)
- **Render 함수**: `renderXxx()` 패턴
- **Modal 함수**: `showXxxModal()` 또는 `promptModal({...})` (제네릭)
- **Mutation 헬퍼**: 동사 시작 (`approveXxx`, `addXxx`, `setXxx`, `release...` 등)

---

## 부록 B · 알려진 안전 이슈 (운영 전 처리)

- ✅ `esc()` HTML 이스케이프 — 핵심 사용자 입력 필드 적용 완료
- ⚠ XSS 방어 추가 적용 권장 — 모든 동적 innerHTML에 `esc()` 적용 (현재는 사용자 입력 필드만)
- ⚠ CSRF 토큰 — Supabase API 호출 시 인증 토큰 자동 처리됨 (RLS 활성화 필수)
- ⚠ 비밀번호/계좌번호 마스킹 — `account` 필드 표시 시 마지막 4자리만 노출 권장

---

**문의**: 추가 질문은 `잡핏_변경이력.md` (v1.0~v1.3 변경 이력) + `잡핏_기획안_v1_3.docx` (공식 기획안) 함께 참조.
