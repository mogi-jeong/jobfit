# 잡핏(JobFit) 관리자 웹 — Claude Code 작업 지침

## 프로젝트 개요

잡핏(JobFit)은 웨딩홀 서빙·택배 물류 등 단기 알바를 알선하는 **중계 플랫폼**.

- **비즈니스 모델**: 중계업체 — 알바비는 파트너사가 알바생에게 **직접 지급**, 잡핏은 **앱 사용 보상 포인트만** 지급 (소액)
- **구조**: 의뢰 기업(파트너사) → 잡핏(테스트 마스터 1인 운영) → 알바생 매칭
- **타깃**: 웨딩홀 서빙, 택배 물류 (CJ대한통운 6곳, 롯데택배 3곳, 컨벤션 2곳 = 총 11개 근무지)
- **현재 단계**: 관리자 웹 프로토타입 (디자인 레퍼런스, 이후 Flutter + Supabase로 재구현 예정)

### 배포

- **URL**: https://mogi-jeong.github.io/jobfit/
- **Repo**: https://github.com/mogi-jeong/jobfit
- **방식**: GitHub Pages (`main` 브랜치 루트 `index.html`)
- Push 후 1~3분 내 반영. 새로고침은 `Ctrl+Shift+R` 권장 (캐시 무효화).

---

## ⚠️ 가장 중요한 규칙 — 잡핏 = 중계업체

**절대 혼동하지 말 것:**

| 구분 | 누가 지급 | 금액 | 어디 표시 |
|---|---|---|---|
| **알바비 (일급/시급)** | 파트너사가 알바생에게 직접 | 100,000원~125,000원 | 공고 정보의 `j.wage`, 단위는 **원** |
| **잡핏 포인트** | 잡핏이 알바생에게 | 기본 1,000P (공고별 조정 가능) | 관제 시스템 등, 단위는 **P** |

- **잡핏은 포인트만 지급함.** 알바비 지급 책임 없음 (파트너사 몫).
- 포인트 보상: **모든 공고 기본 1,000P** — 마스터/관리자가 공고 등록·수정 시 공고별로 자유 조정 (`pointRewardFor()` 헬퍼: `j.point` 우선, 없으면 `DEFAULT_POINT_REWARD=1000`)
- 출금 정책: 최초 3만P 달성 시, 1만P 단위, 1일 최대 10만P, **반자동 처리** (수동 이체 후 처리 완료 클릭)

UI에서 "포인트 지급"이라는 표현 쓸 때 반드시 `j.wage` 가 아니라 `pointRewardFor(j)` 값을 써야 함.

---

## 기술 스택

### 현재 프로토타입

- **3파일 구조** (v0.6부터 분리됨):
  - `index.html` — HTML 뼈대 + CSS (~430줄) · 레이아웃 + 디자인 시스템
  - `js/data.js` — 샘플 데이터 (~250줄) · **Supabase 스키마 설계 참고용**
  - `js/app.js` — 앱 로직 (~5,430줄) · IIFE 래핑 · 헬퍼 + 렌더 + 핸들러
- **Kakao Maps JavaScript API** (services, drawing 라이브러리)
  - JS 키: `4f478e9f00aaf4d8b3432db26f3d1aa2`
  - 허용 도메인: `https://mogi-jeong.github.io`, `http://localhost`, `http://127.0.0.1:5500`
- **바닐라 JS** — 프레임워크 없음. IIFE로 스코프 격리
- **GitHub Pages 배포**

### 실제 앱 구현 시 (참고용)

- 알바생/관리자 앱: **Flutter 3.x** (iOS/Android 단일 코드베이스)
- 백엔드: **Supabase** (PostgreSQL / Auth / Storage)
- 지도: `kakao_map_plugin` 1차 / iOS 이슈 시 `flutter_naver_map` 대체
- 포인트 출금: 반자동 (토스 자동화는 전자금융업 등록 후 별도 계약)
- 알림: FCM

---

## 용어 체계

| 내부 (DB/관리자/기획안) | 알바생 UI 노출 |
|---|---|
| **파트너사** | 업종 |
| **근무지** | 지역 |

