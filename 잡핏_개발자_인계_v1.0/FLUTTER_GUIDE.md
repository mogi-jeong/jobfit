# Flutter 앱 제작 가이드

**작성**: 2026-05-02
**대상**: 잡핏 알바생 앱 + 관리자 앱 (Flutter)
**선행 문서**: [HANDOFF.md](HANDOFF.md) (Supabase 스키마) · [NEXT_SESSION.md](NEXT_SESSION.md)

---

## 1. 프로젝트 구조 (권장)

```
c:/jobpit_app/                  ← Flutter 프로젝트 루트 (별도)
├── lib/
│   ├── main.dart
│   ├── app/                    ← 앱 진입 + 라우팅
│   ├── core/
│   │   ├── policy.dart         ← POLICY 상수 (Dart const)
│   │   ├── supabase_client.dart
│   │   ├── theme.dart          ← 컬러 팔레트 (관리자 웹과 통일)
│   │   └── kakao_init.dart
│   ├── models/                 ← 데이터 모델 (Worker, Job, Application, ...)
│   ├── repositories/           ← Supabase 호출 추상화
│   ├── features/
│   │   ├── auth/               ← 카카오 로그인 + 세션
│   │   ├── home/
│   │   ├── jobs/               ← 알바찾기
│   │   ├── mywork/             ← 내근무 + 출근/퇴근
│   │   ├── points/
│   │   ├── inquiry/
│   │   ├── busguide/           ← 통근버스 가이드
│   │   ├── buddy/              ← 같이하기
│   │   └── admin/              ← 관리자 앱 (별도 entry)
│   └── shared/                 ← 공통 위젯
├── assets/
│   └── images/
└── pubspec.yaml
```

---

## 2. 핵심 패키지

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.5.0
  kakao_flutter_sdk_user: ^1.9.0
  kakao_flutter_sdk_share: ^1.9.0  # 같이하기 카카오톡 공유
  kakao_map_plugin: ^0.x.x         # iOS 이슈 시 flutter_naver_map 대체
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
  geolocator: ^12.0.0              # GPS
  intl: ^0.19.0                    # 날짜/시각 포맷
  go_router: ^14.0.0               # 라우팅
  riverpod: ^2.5.0                 # 상태 관리 (선호 시)
```

---

## 3. POLICY 상수 (Dart로 1:1 매핑)

```dart
// lib/core/policy.dart
class Policy {
  // 포인트
  static const int pointMinWithdraw   = 30000;   // 출금 가능 최저
  static const int pointWithdrawUnit  = 10000;   // 출금 단위
  static const int pointDailyMax      = 100000;  // 1일 한도
  static const int pointCancelDeduct  = 1000;    // 단순 변심 자동 차감

  // 시간 (분)
  static const int autoCheckoutMin    = 360;     // 6h 자동 퇴근
  static const int approvalLimitMin   = 360;     // 신청 승인 6h 초과 경고
  static const int urgentRecruitMin   = 720;     // 12h 내 미충원 긴급
  static const int cancelFreeMin      = 720;     // 자유 취소 12h

  // 경고
  static const int warnLimit          = 3;       // N회 → 협의대상

  // 대기열
  static const int wlOfferFarMin      = 120;     // 24h 전 자리제안 수락 시간
  static const int wlOfferNearMin     = 30;      // 24h 이내 자리제안 수락 시간
  static const int wlFactor           = 2;       // 대기열 상한 = cap × N

  // 같이하기
  static const int buddyBonusAmount   = 3000;    // 양쪽 출퇴근 완료 시 각자

  // 자동 알림
  static const int preWorkReminderMin = 60;      // 근무 시작 N분 전 자동 알림
}
```

---

## 4. 데이터 모델 (Dart 클래스)

```dart
// lib/models/worker.dart
class Worker {
  final String id;
  final String name;
  final String phone;
  final int warnings;
  final int total;
  final int noshow;
  final bool negotiation;
  final int points;
  final DateTime? lastWorked;
  final DateTime joinedAt;
  final List<String> favParts;

  Worker.fromJson(Map<String, dynamic> j)
    : id = j['id'],
      name = j['name'],
      phone = j['phone'],
      warnings = j['warnings'] ?? 0,
      total = j['total'] ?? 0,
      noshow = j['noshow'] ?? 0,
      negotiation = j['negotiation'] ?? false,
      points = j['points'] ?? 0,
      lastWorked = j['last_worked'] != null ? DateTime.parse(j['last_worked']) : null,
      joinedAt = DateTime.parse(j['joined_at']),
      favParts = List<String>.from(j['fav_parts'] ?? []);
}

