# 잡핏(JobFit) 개발자 인계 패키지 v1.0

**인계일**: 2026-05-01
**대상**: 백엔드 + 프론트엔드 개발자 (Supabase 연동 + React 재구현 담당)

---

## 📦 패키지 구성

```
잡핏_개발자_인계_v1.0/
├── README.md                    ← 이 파일 (가장 먼저 읽기)
├── 잡핏_기획안_v1_4.md          ← 전체 서비스 기획안 (최신)
├── HANDOFF.md                   ← 외부 개발자 인계 문서 (Supabase 스키마 + API 매핑)
├── CLAUDE.md                    ← 프로토타입 작업 지침 (구조·정책 요약)
├── 잡핏_변경이력.md              ← v1.0 ~ v1.4 전체 변경 이력
├── 통근버스 시간표.xlsx          ← 곤지암 MegaHub 실 시간표 v1 (참고)
├── index.html                   ← 관리자 웹 진입점 (HTML + CSS, ~430줄)
└── js/
    ├── data.js                  ← 데이터 모델 + POLICY + 헬퍼 + Supabase 시드 (~1,000줄)
    └── app.js                   ← 앱 로직 (IIFE, ~12,000줄)
```

---

## 🚀 빠른 실행

```bash
# 1. 폴더 진입
cd 잡핏_개발자_인계_v1.0/

# 2. 정적 서버 띄우기 (Python)
python -m http.server 8000

# 또는 Node
npx serve

# 3. 브라우저: http://localhost:8000
```

