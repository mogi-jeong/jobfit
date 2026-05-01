# 🚀 다음 세션 진입 가이드

**작성**: 2026-05-02
**다음 작업**: Phase 2/3 — Flutter 알바생 앱 + 관리자 앱

> 새 Claude Code 세션을 열었을 때 **가장 먼저 읽을 문서**입니다.
> CLAUDE.md + 메모리는 자동 로드되니, 이 문서로 "지금 어디까지 했고 다음 무엇을 할지"를 1분 내 파악.

---

## 📍 지금 어디까지 했나? (Phase 1 완료)

### 완성된 산출물

```
c:/jobpit/
├── 관리자 웹 프로토타입 (디자인·비즈니스 로직 명세서)
│   ├── index.html              ← HTML + CSS
│   ├── js/data.js              ← 데이터 + POLICY + 헬퍼 + mutation
│   └── js/app.js               ← 앱 로직 (~12,000줄)
│
├── 외부 개발자 인계 패키지
│   └── 잡핏_개발자_인계_v1.0/   ← 압축해서 개발자에게 전달 가능
│
├── 문서
│   ├── 잡핏_기획안_v1_4.md      ← 서비스 기획안 (정책 v1.4)
│   ├── HANDOFF.md              ← Supabase 스키마 + API 매핑
│   ├── CLAUDE.md               ← 작업 지침 (자동 로드)
│   ├── 잡핏_변경이력.md         ← v0.x 진화 + v1.x 정책 진화 이력
│   └── NEXT_SESSION.md         ← 이 파일
│
└── 자료
    └── 통근버스 시간표.xlsx     ← 곤지암 실 시간표 v1
```

### v0.12 (현재 코드 시점) 핵심 기능
- 18개 페이지 + 모달 다수
- 통근버스 매트릭스 모델 (곤지암 23노선 × 28슬롯)
- 알림 시스템 (수동 + 자동 1시간 전 + 토스트 UI)
- 같이하기 / 취소 6사유 / 포인트 회수 / 1:1 채팅 / 신청자 직접 추가
- 주휴수당 v1.1 (동일 근무지 기준 통일, UI 표시 명확화)

---

## 🎯 다음 작업 — Flutter 앱 (Phase 2/3)

> ⚠ 사용자 결정: 알바생 앱 + 관리자 앱은 **관리자 웹 + Supabase 연동 완료 후** 제작.
> 즉 Phase 2 (Supabase 연동) 와 Phase 3 (Flutter) 사이 순서는 사용자가 결정.

### 알바생 앱 (Flutter, iOS/Android)

| 화면 | 주요 기능 | 데이터 소스 |
|---|---|---|
| 홈 | 이번달 근무수 / 포인트 / 경고 / 신청 현황 | `applications` + `pointTxs` + `workers` |
| 알바찾기 | 달력 기반 + 업종/지역 필터 + 즐겨찾기 우선순위 | `jobs` (open) + `worksites` |
| 내근무 | 출근/퇴근 / 통근버스 가이드 / 지각 보고 | `applications` (approved) + `busRoutesBySite` |
| 포인트 | 적립/출금/회수 이력 | `pointTxs` |
| 프로필 + 1:1 문의 | 즐겨찾기·동의·문의 | `workers` + `inquiries` |
| 통근버스 가이드 | 매트릭스 룩업 + 카카오맵 | `busRoutesBySite` (매트릭스) |
| 같이하기 | 친구 호출 + 페어 신청 | `applications` (buddy 필드) |

### 관리자 앱 (Flutter, 현장용 — 4탭)

| 탭 | 주요 기능 |
|---|---|
| 홈 | 담당 근무지 오늘 출결 요약 |
| 출결 | 호명 + 출근/지각/결근 토글 |
| 승인 | 12h 이내 신청 + 협의대상 즉시 결재 |
| 경고 | 5사유 모달 + 협의대상 자동 등록 |

### 기술 스택

- **Flutter 3.x** (iOS/Android 단일 코드베이스)
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **kakao_flutter_sdk** (카카오 로그인)
- **kakao_map_plugin** (지도 — iOS 이슈 시 `flutter_naver_map` 대체)
- **firebase_messaging** (FCM)
- **geolocator** (GPS 권한 + 영역 검증)

---

## 📚 작업 시작 시 활용할 자산

### 1. 데이터 모델 → Dart 매핑

[HANDOFF.md §3](HANDOFF.md) 의 Supabase SQL 스키마를 그대로 Dart 클래스로:

```dart
// 예시
class Worker {
  final String id;
  final String name;
  final String phone;
  int warnings;
  int total;
  int noshow;
  bool negotiation;
  int points;
  // ...
}

class BusSchedule {
  final BusArrival arrival;
  final List<String> workStartTimes;
  final List<BusRoute> routes;
}

class BusRoute {
  final String id;
  final String name;
  final String area;
  final String stop;
  final double lat;
  final double lng;
  final List<String> departures;  // workStartTimes 인덱스 매칭
}
```

### 2. POLICY 상수 → Dart const

[`js/data.js`의 POLICY 객체](js/data.js)를 그대로:

```dart
class Policy {
  static const int pointMinWithdraw = 30000;
  static const int pointWithdrawUnit = 10000;
  static const int pointDailyMax = 100000;
  static const int pointCancelDeduct = 1000;
  static const int autoCheckoutMin = 360;       // 6h
  static const int approvalLimitMin = 360;      // 6h
  static const int urgentRecruitMin = 720;      // 12h
  static const int cancelFreeMin = 720;         // 12h
  static const int warnLimit = 3;
  static const int wlOfferFarMin = 120;         // 2h
  static const int wlOfferNearMin = 30;
  static const int wlFactor = 2;
  static const int buddyBonusAmount = 3000;
  static const int preWorkReminderMin = 60;     // 1h
}
```

### 3. mutation 헬퍼 → Supabase RPC

[HANDOFF.md §5](HANDOFF.md)의 30+ 헬퍼 매핑 표가 이미 정리됨. Flutter에서 Supabase 클라이언트로 호출:

```dart
// 예시
await supabase.rpc('approve_gps_request', params: {
  'gps_id': gpsId,
  'admin_note': note,
  'by': currentUser.name,
});
```

### 4. 통근버스 매트릭스 헬퍼 → Dart

```dart
BusRecommendation? recommendBusForWorker(
  double workerLat, double workerLng,
  String siteId, String jobStartHHMM,
) {
  final schedule = busSchedule(siteId);
  if (schedule == null) return null;
  final idx = schedule.workStartTimes.indexOf(jobStartHHMM);
  if (idx == -1) return null;
  // 가장 가까운 정류장 찾기 ...
}
```

### 5. UI 명세는 관리자 웹 미리보기 참고

[`app.js` 의 알바생 앱 미리보기 (renderApHome 등)](js/app.js)는 Flutter 화면 와이어프레임 명세 역할. 컬러/뱃지/카드 패턴 참고.

---

## ⚙ 작업 시작 체크리스트 (사용자가 신호 보낼 때)

- [ ] 사용자가 "Flutter 시작하자" / "알바생 앱 만들어줘" 등 명시
- [ ] 알바생 앱부터 vs 관리자 앱부터 결정
- [ ] Supabase 연동 시점 확인 (먼저 vs 나중)
- [ ] Flutter 프로젝트 위치 결정 (`c:/jobpit_app/` 등 별도 폴더 권장)
- [ ] 패키지 의존성 결정 (kakao_flutter_sdk / supabase_flutter 버전)
- [ ] 첫 화면 = 홈 vs 로그인 결정

---

## 🧠 메모리 시스템 (자동 로드)

`~/.claude/projects/c--jobpit/memory/` 에 보존된 사용자 결정·선호:

| 메모리 | 핵심 |
|---|---|
| `project_current_phase.md` | ⭐ 현재 단계 + 다음 작업 (이 문서와 짝) |
| `feedback_toast_ui.md` | alert 대신 토스트(showToast) 우선 |
| `project_design_decision.md` | 관리자 웹 디자인 폴리시 안 함 (직원 내부용) |
| `project_control_system_separate_page.md` | 관제 시스템 SPA 내 렌더 (롤백 결정) |
| `project_page_review_plan.md` | 페이지 점검 계획 (v0.11/v0.12로 자연 통합) |

→ 새 세션에서 자동 로드되니, **추가 컨텍스트 명시 안 해도 됨**.

---

## 🔄 재부팅 후 첫 메시지 권장 형식

```
잡핏 다음 작업 시작하자.
[알바생 앱 / 관리자 앱 / Supabase 먼저 / 다른거] 부터 진행.
```

→ Claude는 즉시 NEXT_SESSION.md + CLAUDE.md + 메모리로 컨텍스트 파악 후 진입.

---

— 이 문서는 컨텍스트 보존용. Flutter 작업 시작 후 자동으로 갱신될 예정.