**금지 용어**:
- ❌ "블랙리스트" → ✅ **"협의대상"** (노조 이슈로 통일 변경)
- 주 4일 제한은 구체 명칭 "CJ대한통운 / 롯데택배" 사용

---

## 권한 체계 (3단계)

| 권한 | 범위 | 주요 기능 |
|---|---|---|
| **마스터** (1명) | 전체 | 모든 권한 + 관리자 계정 관리 + 근무지 등록/GPS 영역 설정 + **협의대상 해제 (마스터 전용)** |
| **관리자 1등급** (소수) | 전 근무지 | 2등급 계정 관리 / 사장님 부재 대비 |
| **관리자 2등급** (현장) | 배정된 근무지 | 경고 부여/해제 (담당 근무지) / 복수 파트너사 교차 담당 가능 |

- 관제 시스템은 등급 무관 전원 접근 (전 근무지 열람)
- 현재 프로토타입은 **마스터 권한 기준**으로 구현
- 로그인 화면에서 등급 선택 가능 (데모)

---

## 현재 구현 상태 (v0.5)

### ✅ 완성된 페이지 (사이드바 11개 전부)

1. **홈 대시보드** — KPI 8개 · 알림 박스 · 오늘 진행 공고 · 최근 활동 · 빠른 이동 버튼
2. **공고 관리** — 4탭:
   - 공고 리스트 (필터 · 리스트/캘린더 뷰 · 카드 · 대기열 뱃지)
   - 공고 등록 폼 (달력 복수 날짜 · 시간대 동적 슬롯 · 3개 토글)
   - **대기열 관리** (FULL·순번·수락 대기·자동거절·REOPENED 실시간 타이머)
   - 템플릿 관리 (근로계약서/안전교육 PDF)
3. **신청 승인** — 협의대상/경고3회/12h 뱃지 · 우선순위 정렬 · 승인/거절
4. **근무자 관리** — 50명 근무자 · 검색·필터 · 상세(경고 이력 타임라인)
5. **관제 시스템** — 실시간 공고 카드 · **도넛 차트** 출결 · 알바생 명단 · 계약서/서명 모달
6. **근무지 관리** — 파트너사 아코디언 · GPS 다각형 편집 · 주소 검색 · 출근 시뮬
7. **협의대상** — 전화번호 기반 · 수동 등록 · 해제 (마스터 전용)
8. **포인트** — 3탭 (출금 요청/이력/회수) · 반자동 처리 UI
9. **문의** — 답변 시스템 · 응답시간 KPI
10. **통계 리포트** — 기간 토글 · 파트너사 바 차트 · TOP5 랭킹 · 시간대 도넛 · 7일 트렌드
11. **관리자 계정** — 3단계 권한 · 담당 근무지 체크박스 배정

### ✅ 모달/보조 폼

- 공고 수정 폼 (단일 공고, 등록 폼 별도)
- 공고 상세 페이지 (신청자 목록 · 모집 현황 · 대기열 · 공유 링크)
- 근무지 추가 wizard (4단계 스텝 + 카카오맵 주소 검색)
- 근무지 정보 수정 모달, 삭제 (진행 중 공고 체크)
- 파트너사 추가/수정 모달
- 관리자 로그인 (카카오 + 전화번호 2FA · 등급 선택)
- 관리자 계정 생성 모달 (등급별 권한 설명 · 2등급 근무지 체크)
- 알림 발송 모달 (근무자/그룹/관리자 · 3분류 · 야간제한/예약)
- 엑셀 업/다운로드 모달 (컨텍스트별 컬럼 설명)
- 처리 이력 전체 보기 (신청/협의대상/포인트 통합 타임라인)

### ⏳ 미구현 (남은 작업)