> 카카오맵 API 키는 [index.html](index.html) 에 임시 키가 들어있습니다.
> 실서비스 도메인으로 옮길 때 [Kakao Developers](https://developers.kakao.com)에서 도메인 등록 + 새 키 발급 필요.

---

## 📋 읽기 순서 (필수)

1. **[잡핏_기획안_v1_4.md](잡핏_기획안_v1_4.md)** — 비즈니스 룰·정책·출시 로드맵 전체 (1~2시간)
2. **[HANDOFF.md](HANDOFF.md)** — Supabase 스키마 + mutation 헬퍼 매핑 + 화면 카탈로그 (개발 작업 직접 영향, 2~3시간)
3. **[CLAUDE.md](CLAUDE.md)** — 프로토타입 코드 구조·정책 상수 위치 (코드 수정 전 필독, 30분)
4. **[잡핏_변경이력.md](잡핏_변경이력.md)** — 정책 변경 이력 (이월 안건 N1~N31 결정/미결정 추적, 30분)

---

## ⚠ 가장 중요 — 잡핏 = 중계업체

| 구분 | 누가 지급 | 금액 | 코드 필드 |
|---|---|---|---|
| **알바비** (일급/시급) | 파트너사 → 알바생 직접 | 100,000~125,000원 | `j.wage` (단위: **원**) |
| **잡핏 포인트** | 잡핏 → 알바생 | 기본 1,000P (공고별 조정 가능) | `pointRewardFor(j)` (단위: **P**) |

→ 잡핏은 **포인트만 지급**. 알바비/주휴수당 지급 책임은 파트너사. 정산 리포트는 안내·집계용.

---

## 🎯 인계 단계 (Phase 분리)

이 패키지는 **Phase 1 — 관리자 웹 프로토타입 완성** 산출물입니다.

### Phase 1: 관리자 웹 프로토타입 ✅ 완료

- 14개 운영 페이지 (홈/공고/신청/대기열/퇴근/취소 승인/근무자/협의대상/근무지/포인트/문의/관제/통계/정산/계정/감사로그)
- 11개 데이터 entity 모델링
- mutation 헬퍼 30+ 개 (Supabase RPC 매핑 가능)
- 권한 3단계 + 정책 상수 통합 (`POLICY` 객체)
- 통근버스 매트릭스 모델 + 자동/수동 알림 시스템

### Phase 2: 개발자 작업 영역 (이번 인계 대상)

1. **Supabase 셋업** — PostgreSQL 스키마 11+ 테이블 (HANDOFF.md §3 참조)
2. **데이터 마이그레이션** — `js/data.js` 시드 → SQL INSERT
3. **mutation 헬퍼 → REST/RPC 매핑** — HANDOFF.md §5 참조
4. **관리자 웹 재구현** — 현재 Vanilla JS IIFE → Next.js/Vite + React
5. **RLS 정책 적용** — 3단계 권한 × 11테이블 (HANDOFF.md §3.2)
6. **실 출결 테이블 도입** — `getAttendance()` 시뮬 제거
7. **FCM + 카카오 비즈니스** 연동
8. **운영 환경 배포** — Vercel/Cloudflare + Supabase Pro

→ 예상 기간: **2~3개월** (외주 1~2명 동원 시)

### Phase 3: 알바생 앱 + 관리자 앱 (Phase 2 완료 후)

Phase 2 (관리자 웹 + Supabase) 완료 후 진행:
- **Flutter 3.x** (iOS/Android 단일 코드베이스)
- 알바생 앱 5+ 화면 / 관리자 앱 4탭 (현장용)
- 카카오 로그인 + GPS + FCM + 카카오맵
- 베타 테스트 → 정식 출시

→ 예상 기간: **3~4개월**

---

## 🛠 현재 프로토타입의 한계 (재구현 시 자연 해결)

| 한계 | 원인 | Phase 2 해결 방법 |
|---|---|---|
| `TODAY` 고정 (`'2026-05-01'`) | 시뮬 일관성 위해 | 시스템 시각 사용 |
| 외부 구인 인원 런타임 mutation | 백엔드 없음 | DB 영속화 |
| 통근버스 시간표 업로드 = 메모리만 | localStorage조차 없음 | Supabase 테이블 영구 저장 |
| 알림 발송 = 토스트/콘솔 시뮬 | FCM 미연결 | FCM + 카카오 알림톡 |
| `getAttendance()` 결정적 시뮬 | 실 출결 테이블 없음 | 실 출결 테이블 + Realtime 구독 |
| 알바생 앱 자체 미구현 | Flutter 별도 작업 | Phase 3에서 제작 |

---

## 🔑 핵심 정책 상수 (`POLICY` 객체)

[`js/data.js`](js/data.js) 의 `POLICY` 객체 — 정책 변경 시 한 곳만 수정:

| 상수 | 값 | 의미 |
|---|---|---|
| `POINT_MIN_WITHDRAW` | 30,000P | 출금 가능 최저 보유 |
| `POINT_WITHDRAW_UNIT` | 10,000P | 출금 단위 |
| `POINT_DAILY_MAX` | 100,000P | 1일 출금 한도 |
| `POINT_CANCEL_DEDUCT` | 1,000P | 단순 변심 자동 차감 |
| `AUTO_CHECKOUT_MIN` | 360 (6h) | 종료+N분 자동 퇴근 |
| `APPROVAL_LIMIT_MIN` | 360 (6h) | 신청 승인 6h 초과 경고 |
| `URGENT_RECRUIT_MIN` | 720 (12h) | 시작 12h 내 미충원 긴급 |
| `CANCEL_FREE_MIN` | 720 (12h) | 자유 취소 시한 |
| `WARN_LIMIT` | 3 | 경고 N회 → 협의대상 |
| `WL_OFFER_FAR_MIN` | 120 (2h) | 24h 전 자리제안 수락 시간 |
| `WL_OFFER_NEAR_MIN` | 30 | 24h 이내 자리제안 수락 시간 |
| `WL_FACTOR` | 2 | 대기열 상한 = cap × N |
| `BUDDY_BONUS_AMOUNT` | 3,000P | 같이하기 보너스 (각자) |
| `PRE_WORK_REMINDER_MIN` | 60 | 근무 시작 N분 전 자동 알림 |

---

## 📌 미해결 정책 (사장님 결정 대기 — Phase 1.5)

[잡핏_기획안_v1_4.md §17](잡핏_기획안_v1_4.md) 이월 안건:

- **N1** 관리자 로그인·계정 인증 방식
- **N5** 기간 공고 정의 + 포인트 지급
- **N6** 점검 모드 / 강제 업데이트
- **N8/N9** 관리자 1·2등급 실 인원 + 담당 근무지 배정
- **N13** 토스 출금 실패 처리
- **N14** admin2 권한 세부 (포인트 한도)
- **N18** admin1·2 로그인 2FA
- **N19** 신청 승인 6h 초과 처리
- **N21** 관리자 앱 ↔ 웹 동시 로그인
- **N28** 모집 대기 공고 자동 정리
- **N30** 출결 정정 사후 가능 기간
- **N31** 통근버스 운영 중단 대응 (폭설·사고)

→ Supabase 셋업 전에 사장님과 결정 미팅 권장

---

## ⚖ 법적 검토 사항 (출시 전 필수)

| 항목 | 기관 |
|---|---|
| 전자 근로계약서 법적 유효성 | 법무법인 |
| 포인트-현금 출금 (토스 연동) | 전자금융업 등록 |
| 포인트 유효기간 1년 적합성 | 법무법인 |
| 산재보험 가입 의무 주체 | 법무법인 |
| 4대보험 일용직 처리 | 법무법인 |
| 개인정보처리방침 / 동의 | 법무법인 |
| 주휴수당 동일 근무지 기준 | ✅ 노동법 자문 완료 (v1.1) |

---

## 🔌 외부 서비스 (Phase 2 셋업 필요)

| 서비스 | 용도 | 비용 |
|---|---|---|
| Supabase | DB / Auth / Storage / Realtime | Free (Pro: $25/월) |
| Vercel 또는 Cloudflare | 관리자 웹 호스팅 | Free / $20/월 |
| Firebase (FCM) | 푸시 알림 | Free |
| 카카오 비즈니스 | 알림톡 / 카카오 인증 | 사용량 과금 |
| 카카오맵 | 통근버스 가이드 | Free (도메인 등록) |
| 토스 Payments | 포인트 출금 자동화 | 전자금융업 등록 후 |

---

## 📂 코드 구조

### 스크립트 로딩 순서 ([index.html](index.html))

1. 카카오맵 SDK (CDN, autoload=false)
2. SheetJS (CDN, 통근버스 시간표 XLSX 입출력)
3. `js/data.js` — 모든 데이터 배열/객체 + 헬퍼 + mutation API
4. `js/app.js` — IIFE로 래핑, 모든 페이지 렌더 + 핸들러

### 자주 수정하는 곳

| 무엇 | 어느 파일 | 찾는 법 |
|---|---|---|
| 페이지 렌더 함수 | `js/app.js` | `render*()` 로 grep |
| 모달 | `js/app.js` | `showXxxModal` / `.jf-modal-overlay.xxx-form` |
| 이벤트 핸들러 | `js/app.js` | `window.__xxx` 로 grep |
| 시드 데이터 | `js/data.js` | 배열 이름으로 grep (`const worksites`, `const jobs` 등) |
| 정책 상수 | `js/data.js` | `POLICY` 객체 |
| 통근버스 시간표 | `js/data.js` | `busRoutesBySite` (매트릭스 모델) |
| 디자인 시스템 | `index.html` | `</style>` 위 CSS |
| 사이드바 메뉴 | `index.html` | `.jf-nav-item[data-page]` |

### 구문 검증 명령

```bash
node -e "const fs=require('fs');const d=fs.readFileSync('js/data.js','utf8');const a=fs.readFileSync('js/app.js','utf8');try{new Function(d+'\n'+a);console.log('OK');}catch(e){console.log('FAIL',e.message)}"
```

---

## 📝 개발자 체크리스트 (Phase 2 시작 전)

- [ ] 패키지 4개 문서 모두 읽기 (위 "읽기 순서" 참조)
- [ ] 사장님과 미해결 정책 12건 결정 미팅 일정 잡기
- [ ] 법무법인 자문 일정 확보 (전자계약·산재·개인정보)
- [ ] Supabase 프로젝트 생성 + 스키마 SQL 작성 시작
- [ ] Firebase 프로젝트 + 카카오 비즈니스 등록
- [ ] React + Next.js 컴포넌트 라이브러리 결정 (shadcn/ui 권장)
- [ ] 베타 테스트 근무지 선정 (곤지암 MegaHub 권장 — 통근버스 데이터 완비)

---

## 🆘 질문/지원

- 정책 결정 사항: 사장님 직접 문의
- 코드 구조 질문: CLAUDE.md + HANDOFF.md 참조
- 추가 컨텍스트 필요 시: GitHub repo 변경 이력 — https://github.com/mogi-jeong/jobfit

---

— 이상 —
© 2026 잡핏(JobFit) · 인계 패키지 v1.0