// lib/models/job.dart
class Job {
  final String id;
  final String siteId;
  final DateTime date;
  final String slot;        // '주간'|'야간'|'새벽'|'웨딩'
  final String start;       // 'HH:MM'
  final String end;         // 'HH:MM'
  final int cap;
  final int apply;
  final int wage;
  final String wageType;
  final String contact;
  final bool contract;
  final bool safety;
  final bool reminderEnabled;
  final int notifSentCount;
  // ...
}

// lib/models/application.dart
enum ApplicationStatus { pending, approved, rejected, cancelled, cancelPending }

class Application {
  final String id;
  final String workerId;
  final String jobId;
  final DateTime appliedAt;
  ApplicationStatus status;
  final String? reason;
  final DateTime? processedAt;
  final String? processedBy;
  final String? rejectReason;
  // 같이하기
  final String? buddyAppId;
  final String? buddyRole;
  final bool buddyBonusGiven;
  // 취소 승인
  final String? cancelReasonType;
  final String? cancelReason;
  // ...
}

// lib/models/bus_schedule.dart
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

class BusArrival {
  final String name;
  final double lat;
  final double lng;
}
```

---

## 5. Supabase 클라이언트 + RPC 호출

```dart
// lib/core/supabase_client.dart
final supabase = Supabase.instance.client;

// 예시 RPC 호출 — 헬퍼 함수
Future<bool> approveGpsRequest(String gpsId, String adminNote) async {
  final result = await supabase.rpc('approve_gps_request', params: {
    'gps_id': gpsId,
    'admin_note': adminNote,
    'by': supabase.auth.currentUser?.id,
  });
  return result['ok'] == true;
}

Future<List<Job>> fetchOpenJobs() async {
  final data = await supabase
    .from('jobs')
    .select('*, worksites(*)')
    .eq('pending', false)
    .gte('date', DateTime.now().toIso8601String().substring(0, 10))
    .order('date');
  return (data as List).map((j) => Job.fromJson(j)).toList();
}
```

---

## 6. 통근버스 추천 헬퍼 (Dart)

```dart
// lib/features/busguide/recommend.dart
class BusRecommendation {
  final BusRoute route;
  final NearestStop nearestStop;
  final String departureTime;
  final String workStartTime;
  final BusArrival arrival;
  final int workStartIndex;
}

BusRecommendation? recommendBusForWorker(
  double workerLat, double workerLng,
  BusSchedule? schedule, String jobStartHHMM,
) {
  if (schedule == null || schedule.routes.isEmpty) return null;
  final idx = schedule.workStartTimes.indexOf(jobStartHHMM);
  if (idx == -1) return null;

  // 가장 가까운 정류장 찾기 (haversine)
  final candidates = schedule.routes.map((rt) {
    final d = haversineMeters(workerLat, workerLng, rt.lat, rt.lng);
    return _Candidate(rt, d);
  }).toList()..sort((a, b) => a.distance.compareTo(b.distance));

  final best = candidates.first;
  return BusRecommendation(
    route: best.route,
    nearestStop: NearestStop(/* ... */),
    departureTime: best.route.departures[idx],
    workStartTime: jobStartHHMM,
    arrival: schedule.arrival,
    workStartIndex: idx,
  );
}

int haversineMeters(double lat1, double lng1, double lat2, double lng2) {
  const R = 6371000.0;
  final dLat = (lat2 - lat1) * pi / 180;
  final dLng = (lng2 - lng1) * pi / 180;
  final a = sin(dLat/2) * sin(dLat/2) +
            cos(lat1 * pi / 180) * cos(lat2 * pi / 180) * sin(dLng/2) * sin(dLng/2);
  return (R * 2 * atan2(sqrt(a), sqrt(1-a))).round();
}
```

---

## 7. 카카오 로그인 + 세션 처리

```dart
// lib/features/auth/kakao_login.dart
import 'package:kakao_flutter_sdk_user/kakao_flutter_sdk_user.dart';