1. **자동 퇴근 처리 UI** — 종료 시간 알람 + 5분 단위 반복 + 종료+6h 후 자동 처리 상태 표시 (관제 시스템 확장)
2. **GPS 미검증 퇴근 승인** — 영역 밖 퇴근 시 사유 입력 → 관리자 승인 → 포인트 지급 여부 결정 플로우
3. **경고 부여 사유 선택 UI 정교화** — 현재 `prompt` 자유 입력 → 5가지 radio 버튼 (12h 이내 취소 / 지각 / 무단결근 / 무응답 / GPS 미검증)
4. **주휴수당 팝업 실제 UI 미리보기** — 공고 등록 폼 토글만 있음. 알바생 앱에서 어떻게 뜨는지 모바일 프레임 미리보기 필요
5. **알바생 앱 미리보기 화면** — 별도 사이드바 메뉴로 추가하면 좋음 (홈/공고/내근무/포인트/프로필)
6. **N 이월 안건들** — 강제 업데이트/점검 모드(N6), 통근버스 탑승 가이드(N17), 신청 승인 6h 초과 처리(N19) 등

---

## 핵심 비즈니스 규칙 요약

### 알바생 관련
- 하루 **1건 신청만 가능** (시간대 다른 공고라도 중복 불가)
- 미성년자 가입 불가
- 택배(CJ/롯데) 파트너사별 주 4일 제한
- 공고 FULL 시 대기 신청 (모집인원 × 2까지)

### 신청 승인 플로우
- 근무 시작 **12시간 전** 신청: 자동 승인
- 근무 시작 **12시간 이내** 신청: 관리자 승인 필요
- **협의대상 / 경고 3회 이상**: 시간 무관 관리자 승인
- 승인 대기 제한시간: 최대 6시간 (N19 이월)

### 경고 및 협의대상 (관리자 재량 판단, 자동 아님)
- 대상 사유: 12h 이내 취소 / 지각 / 무단결근 / 무응답 / GPS 미검증
- 경고 3회 누적 → 자동 협의대상 등록
- 협의대상 = 전화번호 기반 (재가입 시 자동 매칭)
- 해제는 **마스터 전용**, 영구 차단 없음

### GPS
- 출근/퇴근 검증: **근무지별 다각형 영역** (500m 고정 아님)
- 퇴근 시 영역 밖일 경우: 사유 + 승인 후 포인트 지급
- 마스터가 근무지 최초 등록 시 영역 설정

### 공고
- 같은 근무지·날짜에 **시간대 다른 공고 여러 개 등록 가능**
- 등록 시 계약서/안전교육/주휴수당팝업 각각 on/off 토글
- 담당자 전화번호 필수 + 알바생에게 공개

### 취소
- 근무 시작 12h 전까지: 자유 취소
- 12h 이내 취소: 사유 작성 후 관리자 검토
- 단순 변심 취소: **1,000P 자동 차감** (경고와 별개)

### 종료/자동 퇴근
- 종료 시간 알람 + 퇴근 미처리 시 5분 단위 반복 (최대 6h)
- 종료 + 6h 후 자동 퇴근 처리

### 대기열 (v1.2 핵심)
- FULL 시 대기 신청 (모집인원 × 2까지)
- 누군가 취소 → 대기 1번에게 "자리 제안" 알림
- 수락 제한시간: **24h 전 2시간 / 24h 이내 30분**
- 시간 초과 → 자동 거절 → 다음 대기자 이관
- 모든 대기자 실패 → `reopened=true` (일반 모집 재개)

### 알림
- 야간 제한: 22:00~08:00 발송 금지 (출근/대기열 예외)
- 3분류: 서비스 / 마케팅 / 긴급 구인
- 마케팅·긴급 구인은 동의자에게만

### 주휴수당 팝업 (v1.3)
- **컨벤션**: 이번 주 2일째 신청 시 팝업
- **CJ/롯데**: 이번 주 N회 출근 상태에서 4회 만근 안내 팝업

---

## 실제 근무지 데이터 (프로토타입)

### CJ대한통운 (6곳)
| ID | 이름 | 위치 | GPS |
|---|---|---|---|
| `gonjiam` | 곤지암 MegaHub | 경기 광주시 도척면 | ✅ |
| `yongin` | 용인 Hub | 경기 용인시 처인구 양지면 | ✅ |
| `gunpo_a` | 군포 Hub_A | 경기 군포시 부곡동 | ✅ |
| `gunpo_b` | 군포 Hub_B | 경기 군포시 금정동 | ❌ |
| `icheon` | 이천 MpHub | 경기 이천시 부발읍 | ✅ |
| `anseong` | 안성 MpHub | 경기 안성시 공도읍 | ✅ |

### 롯데택배 (3곳)
| ID | 이름 | 위치 | GPS |
|---|---|---|---|
| `jincheon` | 진천 MegaHub | 충북 진천군 이월면 | ✅ |
| `namyangju` | 남양주 Hub | 경기 남양주시 화도읍 | ❌ |
| `gunpo_l` | 군포 Hub | 경기 군포시 당정동 | ✅ |

### 컨벤션 (2곳)
| ID | 이름 | 위치 |
|---|---|---|
| `ltower` | L타워 웨딩홀 | 서울 강남구 테헤란로 |
| `whills` | W힐스 웨딩홀 | 서울 서초구 서초대로 |

---

## 데이터 모델 (`index.html` 안의 전역 배열/객체)

| 변수 | 설명 | 개수 |
|---|---|---|
| `worksites` | 파트너사 키 → 근무지 배열 (cj/lotte/convention) | 3개 파트너사, 11개 근무지 |
| `jobs` | 공고 (siteId, date, slot, start, end, cap, apply, wage, ...) | 20건 |
| `workers` | 알바생 (id, name, phone, warnings, total, points, negotiation, ...) | 50명 |
| `applications` | 신청 (workerId, jobId, status, reason, processedAt...) | 10건 (7건 pending) |
| `negotiations` | 협의대상 (전화번호 기반) | 8건 |
| `pointTxs` | 포인트 트랜잭션 (출금/차감) | 12건 |
| `admins` | 관리자 계정 | 9명 (마스터 1 + 1급 3 + 2급 5) |
| `inquiries` | 문의 | 6건 |
| `templates` | 계약서/안전교육 템플릿 | 6개 |
| `waitlist` | 대기열 엔트리 | 13건 |

### 핵심 헬퍼 함수

- `findSite(siteId)` → `{ site, partner, partnerKey }`
- `findWorker(id)`, `findJob(id)`, `findApp(id)`, `findWl(id)`, ...
- `jobStatus(j)` → `open | closed | progress | done`
- `pointRewardFor(j)` → 시간대별 포인트 (2000/2500/3000)
- `attendanceSummary(jobId)` → `{ 출근, 지각, 결근, 대기 }`
- `donutSvg(segments, size, thick)` → SVG 도넛 차트
- `attendanceDonut(sum, size, thick)` → 출결 도넛 위젯

---

## 디자인 시스템

### 컬러 팔레트
```css
#1B3A6B  /* 딥 네이비 — 사이드바, 헤더, 브랜드 */
#1E40AF  /* 인디고 — 강조 */
#2563EB  /* 로열 블루 — CTA 버튼, 활성 상태 */
#22C55E  /* 성공 — 출근, 정상 */
#F59E0B  /* 경고 — 지각, 대기 */
#EF4444  /* 에러 — 결근, 협의대상 */
#6B7684  /* 보조 텍스트 */
#F5F7FA  /* 배경, 메트릭 카드 배경 */
```

### 상태 뱃지
- 성공: `background:#DCFCE7; color:#166534`
- 경고: `background:#FEF3C7; color:#92400E`
- 에러: `background:#FEE2E2; color:#991B1B`
- 정보: `background:#DBEAFE; color:#1E40AF`

### 컴포넌트
- 버튼 최소 높이: 36px (모바일 48px)
- border-radius: 8px (기본), 12px (카드/패널)
- 카드: `#fff` + `0.5px solid rgba(0,0,0,0.1)` + 18px padding
- 메트릭 그리드: 4열 (`.jf-metric-grid`)
- 기본 폰트 크기: 14px / 타이틀 22px