Future<User?> kakaoSignIn() async {
  try {
    OAuthToken token;
    if (await isKakaoTalkInstalled()) {
      token = await UserApi.instance.loginWithKakaoTalk();
    } else {
      token = await UserApi.instance.loginWithKakaoAccount();
    }
    final kakaoUser = await UserApi.instance.me();

    // Supabase에 카카오 토큰 전달 → 자체 세션 생성
    final response = await supabase.auth.signInWithIdToken(
      provider: OAuthProvider.kakao,
      idToken: token.idToken!,
      accessToken: token.accessToken,
    );
    return response.user;
  } catch (e) {
    return null;
  }
}
```

---

## 8. FCM 푸시 알림 분류 (서비스/구인/마케팅)

```dart
// lib/core/fcm_handler.dart
FirebaseMessaging.onMessage.listen((message) {
  final category = message.data['category'];
  // 'service' | 'urgent_recruit' | 'marketing'

  // 야간 시간 22~08 + 마케팅이면 묵음 처리 (서버에서 거른다는 가정)
  // 긴급 알림은 우회 가능

  // 알림 표시 (flutter_local_notifications 사용)
});
```

---

## 9. GPS 영역 검증 (Ray Casting)

```dart
// lib/features/mywork/gps_polygon.dart
bool isPointInPolygon(double lat, double lng, List<List<double>> polygon) {
  bool inside = false;
  for (int i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    final xi = polygon[i][0], yi = polygon[i][1];
    final xj = polygon[j][0], yj = polygon[j][1];
    final intersect = ((yi > lng) != (yj > lng)) &&
                      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
```

---

## 10. 토스트 UI (관리자 웹과 통일)

```dart
// lib/shared/toast.dart
import 'package:flutter/material.dart';

void showToast(BuildContext ctx, {
  required String title,
  required String body,
  bool urgent = false,
  Duration duration = const Duration(seconds: 6),
}) {
  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
    backgroundColor: urgent ? const Color(0xFF991B1B) : const Color(0xFF1B3A6B),
    duration: duration,
    behavior: SnackBarBehavior.floating,
    margin: const EdgeInsets.only(top: 16, right: 16, left: 16),
    content: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        const SizedBox(height: 4),
        Text(body, style: TextStyle(fontSize: 12, color: Colors.grey[200])),
      ],
    ),
  ));
}
```

---

## 11. 컬러 팔레트 (Dart Theme)

```dart
// lib/core/theme.dart
class JfColors {
  static const deepNavy   = Color(0xFF1B3A6B);
  static const indigo     = Color(0xFF1E40AF);
  static const royalBlue  = Color(0xFF2563EB);
  static const success    = Color(0xFF22C55E);
  static const warning    = Color(0xFFF59E0B);
  static const error      = Color(0xFFEF4444);
  static const textSub    = Color(0xFF6B7684);
  static const bg         = Color(0xFFF5F7FA);
}

ThemeData jfLightTheme() {
  return ThemeData(
    useMaterial3: true,
    primaryColor: JfColors.deepNavy,
    scaffoldBackgroundColor: JfColors.bg,
    fontFamily: 'NotoSansKR',
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: JfColors.royalBlue,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    // ...
  );
}
```

---

## 12. 작업 순서 권장

1. **Flutter 프로젝트 초기화** + 패키지 설치
2. **Supabase 클라이언트 셋업** + 기본 인증 흐름 (카카오 로그인)
3. **데이터 모델 클래스** 작성 (Worker, Job, Application, BusSchedule 등)
4. **공통 위젯** (Toast, JfColors theme, JfBadge 등)
5. **알바생 앱 홈 화면** — 가장 단순한 화면부터
6. **알바찾기 + 공고 상세 + 신청** 흐름
7. **내근무 + 출근/퇴근 + GPS 검증**
8. **포인트 + 1:1 문의**
9. **통근버스 가이드** (매트릭스 + 카카오맵)
10. **같이하기**
11. **관리자 앱** (홈/출결/승인/경고 4탭)
12. **베타 테스트** (한 근무지부터)

---

## 13. 참고 문서 (관리자 웹 — 명세서 역할)

| 문서 | 활용 |
|---|---|
| [HANDOFF.md](HANDOFF.md) | Supabase 스키마 11+ 테이블 + RLS + mutation API 매핑 |
| [잡핏_기획안_v1_4.md](잡핏_기획안_v1_4.md) | 비즈니스 정책 전체 (12 섹션) |
| [js/data.js](js/data.js) | POLICY · 데이터 모델 · 헬퍼 함수 (그대로 Dart 매핑) |
| [js/app.js](js/app.js) | 페이지·모달 디자인 명세 (Flutter 화면 와이어프레임 참고) |
| 알바생 앱 미리보기 | `renderApHome` / `renderApJobs` 등 (app.js) — 5탭 디자인 |
| 모바일 관리자 뷰 | `renderMobileAdmin` (app.js) — 관리자 앱 4탭 디자인 |

→ 관리자 웹 코드는 **삭제 X**. Flutter 작업 동안 계속 명세서로 활용.

---

— 새 세션에서 Flutter 작업 시작 시 이 문서 + NEXT_SESSION.md + HANDOFF.md 읽기.