### 클래스 접두사
- `jf-*` 공통 레이아웃 (`jf-layout`, `jf-sidebar`, `jf-main`, `jf-panel`, `jf-metric-*`, `jf-form-row`, `jf-tabs`, `jf-tab`, `jf-modal-*`, `jf-table-*`, `jf-placeholder`)
- `ws-*` 근무지 (`ws-partner`, `ws-site-row`, `ws-info-row`, `ws-section-title`, `ws-gps-*`)
- 페이지별:
  - 공고: `jobs-*` (card, status, progress, cal, ...)
  - 신청 승인: `apv-*` (card, badge, actions)
  - 관제: `ctrl-*` (card, roster, donut)
  - 통계: `stat-*` (chart, rank, trend)
  - 대기열: `wl-*` (group, row, timer-wrap, ring, reopened, badge)
  - 로그인: `login-*` (overlay, card, kakao, step, ...)

---

## 레이아웃 구조

```
.jf-layout (display: grid, 220px + 1fr)
├── .jf-sidebar  (220px, 배경 #1B3A6B)
│   ├── .jf-brand  (로고)
│   ├── .jf-nav-item × 11  (홈/공고/신청/근무자/관제/근무지/협의/포인트/문의/통계/계정)
│   └── .jf-user  (하단, 테스트 [마스터] + 로그아웃)
└── main.jf-main  (padding: 28px 32px, 콘텐츠 영역)
```

사이드바 뱃지: 신청 승인 옆에 빨간 숫자 (대기 건수) — `updateApprovalBadge()` 로 동적 갱신

---

## 파일 구조

```
C:\jobpit\
├── index.html                # HTML 뼈대 + CSS + <script src> 참조 (~430줄)
├── js/
│   ├── data.js               # 샘플 데이터 (~250줄) — Supabase 스키마 참고용
│   └── app.js                # 앱 로직 (~5,430줄) — IIFE · 헬퍼·렌더·핸들러
├── 잡핏_기획안_v1_3.docx    # 전체 기획안 v1.3
├── 잡핏_변경이력.md          # v1.0 → v1.3 전체 변경 내역
└── CLAUDE.md                 # 이 파일
```

### 스크립트 로딩 순서 (중요)

`index.html` 에서 다음 순서로 로드됨:
1. 카카오맵 SDK (CDN · autoload=false)
2. `js/data.js` — 모든 데이터 배열/객체를 Script scope에 정의 (top-level `const`)
3. `js/app.js` — IIFE로 래핑, data.js의 전역 상수 참조

**주의**: 파일 3개 구조 유지. 추가 분할(페이지별 등)은 지금 시점에서 불필요.

---

## 코드 스타일

### HTML
- 한국어 UI, 한국어 주석
- 인라인 이벤트: `onclick="window.__xxx(...)"` 전역 네임스페이스
- 시맨틱 태그 (header, main, aside, section)

### CSS
- 관련 클래스끼리 그룹화하고 `/* 섹션 이름 */` 주석 구분
- 유틸리티보다 시맨틱 네이밍 선호

### JavaScript
- 바닐라 JS, IIFE로 스코프 격리 (`(function(){ ... })()`)
- 전역 핸들러는 `window.__xxx` 네임스페이스 (예: `window.__wlAccept`)
- 페이지 상태는 전역 state 객체 (`jobsState`, `apvState`, `workerState`, ...)
- 렌더 함수는 `render*()` 이름 (예: `renderJobsList`, `renderJobDetail`)
- 한국어 주석 선호

### 구조
- 상단: `const TODAY = '2026-04-23';` (시뮬레이션 기준일)
- 데이터 배열 정의 → 헬퍼 함수 → 페이지 렌더 함수 → 핸들러 → 초기화

---

## Git 워크플로우

```bash
# 수정
# (Edit/Write 도구로 파일 편집)

# 검증 (JS 구문 체크 — 두 파일 합쳐서)
node -e "const fs=require('fs');const d=fs.readFileSync('c:/jobpit/js/data.js','utf8');const a=fs.readFileSync('c:/jobpit/js/app.js','utf8');try{new Function(d+'\\n'+a);console.log('✓ OK');}catch(e){console.log('✗',e.message)}"

# 커밋 + push
git -C c:/jobpit add index.html js/
git -C c:/jobpit commit -m "기능 요약 (한글 간결하게)"
git -C c:/jobpit push origin main
```

### 커밋 메시지 스타일
- 현재까지 사용한 패턴: 한글 간결체 (ex: "대기열 시스템 구현 (FULL·순번·수락 대기·자동거절·REOPENED·실시간 타이머)")
- 영문 prefix 안 씀 (feat:/fix: 등 불필요)

### 브랜치 전략 — 스냅샷 보관용

Main 브랜치에서 계속 작업하되, **큰 구조 변경이 있는 시점마다 스냅샷 브랜치**를 만들어 보관.

| 브랜치 | 생성 시점 | 내용 |
|---|---|---|
| `main` | 항상 최신 | 진행 중 · GitHub Pages 배포 대상 |
| `v0.6-file-split` | 2026-04-24 | 파일 3분할 완료 시점 (index.html + js/data.js + js/app.js) |

**스냅샷 만드는 법:**
```bash
# 현재 상태를 새 브랜치로 보존 (main은 그대로)
git -C c:/jobpit checkout -b v0.7-설명
git -C c:/jobpit push -u origin v0.7-설명
git -C c:/jobpit checkout main  # main으로 복귀
```

**스냅샷으로 복원:**
```bash
# 스냅샷 보기만 (일시 이동)
git -C c:/jobpit checkout v0.6-file-split

# main을 스냅샷 시점으로 되돌리기 (되돌아가서 다시 시작)
git -C c:/jobpit checkout main
git -C c:/jobpit reset --hard v0.6-file-split
git -C c:/jobpit push --force-with-lease origin main  # 주의: 이후 커밋 소실
```

**언제 스냅샷을 만들어야 하나:**
- 큰 리팩토링 완료 후 (파일 분리, 구조 변경 등)
- 대형 기능 추가 직전 (롤백 대비)
- 외부에 공유하기 전 안정 버전
- 버전 번호가 올라갈 만한 변화 (v0.6 → v0.7)

**⚠ 주의:** 스냅샷 브랜치는 **다시 건드리지 않음** (그 시점 고정 보관 용도). 새 작업은 항상 `main` 에서.

---

## Claude Code 작업 팁

### 새 세션에서 바로 시작하려면

1. 이 CLAUDE.md 먼저 훑고
2. `Glob` 로 `c:/jobpit/*.html` 확인
3. `Grep` 으로 특정 기능 찾기 (예: 헬퍼 함수명, 페이지명)
4. 토큰 아끼려면 **전체 파일 Read 금지** — 필요한 섹션만 offset으로

### 자주 수정하는 곳

| 무엇 | 어느 파일 | 찾는 법 |
|---|---|---|
| 페이지 렌더 함수 | `js/app.js` | `render*()` 로 Grep |
| 특정 모달 | `js/app.js` | `showXxxModal` / `.jf-modal-overlay.xxx-form` |
| 이벤트 핸들러 | `js/app.js` | `window.__xxx` 로 Grep |
| 샘플 데이터 수정/추가 | `js/data.js` | 배열 이름으로 Grep (`const worksites`, `const jobs` 등) |
| 레이아웃/디자인 | `index.html` | `</style>` 바로 위에 CSS 추가 |
| 사이드바 메뉴 | `index.html` | `.jf-nav-item[data-page]` 찾기 |

### 커밋 전 체크리스트

1. **JS 구문 검증** (위 node 명령어)
2. **기능 동작 확인** — 필요 시 카카오맵 로딩 여부, 버튼 클릭 플로우
3. **커밋 메시지 한 줄로** — 한글, 간결, 기능 중심

### 프로토타입 특성

- 실제 DB 없음 — 하드코딩 데이터 (`const jobs = [...]` 등)
- 페이지 새로고침 시 변경사항 초기화 (공고 폼 임시저장만 localStorage)
- 실제 배포는 Flutter + Supabase 로 재구현 — 현재는 **디자인 레퍼런스** 용도

---

## 참고 문서

- `잡핏_기획안_v1_3.docx` — 전체 기획안 (최신)
- `잡핏_변경이력.md` — v1.0 → v1.3 전체 변경 이력 + 미확정 이월 안건(N1~N21)
- [Kakao Maps API](https://apis.map.kakao.com/web/documentation/)
- [GitHub Pages](https://docs.github.com/en/pages)
