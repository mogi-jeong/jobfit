// 잡핏 관리자 앱 — 현장용
// 디자인: 텍스트 온리 미니멀 (2026-08-04 확정)
// 데이터: 현재 Mock — 이후 Supabase 저장소로 교체 (repository 패턴)

import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'policy.dart';

part 'mock_data.dart';

// ─── 디자인 토큰 (디자인 가이드 v1) ───
class JColors {
  static const bg = Color(0xFFF5F5F7); // 배경
  static const card = Colors.white; // 카드
  static const ink = Color(0xFF1D1D1F); // 본문 · 검정 카드
  static const muted = Color(0xFF6E6E73); // 보조 글자
  static const inactive = Color(0xFF8E8E93); // 비활성
  static const blue = Color(0xFF0071E3); // 포인트 파랑 (유일 브랜드색)
  static const red = Color(0xFFC22A2A); // 경고
  static const green = Color(0xFF1D7A35); // 긍정
  static const yellow = Color(0xFFFEBC2E); // 검정 카드 안 라벨
  static const amber = Color(0xFF9A6B00); // 수동 처리 필요 · 대기 · 주의
  static const hairline = Color(0x121D1D1F); // 카드 테두리
  static const track = Color(0xFFE8E8ED); // 진행 막대 트랙
}

void main() => runApp(const JobpitAdminApp());

// ─── 관리자 권한 (확정 2026-08-24: 공고 등록 = 마스터+1급만) ───
class Admin {
  final String name, role; // admin1 / admin2
  final List<String>? sites; // null = 전 근무지
  const Admin(this.name, this.role, [this.sites]);
  bool get isA1 => role == 'admin1';
  String get roleLabel => isA1 ? '관리자 1등급' : '관리자 2등급';
}

const demoAdmin1 = Admin('김운영', 'admin1'); // 전 근무지 + 공고 등록
const demoAdmin2 = Admin('김현장', 'admin2', ['곤지암 MegaHub', '이천 MpHub']);


class JobpitAdminApp extends StatelessWidget {
  const JobpitAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '잡핏 관리자',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: JColors.bg,
        colorScheme: ColorScheme.fromSeed(seedColor: JColors.blue),
        // TODO: Pretendard 폰트 파일 추가 후 fontFamily: 'Pretendard'
      ),
      home: const RootGate(),
    );
  }
}

// 로그인 전/후 분기 (실서비스: 관리자 인증 — 방식은 N1 미정)
class RootGate extends StatefulWidget {
  const RootGate({super.key});
  @override
  State<RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<RootGate> {
  Admin? me;

  @override
  Widget build(BuildContext context) {
    if (me == null) {
      return LoginPage(onPick: (a) => setState(() {
        me = a;
        gAdmin = a;
      }));
    }
    return AdminShell(
        admin: me!,
        onLogout: () => setState(() {
              me = null;
              gAdmin = null;
            }));
  }
}

class LoginPage extends StatelessWidget {
  final void Function(Admin) onPick;
  const LoginPage({super.key, required this.onPick});

  @override
  Widget build(BuildContext context) {
    Widget card(Admin a, String desc) => Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            onTap: () => onPick(a),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: JColors.hairline, width: .5),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${a.name} · ${a.roleLabel}',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
                const SizedBox(height: 3),
                Text(desc, style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
              ]),
            ),
          ),
        );

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('잡핏 관리자',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -.8, color: JColors.ink)),
              const SizedBox(height: 4),
              const Text('데모 로그인 — 등급을 선택하세요\n(실서비스 인증 방식은 미정 · N1)',
                  style: TextStyle(fontSize: 12.5, color: JColors.muted, height: 1.5)),
              const SizedBox(height: 22),
              card(demoAdmin1, '전 근무지 열람·운영 · 공고 등록 가능\n포인트 지급 5,000P · 회수 무제한'),
              const SizedBox(height: 10),
              card(demoAdmin2, '담당: 곤지암 · 이천 (2곳)\n포인트 지급 3,000P · 회수 3,000P'),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Mock 데이터 (→ Supabase 교체 지점) ───
class Job {
  final String site, slot, status;
  final String id; // 공고 id (Mock: j-t-1 등 / Supabase: uuid)
  final DateTime start, end;
  final int cap, ok, short;
  final String desc; // 공고 내용 (템플릿 불러오기 + 수정)
  final int point; // 잡핏 포인트 (기본 1,000P · 공고별 조정) — 종료 후 정상 출근+퇴근자에게만 자동 지급
  final bool closed; // 수동 마감 (알바생 앱 노출 중단, 1급) — HANDOFF setRecruitClosed
  final bool contract; // 출근 시 계약서 서명 요구 (공고별 토글 · 웹 등록 폼과 동일)
  final bool safety; // 출근 시 안전교육 서명 요구
  const Job(this.site, this.slot, this.status, this.start, this.end, this.cap, this.ok, this.short,
      {this.id = '', this.desc = '', this.point = 1000, this.closed = false, this.contract = true, this.safety = true});
  bool get needsSign => contract || safety; // 둘 다 꺼진 공고는 서명 표시 대상 아님

  // 1급 공고 수정용 — id 유지 (명단·정정 기록 보존)
  Job copyWith({int? cap, int? short, DateTime? start, DateTime? end, int? point, String? desc, bool? closed}) =>
      Job(site, slot, status, start ?? this.start, end ?? this.end, cap ?? this.cap, ok, short ?? this.short,
          id: id, desc: desc ?? this.desc, point: point ?? this.point, closed: closed ?? this.closed,
          contract: contract, safety: safety);
  String get contact => siteOf(site)?.contact ?? '010-1234-5678'; // 근무지 담당자 전화

  String get timeLabel =>
      '${_hm(start)} – ${_hm(end)}';
  static String _hm(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  static const _wd = ['월', '화', '수', '목', '금', '토', '일'];
  String get dateLabel => '${start.month}/${start.day}(${_wd[start.weekday - 1]})';
}


// ─── 알바생 출결 Mock (→ Supabase attendance 교체 지점) ───
class Worker {
  final String name;
  final String status; // 출결 상태: ok(출근) / late(지각) / early(조퇴) / runaway(무단이탈) / absent(결근) / none(미도착) / wait(출근 전)
  final String? time; // 출근 시각
  final String? org; // 외부인력 소속 (업체명 메모)
  final String? phone; // 외부인력 전화번호
  final String? outTime; // 퇴근 기록 (null = 없음) — 출결 상태와 별개로 관리
  const Worker(this.name, this.status, [this.time, this.org, this.phone, this.outTime]);
}

// ─── 출결 정정 기록 (앱 전역 — 화면을 나갔다 와도 유지 → Supabase attendance 교체 지점) ───
String jobKey(Job j) => j.id.isNotEmpty ? j.id : '${j.site}|${j.start.toIso8601String()}';
final Map<String, Map<String, String>> gOverrides = {}; // jobKey → (이름 → 상태)
final Set<String> gGpsDone = {}; // 'jobKey|이름' 처리 완료한 퇴근 승인
final Map<String, List<Worker>> gInvitedByJob = {}; // jobKey → 직접 추가·앱 승인으로 합류한 가입 알바생
final Map<String, List<Worker>> gExtByJob = {}; // jobKey → 외부인력
final Set<String> gForceCancelled = {}; // 'jobKey|이름' 관리자가 강제 취소한 정식 신청자 (명단에서 제외)
final Set<String> gReminderOff = {}; // 시작 1시간 전 자동 알림을 끈 공고 (jobKey)
// 계약서·안전교육 서명 완료자 — jobKey → 이름 집합 (알바생 앱 출근 흐름에서 서명 → Supabase attendance.signed_at 교체 지점)
// Mock: 출근·지각자의 약 85%가 서명 (이름 해시로 고정) · 직접 추가·앱 승인 합류자는 기본 미서명
final Map<String, Set<String>> gSignedByJob = {};
Set<String> signedOf(Job j) => gSignedByJob.putIfAbsent(jobKey(j), () {
      final set = <String>{};
      for (final w in rosterOf(j)) {
        if ((w.status == 'ok' || w.status == 'late') && w.name.codeUnits.fold(0, (a, c) => a * 31 + c) % 100 < 85) set.add(w.name);
      }
      return set;
    });
bool isSigned(Job j, String name) => signedOf(j).contains(name);
// 관리자 확인(더블체크) — 기록만, 포인트 무관. jobKey → (이름 → '관리자명 HH:MM')
final Map<String, Map<String, String>> gVerifiedIn = {}; // 출근 확인
final Map<String, Map<String, String>> gVerifiedOut = {}; // 퇴근 확인

// 유효 출결 상태 — 정정값 우선. 시작 후엔 '출근 전(wait)'이 곧 '미도착(none)'
String effStatus(Job j, Worker w) {
  final s = gOverrides[jobKey(j)]?[w.name] ?? w.status;
  if (s == 'wait' && DateTime.now().isAfter(j.start)) return 'none';
  return s;
}

// 퇴근 기록 (출결 상태와 별개) — jobKey → (이름 → 시각/방식, '' = 기록 취소)
final Map<String, Map<String, String>> gOut = {};
// 실제 남아 있는 퇴근 기록만 (자동 퇴근 제외) — GPS 사유 필터 등 '기록 유무' 판단용
String? outRecordOf(Job j, Worker w) {
  final v = gOut[jobKey(j)]?[w.name];
  if (v != null) return v.isEmpty ? null : v;
  return w.outTime;
}

bool autoCheckoutDue(Job j) {
  final now = DateTime.now();
  return now.isAfter(j.end) && now.difference(j.end).inHours >= Policy.autoCheckoutHours;
}

// 퇴근 기록 + 시스템 자동 퇴근: 종료 6시간 지났고 출근·지각인데 기록 없으면 '자동' (정상 퇴근으로 인정)
String? outOf(Job j, Worker w) {
  final r = outRecordOf(j, w);
  if (r != null) return r;
  final s = effStatus(j, w);
  if ((s == 'ok' || s == 'late') && autoCheckoutDue(j)) return '자동';
  return null;
}

String checkoutSourceOf(String o) =>
    o.startsWith('반려') ? CheckoutSource.rejected : (o == '자동' ? CheckoutSource.auto : CheckoutSource.manual);

// ─── 명단 합성 — 정식 신청자(강제 취소 제외) + 직접 추가·승인 합류자 + 외부인력 ───
List<Worker> baseRosterOf(Job j) {
  final k = jobKey(j);
  return rosterOf(j).where((w) => !gForceCancelled.contains('$k|${w.name}')).toList();
}

// 앱에서 승인한 신청자(gApprovedByJob)는 합류 명단에 자동 합류 (중복 없이)
List<Worker> invitedOf(Job j) {
  final k = jobKey(j);
  final list = gInvitedByJob.putIfAbsent(k, () => []);
  final base = rosterOf(j);
  for (final n in gApprovedByJob[k] ?? const <String>[]) {
    if (list.any((w) => w.name == n) || base.any((w) => w.name == n)) continue;
    list.add(Worker(n, DateTime.now().isAfter(j.start) ? 'none' : 'wait'));
  }
  return list;
}

List<Worker> extOf(Job j) => gExtByJob.putIfAbsent(jobKey(j), () => []);
List<Worker> membersOf(Job j) => [...baseRosterOf(j), ...invitedOf(j)]; // 가입 알바생 (포인트·주휴 대상)
List<Worker> allOf(Job j) => [...membersOf(j), ...extOf(j)]; // 충원 숫자용 (외부인력 포함)
Worker? workerOf(Job j, String name) => allOf(j).where((w) => w.name == name).firstOrNull;

// 배정 취소 — 합류 명단·승인 기록·정정값 모두 제거
void unassign(Job j, String name) {
  final k = jobKey(j);
  noteBuddyCancelled(j, name);
  gInvitedByJob[k]?.removeWhere((w) => w.name == name);
  gApprovedByJob[k]?.remove(name);
  gOverrides[k]?.remove(name);
  gOut[k]?.remove(name);
}

// 신청 홀드 (B안 · 전원) — 승인 대기 신청 1건 = 1자리 홀드 (협의대상 포함, 같이하기 짝 = 2). 관리자 범위와 무관하게 전체 신청 기준
// 서버가 승인 대기 6h(Policy.approvalWaitMaxHours) 초과 시 홀드 해제 — 앱엔 타이머 없음
int heldOf(Job j) => _pendingAll
    .where((p) => !gDecided.contains(appKey(p)) && _appMatchesJob(p, j))
    .length;
bool _appMatchesJob(PendingApp p, Job j) =>
    p.jobId != null ? p.jobId == j.id : (p.siteName == j.site && p.slotTime.contains(Job._hm(j.start)));

// 실시간 인원 — 확정(전체) · 홀드(승인 대기) · 출근(출근+지각) · 미도착. filled = 확정 + 홀드 (정원 계산용)
({int filled, int confirmed, int held, int ok, int none}) liveCounts(Job j) {
  int ok = 0, none = 0;
  final all = allOf(j);
  for (final w in all) {
    final s = effStatus(j, w);
    if (s == 'ok' || s == 'late') ok++;
    if (s == 'none') none++;
  }
  final held = DateTime.now().isAfter(j.start) ? 0 : heldOf(j);
  return (filled: all.length + held, confirmed: all.length, held: held, ok: ok, none: none);
}

// 빈자리 — 시작 전: 정원 − 확정 − 홀드 / 시작 후: 정원 − 현장에 왔던 사람(출근·지각·조퇴, 퇴근자 포함). 결근·미도착·이탈만 자리가 남
int seatsOf(Job j) {
  final all = allOf(j);
  if (!DateTime.now().isAfter(j.start)) return j.cap - all.length - heldOf(j);
  final present = all.where((w) {
    final s = effStatus(j, w);
    return s == 'ok' || s == 'late' || s == 'early';
  }).length;
  return j.cap - present;
}

// 종료 후 수동 처리 필요 인원 (출근/지각인데 퇴근 기록 없음 + 퇴근 승인 대기) — 종료 6시간 지나면 자동 처리로 간주
int manualCount(Job j) {
  final now = DateTime.now();
  if (!now.isAfter(j.end) || autoCheckoutDue(j)) return 0;
  // 사람 기준으로 합산 (사유 제출자도 퇴근 기록이 없으므로 같은 사람 = 1명)
  final names = <String>{};
  for (final w in membersOf(j)) {
    final s = effStatus(j, w);
    if ((s == 'ok' || s == 'late') && outOf(j, w) == null) names.add(w.name);
  }
  for (final r in pendingGpsOf(j)) {
    names.add(r.name);
  }
  return names.length;
}

// 아직 처리 안 된 GPS 사유 (처리 완료·퇴근 기록 생긴 사람 제외)
List<GpsReq> pendingGpsOf(Job j) {
  final k = jobKey(j);
  return gpsReqsOf(j).where((r) {
    if (gGpsDone.contains('$k|${r.name}')) return false;
    final w = workerOf(j, r.name);
    return w != null && outRecordOf(j, w) == null;
  }).toList();
}

bool needsManual(Job j) => manualCount(j) > 0;

// 같이하기 보너스 자격 — 짝꿍 둘 다 정시 출근(ok, 지각 X) + 정상 퇴근(반려 X)일 때만 (기획 §4-9 정책4)
bool buddyBonusEligible(Job j, Worker w) {
  final p = buddyOf(j, w.name);
  if (p == null) return false;
  final pw = workerOf(j, p);
  if (pw == null) return false;
  bool onTime(Worker x) {
    final o = outOf(j, x);
    return effStatus(j, x) == 'ok' && o != null && !o.startsWith('반려');
  }
  return onTime(w) && onTime(pw);
}

// 포인트 자동 지급 대상 판정 — policy.dart 규칙 사용 (알바생 앱과 동일). 자동 퇴근('자동')도 정상 퇴근
bool jobPointEligible(Job j, Worker w) {
  final o = outOf(j, w);
  return pointEligible(effStatus(j, w), o == null ? null : checkoutSourceOf(o));
}

// ─── 배정 자격 검사 (직접 추가 · 신청 승인 공용) ───
bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

// 하드 블록 사유 (정원 · 같은 날 중복) — null이면 통과
// ownHold = 신청자 본인이 이미 잡고 있는 홀드 수 (승인 = 홀드 → 확정 전환이라 본인 홀드는 빈자리로 취급)
String? eligibilityIssue(Job j, String name, {int seatsNeeded = 1, int ownHold = 0}) {
  final seats = seatsOf(j) + ownHold;
  if (seats < seatsNeeded) {
    return seatsNeeded > 1 ? '정원 초과 — 남은 자리 $seats명 (같이하기는 2자리 필요)' : '정원이 다 찼어요 (${j.cap}명)';
  }
  for (final o in [...gJobs, ...gPastJobs]) {
    if (jobKey(o) == jobKey(j) || !_sameDay(o.start, j.start)) continue;
    if (allOf(o).any((w) => w.name == name)) return '같은 날 다른 공고에 이미 배정 — ${o.site} ${o.slot}';
  }
  return null;
}

int weeklyLimitOf(String site) => (siteOf(site)?.partner ?? '') == '컨벤션' ? 2 : 4; // 동일 근무지 주 N일 (정책 v1.1)
DateTime mondayOf(DateTime t) => DateTime(t.year, t.month, t.day).subtract(Duration(days: t.weekday - 1));

// 이 공고가 속한 주(월~일)에 같은 근무지 배정 횟수 (이 공고 제외 · 결근·미도착 제외)
int weekCountOf(Job j, String name) {
  final mon = mondayOf(j.start), sun = mon.add(const Duration(days: 7));
  var n = 0;
  for (final o in [...gJobs, ...gPastJobs]) {
    if (jobKey(o) == jobKey(j) || o.site != j.site) continue;
    if (o.start.isBefore(mon) || !o.start.isBefore(sun)) continue;
    final w = workerOf(o, name);
    if (w == null) continue;
    final s = effStatus(o, w);
    if (s == 'absent' || s == 'none') continue;
    n++;
  }
  return n;
}

// 소프트 경고 (주 N일 초과) — 확인 후 강제 배정 가능
String? weekLimitIssue(Job j, String name) {
  final n = weekCountOf(j, name), lim = weeklyLimitOf(j.site);
  return n >= lim ? '${j.site.split(' ').first} 이번 주 $n일 배정 — 주 $lim일 초과' : null;
}

// 하드 블록이면 스낵 + false · 주 N일 초과면 확인 다이얼로그
Future<bool> checkEligibility(BuildContext context, Job j, List<String> names, {int ownHold = 0}) async {
  for (final n in names) {
    final issue = eligibilityIssue(j, n, seatsNeeded: names.length, ownHold: ownHold);
    if (issue != null) {
      jSnack(context, '$n — $issue');
      return false;
    }
  }
  final soft = [for (final n in names) if (weekLimitIssue(j, n) case final s?) '$n · $s'];
  if (soft.isEmpty) return true;
  final go = await showDialog<bool>(
    context: context,
    builder: (d) => AlertDialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: const Text('주 근무일 초과', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
      content: Text('${soft.join('\n')}\n\n동일 근무지 주 ${weeklyLimitOf(j.site)}일 제한이에요. 그래도 배정할까요? (기록에 남아요)',
          style: const TextStyle(fontSize: 12.5, color: JColors.muted, height: 1.5)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(d),
            child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
        TextButton(onPressed: () => Navigator.pop(d, true),
            child: const Text('그래도 배정', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w800))),
      ],
    ),
  );
  return go == true;
}

// ─── 신청 승인·거절 (승인 탭 · 공고 상세 공용) → Supabase applications.status 교체 지점 ───
String appKey(PendingApp p) => 'app|${p.name}|${p.jobId ?? p.siteName}';

// 되돌리기 — 결정 취소 + 확정 명단에서 제거
void unapprove(PendingApp a) {
  gDecided.remove(appKey(a));
  final k = a.jobId;
  if (k != null) {
    gApprovedByJob[k]?.remove(a.name);
    gInvitedByJob[k]?.removeWhere((w) => w.name == a.name);
  }
}

Future<bool> approveApp(BuildContext context, PendingApp a, PendingApp? mate, {String via = ''}) async {
  if (a.buddyState == 'pending' || mate?.buddyState == 'pending') {
    jSnack(context, '${a.name} — 같이하기 짝 응답 대기 중 · 짝이 수락해야 승인할 수 있어요');
    return false;
  }
  final job = jobByRef(a.jobId, a.siteName, a.slotTime);
  final names = [a.name, ?mate?.name];
  if (job != null && !await checkEligibility(context, job, names, ownHold: names.length)) return false;
  if (!context.mounted) return false;
  final key = job == null ? a.jobId : jobKey(job);
  var delivered = 0;
  for (final x in [a, ?mate]) {
    gDecided.add(appKey(x));
    if (key != null) {
      final l = gApprovedByJob[key] ??= [];
      if (!l.contains(x.name)) l.add(x.name);
      delivered += deliverNotices(key, x.name); // 확정 즉시 그 공고의 기존 공지 자동 전달
    }
  }
  final tail = via.isEmpty ? '' : ' · $via';
  audit('app_approve', a.name, '승인${mate != null ? ' (같이하기 짝 ${mate.name} 함께)' : ''}$tail',
      jobRef: '${a.siteName} ${a.slotTime}', app: a);
  if (mate != null) {
    audit('app_approve', mate.name, '승인 (같이하기 짝 ${a.name} 함께)$tail', jobRef: '${mate.siteName} ${mate.slotTime}', app: mate);
  }
  gPendingTick.value++;
  jSnack(context,
      (mate != null ? '${a.name} · ${mate.name} — 같이하기 짝 함께 승인' : '${a.name} — 승인 · 확정 명단에 추가') +
          (delivered > 0 ? ' · 공고 공지 자동 전달' : ''));
  return true;
}

Future<bool> rejectApp(BuildContext context, PendingApp a, PendingApp? mate, {String via = ''}) async {
  final ctrl = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Text('${a.name} — 거절', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
      content: TextField(
        controller: ctrl,
        autofocus: true,
        style: const TextStyle(fontSize: 14, color: JColors.ink),
        decoration: const InputDecoration(labelText: '거절 사유 (필수 · 알바생에게 전달돼요)'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx),
            child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
        TextButton(onPressed: () => Navigator.pop(ctx, true),
            child: const Text('거절', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w800))),
      ],
    ),
  );
  if (!context.mounted) return false;
  if (ok != true || ctrl.text.trim().isEmpty) {
    if (ok == true) jSnack(context, '거절 사유를 입력해야 해요');
    return false;
  }
  final reason = ctrl.text.trim();
  var tail = via.isEmpty ? '' : ' · $via';
  // 짝이 이미 확정 명단에 있으면 (짝만 거절) — 남는 짝에게 보너스 소멸 안내
  final job = jobByRef(a.jobId, a.siteName, a.slotTime);
  if (mate == null && a.buddy != null && job != null && workerOf(job, a.buddy!) != null) {
    noteBuddyCancelled(job, a.name);
    tail += ' · 짝 ${a.buddy} 안내';
  }
  // 같이하기: 짝꿍도 함께 거절 (cascade) — 짝은 자리 여유 있을 때 단독 재신청 가능
  gDecided.add(appKey(a));
  if (mate != null) gDecided.add(appKey(mate));
  audit('app_reject', a.name, '거절 · 사유: $reason$tail', jobRef: '${a.siteName} ${a.slotTime}', app: a);
  if (mate != null) {
    audit('app_reject', mate.name, '거절 (같이하기 짝 ${a.name} 함께) · 사유: $reason$tail',
        jobRef: '${mate.siteName} ${mate.slotTime}', app: mate);
  }
  gPendingTick.value++;
  jSnack(context, mate != null ? '${a.name} · ${mate.name} — 짝 함께 거절 · 사유 전달' : '${a.name} — 거절 · 사유가 전달됐어요');
  return true;
}

// 정원 초과 (직접 추가로 자리가 찼을 때) — 승인 대기 신청 카드에 안내 + [대기열로 이동]
bool overbookedFor(PendingApp a) {
  final job = jobByRef(a.jobId, a.siteName, a.slotTime);
  if (job == null || DateTime.now().isAfter(job.start)) return false;
  final c = liveCounts(job);
  return c.confirmed + c.held > job.cap;
}

// 신청 홀드 해제 → 대기열 맨 뒤로 (WaitRow 'waiting') — 자리 나면 순번대로 자동 제안
void moveAppToWaitlist(BuildContext context, PendingApp a) {
  final job = jobByRef(a.jobId, a.siteName, a.slotTime);
  gDecided.add(appKey(a));
  var order = 0;
  if (job != null) {
    final rows = waitlistOf(job);
    order = rows.length + 1;
    rows.add(WaitRow(a.name, order, 'waiting'));
  }
  audit('app_to_waitlist', a.name, '정원 초과(직접 추가) → 대기열 $order번으로 이동', jobRef: '${a.siteName} ${a.slotTime}', app: a);
  gPendingTick.value++;
  jSnack(context, '${a.name} — 대기열로 이동 · 자리 나면 순번대로 제안돼요');
}

// 수락 제한 — 근무 24시간 전이면 1시간, 이내면 30분 (Policy 상수)
Duration acceptWindowOf(Job j) => j.start.difference(DateTime.now()).inHours >= 24
    ? const Duration(minutes: Policy.waitAcceptFarMin)
    : const Duration(minutes: Policy.waitAcceptNearMin);

// 대기자에게 자리 제안 — 상태·마감 기록 + 감사. 스낵 문구 반환 (호출 쪽이 setState·표시)
String offerSeatTo(Job j, WaitRow r, {bool auto = false}) {
  final win = acceptWindowOf(j);
  r.status = 'offered';
  r.deadline = DateTime.now().add(win);
  audit('waitlist', r.name, '자리 제안 (${auto ? '자동' : '수동'}) · 수락 제한 ${win.inMinutes}분', jobRef: '${j.site} ${j.dateLabel}');
  return auto
      ? '대기 ${r.order}번 ${r.name}에게 자리 제안 · ${win.inMinutes}분 내 수락'
      : '${r.order}번 ${r.name} — 자리 제안 발송 · ${win.inMinutes}분 내 수락';
}

// 자리가 비었을 때 (반려·취소·배정 취소) — 대기자가 있고 나가 있는 제안이 없으면 1번에게 자동 제안. 제안했으면 스낵 문구 반환
String? afterSeatOpened(Job j) {
  final rows = waitlistOf(j);
  final now = DateTime.now();
  final live = rows.any((r) => r.status == 'offered' && r.deadline != null && !r.deadline!.isBefore(now));
  final next = rows.where((r) => r.status == 'waiting').firstOrNull;
  if (now.isAfter(j.start)) return null; // 시작 시각 경과 → 대기열 제안 중단 (부족 인원은 현장 직접 추가만)
  if (live || next == null || seatsOf(j) <= 0) return null;
  return offerSeatTo(j, next, auto: true);
}

// 신청 대기 시간 라벨 — '대기 5시간 40분', 6시간 넘으면 빨강
(String, bool) waitLabelOf(PendingApp a) {
  final d = DateTime.now().difference(a.appliedAt);
  final over = d.inHours >= Policy.approvalWaitMaxHours;
  return ('대기 ${beforeLabel(d.inMinutes < 1 ? 1 : d.inMinutes)}${over ? ' · 6시간 초과' : ''}', over);
}

// ─── 포인트 잔액 — 한 곳에서 계산 (프로필 · 회수 · 지급 시트 공용) → Supabase workers.points 교체 지점 ───
// 정산 완료 보상: 종료된 공고에서 정상 출근+퇴근(자동 지급) + 같이하기 보너스
int earnedOf(String name) {
  final now = DateTime.now();
  var sum = 0;
  for (final j in [...gJobs, ...gPastJobs]) {
    if (!now.isAfter(j.end)) continue;
    final w = membersOf(j).where((w) => w.name == name).firstOrNull;
    if (w == null) continue;
    if (jobPointEligible(j, w)) sum += j.point;
    if (buddyBonusEligible(j, w)) sum += Policy.buddyBonus;
  }
  return sum;
}

int balanceOf(String name) =>
    mockBalance(name) - recoveredOf(name) + grantedOf(name) - cancelDeductOf(name) + earnedOf(name);

// ─── 포인트 회수 (관리자 판단 · 메시지 필수 · 알바생 앱에 그대로 전달) → Supabase point_txs(type=deduct) 교체 지점 ───
Admin? gAdmin; // 로그인한 관리자 (권한별 회수 한도 판정용)
final ValueNotifier<int> gPendingTick = ValueNotifier(0); // 승인 처리 시 +1 → 하단 탭 배지 갱신

class Recovery {
  final String name, memo, by, jobRef;
  final int amount;
  final DateTime at;
  const Recovery(this.name, this.amount, this.memo, this.by, this.jobRef, this.at);
}

final List<Recovery> gRecoveries = [];

// Mock 보유 포인트 (이름 기반 고정값) → Supabase workers.points 교체 지점
int mockBalance(String name) => 5000 + (name.codeUnits.fold(0, (a, b) => a + b) % 30) * 1000;

// 이미 회수된 합계 (가용 잔액 계산)
int recoveredOf(String name) => gRecoveries.where((r) => r.name == name).fold(0, (a, r) => a + r.amount);

// ─── 취소 검토 처리 내역 — 잘못 눌렀을 때 되돌리기 (차감이면 포인트 복원) → Supabase applications.cancel_decision 교체 지점 ───
class CancelDecision {
  final CancelReq req;
  final String decision; // deduct 차감 / exempt 면제 / reject 반려
  final String by;
  final DateTime at;
  bool reverted = false;
  CancelDecision(this.req, this.decision, this.by, this.at);
}

final List<CancelDecision> gCancelDecisions = [];
// 유효한(되돌리지 않은) 취소 차감 합계 — 프로필 잔액·내역에 반영
int cancelDeductOf(String name) => gCancelDecisions
    .where((d) => d.req.name == name && d.decision == 'deduct' && !d.reverted)
    .fold(0, (a, _) => a + Policy.cancelDeduct);

// ─── 전화 걸기 — 폰에서는 바로 다이얼, 크롬 데모에선 번호 안내 ───
Future<void> callPhone(BuildContext context, String number) async {
  final uri = Uri.parse('tel:${number.replaceAll('-', '')}');
  var ok = false;
  try {
    ok = await launchUrl(uri);
  } catch (_) {}
  if (!ok && context.mounted) jSnack(context, '전화 $number — 폰에서는 바로 연결돼요');
}

// ─── 처리 로그 (감사 기록) — 누가·언제·무엇을 → Supabase audit_log 교체 지점 ───
class AuditEntry {
  final String type; // app_approve / app_reject / cancel_decide / gps_approve / gps_reject / att_fix / point_grant / point_recover
  final String name, detail, by, jobRef;
  final DateTime at;
  final PendingApp? app; // 신청 승인/거절 되돌리기용
  bool reverted = false;
  AuditEntry(this.type, this.name, this.detail, this.by, this.jobRef, this.at, [this.app]);
}

final List<AuditEntry> gAudit = [];
void audit(String type, String name, String detail, {String jobRef = '', PendingApp? app}) =>
    gAudit.add(AuditEntry(type, name, detail, gAdmin?.name ?? '관리자', jobRef, DateTime.now(), app));
String hmOf(DateTime t) =>
    '${t.month}/${t.day} ${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
String auditTypeLabel(String t) => switch (t) {
      'app_approve' => '신청 승인',
      'app_reject' => '신청 거절',
      'cancel_decide' => '취소 검토',
      'gps_approve' => '퇴근 인정',
      'gps_reject' => '퇴근 반려',
      'gps_early' => '조퇴 인정',
      'verify' => '관리자 확인',
      'att_fix' => '출결 정정',
      'point_grant' => '포인트 지급',
      'point_recover' => '포인트 회수',
      'warning' => '경고 부여',
      'waitlist' => '대기열',
      'app_to_waitlist' => '대기열 이동',
      'app_cancel_admin' => '관리자 취소',
      'reminder' => '자동 알림',
      'notice' => '공고 공지',
      'urgent_recruit' => '긴급 구인',
      'job_edit' => '공고 관리',
      _ => t,
    };

// ─── 근무자 프로필 (어디서든 이름 탭 → 상세) ───
final List<Recovery> gGrants = []; // 보너스 지급 기록 (Recovery 구조 재사용, amount = +)
int grantedOf(String name) => gGrants.where((r) => r.name == name).fold(0, (a, r) => a + r.amount);
Member memberOf(String name) =>
    mockMembers.where((m) => m.name == name).firstOrNull ?? Member(name, '010-0000-0000', '성실 B');
int warningsOf(Member m) => int.tryParse(RegExp(r'경고 (\d)').firstMatch(m.label)?.group(1) ?? '') ?? 0;

void openWorker(BuildContext context, String name) =>
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => WorkerPage(name: name)));

// 이름을 누르면 프로필 — 화면 어디서나 같은 동작
Widget jName(BuildContext context, String name, {TextStyle? style}) => InkWell(
      onTap: () => openWorker(context, name),
      borderRadius: BorderRadius.circular(6),
      child: Text(name,
          style: style ?? const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: JColors.ink)),
    );

// 포인트 지급 (보너스) — 권한별 한도: 1급 5,000P / 2급 3,000P (기획 §6-4), 사유 필수
Future<void> openGrantSheet(BuildContext context, String name) async {
  final admin = gAdmin;
  final limit = (admin == null || admin.isA1) ? 5000 : 3000;
  int amount = 1000;
  final memo = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setS) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text('$name 포인트 지급',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('보유 ${balanceOf(name).toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (x) => '${x[1]},')}P · 한도 ${limit ~/ 1000},000P (${admin?.roleLabel ?? '관리자'})',
              style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
          const SizedBox(height: 10),
          Row(children: [
            _JobListPageState._stepBtn('−', () => setS(() => amount = (amount - 1000).clamp(1000, limit))),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text('+${amount ~/ 1000},000P',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: JColors.green,
                      fontFeatures: [FontFeature.tabularFigures()])),
            ),
            _JobListPageState._stepBtn('＋', () => setS(() => amount = (amount + 1000).clamp(1000, limit))),
          ]),
          const SizedBox(height: 10),
          TextField(
            controller: memo,
            autofocus: true,
            maxLines: 2,
            onChanged: (_) => setS(() {}),
            style: const TextStyle(fontSize: 13, color: JColors.ink),
            decoration: const InputDecoration(labelText: '지급 사유 (필수 · 알바생에게 전달)'),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx),
              child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
          TextButton(
              onPressed: memo.text.trim().isEmpty ? null : () => Navigator.pop(ctx, true),
              child: Text('지급',
                  style: TextStyle(color: memo.text.trim().isEmpty ? JColors.inactive : JColors.green,
                      fontWeight: FontWeight.w800))),
        ],
      ),
    ),
  );
  if (ok != true || memo.text.trim().isEmpty || !context.mounted) return;
  gGrants.add(Recovery(name, amount, memo.text.trim(), admin?.name ?? '관리자', '', DateTime.now()));
  audit('point_grant', name, '+${amount ~/ 1000},000P · ${memo.text.trim()}');
  jSnack(context, '$name — +${amount ~/ 1000},000P 지급 · 메시지 전송');
}

// ─── 공고 공지 — 공고별 · 확정자에게만 · 이후 확정되는 사람도 자동 수신 (→ Supabase notifications 교체 지점) ───
// 단체 발송 알림 로그 (공지 · 자동 리마인더 · 긴급 구인). 개별 메시지(회수·경고·조퇴 안내)는 여기 안 남김
// → Supabase notifications 보존 항목: 본문·제목·긴급·시각·발송자·등급·종류·수신자 수·읽음 수
class JobNotice {
  final String jobKey, text, by;
  final DateTime at;
  final int sentTo; // 발송 당시 수신자 수
  final bool urgent; // 긴급 — 야간(22~08시) 발송 제한 우회, 즉시 발송
  final String kind; // manual(공지) / auto(자동 리마인더) / urgent_recruit(긴급 구인)
  final String role; // 발송자 등급 라벨 ('1급' / '2급' / '' = 시스템)
  final int readCount; // 읽음 수 — 알바생 앱이 알림 열 때 신호를 보내야 집계됨 (선택 사항 · 0이면 표시 안 함, Mock: 60%)
  const JobNotice(this.jobKey, this.text, this.by, this.at, this.sentTo,
      {this.urgent = false, this.kind = 'manual', this.role = '', this.readCount = 0});
  String get kindLabel => switch (kind) { 'auto' => '자동 리마인더', 'urgent_recruit' => '긴급 구인', _ => '공지' };
}

final List<JobNotice> gNotices = [];
final List<(String, String, DateTime)> gNoticeLate = []; // (jobKey, 이름, 시각) — 확정 후 자동 수신 기록
// 공고 공지(수동)만 — 이후 확정자 자동 전달 대상
List<JobNotice> noticesOf(String key) => gNotices.where((n) => n.jobKey == key && n.kind == 'manual').toList();
String adminRoleShort() => gAdmin == null ? '' : (gAdmin!.isA1 ? '1급' : '2급');
final Set<String> _autoReminderSeeded = {};
// 알림 로그 전체 (시간순) — 시작 1시간 전 자동 리마인더가 이미 지났으면 Mock 항목을 한 번 생성
List<JobNotice> noticeLogOf(Job j) {
  final key = jobKey(j);
  final at = j.start.subtract(const Duration(hours: 1));
  if (!_autoReminderSeeded.contains(key) && DateTime.now().isAfter(at) && !gReminderOff.contains(key) && j.id.isNotEmpty) {
    _autoReminderSeeded.add(key);
    final n = membersOf(j).length;
    gNotices.add(JobNotice(key, '[잡핏] 1시간 뒤 ${j.site} ${j.slot} 근무 시작 (${j.timeLabel}) — 출근 60분 전부터 앱에서 출근 가능',
        '시스템', at, n, kind: 'auto', readCount: (n * 0.6).floor()));
  }
  return gNotices.where((n) => n.jobKey == key).toList()..sort((a, b) => a.at.compareTo(b.at));
}

// 승인·직접추가로 확정되는 순간 호출 → 그 공고의 기존 공지를 자동 전달, 전달 건수 반환
int deliverNotices(String key, String name) {
  final n = noticesOf(key).length;
  if (n > 0) gNoticeLate.add((key, name, DateTime.now()));
  return n;
}

Future<void> openNoticeSheet(BuildContext context, Job job, int confirmed) async {
  final ctrl = TextEditingController();
  var urgent = false;
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setS) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('공고 공지 발송',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
              '${job.site} ${job.dateLabel} ${job.slot}\n대상: 확정자 $confirmed명 · 이후 확정되는 사람도 자동 수신\n${urgent ? '긴급 — 야간에도 즉시 발송돼요' : '22~08시엔 아침 8시에 발송돼요'}',
              style: TextStyle(fontSize: 11.5, color: urgent ? JColors.red : JColors.muted, height: 1.5)),
          const SizedBox(height: 8),
          TextField(
            controller: ctrl,
            autofocus: true,
            maxLines: 3,
            maxLength: 500,
            style: const TextStyle(fontSize: 14, color: JColors.ink),
            decoration: const InputDecoration(hintText: '예: 오늘 물량 많아요, 10분 일찍 와주세요'),
          ),
          Row(children: [
            const Expanded(
              child: Text('긴급 (야간 22~08시 제한 우회, 즉시 발송)',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.ink)),
            ),
            Switch(
              value: urgent,
              activeTrackColor: JColors.red,
              onChanged: (v) => setS(() => urgent = v),
            ),
          ]),
          Align(
            alignment: Alignment.centerRight,
            child: InkWell(
              onTap: () => openTemplatePicker(ctx).then((t) { if (t != null) ctrl.text = t; }),
              borderRadius: BorderRadius.circular(6),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Text('자주 쓰는 문구', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.blue)),
              ),
            ),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx),
              child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
          TextButton(onPressed: () => Navigator.pop(ctx, true),
              child: Text(urgent ? '긴급 발송' : '발송',
                  style: TextStyle(color: urgent ? JColors.red : JColors.blue, fontWeight: FontWeight.w800))),
        ],
      ),
    ),
  );
  if (ok != true || ctrl.text.trim().isEmpty || !context.mounted) return;
  gNotices.add(JobNotice(jobKey(job), ctrl.text.trim(), gAdmin?.name ?? '관리자', DateTime.now(), confirmed,
      urgent: urgent, role: adminRoleShort()));
  audit('notice', job.site, '${urgent ? '긴급 ' : ''}공지 · 확정 $confirmed명 · ${ctrl.text.trim()}',
      jobRef: '${job.dateLabel} ${job.slot}');
  jSnack(context, '${urgent ? '긴급 공지 즉시 발송' : '공지 발송'} · 확정 $confirmed명 (이후 확정자도 자동 수신)');
}

// ─── 긴급 구인 알림 — 마케팅·긴급 구인 동의자에게만 · 추가 포인트 얹기 가능 (→ Supabase notifications kind=urgent) ───
Future<void> openUrgentRecruitSheet(BuildContext context, Job job, int short) async {
  final ctrl = TextEditingController(
      text: '${job.site} ${job.dateLabel} ${job.slot} ${job.timeLabel} · $short명 급구! 지금 신청하면 바로 확정돼요.');
  var extra = 0;
  final n = consentCountOf(job.site);
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setS) => Padding(
        padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + MediaQuery.of(ctx).viewInsets.bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('긴급 구인 알림', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
          const SizedBox(height: 2),
          Text('동의자 $n명 대상 · 긴급 구인 동의한 알바생에게만 · 야간 제한 없음',
              style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
          const SizedBox(height: 10),
          TextField(
            controller: ctrl,
            maxLines: 3,
            maxLength: 200,
            style: const TextStyle(fontSize: 13, color: JColors.ink, height: 1.5),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: JColors.hairline)),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: InkWell(
              onTap: () => openTemplatePicker(ctx).then((t) { if (t != null) ctrl.text = t; }),
              borderRadius: BorderRadius.circular(6),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Text('자주 쓰는 문구', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.blue)),
              ),
            ),
          ),
          const SizedBox(height: 6),
          const Text('추가 포인트 (공고 기본 포인트에 얹음)', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
          const SizedBox(height: 6),
          Wrap(spacing: 6, children: [
            for (final p in const [0, 500, 1000])
              InkWell(
                onTap: () => setS(() => extra = p),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: extra == p ? JColors.ink : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: extra == p ? JColors.ink : JColors.hairline, width: .5),
                  ),
                  child: Text(p == 0 ? '없음' : '+${p}P',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: extra == p ? Colors.white : JColors.ink)),
                ),
              ),
          ]),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(child: jPill('취소', bg: Colors.white, fg: JColors.muted, border: JColors.hairline, onTap: () => Navigator.pop(ctx))),
            const SizedBox(width: 8),
            Expanded(flex: 2, child: jPill('동의자 $n명에게 발송', bg: JColors.blue, fg: Colors.white, onTap: () => Navigator.pop(ctx, true))),
          ]),
        ]),
      ),
    ),
  );
  if (ok != true || ctrl.text.trim().isEmpty || !context.mounted) return;
  gNotices.add(JobNotice(jobKey(job), '${extra > 0 ? '+${extra}P · ' : ''}${ctrl.text.trim()}', gAdmin?.name ?? '관리자',
      DateTime.now(), n, urgent: true, kind: 'urgent_recruit', role: adminRoleShort()));
  audit('urgent_recruit', job.site, '동의자 $n명 · ${extra > 0 ? '+${extra}P · ' : ''}${ctrl.text.trim()}',
      jobRef: '${job.dateLabel} ${job.slot}');
  jSnack(context, '긴급 구인 알림 발송 · 동의자 $n명${extra > 0 ? ' · 추가 +${extra}P' : ''}');
}

// GPS 영역 밖 퇴근 — 사유 검토 대기 (알바생 앱에서 제출 → 여기서 승인/반려)
class GpsReq {
  final String name, reason, dist, time;
  final DateTime at; // 제출 시각 (종료 전 제출이면 조퇴 처리 대상)
  const GpsReq(this.name, this.reason, this.dist, this.time, this.at);
}



// ─── 가입 알바생 풀 Mock (직접 추가 검색용 → Supabase workers 교체 지점) ───
class Member {
  final String name, phone, label;
  final bool neg; // 협의대상
  final int pendingWithdraw; // 출금 요청 대기 중인 포인트 — 회수 시 보호 (→ Supabase point_txs type=withdraw pending)
  const Member(this.name, this.phone, this.label, [this.neg = false, this.pendingWithdraw = 0]);
}


// ─── 경고 부여 (관리자 재량 · 3회 누적 → 자동 협의대상) → Supabase warnings 교체 지점 ───
// 확정 (2026-08-30): 앱에서 경고 부여 가능 — 관리자 재량, 3회 누적 시 협의대상 자동
class WarningEntry {
  final String name, reason, memo, by, jobRef;
  final DateTime at;
  bool reverted;
  WarningEntry(this.name, this.reason, this.memo, this.by, this.at, this.jobRef, [this.reverted = false]);
}

final List<WarningEntry> gWarnings = [];

// 알바생 앱에 팝업으로 전달되는 안내 (조퇴 기록 등) → Supabase worker_notices 교체 지점
final List<({String name, String text, DateTime at, String jobRef})> gWorkerNotes = [];
const earlyLeaveNote = '조퇴 기록 — 알바비·포인트 지급 대상 아님. 반복 시 경고 대상';
void noteEarlyLeave(String name, String jobRef) =>
    gWorkerNotes.add((name: name, text: earlyLeaveNote, at: DateTime.now(), jobRef: jobRef));
const warningReasons = ['12시간 이내 취소', '지각', '무단결근', '무응답', 'GPS 미검증']; // 기획 5종

// 같이하기 짝이 취소됐을 때 — 남는 짝에게 보너스 소멸 안내 (근무는 그대로). 짝이 명단에 남아 있으면 그 이름 반환
String buddyCancelNote(String cancelled) =>
    '짝 $cancelled가 근무를 취소했어요 — 같이하기 보너스 ${Policy.buddyBonus ~/ 1000},000P는 받을 수 없어요. 근무는 그대로 진행돼요.';
String? remainingBuddyOf(Job j, String cancelled) {
  final p = buddyOf(j, cancelled);
  if (p == null || workerOf(j, p) == null) return null;
  return p;
}
void noteBuddyCancelled(Job j, String cancelled) {
  final p = remainingBuddyOf(j, cancelled);
  if (p == null) return;
  gWorkerNotes.add((name: p, text: buddyCancelNote(cancelled), at: DateTime.now(), jobRef: '${j.site} ${j.dateLabel} ${j.slot}'));
}

int appWarningsOf(String name) => gWarnings.where((w) => w.name == name && !w.reverted).length;
// 협의대상 = 등록된 협의대상 OR 경고 3회 이상 (전화번호 기반 · 해제는 마스터 웹 전용)
bool isNegotiation(String name) => memberOf(name).neg || (warningsOf(memberOf(name)) + appWarningsOf(name)) >= 3;
int totalWarningsOf(String name) => warningsOf(memberOf(name)) + appWarningsOf(name);

Future<void> openWarnSheet(BuildContext context, String name, {String jobRef = ''}) async {
  String reason = warningReasons.first;
  final memo = TextEditingController();
  final before = totalWarningsOf(name);
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setS) => Padding(
        padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + MediaQuery.of(ctx).viewInsets.bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('$name — 경고 부여', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
          const SizedBox(height: 4),
          Text(
              '현재 경고 $before회 → 부여 시 ${before + 1}회${before + 1 >= 3 ? ' · 협의대상 자동 등록' : ''}\n관리자 재량 판단이에요. 알바생에게 사유가 전달돼요.',
              style: TextStyle(fontSize: 11.5, height: 1.5, color: before + 1 >= 3 ? JColors.red : JColors.muted)),
          const SizedBox(height: 12),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final r in warningReasons)
              InkWell(
                onTap: () => setS(() => reason = r),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                  decoration: BoxDecoration(
                    color: reason == r ? JColors.ink : Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: reason == r ? JColors.ink : JColors.hairline, width: .5),
                  ),
                  child: Text(r,
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                          color: reason == r ? Colors.white : JColors.ink)),
                ),
              ),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: memo,
            maxLines: 2,
            maxLength: 120,
            style: const TextStyle(fontSize: 13, color: JColors.ink, height: 1.5),
            decoration: InputDecoration(
              isDense: true,
              hintText: '메모 (선택) · 예: 8/24 곤지암 40분 지각, 사전 연락 없음',
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: JColors.hairline)),
            ),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: jPill('취소', bg: Colors.white, fg: JColors.muted, border: JColors.hairline, onTap: () => Navigator.pop(ctx))),
            const SizedBox(width: 8),
            Expanded(child: jPill('경고 부여', bg: JColors.red, fg: Colors.white, onTap: () => Navigator.pop(ctx, true))),
          ]),
        ]),
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  gWarnings.add(WarningEntry(name, reason, memo.text.trim(), gAdmin?.name ?? '관리자', DateTime.now(), jobRef));
  audit('warning', name, '경고 $reason${memo.text.trim().isEmpty ? '' : ' · ${memo.text.trim()}'}', jobRef: jobRef);
  final now = totalWarningsOf(name);
  jSnack(
      context,
      now >= 3
          ? '$name 경고 $now회 — 협의대상 자동 등록 (해제는 마스터 웹)'
          : now == 2
              ? '$name 경고 $now회 · 알바생에게 전달됨 — 다음 경고 시 협의대상 등록'
              : '$name 경고 $now회 · 알바생에게 전달됨');
}

// ─── 메시지 템플릿 — 공지 · 회수 사유 · 문의 답변에서 골라 쓰기 (→ Supabase admin_templates 교체 지점) ───
final List<String> gMsgTemplates = [
  '오늘 물량이 많아요. 10분 일찍 와주세요.',
  '작업복(긴바지·운동화) 착용 필수입니다. 슬리퍼 불가.',
  '통근버스 1차 출발 시간이 10분 당겨졌어요. 확인 부탁드려요.',
  '식사는 현장 식당에서 제공됩니다. 개인 물병 지참해주세요.',
  '퇴근 시 GPS 영역 안에서 퇴근 버튼 눌러주세요. 안 되면 사유 제출해주세요.',
  '사전 연락 없는 지각으로 포인트 1,000P 회수합니다. 다음부턴 늦어요 보고 부탁드려요.',
  // 기획안 §4-5 빠른 템플릿 — 폭설 · 사고 · 결행
  '[폭설] 도로 사정으로 통근버스가 지연될 수 있어요. 안전하게 오시고, 늦으면 늦어요 보고 남겨주세요.',
  '[사고] 현장에 안전 사고가 있었어요. 관리자 안내 전까지 작업장 진입을 멈춰주세요.',
  '[결행] 오늘 근무가 취소됐어요. 포인트·알바비 처리는 별도 안내드립니다. 죄송합니다.',
];

Future<String?> openTemplatePicker(BuildContext context) => showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
          children: [
            const Text('자주 쓰는 문구', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
            const SizedBox(height: 2),
            const Text('내정보 › 자주 쓰는 문구에서 추가·삭제', style: TextStyle(fontSize: 11.5, color: JColors.muted)),
            const SizedBox(height: 10),
            if (gMsgTemplates.isEmpty)
              const Padding(padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text('저장된 문구가 없어요', style: TextStyle(fontSize: 12, color: JColors.inactive))),
            for (final t in gMsgTemplates)
              InkWell(
                onTap: () => Navigator.pop(ctx, t),
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                  child: Text(t, style: const TextStyle(fontSize: 13, color: JColors.ink, height: 1.45)),
                ),
              ),
          ],
        ),
      ),
    );

// ─── 알림 수신함 — 지금 상태에서 파생 (FCM 붙이면 notifications 테이블 → 같은 카드로) ───
class InboxItem {
  final String key, title, body, kind; // kind: job(공고 상세) / approval(승인 탭) / comm(소통 탭)
  final Color color;
  final DateTime at;
  final Job? job;
  const InboxItem(this.key, this.title, this.body, this.kind, this.color, this.at, [this.job]);
}

final Set<String> gInboxRead = {}; // 읽음 처리한 알림 key

List<InboxItem> buildInbox(Admin a) {
  final now = DateTime.now();
  bool inScope(String site) => a.sites == null || a.sites!.contains(site);
  final out = <InboxItem>[];
  for (final j in [...gJobs, ...gPastJobs]) {
    if (!inScope(j.site)) continue;
    final started = now.isAfter(j.start), ended = now.isAfter(j.end);
    final ref = '${j.site} ${j.dateLabel} ${j.slot}';
    if (started && !ended) {
      final none = liveCounts(j).none;
      if (none > 0 && now.difference(j.start).inMinutes >= Policy.absentAfterMin) {
        out.add(InboxItem('none|${jobKey(j)}', '미도착 $none명', '$ref · 수동 출근 또는 결근 처리', 'job', JColors.red,
            j.start.add(const Duration(minutes: Policy.absentAfterMin)), j));
      }
    }
    for (final r in pendingGpsOf(j)) {
      out.add(InboxItem('gps|${jobKey(j)}|${r.name}', '${r.name} 퇴근 사유 제출', '$ref · "${r.reason}" · ${r.dist}', 'job',
          JColors.amber, ended ? j.end : j.start, j));
    }
    if (ended && manualCount(j) > 0) {
      out.add(InboxItem('manual|${jobKey(j)}', '퇴근 확인 필요 ${manualCount(j)}명', '$ref · 종료 후 6시간 안에 처리', 'job',
          JColors.amber, j.end, j));
    }
    if (!started) {
      for (final r in waitlistOf(j)) {
        if (r.status == 'offered' && r.deadline != null && r.deadline!.isBefore(now)) {
          out.add(InboxItem('wl|${jobKey(j)}|${r.name}', '대기열 제안 시간 초과 · ${r.name}', '$ref · 다음 대기자에게 제안', 'job',
              JColors.amber, r.deadline!, j));
        }
      }
      final seats = seatsOf(j);
      if (seats > 0 && j.start.difference(now).inHours < 12) {
        out.add(InboxItem('short|${jobKey(j)}', '$seats명 부족 · 시작 12시간 전', ref, 'job',
            JColors.red, j.start.subtract(const Duration(hours: 12)), j));
      }
    }
  }
  for (final p in pendingAppsFor(a)) {
    final urgent = p.danger || p.flag.contains('12') || waitLabelOf(p).$2;
    out.add(InboxItem(appKey(p), '${p.name} 신청 승인 필요', '${p.siteName} ${p.slotTime} · ${p.flag} · ${waitLabelOf(p).$1}', 'approval',
        urgent ? JColors.red : JColors.amber, p.appliedAt));
  }
  for (final c in cancelReqsFor(a)) {
    out.add(InboxItem('cancel|${c.name}|${c.siteName}', '${c.name} 취소 검토', '${c.siteName} ${c.slotTime} · 시작 ${beforeLabel(c.beforeMin)} 전 취소', 'approval',
        JColors.amber, now.subtract(const Duration(minutes: 30))));
  }
  for (final l in lateReportsFor(a)) {
    out.add(InboxItem('late|${l.name}|${l.siteName}', '${l.name} ${l.delayMin}분 늦어요', '${l.siteName} ${l.slot} · ${l.reason}', 'comm',
        JColors.amber, now.subtract(const Duration(minutes: 20))));
  }
  out.sort((x, y) => y.at.compareTo(x.at));
  return out;
}

int unreadInbox(Admin a) => buildInbox(a).where((i) => !gInboxRead.contains(i.key)).length;

class InboxPage extends StatefulWidget {
  final Admin admin;
  final void Function(int tab) onGoTab;
  const InboxPage({super.key, required this.admin, required this.onGoTab});
  @override
  State<InboxPage> createState() => _InboxPageState();
}

class _InboxPageState extends State<InboxPage> {
  @override
  Widget build(BuildContext context) {
    final items = buildInbox(widget.admin);
    final unread = items.where((i) => !gInboxRead.contains(i.key)).length;
    return Scaffold(
      body: SafeArea(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 16, 6),
            child: Row(children: [
              InkWell(
                onTap: () => Navigator.of(context).pop(),
                borderRadius: BorderRadius.circular(10),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  child: Text('‹', style: TextStyle(fontSize: 26, color: JColors.blue, height: 1)),
                ),
              ),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('알림', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.4, color: JColors.ink)),
                  Text('처리 필요 ${items.length}건 · 안 읽음 $unread', style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                ]),
              ),
              if (unread > 0)
                InkWell(
                  onTap: () => setState(() => gInboxRead.addAll(items.map((i) => i.key))),
                  borderRadius: BorderRadius.circular(10),
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Text('모두 읽음', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.blue)),
                  ),
                ),
            ]),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
              children: [
                if (items.isEmpty)
                  jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 14),
                      child: Text('처리할 알림이 없어요', style: TextStyle(fontSize: 12.5, color: JColors.inactive))))),
                for (final i in items)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: JColors.card,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () {
                          setState(() => gInboxRead.add(i.key));
                          if (i.kind == 'job' && i.job != null) {
                            Navigator.of(context).push(MaterialPageRoute(builder: (_) => AttendancePage(job: i.job!)));
                          } else {
                            Navigator.of(context).pop();
                            widget.onGoTab(i.kind == 'approval' ? 2 : 3);
                          }
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: JColors.hairline, width: .5),
                          ),
                          padding: const EdgeInsets.all(14),
                          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 5),
                              child: Container(width: 7, height: 7,
                                  decoration: BoxDecoration(shape: BoxShape.circle,
                                      color: gInboxRead.contains(i.key) ? Colors.transparent : i.color)),
                            ),
                            const SizedBox(width: 9),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(i.title,
                                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700,
                                        color: gInboxRead.contains(i.key) ? JColors.muted : JColors.ink)),
                                const SizedBox(height: 2),
                                Text(i.body, style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.4)),
                              ]),
                            ),
                            const SizedBox(width: 8),
                            Text(hmOf(i.at), style: const TextStyle(fontSize: 10.5, color: JColors.inactive,
                                fontFeatures: [FontFeature.tabularFigures()])),
                          ]),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

// ─── 승인 카드 → 공고 상세 이동 — id 우선, 없으면 근무지명 + 시작 시각으로 매칭 (→ Supabase applications.job_id) ───
Job? jobByRef(String? id, String site, String slot) {
  final all = [...gJobs, ...gPastJobs];
  if (id != null) {
    final j = all.where((x) => x.id == id).firstOrNull;
    if (j != null) return j;
  }
  return all.where((x) => x.site == site && slot.contains(Job._hm(x.start))).firstOrNull;
}

Widget jobLink(BuildContext context, String? id, String site, String slot, String text) {
  final j = jobByRef(id, site, slot);
  return InkWell(
    onTap: j == null ? null : () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AttendancePage(job: j))),
    borderRadius: BorderRadius.circular(6),
    child: Text.rich(TextSpan(children: [
      TextSpan(text: text,
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: j == null ? JColors.muted : JColors.blue)),
      if (j != null) const TextSpan(text: '  공고 보기 ›', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.blue)),
    ])),
  );
}

// ─── 앱에서 승인한 신청자 (jobKey → 이름들) — 공고 상세 확정 명단에 합류 → Supabase applications.status='approved' 교체 지점 ───
final Map<String, List<String>> gApprovedByJob = {};

// 이 공고의 신청 대기 — id 우선, 없으면 근무지명 + 시작 시각 매칭
List<PendingApp> pendingAppsOf(Job j) => gAdmin == null
    ? const []
    : pendingAppsFor(gAdmin!)
        .where((p) => p.jobId != null ? p.jobId == j.id : (p.siteName == j.site && p.slotTime.contains(Job._hm(j.start))))
        .toList();

// ─── 앱 셸 (하단 독 + 탭) ───
class AdminShell extends StatefulWidget {
  final Admin admin;
  final VoidCallback onLogout;
  const AdminShell({super.key, required this.admin, required this.onLogout});
  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int tab = 0;
  static const tabs = ['공고', '일정', '승인', '소통', '내정보']; // 앱 열면 공고 먼저

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: switch (tab) {
              0 => JobListPage(admin: widget.admin, onGoTab: (i) => setState(() => tab = i)),
              1 => SchedulePage(admin: widget.admin),
              2 => ApprovalPage(admin: widget.admin),
              3 => CommPage(admin: widget.admin),
              _ => MePage(admin: widget.admin, onLogout: widget.onLogout),
            },
          ),
          // 떠 있는 텍스트 독
          Positioned(
            left: 14, right: 14, bottom: 12,
            child: Container(
              height: 54,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: .88),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: JColors.hairline, width: .5),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .14), blurRadius: 24, offset: const Offset(0, 10))],
              ),
              child: ValueListenableBuilder<int>(
                valueListenable: gPendingTick,
                builder: (_, _, _) {
                  // 승인 탭 배지 = 신청 대기 + 취소 검토 (담당 범위)
                  final pendingN = pendingAppsFor(widget.admin).length + cancelReqsFor(widget.admin).length;
                  return Row(
                children: List.generate(tabs.length, (i) {
                  final on = tab == i;
                  return Expanded(
                    child: InkWell(
                      onTap: () => setState(() => tab = i),
                      borderRadius: BorderRadius.circular(18),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text.rich(TextSpan(children: [
                            TextSpan(
                                text: tabs[i],
                                style: TextStyle(
                                  fontSize: 13,
                                  letterSpacing: -.3,
                                  fontWeight: on ? FontWeight.w800 : FontWeight.w600,
                                  color: on ? JColors.ink : JColors.inactive,
                                )),
                            if (tabs[i] == '승인' && pendingN > 0)
                              TextSpan(
                                  text: ' +$pendingN',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: JColors.amber)),
                          ])),
                          const SizedBox(height: 3),
                          Container(width: 4, height: 4,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: on ? JColors.blue : Colors.transparent,
                              )),
                        ],
                      ),
                    ),
                  );
                }),
              );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── 공고 리스트 (메인 화면) — 타이머 자동 갱신 ───
class JobListPage extends StatefulWidget {
  final Admin admin;
  final void Function(int tab)? onGoTab;
  const JobListPage({super.key, required this.admin, this.onGoTab});
  @override
  State<JobListPage> createState() => _JobListPageState();
}

class _JobListPageState extends State<JobListPage> {
  String view = 'today'; // today(공고: 24시간 내 시작 전) | active(진행중) | upcoming(예정) | past(종료)
  Timer? _tick;

  bool _inScope(Job j) => widget.admin.sites == null || widget.admin.sites!.contains(j.site);
  // 24시간 = 진행 중 + 지금부터 24시간 안에 시작 (자정 넘는 야간도 자연히 포함)
  List<Job> get jobs {
    final now = DateTime.now();
    final limit = now.add(const Duration(hours: 24));
    return gJobs
        .where((j) => _inScope(j) && !now.isAfter(j.end) && !j.start.isAfter(limit))
        .toList()
      ..sort((a, b) => a.start.compareTo(b.start));
  }

  // 공고 = 아직 시작 전 + 24시간 안에 시작 (모집·확정 단계)
  List<Job> get openJobs => jobs.where((j) => !DateTime.now().isAfter(j.start)).toList();
  // 진행중 = 시작했고 아직 안 끝남
  List<Job> get activeJobs => jobs.where((j) => DateTime.now().isAfter(j.start)).toList();
  int get activeIssues => activeJobs.where((j) => liveCounts(j).none > 0).length; // 미도착 있는 공고 수

  // 예정 = 24시간 이후 시작
  List<Job> get upcomingJobs {
    final limit = DateTime.now().add(const Duration(hours: 24));
    return gJobs.where((j) => _inScope(j) && j.start.isAfter(limit)).toList()
      ..sort((a, b) => a.start.compareTo(b.start));
  }

  // 종료 = 끝난 공고 전부 (오늘 끝난 것 + 지난 2주), 최신순
  List<Job> get pastJobs {
    final now = DateTime.now();
    return [...gJobs, ...gPastJobs].where((j) => _inScope(j) && now.isAfter(j.end)).toList()
      ..sort((a, b) => b.end.compareTo(a.end));
  }

  int get manualPending => pastJobs.where(needsManual).length; // 종료 탭 배지 (+N)

  @override
  void initState() {
    super.initState();
    // 매초 갱신 → 초 단위 타이머
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 알림은 빌드당 한 번만 계산 — 헤더 배지와 브리핑 카드가 같은 목록을 봄
    final unread = buildInbox(widget.admin).where((i) => !gInboxRead.contains(i.key)).length;
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('공고',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -.6, color: JColors.ink)),
                      const SizedBox(height: 2),
                      Text(
                          switch (view) {
                            'today' =>
                              '${widget.admin.sites == null ? '전 근무지' : '담당 ${widget.admin.sites!.length} 근무지'} · 24시간 안에 시작 ${openJobs.length}건',
                            'active' =>
                              '${widget.admin.sites == null ? '전 근무지' : '담당 ${widget.admin.sites!.length} 근무지'} · 진행 중 ${activeJobs.length}건${activeIssues > 0 ? ' · 미도착 발생 $activeIssues건' : ''}',
                            'upcoming' =>
                              '${widget.admin.sites == null ? '전 근무지' : '담당 ${widget.admin.sites!.length} 근무지'} · 24시간 이후 예정 ${upcomingJobs.length}건',
                            _ => manualPending > 0
                                ? '수동 처리 필요 $manualPending건 · 종료 후 7일까지 정정 가능'
                                : '종료된 공고 · 종료 후 7일까지 정정 가능',
                          },
                          style: const TextStyle(fontSize: 12.5, color: JColors.muted)),
                    ],
                  ),
                ),
                // 알림 수신함 — 처리 필요 건 시간순
                InkWell(
                  onTap: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => InboxPage(admin: widget.admin, onGoTab: (i) => widget.onGoTab?.call(i))))
                      .then((_) { if (mounted) setState(() {}); }),
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Text.rich(TextSpan(children: [
                      const TextSpan(text: '알림', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.ink)),
                      if (unread > 0)
                        TextSpan(text: ' +$unread',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: JColors.red)),
                    ])),
                  ),
                ),
                // 공고 등록 — 마스터·1등급 전용 (2026-08-24 확정)
                if (widget.admin.isA1)
                  InkWell(
                    onTap: () => openRegisterSheet(context).then((ok) { if (ok && mounted) setState(() {}); }),
                    borderRadius: BorderRadius.circular(10),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Text('＋ 공고 등록',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.blue)),
                    ),
                  ),
              ],
            ),
          ),
          // 오늘 브리핑 — 검정 카드 1장: 전체 합계 (무슨 일이 생겼나 → 탭·알림으로 이동)
          if (view == 'today' || view == 'active') _brief(unread),
          // [공고] [진행중] [예정] [종료] 전환
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(color: const Color(0xFFE8E8ED), borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              for (final v in const [('today', '공고'), ('active', '진행중'), ('upcoming', '예정'), ('past', '종료')])
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => view = v.$1),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: view == v.$1 ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: view == v.$1
                            ? [BoxShadow(color: Colors.black.withValues(alpha: .12), blurRadius: 3)]
                            : null,
                      ),
                      child: Text.rich(TextSpan(children: [
                        TextSpan(
                            text: v.$2,
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: view == v.$1 ? FontWeight.w700 : FontWeight.w600,
                                color: view == v.$1 ? JColors.ink : JColors.muted)),
                        // 진행중 탭 배지 — 미도착 발생 공고 수 (빨강)
                        if (v.$1 == 'active' && activeIssues > 0)
                          TextSpan(
                              text: ' +$activeIssues',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: JColors.red)),
                        // 종료 탭 배지 — 수동 처리 필요 공고 수 (앰버)
                        if (v.$1 == 'past' && manualPending > 0)
                          TextSpan(
                              text: ' +$manualPending',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: JColors.amber)),
                      ])),
                    ),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 12),
          if (view == 'today')
            ..._grouped(openJobs, '24시간 안에 시작하는 공고가 없어요')
          else if (view == 'active')
            ..._grouped(activeJobs, '진행 중인 공고가 없어요')
          else if (view == 'upcoming')
            ..._grouped(upcomingJobs, '24시간 이후 예정 공고가 없어요')
          else
            ..._pastList(),
        ],
      ),
    );
  }

  static Widget _calendar(BuildContext ctx, DateTime month, Set<DateTime> picked,
      void Function(void Function()) setSheet, void Function(DateTime) setMonth) {
    final n = DateTime.now();
    final today0 = DateTime(n.year, n.month, n.day);
    final first = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final lead = first.weekday % 7; // 일요일 시작
    final canPrev = month.isAfter(DateTime(n.year, n.month));
    final cells = <Widget>[
      for (var i = 0; i < lead; i++) const SizedBox(),
      for (var d = 1; d <= daysInMonth; d++)
        () {
          final date = DateTime(month.year, month.month, d);
          final past = date.isBefore(today0);
          final sel = picked.contains(date);
          final isToday = date == today0;
          return InkWell(
            onTap: past ? null : () => setSheet(() => sel ? picked.remove(date) : picked.add(date)),
            borderRadius: BorderRadius.circular(18),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(shape: BoxShape.circle, color: sel ? JColors.ink : Colors.transparent),
              child: Text('$d',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: sel || isToday ? FontWeight.w800 : FontWeight.w600,
                      color: sel
                          ? Colors.white
                          : past
                              ? const Color(0xFFC7C7CC)
                              : isToday
                                  ? JColors.blue
                                  : JColors.ink)),
            ),
          );
        }(),
    ];
    Widget nav(String t, bool on, VoidCallback f) => InkWell(
          onTap: on ? f : null,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            child: Text(t, style: TextStyle(fontSize: 22, height: 1, color: on ? JColors.blue : const Color(0xFFC7C7CC))),
          ),
        );
    return Container(
      decoration: BoxDecoration(
          color: const Color(0xFFF5F5F7), borderRadius: BorderRadius.circular(14)),
      padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
      child: Column(children: [
        Row(children: [
          nav('‹', canPrev, () => setSheet(() => setMonth(DateTime(month.year, month.month - 1)))),
          Expanded(
              child: Text('${month.year}년 ${month.month}월',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: JColors.ink))),
          nav('›', true, () => setSheet(() => setMonth(DateTime(month.year, month.month + 1)))),
        ]),
        Row(children: [
          for (final w in const ['일', '월', '화', '수', '목', '금', '토'])
            Expanded(
                child: Text(w,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: w == '일' ? JColors.red : (w == '토' ? JColors.blue : JColors.inactive)))),
        ]),
        const SizedBox(height: 4),
        GridView.count(
          crossAxisCount: 7,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.15,
          children: cells,
        ),
      ]),
    );
  }

  static Widget _timeBox(BuildContext ctx, String label, String value, VoidCallback onTap) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12), border: Border.all(color: JColors.hairline)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: JColors.muted)),
              const SizedBox(height: 1),
              Text(value,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: JColors.ink,
                      fontFeatures: [FontFeature.tabularFigures()])),
            ]),
          ),
        ),
      );

  static Widget _stepBtn(String t, VoidCallback f) => InkWell(
        onTap: f,
        borderRadius: BorderRadius.circular(17),
        child: Container(
          width: 34, height: 34, alignment: Alignment.center,
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(17), border: Border.all(color: JColors.hairline)),
          child: Text(t, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: JColors.ink)),
        ),
      );

  // 24시간 보기 — 진행 중 / 앞으로 24시간 두 묶음
  List<Widget> _pastList() => _grouped(pastJobs, '종료된 공고가 없어요');

  static Widget _emptyCard(String msg) => jCard(Center(
      child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Text(msg, style: const TextStyle(fontSize: 12, color: JColors.inactive)))));

  // 날짜별 그룹 리스트 (예정·지난 공통)
  // 오늘 브리핑 — 검정 카드 (전 범위 합계)
  Widget _brief(int unread) {
    final none = activeJobs.fold<int>(0, (a, j) => a + liveCounts(j).none);
    final approvals = pendingAppsFor(widget.admin).length + cancelReqsFor(widget.admin).length;
    final short = openJobs.fold<int>(0, (a, j) => a + (seatsOf(j) > 0 ? seatsOf(j) : 0));
    final lines = <(String, bool)>[
      ('미도착 $none명', none > 0),
      ('퇴근 확인 $manualPending건', manualPending > 0),
      ('승인 대기 $approvals건', approvals > 0),
      ('모집 부족 $short명', short > 0),
    ];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(color: JColors.ink, borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('오늘 브리핑', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: .6))),
            Text(unread > 0 ? '알림 $unread건' : '알림 없음',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: unread > 0 ? 1 : .6))),
          ]),
          const SizedBox(height: 6),
          Text('진행 ${activeJobs.length} · 시작 예정 ${openJobs.length} · 종료 ${pastJobs.where((j) => DateTime.now().difference(j.end).inHours < 24).length}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: -.3, color: Colors.white,
                  fontFeatures: [FontFeature.tabularFigures()])),
          const SizedBox(height: 6),
          Wrap(spacing: 10, runSpacing: 2, children: [
            for (final l in lines)
              Text(l.$1,
                  style: TextStyle(fontSize: 12, fontWeight: l.$2 ? FontWeight.w800 : FontWeight.w600,
                      color: Colors.white.withValues(alpha: l.$2 ? 1 : .45))),
          ]),
        ]),
      ),
    );
  }

  List<Widget> _grouped(List<Job> list, String emptyMsg) {
    if (list.isEmpty) return [_emptyCard(emptyMsg)];
    final out = <Widget>[];
    String? lastDate;
    for (final j in list) {
      if (j.dateLabel != lastDate) {
        lastDate = j.dateLabel;
        out.add(Padding(
          padding: const EdgeInsets.only(bottom: 7, left: 2, top: 4),
          child: Text(j.dateLabel,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.muted)),
        ));
      }
      out.add(Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: _JobCard(job: j),
      ));
    }
    return out;
  }
}

// ─── 타이머 계산 헬퍼 ───
String _dur(Duration d) {
  final h = d.inHours, m = d.inMinutes % 60, s = d.inSeconds % 60;
  final mm = m.toString().padLeft(2, '0');
  final ss = s.toString().padLeft(2, '0');
  if (h > 0) return '$h시간 $mm분 $ss초';
  return '$m분 $ss초';
}

class _JobCard extends StatelessWidget {
  final Job job;
  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    void openAttendance() => Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => AttendancePage(job: job)));
    final started = now.isAfter(job.start);
    final ended = now.isAfter(job.end);
    // 실시간 인원 — 명단(강제 취소 제외) + 직접 추가·승인 합류 + 외부인력 + 정정값 반영
    final live = liveCounts(job);
    final seats = seatsOf(job);
    final short = started ? live.none > 0 : seats > 0;

    // 타이머 상태 신호등 — 맥 점 하나가 상태를 말해줌
    // 시작 전(여유)=초록 · 시작 30분 전=빨강 · 진행 중=파랑 · 종료=회색
    String timerText;
    Color timerColor;
    double? progress; // 진행 중일 때만 막대 표시
    if (ended) {
      final manual = manualCount(job);
      timerText = manual > 0 ? '근무 종료 · 수동 처리 $manual건' : '근무 종료';
      timerColor = manual > 0 ? JColors.amber : JColors.inactive;
    } else if (started) {
      final elapsed = now.difference(job.start);
      timerText = '${_dur(elapsed)} 경과 · 종료 ${Job._hm(job.end)}';
      progress = elapsed.inSeconds / job.end.difference(job.start).inSeconds;
      timerColor = JColors.blue;
    } else {
      final left = job.start.difference(now);
      timerText = '시작까지 ${_dur(left)}';
      timerColor = left.inMinutes < 30 ? JColors.red : JColors.green;
    }

    return Material(
      color: JColors.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
      onTap: openAttendance,
      borderRadius: BorderRadius.circular(16),
      child: Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: JColors.hairline, width: .5),
      ),
      padding: const EdgeInsets.all(15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(job.site,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: -.3, color: JColors.ink)),
              Text(job.status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.muted)),
            ],
          ),
          const SizedBox(height: 3),
          Text(
              '${(job.start.year == now.year && job.start.month == now.month && job.start.day == now.day) ? '' : '${job.dateLabel} '}${job.slot} ${job.timeLabel}',
              style: const TextStyle(fontSize: 12, color: JColors.muted)),
          const SizedBox(height: 4),
          // 타이머 줄 — 맥 점 + 색 글씨
          Row(children: [
            Container(width: 8, height: 8,
                decoration: BoxDecoration(shape: BoxShape.circle, color: timerColor)),
            const SizedBox(width: 6),
            Text(timerText,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w700, color: timerColor,
                    fontFeatures: const [FontFeature.tabularFigures()])),
          ]),
          if (progress != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: progress.clamp(0, 1),
                minHeight: 4,
                backgroundColor: JColors.track,
                valueColor: const AlwaysStoppedAnimation(JColors.blue),
              ),
            ),
          ],
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text.rich(TextSpan(children: [
                TextSpan(
                    text: '${started ? live.ok : live.filled} / ${job.cap} ',
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w800, color: JColors.ink,
                        fontFeatures: [FontFeature.tabularFigures()])),
                TextSpan(text: started ? '출근' : '확정',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.muted)),
              ])),
              // 시작 전엔 '부족'(모집), 시작 후엔 '미출근'(출결) — 단어 구분
              ended
                  ? (manualCount(job) > 0
                      ? Text('퇴근 미처리 ${manualCount(job)}명',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.amber))
                      : const Text('근무 완료',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.inactive)))
                  : started
                      ? Text(short ? '${live.none}명 미출근 · 확인해주세요' : '이상 없음',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                              color: short ? JColors.red : JColors.green))
                      : Text(
                          (job.closed ? '수동 마감 · ' : '') +
                              (short ? '$seats명 부족' : '충원 완료') +
                              (waitlistOf(job).isNotEmpty ? ' · 대기 ${waitlistOf(job).length}' : ''),
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                              color: job.closed ? JColors.amber : (short ? JColors.red : JColors.green))),
            ],
          ),
        ],
      ),
      ),
      ),
    );
  }
}

// ─── 출결 화면 (GPS 자동 + 수동 보정) ───
class AttendancePage extends StatefulWidget {
  final Job job;
  const AttendancePage({super.key, required this.job});
  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  // 이름 → 수동 상태 (앱 전역 저장소 사용 → 화면 나갔다 와도 유지)
  Map<String, String> get overrides => gOverrides.putIfAbsent(jobKey(widget.job), () => {});
  // 이름 → 퇴근 기록 ('' = 기록 취소). 출결 상태와 별개
  Map<String, String> get outs => gOut.putIfAbsent(jobKey(widget.job), () => {});
  // 퇴근 기록 (전역 규칙과 동일 — 종료 6시간 후 자동 퇴근 '자동' 포함)
  String? outOf_(Worker w) => outOf(widget.job, w);

  // 포인트 자동 지급 대상 = 정상 출근(출근·지각) + 정상 퇴근 기록(반려 제외). 조퇴·이탈·결근은 자동 지급 없음
  bool _eligible(Worker w) => jobPointEligible(widget.job, w);
  List<Worker> get extWorkers => extOf(widget.job); // 외부인력 (기획안: 외부 구인) — 앱 전역 저장
  List<Worker> get invited => invitedOf(widget.job); // 직접 추가한 가입 알바생 (기획안 §5-3, 즉시 승인) + 앱에서 승인한 신청자
  List<GpsReq> get gpsReqs => pendingGpsOf(widget.job); // 퇴근 승인 대기 (처리분·퇴근 기록 생긴 사람 제외)
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  String statusOf(Worker w) => effStatus(widget.job, w);
  bool isExt(String name) => extWorkers.any((e) => e.name == name);
  bool isInvited(String name) => invited.any((e) => e.name == name);

  void snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
      behavior: SnackBarBehavior.floating,
      backgroundColor: JColors.ink,
      duration: const Duration(milliseconds: 1300),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ));
  }

  // 수동 출근인데 미서명이면 현장 서명 확인 (알바생 앱 서명 흐름을 관리자가 대신 확인)
  Future<void> mark(String name, String s) async {
    var signTail = '';
    if (s == 'ok' && widget.job.needsSign && !isExt(name) && !isSigned(widget.job, name)) {
      final r = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Text('$name — 미서명 상태', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
          content: const Text('미서명 상태 — 현장에서 서명 받았나요?\n(계약서·안전교육 서명은 원래 알바생 앱 출근 흐름에서 처리돼요)',
              style: TextStyle(fontSize: 12.5, color: JColors.muted, height: 1.5)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx),
                child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
            TextButton(onPressed: () => Navigator.pop(ctx, 'unsigned'),
                child: const Text('서명 없이 출근', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w700))),
            TextButton(onPressed: () => Navigator.pop(ctx, 'signed'),
                child: const Text('서명 확인 · 출근', style: TextStyle(color: JColors.blue, fontWeight: FontWeight.w800))),
          ],
        ),
      );
      if (!mounted || r == null) return;
      if (r == 'signed') signedOf(widget.job).add(name);
      signTail = r == 'signed' ? '수동 출근 · 서명 확인' : '수동 출근 · 미서명';
    }
    setState(() {
      overrides[name] = s;
      // 퇴근 기록은 별개 — 조퇴·이탈은 이미 떠난 것이라 기록 자동, 결근·미도착이면 기록 제거
      if (s == 'early') outs[name] = '조퇴';
      if (s == 'runaway') outs[name] = '이탈';
      if (s == 'absent' || s == 'none') outs[name] = '';
      // 조퇴·이탈 → 출근·지각으로 되돌리면 자동으로 남은 '조퇴/이탈' 기록도 지움 (가짜 퇴근 방지)
      if ((s == 'ok' || s == 'late') && (outs[name] == '조퇴' || outs[name] == '이탈')) outs[name] = '';
    });
    final ref = '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}';
    audit('att_fix', name, '→ ${_stMeta(s).$1}${signTail.isEmpty ? '' : ' · $signTail'}', jobRef: ref);
    if (s == 'early') noteEarlyLeave(name, ref); // 알바생 앱 팝업 — 알바비·포인트 없음, 반복 시 경고
    snack('$name — ${_stMeta(s).$1} 처리${s == 'early' ? ' · 알바생에게 안내 전달' : ''}');
  }

  // 상태 라벨·색 (전 화면 공통)
  static (String, Color) _stMeta(String s) => switch (s) {
        'ok' => ('출근', JColors.green),
        'late' => ('지각', const Color(0xFF9A6B00)),
        'early' => ('조퇴', const Color(0xFF9A6B00)),
        'runaway' => ('무단이탈', JColors.red),
        'absent' => ('결근', JColors.red),
        'wait' => ('출근 전', JColors.inactive),
        _ => ('미도착', JColors.inactive),
      };

  // 출결 정정 + 외부인력 수정·삭제 시트 (조퇴·무단이탈 등 현장 기록 → DB 저장 지점)
  void _statusSheet(Worker w, {bool statusEditable = true}) {
    final ext = isExt(w.name);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(w.name + (w.org != null ? '  ·  ${w.org}' : ''),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
            const SizedBox(height: 2),
            Text(ext ? '외부인력' : '출결 정정 — 변경 내용은 기록에 남아요',
                style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
            if (!ext) ...[
              const SizedBox(height: 8),
              _pill('프로필 보기 · 근무·포인트 내역', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: () {
                Navigator.pop(ctx);
                openWorker(context, w.name);
              }),
            ],
            // 전화 — 회원은 회원 번호, 외부인력은 입력한 번호
            if ((ext ? w.phone : memberOf(w.name).phone) != null) ...[
              const SizedBox(height: 8),
              _pill('전화 ${ext ? w.phone : memberOf(w.name).phone}',
                  bg: Colors.white, fg: JColors.ink, border: JColors.muted, onTap: () {
                Navigator.pop(ctx);
                callPhone(context, (ext ? w.phone : memberOf(w.name).phone)!);
              }),
            ],
            if (statusEditable) ...[
              const SizedBox(height: 13),
              // 출근 행 (출근·지각) ↔ 근무 행 (조퇴·무단이탈·결근) — 같은 status 필드라 한쪽을 고르면 다른 행 강조는 자동 해제
              _chipRow('출근', [for (final s in const ['ok', 'late']) _stChip(ctx, w, s)]),
              const SizedBox(height: 8),
              _chipRow('근무', [for (final s in const ['early', 'runaway', 'absent']) _stChip(ctx, w, s)]),
              const SizedBox(height: 8),
              // 퇴근 기록 — 출결 상태와 별개. 출근·지각일 때만, 그리고 근무 종료 후에만 (규칙 §3 · Policy.checkoutOpenAfterEnd)
              Builder(builder: (_) {
                final st = statusOf(w);
                final now = DateTime.now();
                final attending = st == 'ok' || st == 'late';
                final ended = now.isAfter(widget.job.end);
                final o = outOf_(w);
                final hm = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
                final enabled = attending && ended;
                final label = o == null ? '퇴근 처리 · 현재 $hm' : '퇴근 기록 취소 · $o';
                final hint = !attending
                    ? '조퇴·이탈·결근은 퇴근 처리 대상이 아니에요'
                    : (!ended ? '근무 종료(${Job._hm(widget.job.end)}) 후 퇴근 처리 가능' : null);
                return _chipRow('퇴근', [
                  enabled
                      ? _pill(label,
                          bg: o == null ? JColors.amber : Colors.white,
                          fg: o == null ? Colors.white : JColors.muted,
                          border: o == null ? null : JColors.muted, onTap: () {
                          Navigator.pop(ctx);
                          final had = o != null;
                          setState(() {
                            outs[w.name] = had ? '' : '수동';
                            // 수동 퇴근 처리하면 그 사람의 GPS 사유 제출은 처리된 것으로
                            if (!had) gGpsDone.add('${jobKey(widget.job)}|${w.name}');
                          });
                          snack('${w.name} — ${had ? '퇴근 기록 취소' : '퇴근 처리'}');
                        })
                      : Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(19),
                            border: Border.all(color: JColors.hairline),
                          ),
                          child: Text(label,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.inactive)),
                        ),
                ], hint: hint);
              }),
            ],
            // 포인트 회수 — 종료 후 출근·지각자에게 (관리자 판단, 메시지 필수)
            if (!ext && DateTime.now().isAfter(widget.job.end) &&
                (statusOf(w) == 'ok' || statusOf(w) == 'late')) ...[
              const SizedBox(height: 10),
              _pill('포인트 회수 · 알바생에게 메시지', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                Navigator.pop(ctx);
                openRecoverSheet(context, name: w.name, jobRef: '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}')
                    .then((_) { if (mounted) setState(() {}); });
              }),
            ],
            // 경고 부여 — 지각·무단이탈·미도착 등 관리자 재량 (3회 → 협의대상 자동)
            if (!ext && DateTime.now().isAfter(widget.job.start)) ...[
              const SizedBox(height: 8),
              _pill('경고 부여 · 누적 ${totalWarningsOf(w.name)}회', bg: Colors.white, fg: JColors.amber, border: JColors.amber, onTap: () {
                Navigator.pop(ctx);
                openWarnSheet(context, w.name, jobRef: '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}')
                    .then((_) { if (mounted) setState(() {}); });
              }),
            ],
            if (ext) ...[
              const SizedBox(height: 14),
              Row(children: [
                Expanded(
                    child: _pill('정보 수정', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: () {
                  Navigator.pop(ctx);
                  _editExternal(w);
                })),
                const SizedBox(width: 7),
                Expanded(
                    child: _pill('삭제', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                  Navigator.pop(ctx);
                  setState(() {
                    extWorkers.removeWhere((e) => e.name == w.name);
                    overrides.remove(w.name);
                  });
                  snack('${w.name} — 외부인력에서 삭제했어요');
                })),
              ]),
            ] else if (isInvited(w.name)) ...[
              const SizedBox(height: 14),
              _pill('배정 취소', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                Navigator.pop(ctx);
                final mate = remainingBuddyOf(widget.job, w.name);
                setState(() => unassign(widget.job, w.name));
                audit('app_cancel_admin', w.name, '배정 취소${mate == null ? '' : ' · 짝 $mate 안내'}',
                    jobRef: '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}');
                snack('${w.name} — 배정을 취소했어요${mate == null ? '' : ' · 짝 $mate에게 보너스 소멸 안내'}');
                _afterSeatOpened();
              }),
            ] else if (!DateTime.now().isAfter(widget.job.start)) ...[
              // 정식 신청자 강제 취소 — 시작 전 · 사유 필수 · 알바생에게 전달 (→ Supabase applications.status='cancelled_admin')
              const SizedBox(height: 14),
              _pill('신청 취소 (사유 필수)', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                Navigator.pop(ctx);
                _forceCancel(w);
              }),
            ],
            const SizedBox(height: 4),
          ]),
        ),
      ),
    );
  }

  // 정식 신청자 강제 취소 — 사유 다이얼로그 → gForceCancelled 등록 → 자리 나면 대기 1번에게 자동 제안
  Future<void> _forceCancel(Worker w) async {
    final ctrl = TextEditingController();
    final mate = remainingBuddyOf(widget.job, w.name); // 같이하기 짝 — 남는 짝에게 보너스 소멸 안내
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text('${w.name} — 신청 취소', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          TextField(
            controller: ctrl,
            autofocus: true,
            style: const TextStyle(fontSize: 14, color: JColors.ink),
            decoration: const InputDecoration(labelText: '취소 사유 (필수 · 알바생에게 전달돼요)'),
          ),
          if (mate != null) ...[
            const SizedBox(height: 10),
            Text('짝 $mate에게 보너스 소멸 안내가 전송돼요',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.amber)),
          ],
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx),
              child: const Text('닫기', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
          TextButton(onPressed: () => Navigator.pop(ctx, true),
              child: const Text('신청 취소', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w800))),
        ],
      ),
    );
    if (!mounted) return;
    if (ok != true || ctrl.text.trim().isEmpty) {
      if (ok == true) snack('취소 사유를 입력해야 해요');
      return;
    }
    noteBuddyCancelled(widget.job, w.name);
    setState(() {
      gForceCancelled.add('${jobKey(widget.job)}|${w.name}');
      overrides.remove(w.name);
    });
    audit('app_cancel_admin', w.name, '신청 취소 · 사유: ${ctrl.text.trim()}${mate == null ? '' : ' · 짝 $mate 안내'}',
        jobRef: '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}');
    snack('${w.name} — 신청 취소 · 사유가 전달됐어요');
    _afterSeatOpened();
  }

  // 자리가 비었을 때 — 공용 afterSeatOpened() (승인 탭 반려에서도 같은 로직)
  void _afterSeatOpened() {
    final msg = afterSeatOpened(widget.job);
    if (msg == null) return;
    setState(() {});
    snack(msg);
  }

  void _offerTo(WaitRow r, {bool auto = false}) {
    final msg = offerSeatTo(widget.job, r, auto: auto);
    setState(() {});
    snack(msg);
  }

  // 상태 시트 — 라벨 붙은 칩 행 (출근 / 근무 / 퇴근)
  Widget _chipRow(String label, List<Widget> chips, {String? hint}) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 34,
            child: Padding(
              padding: const EdgeInsets.only(top: 9),
              child: Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
            ),
          ),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Wrap(spacing: 7, runSpacing: 7, children: chips),
              if (hint != null) ...[
                const SizedBox(height: 4),
                Text(hint, style: const TextStyle(fontSize: 11, color: JColors.inactive)),
              ],
            ]),
          ),
        ],
      );

  Widget _stChip(BuildContext ctx, Worker w, String s) {
    final (label, color) = _stMeta(s);
    final on = statusOf(w) == s;
    return InkWell(
      onTap: () {
        Navigator.pop(ctx);
        mark(w.name, s);
      },
      borderRadius: BorderRadius.circular(17),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: on ? JColors.ink : Colors.white,
          borderRadius: BorderRadius.circular(17),
          border: Border.all(color: on ? JColors.ink : color.withValues(alpha: .45)),
        ),
        child: Text(label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: on ? Colors.white : color)),
      ),
    );
  }

  // 외부인력 정보 수정 (이름·소속)
  Future<void> _editExternal(Worker w) async {
    final nameCtrl = TextEditingController(text: w.name);
    final orgCtrl = TextEditingController(text: w.org ?? '');
    final phCtrl = TextEditingController(text: w.phone ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('외부인력 수정',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: nameCtrl,
                autofocus: true,
                style: const TextStyle(fontSize: 14, color: JColors.ink),
                decoration: const InputDecoration(labelText: '이름 (필수)')),
            const SizedBox(height: 4),
            TextField(
                controller: orgCtrl,
                style: const TextStyle(fontSize: 14, color: JColors.ink),
                decoration: const InputDecoration(labelText: '소속 (선택)')),
            const SizedBox(height: 4),
            TextField(
                controller: phCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(fontSize: 14, color: JColors.ink),
                decoration: const InputDecoration(labelText: '전화번호 (선택)'),
                onSubmitted: (_) => Navigator.pop(ctx, true)),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('저장', style: TextStyle(color: JColors.blue, fontWeight: FontWeight.w800))),
        ],
      ),
    );
    final name = nameCtrl.text.trim();
    if (ok != true || name.isEmpty) return;
    final org = orgCtrl.text.trim();
    final ph = phCtrl.text.trim();
    setState(() {
      final i = extWorkers.indexWhere((e) => e.name == w.name);
      if (i < 0) return;
      final ov = overrides.remove(w.name); // 이름이 바뀌면 정정 기록도 따라감
      extWorkers[i] = Worker(name, extWorkers[i].status, null,
          org.isEmpty ? null : org, ph.isEmpty ? null : ph);
      if (ov != null) overrides[name] = ov;
    });
    snack('$name — 수정했어요');
  }

  // 외부인력 추가 — 앱 미가입자를 이름 + 소속(업체 메모)으로 즉시 등록
  Future<void> addExternal() async {
    final nameCtrl = TextEditingController();
    final orgCtrl = TextEditingController();
    final phCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('외부인력 추가',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              autofocus: true,
              style: const TextStyle(fontSize: 14, color: JColors.ink),
              decoration: const InputDecoration(labelText: '이름 (필수)'),
            ),
            const SizedBox(height: 4),
            TextField(
              controller: orgCtrl,
              style: const TextStyle(fontSize: 14, color: JColors.ink),
              decoration: const InputDecoration(labelText: '소속 (선택 · 예: 한빛인력)'),
            ),
            const SizedBox(height: 4),
            TextField(
              controller: phCtrl,
              keyboardType: TextInputType.phone,
              style: const TextStyle(fontSize: 14, color: JColors.ink),
              decoration: const InputDecoration(labelText: '전화번호 (선택)'),
              onSubmitted: (_) => Navigator.pop(ctx, true),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('추가', style: TextStyle(color: JColors.blue, fontWeight: FontWeight.w800))),
        ],
      ),
    );
    final name = nameCtrl.text.trim();
    if (ok != true || name.isEmpty) return;
    final org = orgCtrl.text.trim();
    final ph = phCtrl.text.trim();
    final started = DateTime.now().isAfter(widget.job.start);
    setState(() => extWorkers.add(Worker(name, started ? 'ok' : 'wait', null,
        org.isEmpty ? null : org, ph.isEmpty ? null : ph)));
    snack('$name${org.isEmpty ? '' : ' ($org)'} — 외부인력으로 추가했어요');
  }

  // 알바생 직접 추가 (기획안 §5-3) — 가입 회원 검색 → 즉시 승인 배정
  // 자격 검증: 이미 배정=불가 / 협의대상=확인 후 강제 가능
  void _inviteSheet() {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        final q = ctrl.text.trim();
        final list = mockMembers.where((m) => q.isEmpty || m.name.contains(q)).toList();

        Future<void> doAdd(Member m) async {
          // 정원 · 같은 날 중복 = 불가 / 주 N일 초과 = 확인 후 배정
          if (!await checkEligibility(ctx, widget.job, [m.name])) return;
          if (!ctx.mounted) return;
          Navigator.pop(ctx);
          final started = DateTime.now().isAfter(widget.job.start);
          setState(() => invited.add(Worker(m.name, started ? 'none' : 'wait')));
          audit('app_approve', m.name, '직접 추가 (즉시 승인)', jobRef: '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}');
          final n = deliverNotices(jobKey(widget.job), m.name); // 확정 즉시 기존 공지 자동 전달
          snack('${m.name} — 배정했어요 (즉시 승인)${n > 0 ? ' · 공고 공지 $n건 자동 전달' : ''}');
        }

        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('알바생 직접 추가',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
                  const SizedBox(height: 2),
                  const Text('가입된 알바생을 검색해 바로 배정해요 (즉시 승인)',
                      style: TextStyle(fontSize: 11.5, color: JColors.muted)),
                  const SizedBox(height: 11),
                  TextField(
                    controller: ctrl,
                    onChanged: (_) => setSheet(() {}),
                    style: const TextStyle(fontSize: 14, color: JColors.ink),
                    decoration: const InputDecoration(hintText: '이름 검색'),
                  ),
                  const SizedBox(height: 11),
                  ...list.map((m) {
                    final booked = workerOf(widget.job, m.name) != null;
                    final neg = isNegotiation(m.name); // 등록 협의대상 + 경고 3회 누적 자동
                    final (right, rightColor) = booked
                        ? ('이미 배정', JColors.inactive)
                        : neg
                            ? ('협의대상', JColors.red)
                            : (m.label, JColors.muted);
                    return InkWell(
                      onTap: booked
                          ? null
                          : neg
                              ? () async {
                                  final go = await showDialog<bool>(
                                    context: ctx,
                                    builder: (d) => AlertDialog(
                                      backgroundColor: Colors.white,
                                      surfaceTintColor: Colors.transparent,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                                      title: const Text('협의대상 알바생이에요',
                                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
                                      content: const Text('그래도 강제로 배정할까요? 기록에 남아요.',
                                          style: TextStyle(fontSize: 12.5, color: JColors.muted)),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(d),
                                            child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
                                        TextButton(onPressed: () => Navigator.pop(d, true),
                                            child: const Text('강제 배정', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w800))),
                                      ],
                                    ),
                                  );
                                  if (go == true) doAdd(m);
                                }
                              : () => doAdd(m),
                      borderRadius: BorderRadius.circular(10),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text.rich(TextSpan(children: [
                              TextSpan(text: m.name,
                                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700,
                                      color: booked ? JColors.inactive : JColors.ink)),
                              TextSpan(text: '  ${m.phone}',
                                  style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
                            ])),
                            Text(right,
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: rightColor)),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final job = widget.job;
    final started = now.isAfter(job.start);
    final ended = now.isAfter(job.end);
    final base = baseRosterOf(widget.job); // 정식 신청자 (관리자 강제 취소 제외)

    // 상태별로 완전히 다른 페이지 내용
    final content = ended
        ? _endedContent(base)
        : started
            ? _activeContent(base)
            : _upcomingContent(base, now);
    // 상단 요약 카드 — 시작 전/진행 중은 기존 인원 카드를 대체, 종료 후는 정산 카드 위에
    if (!ended && content.isNotEmpty) content.removeAt(0);
    content.insert(0, _summaryCard(now, base));
    // 공고 내용 카드 (요약 카드 바로 아래)
    if (job.desc.isNotEmpty) {
      final descCard = Padding(
        padding: const EdgeInsets.only(top: 10),
        child: _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('공고 내용', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
          const SizedBox(height: 5),
          Text(job.desc, style: const TextStyle(fontSize: 12.5, color: JColors.ink, height: 1.55)),
        ])),
      );
      content.insert(content.isEmpty ? 0 : 1, descCard);
    }
    // 공고 공지 — 시작 전·진행 중엔 발송 가능, 종료 후엔 기록만
    final notice = _noticeSection(canSend: !ended, confirmed: base.length + invited.length);
    if (notice.isNotEmpty) {
      if (ended) {
        content.addAll(notice);
      } else {
        content.insertAll(content.length < 2 ? content.length : 2, notice);
      }
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 상단 바
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 16, 6),
              child: Row(children: [
                InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(10),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    child: Text('‹', style: TextStyle(fontSize: 26, color: JColors.blue, height: 1)),
                  ),
                ),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${job.site} · ${job.slot}',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.4, color: JColors.ink)),
                    Text('${job.dateLabel} · ${job.timeLabel}',
                        style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                  ]),
                ),
                // 공고 관리 (수정·마감·삭제) — 마스터·1등급, 종료 전
                if ((gAdmin?.isA1 ?? false) && !ended)
                  InkWell(
                    onTap: _manageSheet,
                    borderRadius: BorderRadius.circular(10),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Text('관리', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.blue)),
                    ),
                  ),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                children: content,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 진행 중: GPS 자동 + 수동 보정 ──
  List<Widget> _activeContent(List<Worker> base) {
    final members = [...base, ...invited]; // 정식 신청자 + 직접 추가
    final none = members.where((w) => statusOf(w) == 'none').toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    final done = members.where((w) => statusOf(w) != 'none').toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    // 출근 수 = 정식 신청자 + 직접 추가 + 외부인력 (충원 숫자에는 포함)
    final okCount = [...members, ...extWorkers].where((w) {
      final s = statusOf(w);
      return s == 'ok' || s == 'late'; // 지금 현장에 있는 인원 (종료 전엔 퇴근 기록 없음 · 조퇴는 상태 early)
    }).length;
    // 빈자리 = 결근·미도착·이탈만 (퇴근자는 자리를 채운 사람) — 추가·외부인력·대기열 제안 기준
    final short = seatsOf(widget.job);

    return [
      _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _bigCount(okCount, widget.job.cap, '출근'),
            Text(none.isEmpty ? '전원 처리' : '${none.length}명 미도착',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                    color: none.isEmpty ? JColors.green : JColors.red)),
          ],
        ),
        if (widget.job.needsSign) ...[const SizedBox(height: 6), _signLine(members)],
      ])),
      if (okCount > 0)
        Padding(
          padding: const EdgeInsets.only(left: 2, top: 6),
          child: Text('출근 확인 ${_verifyCount(members, out: false).$1}/${_verifyCount(members, out: false).$2}',
              style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
        ),
      if (short > 0) ...[
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _pill('알바생 추가', bg: JColors.blue, fg: Colors.white, onTap: _inviteSheet)),
          const SizedBox(width: 7),
          Expanded(child: _pill('외부인력 추가', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: addExternal)),
        ]),
      ],
      ..._gpsSection(),
      ..._waitSection(seats: short),
      const SizedBox(height: 12),
      _sect(none.isEmpty ? '보정 필요 없음' : '보정 필요 · ${none.length}명'),
      if (none.isEmpty)
        _card(const Center(
            child: Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('전원 자동 처리됐어요', style: TextStyle(fontSize: 12, color: JColors.inactive)),
        ))),
      ...none.map((w) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _card(Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  jName(context, w.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: JColors.ink)),
                  Text(lateReportFor(widget.job, w.name) != null ? '지각 예정' : '미도착',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                          color: lateReportFor(widget.job, w.name) != null ? JColors.amber : JColors.inactive)),
                ]),
                // 늦어요 보고 — 알바생이 미리 보낸 지연 예고를 출결 화면에서 바로
                if (lateReportFor(widget.job, w.name) != null) ...[
                  const SizedBox(height: 4),
                  Text('늦어요 보고 · ${lateReportFor(widget.job, w.name)!.delayMin}분 지연 예정 · ${lateReportFor(widget.job, w.name)!.reason} (${lateReportFor(widget.job, w.name)!.ago})',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.amber)),
                ],
                // 같이하기 짝 힌트 — 안 온 사람 확인할 때만 필요한 맥락 정보
                if (buddyOf(widget.job, w.name) != null) ...[
                  const SizedBox(height: 4),
                  Text(_buddyHint(w),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.blue)),
                ],
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _pill('수동 출근', bg: JColors.blue, fg: Colors.white, onTap: () => mark(w.name, 'ok'))),
                  const SizedBox(width: 7),
                  Expanded(child: _pill('결근 처리', bg: Colors.white, fg: JColors.red, border: JColors.red,
                      onTap: () => mark(w.name, 'absent'))),
                ]),
              ],
            )),
          )),
      const SizedBox(height: 10),
      if (done.isNotEmpty) ...[
        _sectVerify('처리됨 · ${done.length}명 — 눌러서 정정', done, out: false),
        _rosterCard(done, onTap: (w) => _statusSheet(w)),
      ],
      ..._extSection(),
    ];
  }

  // ── 시작 전: 모집 현황 + 확정 명단 ──
  List<Widget> _upcomingContent(List<Worker> base, DateTime now) {
    final left = widget.job.start.difference(now);
    final urgent = left.inMinutes < 30;
    // 충원 숫자엔 직접 추가 + 외부인력 포함, 외부인력 명단만 분리 표시
    final members = [...base, ...invited];
    final filled = members.length + extWorkers.length;
    final held = heldOf(widget.job); // 승인 대기 홀드
    final short = widget.job.cap - filled - held;
    final roster = members.map((w) => Worker(w.name, 'wait')).toList()
      ..sort((a, b) => a.name.compareTo(b.name));

    return [
      _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _bigCount(filled, widget.job.cap, '확정', held: held),
            Text(short > 0 ? '$short명 부족' : '충원 완료',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                    color: short > 0 ? JColors.red : JColors.green)),
          ],
        ),
        const SizedBox(height: 8),
        Row(children: [
          Container(width: 8, height: 8,
              decoration: BoxDecoration(shape: BoxShape.circle, color: urgent ? JColors.red : JColors.green)),
          const SizedBox(width: 6),
          Text('시작까지 ${_dur(left)}',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                  color: urgent ? JColors.red : JColors.green,
                  fontFeatures: const [FontFeature.tabularFigures()])),
        ]),
        if (widget.job.needsSign) ...[const SizedBox(height: 6), _signLine(members)],
      ])),
      if (widget.job.closed)
        const Padding(
          padding: EdgeInsets.only(top: 8, left: 2),
          child: Text('수동 마감됨 — 알바생 앱에 노출되지 않아요 (관리 › 모집 재개)',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.amber)),
        ),
      if (short > 0) ...[
        const SizedBox(height: 12),
        _sect('모집 · $short명 더 필요해요'),
        Row(children: [
          Expanded(child: _pill('알바생 추가', bg: JColors.blue, fg: Colors.white, onTap: _inviteSheet)),
          const SizedBox(width: 7),
          Expanded(child: _pill('외부인력', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: addExternal)),
          const SizedBox(width: 7),
          Expanded(child: _pill('긴급 알림', bg: Colors.white, fg: JColors.blue, border: JColors.blue,
              onTap: () => openUrgentRecruitSheet(context, widget.job, short).then((_) { if (mounted) setState(() {}); }))),
        ]),
      ],
      ..._appsSection(),
      ..._waitSection(seats: short),
      const SizedBox(height: 12),
      _sect('확정 명단 · ${roster.length}명 — 눌러서 프로필 · 취소'),
      if (roster.isEmpty)
        _card(const Center(
            child: Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('아직 확정된 인원이 없어요', style: TextStyle(fontSize: 12, color: JColors.inactive)),
        )))
      else
        _rosterCard(roster, onTap: (w) => _statusSheet(w, statusEditable: false)), // 시작 전엔 프로필 · 전화 · 신청/배정 취소
      ..._extSection(statusEditable: false),
    ];
  }

  // ── 종료: 최종 집계 + 퇴근 미처리 개별 처리 (출결 상태와 퇴근 기록은 별개) ──
  List<Widget> _endedContent(List<Worker> base) {
    final mapped = [...base, ...invited]
        .map((w) => statusOf(w) == 'none' ? Worker(w.name, 'absent') : w)
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    int ok = 0, late = 0, early = 0, runaway = 0, absent = 0;
    for (final w in mapped) {
      switch (statusOf(w)) {
        case 'ok': ok++;
        case 'late': late++;
        case 'early': early++;
        case 'runaway': runaway++;
        default: absent++;
      }
    }
    final attended = ok + late + early;
    final autoDone = DateTime.now().difference(widget.job.end).inHours >= Policy.autoCheckoutHours;
    final locked = DateTime.now().difference(widget.job.end).inDays >= Policy.correctionDays;
    // 퇴근 미처리 = 출근/지각인데 퇴근 기록 없음 (종료 6시간 후엔 시스템이 자동 처리)
    final pending = autoDone
        ? <Worker>[]
        : mapped.where((w) => (statusOf(w) == 'ok' || statusOf(w) == 'late') && outOf_(w) == null).toList();
    final done = mapped.where((w) => !pending.contains(w)).toList();
    final eligible = mapped.where(_eligible).length; // 포인트 자동 지급 대상
    final bonusN = mapped.where((w) => buddyBonusEligible(widget.job, w)).length; // 같이하기 보너스 대상 인원
    final totalP = eligible * widget.job.point + bonusN * Policy.buddyBonus;
    final gpsBy = {for (final r in gpsReqs) r.name: r}; // 사유 제출자 (퇴근 미처리와 같은 사람 → 한 카드로 합침)
    final bulkTargets = pending.where((w) => !gpsBy.containsKey(w.name)).toList(); // 일괄 처리는 사유 없는 사람만

    Future<void> bulkOut() async {
      final go = await showDialog<bool>(
        context: context,
        builder: (d) => AlertDialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: Text('${bulkTargets.length}명 정상 퇴근 처리',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
          content: Text(
              '${bulkTargets.map((w) => w.name).join(', ')}\n\n위 인원을 근무 종료 시각(${Job._hm(widget.job.end)}) 기준 정상 퇴근으로 기록합니다.\n조퇴·무단이탈자가 있다면 먼저 개별로 표시하세요. (사유 제출자는 제외)',
              style: const TextStyle(fontSize: 12.5, color: JColors.muted, height: 1.5)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(d),
                child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
            TextButton(onPressed: () => Navigator.pop(d, true),
                child: const Text('퇴근 처리', style: TextStyle(color: JColors.amber, fontWeight: FontWeight.w800))),
          ],
        ),
      );
      if (go != true || !mounted) return;
      setState(() {
        for (final w in bulkTargets) {
          outs[w.name] = Job._hm(widget.job.end);
        }
      });
      snack('${bulkTargets.length}명 — 종료 시각 기준 퇴근 처리했어요');
    }

    return [
      _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _bigCount(attended, widget.job.cap, '출근'),
            pending.isNotEmpty
                ? Text('퇴근 미처리 ${pending.length}명',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.amber))
                : Text(absent > 0 ? '결근 $absent명' : '결근 없음',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                        color: absent > 0 ? JColors.red : JColors.green)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
            [
              '출근 $ok',
              '지각 $late',
              if (early > 0) '조퇴 $early',
              if (runaway > 0) '무단이탈 $runaway',
              '결근 $absent',
              if (_verifyCount(mapped, out: true).$2 > 0)
                '확인 ${_verifyCount(mapped, out: true).$1}/${_verifyCount(mapped, out: true).$2}',
              '${Job._hm(widget.job.end)} 종료',
            ].join(' · '),
            style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
        const SizedBox(height: 6),
        // 포인트 정산 — 종료 후, 정상 출근+퇴근자에게만 자동
        Text.rich(TextSpan(children: [
          const TextSpan(text: '정산  ', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
          TextSpan(
              text: '정상 출근·퇴근 $eligible명 → +${totalP.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}P 지급 예정',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                  color: eligible > 0 ? JColors.green : JColors.inactive)),
          if (bonusN > 0)
            TextSpan(
                text: ' (같이하기 보너스 $bonusN명 포함)',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.green)),
          if (pending.isNotEmpty)
            TextSpan(
                text: '  ·  퇴근 미처리 ${pending.length}명은 처리 후 확정',
                style: const TextStyle(fontSize: 11, color: JColors.amber, fontWeight: FontWeight.w600)),
        ])),
      ])),
      // 퇴근 미처리 카드에 합쳐지지 않은 사유 제출 건(자동 퇴근 후 남은 사유 등)은 따로 표시
      ..._gpsSection(exclude: pending.map((w) => w.name).toSet()),
      // ── 퇴근 확인 필요 — 한 섹션으로 통합: 사유 제출자는 승인/반려, 나머지는 퇴근/조퇴/이탈 ──
      if (pending.isNotEmpty) ...[
        const SizedBox(height: 12),
        _sect('퇴근 확인 필요 · ${pending.length}명 — 한 명씩'),
        ...pending.map((w) {
          final r = gpsBy[w.name];
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                jName(context, w.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: JColors.ink)),
                Text(
                    r != null
                        ? r.dist
                        : '${_stMeta(statusOf(w)).$1}${w.time != null ? ' ${w.time}' : ''} · 퇴근 기록 없음',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                        color: r != null ? JColors.red : JColors.amber)),
              ]),
              if (r != null) ...[
                // 알바생이 낸 사유 → 승인(정상 퇴근 인정) / 반려(미인정 · 포인트 없음)
                const SizedBox(height: 3),
                Text('"${r.reason}" · ${r.time} 제출 · ${_stMeta(statusOf(w)).$1}${w.time != null ? ' ${w.time}' : ''}',
                    style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                      child: _pill('승인 · 퇴근 인정', bg: JColors.blue, fg: Colors.white, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      gGpsDone.add('${jobKey(widget.job)}|${r.name}');
                      outs[r.name] = r.time;
                    });
                    audit('gps_approve', r.name, '영역 밖 퇴근 사유 승인 · ${r.dist}', jobRef: '${widget.job.site} ${widget.job.dateLabel}');
                    snack('${r.name} — 퇴근 인정 · 정산 때 포인트 지급 대상');
                  })),
                  const SizedBox(width: 7),
                  Expanded(
                      child: _pill('반려', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      gGpsDone.add('${jobKey(widget.job)}|${r.name}');
                      outs[r.name] = '반려 ${r.time}';
                    });
                    audit('gps_reject', r.name, '영역 밖 퇴근 사유 반려 · ${r.dist}', jobRef: '${widget.job.site} ${widget.job.dateLabel}');
                    snack('${r.name} — 반려 · 퇴근 미인정, 포인트 없음');
                  })),
                ]),
              ] else ...[
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _pill('퇴근 처리', bg: JColors.amber, fg: Colors.white, onTap: () {
                    setState(() => outs[w.name] = Job._hm(widget.job.end));
                    snack('${w.name} — 퇴근 처리 (${Job._hm(widget.job.end)})');
                  })),
                  const SizedBox(width: 7),
                  Expanded(child: _pill('조퇴', bg: Colors.white, fg: JColors.amber, border: JColors.amber,
                      onTap: () => mark(w.name, 'early'))),
                  const SizedBox(width: 7),
                  Expanded(child: _pill('무단이탈', bg: Colors.white, fg: JColors.red, border: JColors.red,
                      onTap: () => mark(w.name, 'runaway'))),
                ]),
              ],
            ])),
          );
        }),
        if (bulkTargets.isNotEmpty) ...[
          const SizedBox(height: 4),
          _pill('나머지 ${bulkTargets.length}명 정상 퇴근 처리', bg: Colors.white, fg: JColors.amber, border: JColors.amber,
              onTap: bulkOut),
        ],
      ],
      const SizedBox(height: 12),
      // 정정 허용 7일 (사용자 결정 2026-08-24, N30)
      if (locked) ...[
        _sect('최종 명단 · ${done.length}명 — 이름 누르면 프로필'),
        _rosterCard(done, onTap: (w) => openWorker(context, w.name)),
        ..._extSection(statusEditable: false),
        const SizedBox(height: 10),
        const Padding(
          padding: EdgeInsets.only(left: 2),
          child: Text('종료 후 7일이 지나 정정할 수 없어요 · 필요하면 PC 관리자 웹에 문의하세요',
              style: TextStyle(fontSize: 11, color: JColors.inactive)),
        ),
      ] else ...[
        _sectVerify('${pending.isEmpty ? '최종' : '처리된'} 명단 · ${done.length}명 — 눌러서 정정', done, out: true),
        _rosterCard(done, onTap: (w) => _statusSheet(w)),
        ..._extSection(),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.only(left: 2),
          child: Text(
              autoDone
                  ? '종료 6시간이 지나 퇴근은 자동 처리됐어요 · 출결 정정은 7일까지 가능'
                  : '퇴근 미처리자는 종료 6시간 후 자동 퇴근 처리돼요 · 출결 정정은 7일까지 가능',
              style: const TextStyle(fontSize: 11, color: JColors.inactive)),
        ),
      ],
    ];
  }

  // ── 1급 공고 관리: 수정 · 수동 마감/재개 · 삭제 ──
  void _replaceJob(Job nj) {
    final i = gJobs.indexOf(widget.job);
    if (i >= 0) {
      gJobs[i] = nj;
    } else {
      final k = gPastJobs.indexOf(widget.job);
      if (k >= 0) gPastJobs[k] = nj;
    }
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => AttendancePage(job: nj)));
  }

  void _manageSheet() {
    final j = widget.job;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('공고 관리 — 마스터·1등급',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
            const SizedBox(height: 2),
            Text('${j.site} ${j.dateLabel} ${j.slot} · 확정 ${membersOf(j).length}명',
                style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
            const SizedBox(height: 12),
            _pill('공고 수정 — 인원 · 시간 · 포인트 · 내용', bg: JColors.blue, fg: Colors.white, onTap: () {
              Navigator.pop(ctx);
              _editJobSheet();
            }),
            const SizedBox(height: 8),
            _pill(j.closed ? '모집 재개 — 알바생 앱에 다시 노출' : '수동 마감 — 알바생 앱 노출 중단',
                bg: Colors.white, fg: JColors.amber, border: JColors.amber, onTap: () {
              Navigator.pop(ctx);
              audit('job_edit', j.site, j.closed ? '모집 재개' : '수동 마감', jobRef: '${j.dateLabel} ${j.slot}');
              _replaceJob(j.copyWith(closed: !j.closed));
              jSnack(context, j.closed ? '모집 재개 — 알바생 앱에 노출돼요' : '수동 마감 — 확정자는 그대로, 신규 신청만 막혀요');
            }),
            const SizedBox(height: 8),
            _pill('공고 삭제', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () async {
              Navigator.pop(ctx);
              final n = membersOf(j).length;
              final go = await showDialog<bool>(
                context: context,
                builder: (d) => AlertDialog(
                  backgroundColor: Colors.white,
                  surfaceTintColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  title: const Text('공고 삭제', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
                  content: Text(
                      '${j.site} ${j.dateLabel} ${j.slot}\n${n > 0 ? '확정자 $n명에게 취소 알림이 발송되고 신청이 모두 취소됩니다.' : '확정자가 없어 바로 삭제됩니다.'}\n되돌릴 수 없어요.',
                      style: const TextStyle(fontSize: 12.5, color: JColors.muted, height: 1.5)),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(d), child: const Text('취소', style: TextStyle(color: JColors.muted))),
                    TextButton(onPressed: () => Navigator.pop(d, true),
                        child: const Text('삭제', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w800))),
                  ],
                ),
              );
              if (go != true || !mounted) return;
              gJobs.remove(j);
              gPastJobs.remove(j);
              audit('job_edit', j.site, '공고 삭제 (확정 $n명 취소 알림)', jobRef: '${j.dateLabel} ${j.slot}');
              Navigator.of(context).pop();
              jSnack(context, '공고 삭제 · ${n > 0 ? '확정자 $n명에게 취소 알림' : '완료'}');
            }),
          ]),
        ),
      ),
    );
  }

  void _editJobSheet() {
    final j = widget.job;
    int cap = j.cap;
    var start = TimeOfDay(hour: j.start.hour, minute: j.start.minute);
    var end = TimeOfDay(hour: j.end.hour, minute: j.end.minute);
    final pointCtrl = TextEditingController(text: '${j.point}');
    final descCtrl = TextEditingController(text: j.desc);
    String tod(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    final confirmed = membersOf(j).length;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setS) {
        Widget label(String t) => Padding(
            padding: const EdgeInsets.only(top: 13, bottom: 6),
            child: Text(t, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)));
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                const Text('공고 수정', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
                const SizedBox(height: 2),
                Text('${j.site} ${j.dateLabel} · 확정 $confirmed명 (인원은 확정자보다 줄일 수 없어요)',
                    style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                label('모집 인원'),
                Row(children: [
                  _JobListPageState._stepBtn('−', () => setS(() => cap = (cap - 1).clamp(confirmed < 1 ? 1 : confirmed, 50))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text('$cap명',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink,
                            fontFeatures: [FontFeature.tabularFigures()])),
                  ),
                  _JobListPageState._stepBtn('＋', () => setS(() => cap = (cap + 1).clamp(1, 50))),
                ]),
                label('시간'),
                Row(children: [
                  Expanded(child: _JobListPageState._timeBox(ctx, '시작', tod(start), () async {
                    final t = await showTimePicker(context: ctx, initialTime: start);
                    if (t != null) setS(() => start = t);
                  })),
                  const SizedBox(width: 8),
                  Expanded(child: _JobListPageState._timeBox(ctx, '종료', tod(end), () async {
                    final t = await showTimePicker(context: ctx, initialTime: end);
                    if (t != null) setS(() => end = t);
                  })),
                ]),
                label('포인트 (P)'),
                TextField(controller: pointCtrl, keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 14, color: JColors.ink),
                    decoration: const InputDecoration(isDense: true)),
                label('공고 내용'),
                TextField(controller: descCtrl, maxLines: 4, maxLength: 500,
                    style: const TextStyle(fontSize: 13, color: JColors.ink, height: 1.5),
                    decoration: InputDecoration(
                      isDense: true, contentPadding: const EdgeInsets.all(12),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: JColors.hairline)),
                    )),
                const SizedBox(height: 8),
                SizedBox(
                  height: 42, width: double.infinity,
                  child: jPill('저장 · 확정자에게 변경 알림', bg: JColors.blue, fg: Colors.white, onTap: () {
                    final d = DateTime(j.start.year, j.start.month, j.start.day);
                    final s = DateTime(d.year, d.month, d.day, start.hour, start.minute);
                    var e = DateTime(d.year, d.month, d.day, end.hour, end.minute);
                    if (!e.isAfter(s)) e = e.add(const Duration(days: 1));
                    final now = DateTime.now();
                    final newShort = now.isAfter(j.start) ? j.short : (cap - confirmed).clamp(0, cap);
                    Navigator.pop(ctx);
                    audit('job_edit', j.site, '공고 수정 · 인원 ${j.cap}→$cap · ${tod(start)}–${tod(end)}',
                        jobRef: '${j.dateLabel} ${j.slot}');
                    _replaceJob(j.copyWith(
                        cap: cap, short: newShort, start: s, end: e,
                        point: int.tryParse(pointCtrl.text.trim()) ?? j.point, desc: descCtrl.text.trim()));
                    jSnack(context, '공고 수정 완료 · 확정 $confirmed명에게 변경 알림');
                  }),
                ),
              ]),
            ),
          ),
        );
      }),
    );
  }

  // 서명 현황 한 줄 — 계약서·안전교육 토글이 켜진 공고만 (외부인력 제외)
  Widget _signLine(List<Worker> members) {
    final signed = members.where((w) => isSigned(widget.job, w.name)).length;
    final k = members.length - signed;
    return Text('서명 $signed/${members.length} · 미서명 $k명',
        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: k > 0 ? JColors.red : JColors.muted,
            fontFeatures: const [FontFeature.tabularFigures()]));
  }

  // 미도착자의 짝꿍 상태 → "짝한테 물어보세요" 힌트
  String _buddyHint(Worker w) {
    final p = buddyOf(widget.job, w.name)!;
    final pw = [...rosterOf(widget.job), ...invited].where((x) => x.name == p).firstOrNull;
    final s = pw == null ? 'none' : statusOf(pw);
    return switch (s) {
      'none' => '짝 $p도 미도착',
      'ok' || 'late' => '짝 $p — 출근함 · 어디쯤인지 물어보세요',
      _ => '짝 $p — ${_stMeta(s).$1}',
    };
  }

  // ── 공고 공지 — 확정자 대상 · 게시물처럼 남아 이후 확정자에게 자동 전달 ──
  List<Widget> _noticeSection({required bool canSend, required int confirmed}) {
    final key = jobKey(widget.job);
    final list = noticesOf(key).reversed.toList();
    final log = noticeLogOf(widget.job).reversed.toList(); // 단체 발송만 · 최신순
    final late = gNoticeLate.where((e) => e.$1 == key).map((e) => e.$2).toSet().toList();
    if (!canSend && list.isEmpty && log.isEmpty) return const [];
    String hm(DateTime t) => '${t.month}/${t.day} ${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return [
      const SizedBox(height: 12),
      _sect('공고 공지 · ${list.length}건 — 확정자에게만'),
      if (canSend)
        _pill('＋ 공지 발송 · 확정 $confirmed명', bg: Colors.white, fg: JColors.blue, border: JColors.blue,
            onTap: () => openNoticeSheet(context, widget.job, confirmed).then((_) {
                  if (mounted) setState(() {});
                })),
      ...list.map((n) => Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(n.text, style: const TextStyle(fontSize: 12.5, color: JColors.ink, height: 1.5)),
              const SizedBox(height: 4),
              Text('${n.by} · ${hm(n.at)} · 확정 ${n.sentTo}명 전송 · 이후 확정자 자동 수신',
                  style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
            ])),
          )),
      if (late.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 2),
          child: Text('확정 후 자동 수신: ${late.join(', ')}',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.blue)),
        ),
      if (log.isNotEmpty) ...[
        const SizedBox(height: 12),
        _sect('알림 로그 · ${log.length}건 — 단체 발송만 (개별 메시지 제외)'),
        _card(Column(children: [
          for (final (i, n) in log.indexed) ...[
            if (i > 0) const Divider(height: 12, thickness: .5, color: JColors.hairline),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text.rich(TextSpan(children: [
                TextSpan(text: '${n.at.hour.toString().padLeft(2, '0')}:${n.at.minute.toString().padLeft(2, '0')} · ${n.kindLabel}'),
                if (n.urgent) const TextSpan(text: ' [긴급]', style: TextStyle(color: JColors.red)),
                TextSpan(text: ' · 발송 ${n.sentTo}${n.readCount > 0 ? ' · 확인 ${n.readCount}' : ''} · ${n.by}${n.role.isEmpty ? '' : '(${n.role})'}'),
              ]), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.ink,
                  fontFeatures: [FontFeature.tabularFigures()])),
              const SizedBox(height: 2),
              Text(n.text, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11, color: JColors.muted)),
            ]),
          ],
        ])),
      ],
    ];
  }

  // ── 대기열 (FULL 시 줄서기, 모집×2까지) — 자리 나면 1번에게 자동 제안 ──
  // seats = 지금 비어 있는 자리 수 (부족/미출근). 자리가 있고 대기자가 있으면 관리자가 "지금 제안" 가능
  // ── 신청 대기 — 이 공고에 신청했지만 아직 승인 안 된 사람 (승인 탭과 같은 데이터 · 같은 처리) ──
  List<Widget> _appsSection() {
    final apps = pendingAppsOf(widget.job);
    if (apps.isEmpty) return const [];
    PendingApp? mateOf(PendingApp a) => a.buddy == null ? null : apps.where((x) => x.name == a.buddy).firstOrNull;

    // 승인 탭과 같은 헬퍼 — 확정 명단 합류(gApprovedByJob) · 정원/중복/주 N일 검사 · 공지 자동 전달
    Future<void> approve(PendingApp a) async {
      final done = await approveApp(context, a, mateOf(a), via: '공고 상세에서');
      if (done && mounted) setState(() {});
    }

    // 반려 = 홀드 해제 → 자리 나면 대기 1번 자동 제안
    Future<void> reject(PendingApp a) async {
      final done = await rejectApp(context, a, mateOf(a), via: '공고 상세에서');
      if (done && mounted) {
        setState(() {});
        _afterSeatOpened();
      }
    }

    return [
      const SizedBox(height: 12),
      _sect('신청 대기 · ${apps.length}명 — 승인하면 확정 명단으로'),
      ...apps.map((a) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                jName(context, a.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: JColors.ink)),
                Text(a.flag,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: a.danger ? JColors.red : JColors.amber)),
              ]),
              const SizedBox(height: 2),
              Text(a.note, style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
              Text(waitLabelOf(a).$1,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                      color: waitLabelOf(a).$2 ? JColors.red : JColors.muted,
                      fontFeatures: const [FontFeature.tabularFigures()])),
              if (a.buddy != null)
                Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Text(
                      a.buddyState == 'pending'
                          ? '같이하기 · ${a.buddy}와 함께 신청 — 짝 응답 대기 (응답 후 승인 가능)'
                          : '같이하기 · ${a.buddy}와 함께 신청 — 승인·거절이 둘 다 같이 처리돼요',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                          color: a.buddyState == 'pending' ? JColors.amber : JColors.blue)),
                ),
              if (overbookedFor(a)) ...[
                const SizedBox(height: 6),
                const Text('정원 초과 — 직접 추가로 자리가 찼어요',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.amber)),
                const SizedBox(height: 6),
                _pill('대기열로 이동', bg: Colors.white, fg: JColors.amber, border: JColors.amber, onTap: () {
                  moveAppToWaitlist(context, a);
                  setState(() {});
                }),
              ],
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: _pill('승인', bg: JColors.blue, fg: Colors.white, onTap: () => approve(a))),
                const SizedBox(width: 7),
                Expanded(child: _pill('거절', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () => reject(a))),
              ]),
            ])),
          )),
    ];
  }

  List<Widget> _waitSection({int seats = 0}) {
    final rows = waitlistOf(widget.job);
    if (rows.isEmpty) return const [];
    final now = DateTime.now();
    String fmt(Duration d) {
      final h = d.inHours, m = d.inMinutes % 60, s = d.inSeconds % 60;
      final ss = s.toString().padLeft(2, '0');
      return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:$ss' : '$m:$ss';
    }

    final offered = rows.where((r) => r.status == 'offered').toList();
    final liveOffer = offered.where((r) => !r.deadline!.difference(now).isNegative).toList();
    final expired = offered.where((r) => r.deadline!.difference(now).isNegative).toList();
    final waiting = rows.where((r) => r.status == 'waiting').toList();
    void offerTo(WaitRow r) => _offerTo(r);

    return [
      const SizedBox(height: 12),
      _sect('대기열 · ${rows.length}명 (최대 ${widget.job.cap * 2}명)'),
      _card(Column(children: [
        for (var i = 0; i < rows.length; i++) ...[
          if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
          () {
            final r = rows[i];
            String right;
            Color color;
            if (r.status == 'offered') {
              final left = r.deadline!.difference(now);
              if (left.isNegative) {
                right = '시간 초과 · 응답 없음';
                color = JColors.red;
              } else {
                right = '자리 제안 중 · ${fmt(left)}';
                color = left.inMinutes < 5 ? JColors.red : JColors.amber;
              }
            } else if (r.status == 'auto_rejected') {
              right = '자동 거절';
              color = JColors.inactive;
            } else {
              right = '대기 중';
              color = JColors.inactive;
            }
            return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              InkWell(
                onTap: () => openWorker(context, r.name),
                borderRadius: BorderRadius.circular(6),
                child: Text('${r.order}번  ${r.name}',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                        color: r.status == 'auto_rejected' ? JColors.inactive : JColors.ink,
                        decoration: r.status == 'auto_rejected' ? TextDecoration.lineThrough : null)),
              ),
              Text(right,
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color,
                      fontFeatures: const [FontFeature.tabularFigures()])),
            ]);
          }(),
        ],
      ])),
      // 시작 후엔 제안 없음 — 공고가 알바생 앱에서 내려가 신청·대기 불가 (확정 정책)
      if (now.isAfter(widget.job.start))
        const Padding(
          padding: EdgeInsets.only(top: 6, left: 2),
          child: Text('시작 후 대기열 제안 없음', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.inactive)),
        )
      // 수동 제안 — 자리가 비었는데 제안이 안 나가 있을 때 (취소 직후 등) 관리자가 바로 발송
      else if (seats > 0 && liveOffer.isEmpty && waiting.isNotEmpty) ...[
        const SizedBox(height: 8),
        _pill('지금 자리 제안 → ${waiting.first.order}번 ${waiting.first.name}',
            bg: JColors.blue, fg: Colors.white, onTap: () => offerTo(waiting.first)),
      ],
      // 시간 초과 건 정리 → 다음 대기자에게 넘기기 (자동 처리와 같은 동작을 수동으로)
      if (expired.isNotEmpty) ...[
        const SizedBox(height: 8),
        _pill(waiting.isNotEmpty
                ? '시간 초과 ${expired.length}건 자동 거절 → 다음 ${waiting.first.name}에게 제안'
                : '시간 초과 ${expired.length}건 자동 거절 · 대기자 없음 → 일반 모집 재개',
            bg: Colors.white, fg: JColors.amber, border: JColors.amber, onTap: () {
          setState(() {
            for (final r in expired) {
              r.status = 'auto_rejected';
            }
          });
          if (waiting.isNotEmpty) {
            offerTo(waiting.first);
          } else {
            audit('waitlist', widget.job.site, '대기자 전원 실패 → 일반 모집 재개(reopened)',
                jobRef: '${widget.job.site} ${widget.job.dateLabel}');
            snack('대기자 없음 — 일반 모집 재개 · 알바생 앱에 다시 노출');
          }
        }),
      ],
      const Padding(
        padding: EdgeInsets.only(top: 6, left: 2),
        child: Text('자리가 나면 1번에게 자동 제안 · 수락 제한 24시간 전 1시간 / 이내 30분 · 전원 실패 시 일반 모집 재개',
            style: TextStyle(fontSize: 11, color: JColors.inactive)),
      ),
    ];
  }

  // ── 퇴근 승인 대기 (GPS 영역 밖 사유 검토) — 사용자 결정 2026-08-24: 앱 포함 ──
  List<Widget> _gpsSection({Set<String> exclude = const {}}) {
    final reqs = gpsReqs.where((r) => !exclude.contains(r.name)).toList();
    if (reqs.isEmpty) return const [];
    return [
      const SizedBox(height: 12),
      _sect('퇴근 승인 대기 · ${reqs.length}명'),
      ...reqs.map((r) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _card(Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(r.name,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: JColors.ink)),
                  Text(r.dist,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.red)),
                ]),
                const SizedBox(height: 3),
                Text('"${r.reason}" · ${r.time} 제출',
                    style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                // 종료 전 제출 = 조퇴 후보 (알바생 앱 [퇴근]은 종료 후에만 열리므로 사유 제출로만 가능)
                if (r.at.isBefore(widget.job.end)) ...[
                  const SizedBox(height: 3),
                  Text('종료 ${_beforeEndLabel(r.at)} 전 제출',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.red)),
                ],
                const SizedBox(height: 10),
                Row(children: [
                  if (r.at.isBefore(widget.job.end)) ...[
                    Expanded(
                        child: _pill('조퇴로 인정', bg: JColors.amber, fg: Colors.white, onTap: () {
                      setState(() {
                        gpsReqs.remove(r);
                        gGpsDone.add('${jobKey(widget.job)}|${r.name}');
                        overrides[r.name] = 'early';
                        outs[r.name] = '조퇴';
                      });
                      audit('gps_early', r.name, '종료 전 퇴근 사유 → 조퇴 인정 · ${r.time} 제출 · ${r.dist}',
                          jobRef: '${widget.job.site} ${widget.job.dateLabel}');
                      noteEarlyLeave(r.name, '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}');
                      snack('${r.name} — 조퇴 인정 · 포인트 자동 지급 없음');
                    })),
                    const SizedBox(width: 7),
                    Expanded(
                        child: _pill('정상 퇴근 인정', bg: Colors.white, fg: JColors.blue, border: JColors.blue,
                            onTap: () => _gpsApprove(r))),
                  ] else
                    Expanded(child: _pill('승인 · 퇴근 인정', bg: JColors.blue, fg: Colors.white, onTap: () => _gpsApprove(r))),
                  const SizedBox(width: 7),
                  Expanded(
                      child: _pill('반려', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      gGpsDone.add('${jobKey(widget.job)}|${r.name}');
                      outs[r.name] = '반려 ${r.time}'; // 퇴근 시각은 남기되 '미인정' → 포인트 대상 제외
                    });
                    audit('gps_reject', r.name, '영역 밖 퇴근 사유 반려 · ${r.dist}', jobRef: '${widget.job.site} ${widget.job.dateLabel}');
                    snack('${r.name} — 반려 · 퇴근 미인정, 포인트 대상 제외');
                  })),
                ]),
              ],
            )),
          )),
    ];
  }

  // 종료 전 제출 — 'N시간 N분' 라벨
  String _beforeEndLabel(DateTime at) {
    final d = widget.job.end.difference(at);
    final h = d.inHours, m = d.inMinutes % 60;
    return h > 0 ? '$h시간 $m분' : '$m분';
  }

  // 사유 승인 → 정상 퇴근 기록 (종료 후 정산 때 포인트 대상)
  void _gpsApprove(GpsReq r) {
    setState(() {
      gpsReqs.remove(r);
      gGpsDone.add('${jobKey(widget.job)}|${r.name}');
      outs[r.name] = r.time;
    });
    audit('gps_approve', r.name, '영역 밖 퇴근 사유 승인 · ${r.dist}', jobRef: '${widget.job.site} ${widget.job.dateLabel}');
    snack('${r.name} — 퇴근 인정 · 종료 후 정산 때 포인트 지급 대상');
  }

  // ── 외부인력 — 정식 명단과 분리된 별도 섹션 (눌러서 정정·수정·삭제) ──
  List<Widget> _extSection({bool statusEditable = true}) {
    if (extWorkers.isEmpty) return const [];
    final list = [...extWorkers]..sort((a, b) => a.name.compareTo(b.name));
    return [
      const SizedBox(height: 10),
      _sect('외부인력 · ${list.length}명 — 눌러서 수정'),
      _rosterCard(list, onTap: (w) => _statusSheet(w, statusEditable: statusEditable)),
    ];
  }

  // ── 상단 요약 카드 — 열자마자 "몇 시 · 몇 명 · 뭘 해야 하나" 한 장 ──
  Widget _summaryCard(DateTime now, List<Worker> base) {
    final job = widget.job;
    final started = now.isAfter(job.start);
    final ended = now.isAfter(job.end);
    final members = [...base, ...invited];

    // 1) 타이머 신호등 (공고 카드와 같은 규칙)
    String timerText;
    Color timerColor;
    double? progress;
    if (ended) {
      timerText = '근무 종료 · ${Job._hm(job.end)}';
      timerColor = JColors.inactive;
    } else if (started) {
      final elapsed = now.difference(job.start);
      timerText = '${_dur(elapsed)} 경과 · 종료 ${Job._hm(job.end)}';
      progress = elapsed.inSeconds / job.end.difference(job.start).inSeconds;
      timerColor = JColors.blue;
    } else {
      final left = job.start.difference(now);
      timerText = '시작까지 ${_dur(left)}';
      timerColor = left.inMinutes < 30 ? JColors.red : JColors.green;
    }

    // 2) 인원 한 줄 + 3) 지금 할 일
    final todos = <(String, Color)>[];
    Widget countLine;
    final wl = waitlistOf(job);
    final expiredOffers = wl
        .where((r) => r.status == 'offered' && r.deadline != null && r.deadline!.isBefore(now))
        .length;
    final apps = gAdmin == null ? 0 : pendingAppsFor(gAdmin!).where((p) => p.jobId == job.id).length;
    if (!started) {
      final filled = members.length + extWorkers.length;
      final held = heldOf(job); // 승인 대기 홀드 — 정원 계산에 포함
      final short = job.cap - filled - held;
      countLine = Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _bigCount(filled, job.cap, '확정', held: held),
          Text(short > 0 ? '$short명 부족' : '충원 완료',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                  color: short > 0 ? JColors.red : JColors.green)),
        ],
      );
      if (short > 0) todos.add(('$short명 더 모집 — 알바생 추가 · 외부인력 · 긴급 알림', JColors.red));
      if (apps > 0) todos.add(('신청 승인 대기 $apps건 — 아래 신청 대기에서 승인·거절', JColors.amber));
      if (expiredOffers > 0) todos.add(('대기열 자리 제안 시간 초과 $expiredOffers건 — 다음 대기자에게', JColors.amber));
      if (wl.isNotEmpty && short <= 0) todos.add(('대기 ${wl.length}명 — 취소 나오면 자동 제안', JColors.muted));
      if (job.closed) todos.add(('수동 마감 상태 — 앱에 노출 안 됨', JColors.amber));
    } else if (!ended) {
      final none = members.where((w) => statusOf(w) == 'none').length;
      final here = [...members, ...extWorkers].where((w) {
        final s = statusOf(w);
        return (s == 'ok' || s == 'late') && outOf_(w) == null;
      }).length;
      final short = seatsOf(job); // 결근·미도착·이탈 자리만 (퇴근자는 채운 사람)
      countLine = Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _bigCount(here, job.cap, '출근'),
          Text(none == 0 ? '전원 처리' : '$none명 미도착',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                  color: none == 0 ? JColors.green : JColors.red)),
        ],
      );
      todos.add(('모집 마감 · 시작 후 알바생 앱 노출 안 됨 — 직접 추가·외부인력만 가능', JColors.muted));
      if (none > 0) todos.add(('미도착 $none명 — 수동 출근 또는 결근 처리', JColors.red));
      if (gpsReqs.isNotEmpty) todos.add(('퇴근 승인 대기 ${gpsReqs.length}명 — 사유 확인 후 승인·반려', JColors.amber));
      if (short > 0) todos.add(('현장 $short명 부족 — 알바생·외부인력 추가 가능', JColors.amber));
      if (expiredOffers > 0) todos.add(('대기열 자리 제안 시간 초과 $expiredOffers건', JColors.amber));
    } else {
      final autoDone = now.difference(job.end).inHours >= Policy.autoCheckoutHours;
      final pending = autoDone
          ? 0
          : members.where((w) => (statusOf(w) == 'ok' || statusOf(w) == 'late') && outOf_(w) == null).length;
      final attended = members.where((w) {
        final s = statusOf(w);
        return s == 'ok' || s == 'late' || s == 'early';
      }).length;
      countLine = Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _bigCount(attended, job.cap, '출근'),
          Text(pending > 0 ? '퇴근 미처리 $pending명' : '정리 완료',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                  color: pending > 0 ? JColors.amber : JColors.green)),
        ],
      );
      if (pending > 0) todos.add(('퇴근 확인 필요 $pending명 — 처리 후 포인트 확정', JColors.amber));
      if (autoDone && gpsReqs.isNotEmpty) todos.add(('퇴근 사유 미처리 ${gpsReqs.length}건', JColors.amber));
      if (todos.isEmpty) todos.add(('할 일 없음 — 종료 후 7일까지 정정 가능', JColors.muted));
    }

    return _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      countLine,
      const SizedBox(height: 8),
      Row(children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: timerColor)),
        const SizedBox(width: 6),
        Text(timerText,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: timerColor,
                fontFeatures: const [FontFeature.tabularFigures()])),
      ]),
      if (progress != null) ...[
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
              value: progress.clamp(0, 1),
              minHeight: 4,
              backgroundColor: JColors.track,
              valueColor: const AlwaysStoppedAnimation(JColors.blue)),
        ),
      ],
      if (todos.isNotEmpty) ...[
        const SizedBox(height: 10),
        const Divider(height: 1, thickness: .5, color: JColors.hairline),
        const SizedBox(height: 8),
        const Text('지금 할 일', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.muted)),
        const SizedBox(height: 4),
        ...todos.map((t) => Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(t.$1,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: t.$2, height: 1.4)),
            )),
      ],
      const SizedBox(height: 10),
      const Divider(height: 1, thickness: .5, color: JColors.hairline),
      const SizedBox(height: 8),
      // 담당자 전화 — 현장에서 제일 많이 누르는 버튼
      InkWell(
        onTap: () => callPhone(context, job.contact),
        borderRadius: BorderRadius.circular(6),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('담당자 ${job.contact}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.ink)),
          const Text('전화 걸기', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.blue)),
        ]),
      ),
      // 공고별 자동 알림 토글 — 시작 1시간 전 확정자 푸시 (종료 전까지) → Supabase jobs.reminder_off
      if (!ended) ...[
        const SizedBox(height: 8),
        InkWell(
          onTap: () {
            final k = jobKey(job);
            final off = gReminderOff.contains(k);
            setState(() => off ? gReminderOff.remove(k) : gReminderOff.add(k));
            audit('reminder', job.site, off ? '시작 1시간 전 알림 켬' : '시작 1시간 전 알림 끔', jobRef: '${job.dateLabel} ${job.slot}');
            snack(off ? '시작 1시간 전 자동 알림 켜짐' : '시작 1시간 전 자동 알림 꺼짐 (이 공고만)');
          },
          borderRadius: BorderRadius.circular(6),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('시작 1시간 전 자동 알림',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.ink)),
            Text(gReminderOff.contains(jobKey(job)) ? '꺼짐 · 켜기' : '켜짐 · 끄기',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                    color: gReminderOff.contains(jobKey(job)) ? JColors.amber : JColors.blue)),
          ]),
        ),
      ],
    ]));
  }

  // held > 0 이면 '7 / 8 확정 · 홀드 1' (홀드 = 승인 대기 신청이 잡은 자리)
  Widget _bigCount(int a, int b, String label, {int held = 0}) => Text.rich(TextSpan(children: [
        TextSpan(text: '$a / $b ',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: JColors.ink,
                fontFeatures: [FontFeature.tabularFigures()])),
        TextSpan(text: label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.muted)),
        if (held > 0)
          TextSpan(text: ' · 홀드 $held', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.amber)),
      ]));

  static const _colHead = TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: JColors.inactive);
  Widget _rosterCard(List<Worker> list, {void Function(Worker)? onTap}) => _card(Column(
        children: [
          if (DateTime.now().isAfter(widget.job.end)) ...[
            Row(children: [
              const Expanded(child: Text('이름', style: _colHead)),
              const SizedBox(width: 44, child: Text('서명', style: _colHead)),
              const SizedBox(width: 84, child: Text('출근', style: _colHead)),
              const SizedBox(width: 48, child: Text('퇴근', style: _colHead)),
              const SizedBox(width: 92, child: Text('포인트', style: _colHead, textAlign: TextAlign.right)),
              const SizedBox(width: 118, child: Text('확인', style: _colHead, textAlign: TextAlign.right)),
            ]),
            const Divider(height: 12, thickness: .5, color: JColors.hairline),
          ],
          for (var i = 0; i < list.length; i++) ...[
            if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
            onTap == null
                ? _row(list[i])
                : InkWell(
                    onTap: () => onTap(list[i]),
                    borderRadius: BorderRadius.circular(8),
                    child: _row(list[i]),
                  ),
          ]
        ],
      ));

  // 명단 행 — 열 고정: 이름 | 출근 | 퇴근 | 포인트 | 확인 (종료 후) · 진행 중엔 이름 | 출근 | 확인
  Widget _row(Worker w) {
    final s = statusOf(w);
    final manual = overrides.containsKey(w.name);
    final (label, color) = _stMeta(s);
    final o = outOf_(w);
    final now = DateTime.now();
    final ended = now.isAfter(widget.job.end);
    final pendingOut = ended && (s == 'ok' || s == 'late') && o == null;
    final src = isExt(w.name) ? '외부' : isInvited(w.name) ? '추가' : (s == 'wait' ? '' : (manual ? '수동' : '자동'));
    const tab = [FontFeature.tabularFigures()];
    const sub = TextStyle(fontSize: 10.5, fontWeight: FontWeight.w500, color: JColors.inactive);

    // 1) 이름 (+ 외부인력 소속·전화, 짝 표시)
    final name = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text.rich(TextSpan(children: [
        TextSpan(text: w.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: JColors.ink)),
        if (src.isNotEmpty)
          TextSpan(text: '  $src', style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFFC7C7CC))),
      ])),
      if (w.org != null || w.phone != null)
        Text([?w.org, ?w.phone].join(' '), style: sub),
      if (buddyOf(widget.job, w.name) != null) ...[
        Text('짝 ${buddyOf(widget.job, w.name)}', style: sub),
        // 짝이 명단에서 빠짐(강제 취소·배정 취소) → 보너스 소멸
        if (workerOf(widget.job, buddyOf(widget.job, w.name)!) == null)
          const Text('짝 취소됨 · 보너스 없음',
              style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: JColors.amber)),
      ],
    ]);

    // 1-1) 서명 (계약서·안전교육) — 공고 토글 둘 다 꺼졌거나 외부인력이면 대상 아님
    final signCell = !widget.job.needsSign || isExt(w.name)
        ? const Text('—', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.inactive))
        : isSigned(widget.job, w.name)
            ? const Text('서명', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: JColors.green))
            : GestureDetector(
                onTap: () => snack('알바생 앱에서 서명해야 출근 처리돼요 (수동 출근 시 관리자 확인 필요)'),
                child: const Text('미서명', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: JColors.red)),
              );

    // 2) 출근 (상태 + 시각)
    final inCell = Text(label + (!manual && w.time != null ? ' ${w.time}' : ''),
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color, fontFeatures: tab));

    // 3) 퇴근 (종료 후)
    final outCell = pendingOut
        ? const Text('미처리', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.amber))
        : Text(o ?? '—',
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600,
                color: o == null ? JColors.inactive : JColors.muted, fontFeatures: tab));

    // 4) 포인트 (종료 후) — 근무 보상 + 같이하기 보너스 두 줄
    final showPoint = ended && !pendingOut && (s == 'ok' || s == 'late' || s == 'early' || s == 'runaway');
    final hasBuddy = buddyOf(widget.job, w.name) != null;
    final pointCell = !showPoint
        ? const SizedBox()
        : Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(_eligible(w) ? '+${widget.job.point}P' : '없음',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                    color: _eligible(w) ? JColors.green : JColors.inactive, fontFeatures: tab)),
            if (hasBuddy)
              Text(buddyBonusEligible(widget.job, w) ? '짝 +${Policy.buddyBonus ~/ 1000},000P' : '짝 보너스 없음',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                      color: buddyBonusEligible(widget.job, w) ? JColors.green : JColors.inactive, fontFeatures: tab)),
          ]);

    // 5) 확인 (더블체크)
    final vt = _verifyTarget(w);
    final verifyCell = vt == null ? const SizedBox() : _verifyText(w, vt);

    return Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      Expanded(child: name),
      SizedBox(width: 44, child: signCell),
      SizedBox(width: ended ? 84 : 96, child: inCell),
      if (ended) ...[
        SizedBox(width: 48, child: outCell),
        SizedBox(width: 92, child: Align(alignment: Alignment.centerRight, child: pointCell)),
      ],
      SizedBox(width: ended ? 118 : 110, child: Align(alignment: Alignment.centerRight, child: verifyCell)),
    ]);
  }

  // ── 관리자 확인(더블체크) — 진행 중: 출근 확인 / 종료 후: 퇴근 확인. 기록만 남기고 포인트엔 영향 없음 ──
  // null = 대상 아님 · false = 출근 확인 · true = 퇴근 확인
  bool? _verifyTarget(Worker w) {
    if (isExt(w.name)) return null;
    final s = statusOf(w);
    if (s != 'ok' && s != 'late') return null;
    final now = DateTime.now();
    if (now.isAfter(widget.job.end)) return outOf_(w) != null ? true : null;
    if (now.isAfter(widget.job.start)) return false;
    return null;
  }

  Map<String, String> _verifyMap(bool out) =>
      (out ? gVerifiedOut : gVerifiedIn).putIfAbsent(jobKey(widget.job), () => {});

  (int, int) _verifyCount(List<Worker> list, {required bool out}) {
    final targets = list.where((w) => _verifyTarget(w) == out).toList();
    final m = _verifyMap(out);
    return (targets.where((w) => m.containsKey(w.name)).length, targets.length);
  }

  void _verify(Worker w, bool out, {bool quiet = false}) {
    final m = _verifyMap(out);
    final label = out ? '퇴근 확인' : '출근 확인';
    final ref = '${widget.job.site} ${widget.job.dateLabel} ${widget.job.slot}';
    setState(() {
      if (m.containsKey(w.name)) {
        m.remove(w.name);
        audit('verify', w.name, '$label 취소', jobRef: ref);
      } else {
        final t = DateTime.now();
        m[w.name] = '${gAdmin?.name ?? '관리자'} ${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
        audit('verify', w.name, label, jobRef: ref);
      }
    });
    if (!quiet) snack('${w.name} — ${m.containsKey(w.name) ? label : '$label 취소'}');
  }

  Widget _verifyText(Worker w, bool out) {
    final v = _verifyMap(out)[w.name];
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _verify(w, out),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Text(v == null ? (out ? '퇴근 확인' : '확인') : '확인됨 · $v',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                color: v == null ? JColors.blue : JColors.inactive,
                fontFeatures: const [FontFeature.tabularFigures()])),
      ),
    );
  }

  // 섹션 제목 + 미확인 인원 있으면 [전원 확인]
  Widget _sectVerify(String t, List<Worker> list, {required bool out}) {
    final left = list.where((w) => _verifyTarget(w) == out && !_verifyMap(out).containsKey(w.name)).toList();
    return Padding(
      padding: const EdgeInsets.only(bottom: 7, left: 2),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Expanded(child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.muted))),
        if (left.isNotEmpty)
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              for (final w in left) {
                _verify(w, out, quiet: true);
              }
              snack('${left.length}명 — ${out ? '퇴근' : '출근'} 확인');
            },
            child: const Text('전원 확인',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.blue)),
          ),
      ]),
    );
  }

  static Widget _sect(String t) => Padding(
      padding: const EdgeInsets.only(bottom: 7, left: 2),
      child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.muted)));

  static Widget _card(Widget child) => Container(
      decoration: BoxDecoration(
        color: JColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: JColors.hairline, width: .5),
      ),
      padding: const EdgeInsets.all(14),
      child: child);

  static Widget _pill(String t, {required Color bg, required Color fg, Color? border, required VoidCallback onTap}) =>
      Material(
        color: bg,
        borderRadius: BorderRadius.circular(19),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(19),
          child: Container(
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(19),
              border: border != null ? Border.all(color: border.withValues(alpha: .4)) : null,
            ),
            child: Text(t, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: fg)),
          ),
        ),
      );
}

// ─── 공용 소품 ───
Widget jCard(Widget child) => Container(
    decoration: BoxDecoration(
      color: JColors.card,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: JColors.hairline, width: .5),
    ),
    padding: const EdgeInsets.all(14),
    child: child);

Widget jSect(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 7, left: 2, top: 4),
    child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.muted)));

Widget jHeader(String title, String sub) => Padding(
    padding: const EdgeInsets.only(top: 10, bottom: 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -.6, color: JColors.ink)),
      if (sub.isNotEmpty) ...[
        const SizedBox(height: 2),
        Text(sub, style: const TextStyle(fontSize: 12.5, color: JColors.muted)),
      ],
    ]));

Widget jPill(String t,
        {required Color bg, required Color fg, Color? border, required VoidCallback onTap}) =>
    Material(
      color: bg,
      borderRadius: BorderRadius.circular(19),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(19),
        child: Container(
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(19),
            border: border != null ? Border.all(color: border.withValues(alpha: .4)) : null,
          ),
          child: Text(t, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: fg)),
        ),
      ),
    );

// 건수 배지 '+N' — 기본 앰버(처리 필요) · muted 회색(정보) · urgent 빨강 + 은은한 펄스(시간 임박·주의)
Widget jBadge(int n, {bool urgent = false, bool muted = false}) {
  final t = Text('+$n',
      style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: urgent ? JColors.red : (muted ? JColors.inactive : JColors.amber),
          fontFeatures: const [FontFeature.tabularFigures()]));
  return urgent ? _Pulse(child: t) : t;
}

// 1초 주기 페이드 펄스 — 진짜 급한 것에만 (장식 아님)
class _Pulse extends StatefulWidget {
  final Widget child;
  const _Pulse({required this.child});
  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: Tween<double>(begin: 1, end: .3).animate(CurvedAnimation(parent: _c, curve: Curves.easeInOut)),
        child: widget.child,
      );
}

void jSnack(BuildContext context, String msg) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
    behavior: SnackBarBehavior.floating,
    backgroundColor: JColors.ink,
    duration: const Duration(milliseconds: 1300),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
  ));
}

// ═══════════ 일정 탭 — 월 달력 + 날짜별 공고 ═══════════
class SchedulePage extends StatefulWidget {
  final Admin admin;
  const SchedulePage({super.key, required this.admin});
  @override
  State<SchedulePage> createState() => _SchedulePageState();
}

class _SchedulePageState extends State<SchedulePage> {
  late DateTime month = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime? selected = _d0(DateTime.now()); // null = 펼침 없음 (같은 날 다시 탭하면 접힘)
  String filter = 'all'; // all | 파트너명(1급) | 근무지명(2급)
  bool onlyShort = false; // 부족·미출근만
  Timer? _tick;

  static DateTime _d0(DateTime t) => DateTime(t.year, t.month, t.day);

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  bool _inScope(Job j) => widget.admin.sites == null || widget.admin.sites!.contains(j.site);
  bool _pass(Job j) {
    final now = DateTime.now();
    if (onlyShort && !(seatsOf(j) > 0 && !now.isAfter(j.end))) return false;
    if (filter == 'all') return true;
    return widget.admin.sites != null ? j.site == filter : (siteOf(j.site)?.partner == filter);
  }

  List<Job> get all => [...gJobs, ...gPastJobs].where((j) => _inScope(j) && _pass(j)).toList();

  // 이 달 안에서 날짜가 몇 번째 주인지 (달 밖이면 -1)
  int _weekOf(DateTime d, int lead) =>
      (d.year == month.year && d.month == month.month) ? (d.day - 1 + lead) ~/ 7 : -1;

  // 주 사이에 끼어드는 그날 공고 패널
  Widget _dayPanel(DateTime d, List<Job> list) => AnimatedSize(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        alignment: Alignment.topCenter,
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.only(top: 4, bottom: 8),
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 2),
          decoration: BoxDecoration(color: JColors.bg, borderRadius: BorderRadius.circular(14)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${d.month}/${d.day}(${Job._wd[d.weekday - 1]}) · ${list.length}건',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.muted)),
            const SizedBox(height: 8),
            if (list.isEmpty)
              const Padding(
                padding: EdgeInsets.only(bottom: 10),
                child: Text('이 날은 공고가 없어요', style: TextStyle(fontSize: 12, color: JColors.inactive)),
              ),
            ...list.map((j) => Padding(padding: const EdgeInsets.only(bottom: 8), child: _JobCard(job: j))),
          ]),
        ),
      );

  Widget _chip(String t, bool on, VoidCallback f, {bool alert = false}) => Padding(
        padding: const EdgeInsets.only(right: 6),
        child: InkWell(
          onTap: f,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: on ? (alert ? JColors.red : JColors.ink) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: on ? Colors.transparent : JColors.hairline),
            ),
            child: Text(t,
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                    color: on ? Colors.white : (alert ? JColors.red : JColors.ink))),
          ),
        ),
      );
  List<Job> onDay(DateTime d) => all.where((j) => _d0(j.start) == d).toList()..sort((a, b) => a.start.compareTo(b.start));

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today0 = _d0(now);
    final first = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final lead = first.weekday % 7;
    final monthJobs = all.where((j) => j.start.year == month.year && j.start.month == month.month).length;
    final dayList = selected == null ? <Job>[] : onDay(selected!);

    Widget nav(String t, VoidCallback f) => InkWell(
          onTap: f,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
            child: Text(t, style: const TextStyle(fontSize: 22, height: 1, color: JColors.blue)),
          ),
        );

    final cells = <Widget>[
      for (var i = 0; i < lead; i++) const SizedBox(),
      for (var d = 1; d <= daysInMonth; d++)
        () {
          final date = DateTime(month.year, month.month, d);
          final jobs = onDay(date);
          final sel = date == selected;
          final isToday = date == today0;
          // 칸 안에 근무지 라벨 최대 2개 (+N) — 부족/미출근은 빨강
          final shown = jobs.take(2).toList();
          return InkWell(
            onTap: () => setState(() => selected = sel ? null : date),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.fromLTRB(2, 4, 2, 2),
              decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10), color: sel ? JColors.ink : Colors.transparent),
              child: Column(children: [
                Text('$d',
                    style: TextStyle(
                        fontSize: 12.5,
                        height: 1.1,
                        fontWeight: sel || isToday ? FontWeight.w800 : FontWeight.w600,
                        color: sel ? Colors.white : (isToday ? JColors.blue : JColors.ink))),
                const SizedBox(height: 2),
                for (final j in shown)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: 2),
                    padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1.5),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: sel
                          ? Colors.white.withValues(alpha: .18)
                          : (seatsOf(j) > 0 && !now.isAfter(j.end) ? const Color(0x1AC22A2A) : const Color(0xFFF0F0F2)),
                    ),
                    child: Text(j.site.split(' ').first,
                        maxLines: 1,
                        overflow: TextOverflow.clip,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 8.5,
                            height: 1.2,
                            fontWeight: FontWeight.w700,
                            color: sel
                                ? Colors.white
                                : (seatsOf(j) > 0 && !now.isAfter(j.end) ? JColors.red : JColors.ink))),
                  ),
                if (jobs.length > 2)
                  Padding(
                    padding: const EdgeInsets.only(top: 1),
                    child: Text('+${jobs.length - 2}',
                        style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700,
                            color: sel ? Colors.white70 : JColors.inactive)),
                  ),
              ]),
            ),
          );
        }(),
    ];

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 10),
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('일정',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -.6, color: JColors.ink)),
                  const SizedBox(height: 2),
                  Text('${month.month}월 공고 $monthJobs건 · 빨강 = 인원 부족',
                      style: const TextStyle(fontSize: 12.5, color: JColors.muted)),
                ]),
              ),
              // 공고 등록 — 1등급 전용, 달력에서 고른 날짜가 미리 선택됨
              if (widget.admin.isA1)
                InkWell(
                  onTap: () => openRegisterSheet(context, preselected: selected == null ? null : {selected!})
                      .then((ok) { if (ok && mounted) setState(() {}); }),
                  borderRadius: BorderRadius.circular(10),
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Text('＋ 공고 등록',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.blue)),
                  ),
                ),
            ]),
          ),
          // 필터 — 1급: 파트너사 / 2급: 담당 근무지 · '부족만' 토글
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              for (final o in <(String, String)>[
                ('all', '전체'),
                if (widget.admin.sites != null)
                  ...widget.admin.sites!.map((s) => (s, s.split(' ').first))
                else
                  ...const [('CJ대한통운', 'CJ'), ('롯데택배', '롯데'), ('컨벤션', '컨벤션')],
              ])
                _chip(o.$2, filter == o.$1, () => setState(() => filter = o.$1)),
              const SizedBox(width: 4),
              _chip('부족만', onlyShort, () => setState(() => onlyShort = !onlyShort), alert: true),
            ]),
          ),
          const SizedBox(height: 10),
          jCard(Column(children: [
            Row(children: [
              nav('‹', () => setState(() => month = DateTime(month.year, month.month - 1))),
              Expanded(
                  child: Text('${month.year}년 ${month.month}월',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: JColors.ink))),
              nav('›', () => setState(() => month = DateTime(month.year, month.month + 1))),
            ]),
            const SizedBox(height: 4),
            Row(children: [
              for (final w in const ['일', '월', '화', '수', '목', '금', '토'])
                Expanded(
                    child: Text(w,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: w == '일' ? JColors.red : (w == '토' ? JColors.blue : JColors.inactive)))),
            ]),
            const SizedBox(height: 4),
            // 주 단위 행 — 탭한 날짜가 있는 주 바로 아래가 벌어지며 그날 공고가 펼쳐짐
            for (var w = 0; w < (cells.length + 6) ~/ 7; w++) ...[
              SizedBox(
                height: 66,
                child: Row(children: [
                  for (var i = 0; i < 7; i++)
                    Expanded(child: w * 7 + i < cells.length ? cells[w * 7 + i] : const SizedBox()),
                ]),
              ),
              if (selected != null && _weekOf(selected!, lead) == w) _dayPanel(selected!, dayList),
            ],
          ])),
        ],
      ),
    );
  }
}

// ═══════════ 승인 탭 — 신청 / 취소 / 대기열 (담당 범위로 필터) ═══════════
class ApprovalPage extends StatefulWidget {
  final Admin admin;
  const ApprovalPage({super.key, required this.admin});
  @override
  State<ApprovalPage> createState() => _ApprovalPageState();
}

class _ApprovalPageState extends State<ApprovalPage> {
  String sub = 'apply';
  // 매 빌드마다 전역 결정 상태(gDecided)에서 다시 계산 — 공고 상세에서 처리한 건도 바로 반영
  List<PendingApp> get apps => pendingAppsFor(widget.admin);
  List<CancelReq> get cancels => cancelReqsFor(widget.admin);
  List<WaitEntry> get waits => waitlistFor(widget.admin);
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  // 같이하기 짝 — 같은 공고에 같이 신청한 사람
  PendingApp? _mateOf(PendingApp a) =>
      a.buddy == null ? null : apps.where((x) => x.name == a.buddy && x.jobId == a.jobId).firstOrNull;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          jHeader('승인',
              '${widget.admin.sites == null ? '전 근무지' : '담당 근무지'} · 처리 필요 ${apps.length + cancels.length}건'
              '${apps.any((a) => a.danger) ? ' · 협의대상 포함' : ''}'),
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(color: const Color(0xFFE8E8ED), borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              // (키, 라벨, 건수, 긴급) — 긴급: 협의대상 신청 / 대기열 마감 5분 이내 → 빨강 + 펄스
              for (final s in <(String, String, int, bool)>[
                ('apply', '신청', apps.length, apps.any((a) => a.danger)),
                ('cancel', '취소', cancels.length, false),
                ('wait', '대기열', waits.length, waits.any((w) {
                  final left = w.deadline.difference(DateTime.now());
                  return !left.isNegative && left.inMinutes < 5;
                })),
              ])
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => sub = s.$1),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: sub == s.$1 ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: sub == s.$1
                            ? [BoxShadow(color: Colors.black.withValues(alpha: .12), blurRadius: 3)]
                            : null,
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(s.$2,
                            style: TextStyle(fontSize: 12,
                                fontWeight: sub == s.$1 ? FontWeight.w700 : FontWeight.w600,
                                color: sub == s.$1 ? JColors.ink : JColors.muted)),
                        if (s.$3 > 0) ...[
                          const SizedBox(width: 3),
                          jBadge(s.$3, urgent: s.$4, muted: s.$1 == 'wait' && !s.$4),
                        ],
                      ]),
                    ),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 12),
          if (sub == 'apply') ...[..._applyList(), const SizedBox(height: 6), ..._approvalHistory()],
          if (sub == 'cancel') ...[..._cancelList(), const SizedBox(height: 6), ..._cancelHistory()],
          if (sub == 'wait') ..._waitList(),
        ],
      ),
    );
  }

  Widget _empty(String t) => jCard(Center(
      child: Padding(padding: const EdgeInsets.symmetric(vertical: 10),
          child: Text(t, style: const TextStyle(fontSize: 12, color: JColors.inactive)))));

  // 신청한 공고 시작까지 남은 시간 (없으면 null)
  Duration? _leftOf(PendingApp a) {
    final j = a.jobId == null ? null : gJobs.where((x) => x.id == a.jobId).firstOrNull;
    return j?.start.difference(DateTime.now());
  }

  // 신청 — 협의대상(신중히) 먼저, 그다음 12시간 이내 · 각 묶음은 시작 임박순
  List<Widget> _applyList() {
    if (apps.isEmpty) return [_empty('승인 대기 없음')];
    int byLeft(PendingApp x, PendingApp y) =>
        (_leftOf(x) ?? const Duration(days: 99)).compareTo(_leftOf(y) ?? const Duration(days: 99));
    final danger = apps.where((a) => a.danger).toList()..sort(byLeft);
    final normal = apps.where((a) => !a.danger).toList()..sort(byLeft);
    Widget head(String t, Color c) => Padding(
        padding: const EdgeInsets.only(bottom: 7, left: 2, top: 2),
        child: Text(t, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: c)));
    return [
      if (danger.isNotEmpty) ...[
        head('협의대상 · ${danger.length}명 — 신중히 검토', JColors.red),
        ...danger.map(_applyCard),
      ],
      if (normal.isNotEmpty) ...[
        head('12시간 이내 신청 · ${normal.length}명', JColors.muted),
        ...normal.map(_applyCard),
      ],
    ];
  }

  Widget _applyCard(PendingApp a) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              jName(context, a.name),
              // 알바 시작까지 남은 시간 — 1시간 미만·이미 시작이면 빨강 (매초 갱신)
              Builder(builder: (_) {
                final left = _leftOf(a);
                final timeTxt = left == null
                    ? null
                    : left.isNegative
                        ? '이미 시작'
                        : '시작까지 ${beforeLabel(left.inMinutes)}';
                final urgent = left != null && left.inMinutes < 60;
                final txt = timeTxt == null
                    ? a.flag
                    : (a.danger ? '협의대상 · $timeTxt' : timeTxt);
                return Text(txt,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                        color: (a.danger || urgent) ? JColors.red : JColors.amber,
                        fontFeatures: const [FontFeature.tabularFigures()]));
              }),
            ]),
            const SizedBox(height: 2),
            jobLink(context, a.jobId, a.siteName, a.slotTime, '${a.siteName} · ${a.slotTime}'),
            Text(a.note, style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
            // 승인 대기 시간 — 정책 최대 6시간, 넘으면 빨강
            Builder(builder: (_) {
              final (txt, over) = waitLabelOf(a);
              return Text(txt,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: over ? JColors.red : JColors.muted,
                      fontFeatures: const [FontFeature.tabularFigures()]));
            }),
            if (a.buddy != null)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                    a.buddyState == 'pending'
                        ? '같이하기 · ${a.buddy}와 함께 신청 — 짝 응답 대기 (응답 후 승인 가능)'
                        : '같이하기 · ${a.buddy}와 함께 신청 — 승인·거절이 둘 다 같이 처리돼요',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                        color: a.buddyState == 'pending' ? JColors.amber : JColors.blue)),
              ),
            if (overbookedFor(a)) ...[
              const SizedBox(height: 6),
              const Text('정원 초과 — 직접 추가로 자리가 찼어요',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.amber)),
              const SizedBox(height: 6),
              jPill('대기열로 이동', bg: Colors.white, fg: JColors.amber, border: JColors.amber, onTap: () {
                moveAppToWaitlist(context, a);
                setState(() {});
              }),
            ],
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: jPill('승인', bg: JColors.blue, fg: Colors.white, onTap: () async {
                // 같이하기: 짝꿍도 함께 승인 (cascade) · 정원·중복·주 N일 검사는 approveApp 안에서
                final done = await approveApp(context, a, _mateOf(a), via: '승인 탭');
                if (done && mounted) setState(() {});
              })),
              const SizedBox(width: 7),
              Expanded(child: jPill('거절', bg: Colors.white, fg: JColors.red, border: JColors.red,
                  onTap: () async {
                final done = await rejectApp(context, a, _mateOf(a), via: '승인 탭');
                if (!done || !mounted) return;
                // 반려 = 홀드 해제 → 자리 나면 대기 1번 자동 제안
                final job = jobByRef(a.jobId, a.siteName, a.slotTime);
                final msg = job == null ? null : afterSeatOpened(job);
                setState(() {});
                if (msg != null) jSnack(context, msg);
              })),
            ]),
          ])),
        );

  List<Widget> _cancelList() {
    if (cancels.isEmpty) return [_empty('취소 검토 대기 없음')];
    return cancels.map((c) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              jName(context, c.name),
              // 근무 시작 기준 — 1시간 미만이면 사실상 노쇼급이라 빨강
              Text('근무 시작 ${beforeLabel(c.beforeMin)} 전 취소',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                      color: c.beforeMin < 60 ? JColors.red : JColors.amber)),
            ]),
            const SizedBox(height: 2),
            jobLink(context, null, c.siteName, c.slotTime, '${c.siteName} · ${c.slotTime}'),
            Text('신청 ${c.appliedAt}  →  취소 ${c.cancelledAt}\n사유: ${c.reason}',
                style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
            // 사유 분류별 권고 — 단순변심=차감 / 질병·가족·교통·천재지변=면제 / 기타=메모 확인
            Builder(builder: (_) {
              final (rec, color) = switch (c.category) {
                '단순변심' => ('권고: 차감 (단순변심)', JColors.amber),
                '기타' => ('메모 확인 후 판단', JColors.muted),
                _ => ('권고: 면제 (${c.category})', JColors.green),
              };
              return Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(rec, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
              );
            }),
            const SizedBox(height: 10),
            Row(children: [
              // 권고 액션은 채운 버튼
              Expanded(child: c.category == '단순변심'
                  ? jPill('차감', bg: JColors.red, fg: Colors.white, onTap: () => _decideCancel(c, 'deduct'))
                  : jPill('차감', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () => _decideCancel(c, 'deduct'))),
              const SizedBox(width: 7),
              Expanded(child: c.category != '단순변심' && c.category != '기타'
                  ? jPill('면제', bg: JColors.blue, fg: Colors.white, onTap: () => _decideCancel(c, 'exempt'))
                  : jPill('면제', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: () => _decideCancel(c, 'exempt'))),
              const SizedBox(width: 7),
              Expanded(child: jPill('반려', bg: Colors.white, fg: JColors.ink, border: JColors.muted,
                  onTap: () => _decideCancel(c, 'reject'))),
            ]),
          ])),
        )).toList();
  }

  void _decideCancel(CancelReq c, String d) {
    setState(() => gDecided.add('cancel|${c.name}|${c.siteName}'));
    gCancelDecisions.add(CancelDecision(c, d, widget.admin.name, DateTime.now()));
    audit('cancel_decide', c.name, switch (d) { 'deduct' => '차감', 'exempt' => '면제', _ => '반려' },
        jobRef: '${c.siteName} ${c.slotTime}');
    gPendingTick.value++;
    jSnack(
        context,
        switch (d) {
          'deduct' => '${c.name} — 취소 승인 · ${Policy.cancelDeduct ~/ 1000},000P 차감 (처리 내역에서 되돌리기 가능)',
          'exempt' => '${c.name} — 취소 승인 · 차감 면제',
          _ => '${c.name} — 반려 · 신청 복원 (출근 의무)',
        });
  }

  // 잘못 눌렀을 때 — 다시 검토 대기로, 차감이었으면 포인트 복원
  void _undoCancel(CancelDecision r) {
    setState(() {
      r.reverted = true;
      gDecided.remove('cancel|${r.req.name}|${r.req.siteName}');
    });
    gPendingTick.value++;
    jSnack(context,
        r.decision == 'deduct'
            ? '${r.req.name} — 차감 취소 · ${Policy.cancelDeduct ~/ 1000},000P 복원 · 다시 검토 대기'
            : '${r.req.name} — 처리 취소 · 다시 검토 대기');
  }

  // 신청 승인/거절 처리 내역 (담당 범위) — 누가·언제 + 되돌리기
  List<Widget> _approvalHistory() {
    final recs = gAudit.reversed
        .where((e) =>
            (e.type == 'app_approve' || e.type == 'app_reject') &&
            e.app != null &&
            (widget.admin.sites == null || widget.admin.sites!.contains(e.app!.siteName)))
        .take(10)
        .toList();
    if (recs.isEmpty) return const [];
    return [
      jSect('승인 처리 내역 · ${recs.length}건 — 누가 · 언제'),
      ...recs.map((e) {
        final approve = e.type == 'app_approve';
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: jCard(Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  jName(context, e.name,
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700,
                          color: e.reverted ? JColors.inactive : JColors.ink,
                          decoration: e.reverted ? TextDecoration.lineThrough : null)),
                  const SizedBox(width: 8),
                  Text(e.reverted ? '되돌림' : (approve ? '승인' : '거절'),
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                          color: e.reverted ? JColors.inactive : (approve ? JColors.blue : JColors.red))),
                ]),
                const SizedBox(height: 2),
                Text('${e.jobRef}\n${e.detail} · ${e.by} · ${hmOf(e.at)}',
                    maxLines: 3, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10.5, color: JColors.inactive, height: 1.4)),
              ]),
            ),
            if (!e.reverted)
              SizedBox(
                width: 78,
                child: jPill('되돌리기', bg: Colors.white, fg: JColors.muted, border: JColors.muted, onTap: () {
                  // 승인 되돌리기 = 확정 명단에서도 제거 (gApprovedByJob · 합류 명단)
                  setState(() {
                    e.reverted = true;
                    unapprove(e.app!);
                  });
                  gPendingTick.value++;
                  jSnack(context, '${e.name} — ${approve ? '승인' : '거절'} 취소 · 다시 검토 대기');
                }),
              ),
          ])),
        );
      }),
    ];
  }

  // 취소 처리 내역 (담당 범위) — 되돌리기 가능
  List<Widget> _cancelHistory() {
    final recs = gCancelDecisions.reversed
        .where((r) => widget.admin.sites == null || widget.admin.sites!.contains(r.req.siteName))
        .take(10)
        .toList();
    if (recs.isEmpty) return const [];
    String hm(DateTime t) => '${t.month}/${t.day} ${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return [
      jSect('취소 처리 내역 · ${recs.length}건 — 잘못 눌렀으면 되돌리기'),
      ...recs.map((r) {
        final (label, color) = switch (r.decision) {
          'deduct' => ('차감 −${Policy.cancelDeduct ~/ 1000},000P', JColors.red),
          'exempt' => ('면제', JColors.blue),
          _ => ('반려 · 신청 복원', JColors.ink),
        };
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: jCard(Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  jName(context, r.req.name,
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700,
                          color: r.reverted ? JColors.inactive : JColors.ink,
                          decoration: r.reverted ? TextDecoration.lineThrough : null)),
                  const SizedBox(width: 8),
                  Text(r.reverted ? '되돌림' : label,
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                          color: r.reverted ? JColors.inactive : color)),
                ]),
                const SizedBox(height: 2),
                Text('${r.req.siteName} · ${r.req.slotTime} · ${r.by} · ${hm(r.at)}',
                    style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
              ]),
            ),
            if (!r.reverted)
              SizedBox(
                width: 78,
                child: jPill('되돌리기', bg: Colors.white, fg: JColors.muted, border: JColors.muted,
                    onTap: () => _undoCancel(r)),
              ),
          ])),
        );
      }),
    ];
  }

  List<Widget> _waitList() {
    if (waits.isEmpty) return [_empty('대기열 진행 중인 건 없음')];
    final now = DateTime.now();
    return [
      ...waits.map((w) {
        final left = w.deadline.difference(now);
        final expired = left.isNegative;
        final h = left.inHours, m = left.inMinutes % 60, s = left.inSeconds % 60;
        final txt = expired
            ? '시간 초과'
            : h > 0
                ? '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}'
                : '$m:${s.toString().padLeft(2, '0')}';
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              InkWell(
                onTap: () => openWorker(context, w.name),
                borderRadius: BorderRadius.circular(6),
                child: Text('${w.siteName} 대기 ${w.order}번 · ${w.name}',
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
              ),
              Text(txt,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800,
                      fontFeatures: const [FontFeature.tabularFigures()],
                      color: expired ? JColors.inactive : (left.inMinutes < 5 ? JColors.red : const Color(0xFF9A6B00)))),
            ]),
            const SizedBox(height: 3),
            Text(
                expired
                    ? '${w.slotTime} · 수락 시간이 지나 자동 거절 — 다음 대기자에게 자리 제안이 갔어요'
                    : '${w.slotTime} · 자리 제안 발송됨 · 수락 대기 중',
                style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
          ])),
        );
      }),
      const Padding(
        padding: EdgeInsets.only(left: 2),
        child: Text('대기열은 자동 처리 (수락 제한: 24시간 전 1시간 · 이내 30분) — 여기선 상황만 확인해요',
            style: TextStyle(fontSize: 11, color: JColors.inactive)),
      ),
    ];
  }
}

// ═══════════ 소통 탭 — 공지 / 늦어요 / 1:1 문의 (담당 범위로 필터) ═══════════
class CommPage extends StatefulWidget {
  final Admin admin;
  const CommPage({super.key, required this.admin});
  @override
  State<CommPage> createState() => _CommPageState();
}

class _CommPageState extends State<CommPage> {
  late final List<LateReport> lates = lateReportsFor(widget.admin);
  late final List<Inquiry> inqs = inquiriesFor(widget.admin);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          jHeader('소통', '문의 · 늦어요 · 포인트 (공지는 각 공고 상세에서)'),
          SizedBox(
            height: 44,
            child: jPill('포인트 회수 · 근무자 검색', bg: Colors.white, fg: JColors.red, border: JColors.red,
                onTap: () => openRecoverSheet(context).then((_) { if (mounted) setState(() {}); })),
          ),
          const SizedBox(height: 6),
          jSect('늦어요 보고 · ${lates.length}건'),
          if (lates.isEmpty)
            jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('보고 없음', style: TextStyle(fontSize: 12, color: JColors.inactive))))),
          // 늦어요 카드 탭 → 그 사람과 1:1 채팅 (보고 내용이 첫 메시지) · 이름 탭 → 프로필
          ...lates.map((l) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: JColors.card,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    onTap: () => _openLateChat(context, l),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: JColors.hairline, width: .5),
                      ),
                      padding: const EdgeInsets.all(14),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          InkWell(
                            onTap: () => openWorker(context, l.name),
                            borderRadius: BorderRadius.circular(6),
                            child: Text('${l.name} — ${l.delayMin}분 늦어요',
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                          ),
                          Text(l.ago, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.amber)),
                        ]),
                        const SizedBox(height: 2),
                        Text('${l.siteName} ${l.slot} · 사유: ${l.reason} · 눌러서 답장',
                            style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                      ]),
                    ),
                  ),
                ),
              )),
          jSect('1:1 문의 · ${inqs.length}건'),
          ...inqs.map((q) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _inqRow(context, q),
              )),
          // 회수 메시지 기록 — 알바생 앱에서도 같은 내용이 포인트 내역 + 알림으로 보임
          if (gRecoveries.isNotEmpty) ...[
            jSect('포인트 회수 메시지 · ${gRecoveries.length}건'),
            ...gRecoveries.reversed.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      jName(context, r.name,
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                      Text('−${r.amount.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}P',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: JColors.red,
                              fontFeatures: [FontFeature.tabularFigures()])),
                    ]),
                    const SizedBox(height: 4),
                    Text('"${r.memo}"', style: const TextStyle(fontSize: 12, color: JColors.ink, height: 1.5)),
                    const SizedBox(height: 3),
                    Text('${r.jobRef.isEmpty ? '' : '${r.jobRef} · '}${r.by} · ${r.at.month}/${r.at.day} ${r.at.hour.toString().padLeft(2, '0')}:${r.at.minute.toString().padLeft(2, '0')} · 알바생에게 전송됨',
                        style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
                  ])),
                )),
          ],
          // 조퇴 안내 — 조퇴 기록 시 알바생 앱에 팝업으로 전달된 건
          if (gWorkerNotes.isNotEmpty) ...[
            jSect('조퇴 안내 · ${gWorkerNotes.length}건'),
            ...gWorkerNotes.reversed.map((n) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    jName(context, n.name,
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                    const SizedBox(height: 4),
                    Text(n.text, style: const TextStyle(fontSize: 12, color: JColors.muted, height: 1.5)),
                    const SizedBox(height: 3),
                    Text('${n.jobRef} · ${hmOf(n.at)} · 앱 팝업으로 전송됨',
                        style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
                  ])),
                )),
          ],
        ],
      ),
    );
  }

  // 늦어요 보고를 첫 메시지로 한 1:1 채팅 (기존 문의 대화가 있으면 이어서)
  void _openLateChat(BuildContext context, LateReport l) {
    final inq = inqs.where((q) => q.name == l.name).firstOrNull;
    Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => InquiryChatPage(name: l.name, initial: [
              ('me', '[늦어요] ${l.delayMin}분 지연 · ${l.reason} (${l.siteName} ${l.slot})', l.ago),
              ...?inq?.msgs,
            ])));
  }

  Widget _inqRow(BuildContext context, Inquiry q) {
    final color = switch (q.status) {
      '답변 대기' => JColors.red,
      '진행중' => JColors.blue,
      _ => JColors.inactive,
    };
    final urgent = lates.any((l) => l.name == q.name); // 늦어요 보고가 있는 사람 = 긴급
    return Material(
      color: JColors.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => InquiryChatPage(name: q.name, initial: q.msgs))),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: JColors.hairline, width: .5),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${q.name}  ·  ${q.siteName}',
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                const SizedBox(height: 1),
                Text(q.preview, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
              ]),
            ),
            const SizedBox(width: 8),
            if (urgent)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Text('긴급', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: JColors.red)),
              ),
            Text(q.status, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ]),
        ),
      ),
    );
  }
}

// 1:1 문의 채팅 (관리자 → 알바생 답변)
class InquiryChatPage extends StatefulWidget {
  final String name;
  final List<(String, String, String)> initial; // (who, text, time)
  const InquiryChatPage({super.key, required this.name, required this.initial});
  @override
  State<InquiryChatPage> createState() => _InquiryChatPageState();
}

class _InquiryChatPageState extends State<InquiryChatPage> {
  late final List<(String, String, String)> msgs = List.of(widget.initial);
  final ctrl = TextEditingController();
  final scroll = ScrollController();

  void _send() {
    final v = ctrl.text.trim();
    if (v.isEmpty) return;
    setState(() => msgs.add(('adm', v, '방금')));
    ctrl.clear();
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => scroll.animateTo(scroll.position.maxScrollExtent + 80,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 16, 6),
            child: Row(children: [
              InkWell(
                onTap: () => Navigator.of(context).pop(),
                borderRadius: BorderRadius.circular(10),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  child: Text('‹', style: TextStyle(fontSize: 26, color: JColors.blue, height: 1)),
                ),
              ),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  InkWell(
                    onTap: () => openWorker(context, widget.name),
                    borderRadius: BorderRadius.circular(6),
                    child: Text(widget.name,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.4, color: JColors.ink)),
                  ),
                  const Text('1:1 문의 · 이름 누르면 프로필', style: TextStyle(fontSize: 11.5, color: JColors.muted)),
                ]),
              ),
              InkWell(
                onTap: () {
                  jSnack(context, '${widget.name} — 문의를 종결했어요');
                  Navigator.of(context).pop();
                },
                borderRadius: BorderRadius.circular(10),
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Text('종결', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: JColors.muted)),
                ),
              ),
            ]),
          ),
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.all(14),
              children: msgs.map((m) {
                final me = m.$1 == 'adm'; // 관리자 = 오른쪽 파랑
                return Align(
                  alignment: me ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                    constraints: const BoxConstraints(maxWidth: 250),
                    decoration: BoxDecoration(
                      color: me ? JColors.blue : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: me ? null : Border.all(color: JColors.hairline, width: .5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(m.$2,
                            style: TextStyle(fontSize: 12.5, height: 1.45, color: me ? Colors.white : JColors.ink)),
                        const SizedBox(height: 2),
                        Text(m.$3,
                            style: TextStyle(fontSize: 8.5,
                                color: me ? Colors.white.withValues(alpha: .6) : JColors.inactive)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: JColors.hairline, width: .5)),
            ),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: ctrl,
                  onSubmitted: (_) => _send(),
                  style: const TextStyle(fontSize: 13, color: JColors.ink),
                  decoration: InputDecoration(
                    hintText: '답변 입력',
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: const BorderSide(color: JColors.hairline)),
                  ),
                ),
              ),
              const SizedBox(width: 7),
              SizedBox(
                width: 64,
                child: jPill('전송', bg: JColors.blue, fg: Colors.white, onTap: _send),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}

// ═══════════ 근무자 프로필 — 정보 · 대화 · 포인트 지급/회수 · 근무 내역 · 포인트 내역 ═══════════
class WorkerPage extends StatefulWidget {
  final String name;
  const WorkerPage({super.key, required this.name});
  @override
  State<WorkerPage> createState() => _WorkerPageState();
}

class _WorkerPageState extends State<WorkerPage> {
  String won(int v) => v.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (x) => '${x[1]},');

  @override
  Widget build(BuildContext context) {
    final name = widget.name;
    final m = memberOf(name);
    final warns = warningsOf(m);
    final now = DateTime.now();

    // 근무 내역 — 모든 공고 명단(강제 취소 제외 + 직접 추가·승인 합류)에서 이 사람 찾기 (→ Supabase applications+attendance)
    final work = <(Job, Worker)>[];
    for (final j in [...gJobs, ...gPastJobs]) {
      final w = membersOf(j).where((w) => w.name == name).firstOrNull;
      if (w != null) work.add((j, w));
    }
    work.sort((a, b) => b.$1.start.compareTo(a.$1.start));
    final ended = work.where((e) => now.isAfter(e.$1.end)).toList();
    final attended = ended.where((e) {
      final s = effStatus(e.$1, e.$2);
      return s == 'ok' || s == 'late' || s == 'early';
    }).length;
    final balance = balanceOf(name); // 보유 = Mock 기본 − 회수 + 지급 − 취소 차감 + 정산 완료 보상 (내역 합계와 일치)

    // 포인트 내역 (최신순): 정산 완료 근무 보상 + 지급 + 회수
    final pts = <(DateTime, String, int)>[
      for (final e in ended)
        if (jobPointEligible(e.$1, e.$2))
          (e.$1.end, '근무 보상 · ${e.$1.site.split(' ').first} ${e.$1.dateLabel} · 정산 완료', e.$1.point),
      for (final e in ended)
        if (buddyBonusEligible(e.$1, e.$2))
          (e.$1.end, '같이하기 보너스 · ${e.$1.site.split(' ').first} ${e.$1.dateLabel} (짝 ${buddyOf(e.$1, name)}) · 정산 완료', Policy.buddyBonus),
      for (final g in gGrants)
        if (g.name == name) (g.at, '지급 · ${g.memo}', g.amount),
      for (final r in gRecoveries)
        if (r.name == name) (r.at, '회수 · ${r.memo}', -r.amount),
      for (final d in gCancelDecisions)
        if (d.req.name == name && d.decision == 'deduct' && !d.reverted)
          (d.at, '취소 차감 · ${d.req.siteName.split(' ').first} ${d.req.slotTime} (단순변심)', -Policy.cancelDeduct),
    ]..sort((a, b) => b.$1.compareTo(a.$1));

    final inq = _inquiriesAll.where((q) => q.name == name).firstOrNull;
    // 이번 주(월~일) 근무지별 횟수 — 동일 근무지 4일(CJ·롯데) / 2일(컨벤션) 기준
    final mon = DateTime(now.year, now.month, now.day).subtract(Duration(days: now.weekday - 1));
    final sun = mon.add(const Duration(days: 7));
    // 만근 = 실제 출근(출근·지각·조퇴)만 · 아직 시작 안 한 확정 건은 '예정 N'으로 따로
    final perSite = <String, int>{};
    final perSiteFuture = <String, int>{};
    for (final e in work) {
      if (e.$1.start.isBefore(mon) || !e.$1.start.isBefore(sun)) continue;
      if (e.$1.start.isAfter(now)) {
        perSiteFuture[e.$1.site] = (perSiteFuture[e.$1.site] ?? 0) + 1;
        continue;
      }
      final s = effStatus(e.$1, e.$2);
      if (s == 'ok' || s == 'late' || s == 'early') perSite[e.$1.site] = (perSite[e.$1.site] ?? 0) + 1;
    }
    final weekSites = {...perSite.keys, ...perSiteFuture.keys};
    final weekLine = weekSites.isEmpty
        ? ''
        : '이번 주 · ${weekSites.map((site) {
            final limit = weeklyLimitOf(site);
            final n = perSite[site] ?? 0, f = perSiteFuture[site] ?? 0;
            return '${site.split(' ').first} $n/$limit일${n >= limit ? ' 만근' : ''}${f > 0 ? ' · 예정 $f' : ''}';
          }).join(' · ')}';

    String stLabel(String s) => switch (s) {
          'ok' => '출근',
          'late' => '지각',
          'early' => '조퇴',
          'runaway' => '무단이탈',
          'absent' || 'none' => '결근',
          _ => '출근 전',
        };

    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 16, 6),
            child: Row(children: [
              InkWell(
                onTap: () => Navigator.of(context).pop(),
                borderRadius: BorderRadius.circular(10),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  child: Text('‹', style: TextStyle(fontSize: 26, color: JColors.blue, height: 1)),
                ),
              ),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(name,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.4, color: JColors.ink)),
                InkWell(
                  onTap: () => callPhone(context, m.phone),
                  borderRadius: BorderRadius.circular(6),
                  child: Text('${m.phone} · 전화',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.blue)),
                ),
              ]),
            ]),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
              children: [
                jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text.rich(TextSpan(children: [
                    TextSpan(text: m.label,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                    if (warns + appWarningsOf(name) > 0)
                      TextSpan(text: '  ·  경고 ${warns + appWarningsOf(name)}회',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700,
                              color: warns + appWarningsOf(name) >= 2 ? JColors.red : JColors.amber)),
                    if (isNegotiation(name))
                      TextSpan(text: m.neg ? '  ·  협의대상' : '  ·  협의대상 (경고 3회 자동)',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: JColors.red)),
                  ])),
                  // 이번 주 동일 근무지 출근 횟수 — 택배 주 4일 제한(정책 v1.1) · 주휴수당 참고
                  if (weekLine.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(weekLine, style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                  ],
                  const SizedBox(height: 8),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text.rich(TextSpan(children: [
                      TextSpan(text: '${won(balance)}P ',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: JColors.ink,
                              fontFeatures: [FontFeature.tabularFigures()])),
                      const TextSpan(text: '보유', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.muted)),
                    ])),
                    Text('누적 근무 $attended회', style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
                  ]),
                ])),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(child: jPill('1:1 대화', bg: JColors.blue, fg: Colors.white, onTap: () =>
                      Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => InquiryChatPage(name: name, initial: inq?.msgs ?? const []))))),
                  const SizedBox(width: 7),
                  Expanded(child: jPill('포인트 지급', bg: Colors.white, fg: JColors.green, border: JColors.green,
                      onTap: () => openGrantSheet(context, name).then((_) { if (mounted) setState(() {}); }))),
                  const SizedBox(width: 7),
                  Expanded(child: jPill('포인트 회수', bg: Colors.white, fg: JColors.red, border: JColors.red,
                      onTap: () => openRecoverSheet(context, name: name).then((_) { if (mounted) setState(() {}); }))),
                ]),
                const SizedBox(height: 7),
                // 경고 부여 — 관리자 재량 · 3회 누적 시 협의대상 자동 (앱 부여 확정 2026-08-30)
                jPill('경고 부여 · ${totalWarningsOf(name)}회 누적',
                    bg: Colors.white, fg: JColors.amber, border: JColors.amber,
                    onTap: () => openWarnSheet(context, name).then((_) { if (mounted) setState(() {}); })),
                if (gWarnings.any((w) => w.name == name)) ...[
                  jSect('경고 이력 (앱) · ${appWarningsOf(name)}회'),
                  jCard(Column(children: [
                    for (final (i, w) in gWarnings.where((w) => w.name == name).toList().reversed.indexed) ...[
                      if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
                      Row(children: [
                        Expanded(
                          child: Text.rich(TextSpan(children: [
                            TextSpan(text: '${w.reason}  ',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700,
                                    color: w.reverted ? JColors.inactive : JColors.ink,
                                    decoration: w.reverted ? TextDecoration.lineThrough : null)),
                            TextSpan(text: '${w.memo.isEmpty ? '' : '${w.memo} · '}${w.by} · ${hmOf(w.at)}',
                                style: const TextStyle(fontSize: 11, color: JColors.muted)),
                          ])),
                        ),
                        if (!w.reverted)
                          InkWell(
                            onTap: () {
                              setState(() => w.reverted = true);
                              audit('warning', name, '경고 취소 · ${w.reason}');
                              jSnack(context, '경고 취소 · 현재 ${totalWarningsOf(name)}회');
                            },
                            borderRadius: BorderRadius.circular(6),
                            child: const Padding(
                              padding: EdgeInsets.all(4),
                              child: Text('취소', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.blue)),
                            ),
                          ),
                      ]),
                    ],
                  ])),
                ],
                if (m.neg)
                  const Padding(
                    padding: EdgeInsets.only(top: 8, left: 2),
                    child: Text('협의대상 해제는 마스터 전용 (PC 관리자 웹)', style: TextStyle(fontSize: 11, color: JColors.inactive)),
                  ),
                jSect('근무 내역 · ${work.length}건'),
                if (work.isEmpty)
                  jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('근무 기록 없음', style: TextStyle(fontSize: 12, color: JColors.inactive))))),
                if (work.isNotEmpty)
                  jCard(Column(children: [
                    for (var i = 0; i < work.length && i < 20; i++) ...[
                      if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
                      () {
                        final (j, w) = work[i];
                        final s = effStatus(j, w);
                        final isEnded = now.isAfter(j.end);
                        final active = !isEnded && now.isAfter(j.start);
                        // 근무 내역엔 출결만 (포인트는 아래 '포인트 내역'에서)
                        final right = active
                            ? ('진행 중', JColors.blue)
                            : !isEnded
                                ? ('예정', JColors.inactive)
                                : (stLabel(s),
                                    s == 'ok' || s == 'late' ? JColors.green : (s == 'early' ? JColors.amber : JColors.red));
                        return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text('${j.dateLabel}  ${j.site.split(' ').first} ${j.slot}',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: JColors.ink)),
                          Text(right.$1,
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: right.$2,
                                  fontFeatures: const [FontFeature.tabularFigures()])),
                        ]);
                      }(),
                    ],
                  ])),
                jSect('포인트 내역 · ${pts.length}건'),
                if (pts.isEmpty)
                  jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text('내역 없음', style: TextStyle(fontSize: 12, color: JColors.inactive))))),
                if (pts.isNotEmpty)
                  jCard(Column(children: [
                    for (var i = 0; i < pts.length && i < 20; i++) ...[
                      if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Expanded(
                          child: Text('${pts[i].$1.month}/${pts[i].$1.day}  ${pts[i].$2}',
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, color: JColors.ink)),
                        ),
                        Text('${pts[i].$3 > 0 ? '+' : '−'}${won(pts[i].$3.abs())}P',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800,
                                color: pts[i].$3 > 0 ? JColors.green : JColors.red,
                                fontFeatures: const [FontFeature.tabularFigures()])),
                      ]),
                    ],
                  ])),
                if (gWorkerNotes.any((n) => n.name == name)) ...[
                  jSect('알바생에게 전달된 안내 · ${gWorkerNotes.where((n) => n.name == name).length}건'),
                  jCard(Column(children: [
                    for (final (i, n) in gWorkerNotes.where((n) => n.name == name).toList().reversed.indexed) ...[
                      if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(n.text, style: const TextStyle(fontSize: 12.5, color: JColors.muted, height: 1.45)),
                        const SizedBox(height: 2),
                        Text('${n.jobRef} · ${hmOf(n.at)} · 앱 팝업으로 전송됨',
                            style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
                      ]),
                    ],
                  ])),
                ],
                const Padding(
                  padding: EdgeInsets.only(top: 10, left: 2),
                  child: Text('경고 이력 상세·협의대상 해제·출금 처리는 PC 관리자 웹에서',
                      style: TextStyle(fontSize: 11, color: JColors.inactive)),
                ),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

// ═══════════ 내정보 탭 ═══════════
class MePage extends StatefulWidget {
  final Admin admin;
  final VoidCallback onLogout;
  const MePage({super.key, required this.admin, required this.onLogout});
  @override
  State<MePage> createState() => _MePageState();
}

class _MePageState extends State<MePage> {
  bool alarmOn = true;

  @override
  Widget build(BuildContext context) {
    final a = widget.admin;
    final sites = a.sites ?? allSites;
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          jHeader('내 정보', ''),
          jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(a.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
            const SizedBox(height: 2),
            Text('${a.roleLabel} · 010-1234-5678', style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
          ])),
          jSect(a.sites == null ? '근무지 범위 · 전 근무지 (${sites.length}곳)' : '담당 근무지 · ${sites.length}곳'),
          jCard(Column(children: [
            for (var i = 0; i < sites.length; i++) ...[
              if (i > 0) const Divider(height: 16, thickness: .5, color: JColors.hairline),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(sites[i],
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.ink)),
              ),
            ],
          ])),
          jSect('권한'),
          jCard(Column(children: [
            _kvRow('공고 등록', a.isA1 ? '가능' : '불가 (마스터·1등급 전용)'),
            const Divider(height: 16, thickness: .5, color: JColors.hairline),
            _kvRow('포인트 지급 한도', a.isA1 ? '5,000P' : '3,000P'),
            const Divider(height: 16, thickness: .5, color: JColors.hairline),
            _kvRow('포인트 회수 한도', a.isA1 ? '무제한' : '3,000P'),
          ])),
          // 내 처리 로그 — 내가 누른 결정 전부 (감사 기록)
          jSect('내 처리 로그 · ${gAudit.where((e) => e.by == a.name).length}건'),
          if (gAudit.where((e) => e.by == a.name).isEmpty)
            jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('아직 처리한 건이 없어요', style: TextStyle(fontSize: 12, color: JColors.inactive))))),
          if (gAudit.where((e) => e.by == a.name).isNotEmpty)
            jCard(Column(children: [
              for (final (i, e) in gAudit.reversed.where((e) => e.by == a.name).take(15).toList().indexed) ...[
                if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(
                    width: 74,
                    child: Text(hmOf(e.at),
                        style: const TextStyle(fontSize: 11, color: JColors.inactive,
                            fontFeatures: [FontFeature.tabularFigures()])),
                  ),
                  Expanded(
                    child: Text.rich(TextSpan(children: [
                      TextSpan(text: '${auditTypeLabel(e.type)}  ',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                              color: e.reverted ? JColors.inactive : JColors.ink,
                              decoration: e.reverted ? TextDecoration.lineThrough : null)),
                      TextSpan(text: '${e.name} ${e.detail}${e.reverted ? ' (되돌림)' : ''}',
                          style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                    ]), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ),
                ]),
              ],
            ])),
          jSect('설정'),
          jCard(Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('인원 부족 알림', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: JColors.ink)),
              SizedBox(height: 1),
              Text('근무 시작 후 미출근 발생 시 푸시', style: TextStyle(fontSize: 11, color: JColors.muted)),
            ]),
            Switch(
              value: alarmOn,
              activeTrackColor: JColors.blue,
              onChanged: (v) {
                setState(() => alarmOn = v);
                jSnack(context, v ? '인원 부족 알림 켜짐' : '인원 부족 알림 꺼짐');
              },
            ),
          ])),
          jSect('자주 쓰는 문구 · ${gMsgTemplates.length}개 — 공지·회수 사유에서 골라 쓰기'),
          jCard(Column(children: [
            for (final (i, t) in gMsgTemplates.indexed) ...[
              if (i > 0) const Divider(height: 14, thickness: .5, color: JColors.hairline),
              Row(children: [
                Expanded(child: Text(t, style: const TextStyle(fontSize: 12.5, color: JColors.ink, height: 1.45))),
                InkWell(
                  onTap: () => setState(() => gMsgTemplates.removeAt(i)),
                  borderRadius: BorderRadius.circular(6),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Text('삭제', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.red)),
                  ),
                ),
              ]),
            ],
            if (gMsgTemplates.isNotEmpty) const Divider(height: 14, thickness: .5, color: JColors.hairline),
            InkWell(
              onTap: _addTemplate,
              borderRadius: BorderRadius.circular(6),
              child: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Align(alignment: Alignment.centerLeft,
                    child: Text('＋ 문구 추가', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: JColors.blue))),
              ),
            ),
          ])),
          const SizedBox(height: 14),
          jPill('로그아웃', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: widget.onLogout),
        ],
      ),
    );
  }

  Future<void> _addTemplate() async {
    final c = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('문구 추가', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: TextField(
          controller: c, autofocus: true, maxLines: 3, maxLength: 200,
          style: const TextStyle(fontSize: 14, color: JColors.ink),
          decoration: const InputDecoration(hintText: '예: 내일 새벽 4시 통근버스 탑승 확인 부탁드려요'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx),
              child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
          TextButton(onPressed: () => Navigator.pop(ctx, true),
              child: const Text('추가', style: TextStyle(color: JColors.blue, fontWeight: FontWeight.w800))),
        ],
      ),
    );
    if (ok == true && c.text.trim().isNotEmpty && mounted) setState(() => gMsgTemplates.add(c.text.trim()));
  }

  Widget _kvRow(String k, String v) => Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(k, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: JColors.muted)),
        Text(v, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: JColors.ink)),
      ]);
}

  // 공고 등록 (1등급 전용) — 근무지·날짜·시간대·인원·일급·포인트
// ─── 공고 등록 시트 (1등급 전용) — 공고 탭·일정 탭 공용 ───
Future<bool> openRegisterSheet(BuildContext context, {Set<DateTime>? preselected}) async {
  var changed = false;
    String site = allSites.first;
    final picked = <DateTime>{...?preselected};
    var month = (preselected != null && preselected.isNotEmpty)
        ? DateTime(preselected.first.year, preselected.first.month)
        : DateTime(DateTime.now().year, DateTime.now().month);
    var start = const TimeOfDay(hour: 8, minute: 0); // 시간 직접 설정
    var end = const TimeOfDay(hour: 17, minute: 0);
    int cap = 8;
    String tpl = 'A';
    final descCtrl = TextEditingController(text: templateBody('A'));
    String tod(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    String slotLabel(TimeOfDay s) => (s.hour >= 20 || s.hour < 5) ? '야간' : (s.hour >= 11 ? '오후' : '주간');
    // 근무지·시간대에 맞는 템플릿 자동 선택 (CJ→A, 롯데→B, 웨딩→C, 야간→D, 컨벤션 그 외→E)
    // — 관리자가 내용을 직접 고친 상태면 덮어쓰지 않음
    void autoTpl() {
      final body = _defaultDesc(site, slotLabel(start));
      final cur = descCtrl.text.trim();
      final untouched = cur.isEmpty || jobTemplates.any((t) => t.body == cur);
      if (!untouched) return;
      descCtrl.text = body;
      tpl = jobTemplates.where((t) => t.body == body).firstOrNull?.key ?? tpl;
    }
    final wageCtrl = TextEditingController(text: '110000');
    final pointCtrl = TextEditingController(text: '1000');

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        Widget chips<T>(List<(T, String)> opts, T cur, void Function(T) set) => Wrap(
              spacing: 7,
              children: opts
                  .map((o) => InkWell(
                        onTap: () => setSheet(() => set(o.$1)),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
                          decoration: BoxDecoration(
                            color: cur == o.$1 ? JColors.ink : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                                color: cur == o.$1 ? JColors.ink : JColors.hairline, width: cur == o.$1 ? 1 : .8),
                          ),
                          child: Text(o.$2,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                                  color: cur == o.$1 ? Colors.white : JColors.ink)),
                        ),
                      ))
                  .toList(),
            );
        Widget label(String t) => Padding(
            padding: const EdgeInsets.only(top: 13, bottom: 6),
            child: Text(t, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)));

        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                const Text('공고 등록',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
                const SizedBox(height: 2),
                const Text('등록하면 알바생 앱에 바로 게시돼요 · 마스터·1등급 전용',
                    style: TextStyle(fontSize: 11.5, color: JColors.muted)),
                label('근무지'),
                chips(allSites.map((s) => (s, s.split(' ').first)).toList(), site, (v) {
                  site = v;
                  autoTpl();
                }),
                label('날짜 — 여러 날 선택 가능 (${picked.length}일 선택)'),
                _JobListPageState._calendar(ctx, month, picked, setSheet, (m) => month = m),
                label('시간 — 직접 설정'),
                Row(children: [
                  Expanded(child: _JobListPageState._timeBox(ctx, '시작', tod(start), () async {
                    final t = await showTimePicker(context: ctx, initialTime: start);
                    if (t != null) setSheet(() => start = t);
                  })),
                  const SizedBox(width: 8),
                  Expanded(child: _JobListPageState._timeBox(ctx, '종료', tod(end), () async {
                    final t = await showTimePicker(context: ctx, initialTime: end);
                    if (t != null) setSheet(() => end = t);
                  })),
                ]),
                const SizedBox(height: 8),
                chips(
                    const [
                      ((8, 17), '주간 08–17'),
                      ((22, 6), '야간 22–06'),
                      ((11, 19), '오후 11–19'),
                    ],
                    (start.hour, end.hour),
                    (v) {
                      start = TimeOfDay(hour: v.$1, minute: 0);
                      end = TimeOfDay(hour: v.$2, minute: 0);
                      autoTpl(); // 야간이면 D 템플릿으로
                    }),
                label('모집 인원'),
                Row(children: [
                  _JobListPageState._stepBtn('−', () => setSheet(() => cap = (cap - 1).clamp(1, 50))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text('$cap명',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink,
                            fontFeatures: [FontFeature.tabularFigures()])),
                  ),
                  _JobListPageState._stepBtn('＋', () => setSheet(() => cap = (cap + 1).clamp(1, 50))),
                ]),
                label('일급 (원 · 파트너사 지급)'),
                TextField(controller: wageCtrl, keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 14, color: JColors.ink),
                    decoration: const InputDecoration(isDense: true)),
                label('포인트 (P · 잡핏 지급, 기본 1,000)'),
                TextField(controller: pointCtrl, keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 14, color: JColors.ink),
                    decoration: const InputDecoration(isDense: true)),
                label('공고 내용 — 템플릿 불러오기 (수정 가능)'),
                chips(jobTemplates.map((t) => (t.key, '${t.key} ${t.title}')).toList(), tpl, (v) {
                  tpl = v;
                  descCtrl.text = templateBody(v);
                }),
                const SizedBox(height: 8),
                TextField(
                  controller: descCtrl,
                  maxLines: 5,
                  style: const TextStyle(fontSize: 12.5, color: JColors.ink, height: 1.5),
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: '업무 · 준비물 · 특이사항',
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: JColors.hairline)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 42, width: double.infinity,
                  child: jPill(picked.isEmpty ? '날짜를 선택하세요' : '${picked.length}건 등록하기',
                      bg: picked.isEmpty ? const Color(0xFFC7C7CC) : JColors.blue, fg: Colors.white, onTap: () {
                    if (picked.isEmpty) return;
                    final label = slotLabel(start);
                    final dates = picked.toList()..sort();
                    for (final d in dates) {
                      final s = DateTime(d.year, d.month, d.day, start.hour, start.minute);
                      var e = DateTime(d.year, d.month, d.day, end.hour, end.minute);
                      if (!e.isAfter(s)) e = e.add(const Duration(days: 1)); // 야간 = 다음날 종료
                      gJobs.add(Job(site, label, '모집중', s, e, cap, 0, cap,
                          desc: descCtrl.text.trim(), point: int.tryParse(pointCtrl.text.trim()) ?? 1000));
                    }
                    Navigator.pop(ctx);
                    changed = true;
                    jSnack(context, '공고 ${dates.length}건 등록 완료 — 알바생 앱에 게시됐어요');
                  }),
                ),
              ]),
            ),
          ),
        );
      }),
    );

  return changed;
}

// ─── 포인트 회수 시트 — 근무자 검색 → 금액(1,000P 단위, 권한별 한도) → 메시지(필수, 알바생에게 전달) ───
Future<void> openRecoverSheet(BuildContext context, {String? name, String? jobRef}) async {
  final admin = gAdmin;
  final int? limit = (admin == null || admin.isA1) ? null : 3000; // 기획 §6-4: 1급 무제한 / 2급 3,000P
  String? picked = name;
  final q = TextEditingController();
  final memo = TextEditingController();
  int amount = 1000;

  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
    builder: (ctx) => StatefulBuilder(builder: (ctx, setS) {
      Widget title(String t, String s) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
            const SizedBox(height: 2),
            Text(s, style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.45)),
          ]);

      List<Widget> body;
      if (picked == null) {
        // 1단계 — 근무자 검색
        final kw = q.text.trim();
        final list = mockMembers.where((m) => kw.isEmpty || m.name.contains(kw) || m.phone.contains(kw)).toList();
        body = [
          title('포인트 회수 — 근무자 검색', '이름 또는 전화번호로 찾아 선택하세요'),
          const SizedBox(height: 11),
          TextField(
            controller: q,
            autofocus: true,
            onChanged: (_) => setS(() {}),
            style: const TextStyle(fontSize: 14, color: JColors.ink),
            decoration: const InputDecoration(hintText: '이름 · 전화번호'),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 260,
            child: ListView(children: [
              for (final m in list)
                InkWell(
                  onTap: () => setS(() => picked = m.name),
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text.rich(TextSpan(children: [
                        TextSpan(text: m.name,
                            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                        TextSpan(text: '  ${m.phone}', style: const TextStyle(fontSize: 10.5, color: JColors.inactive)),
                      ])),
                      Text('보유 ${balanceOf(m.name).toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (x) => '${x[1]},')}P',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
                    ]),
                  ),
                ),
            ]),
          ),
        ];
      } else {
        // 2단계 — 금액 + 메시지. 출금 요청 대기 중인 포인트는 회수 불가(보호)
        final bal = balanceOf(picked!);
        final protect = memberOf(picked!).pendingWithdraw;
        final avail = (bal - protect).clamp(0, bal);
        final maxAmt = [avail, ?limit].reduce((a, b) => a < b ? a : b);
        if (amount > maxAmt) amount = (maxAmt ~/ 1000) * 1000;
        final canSubmit = amount >= 1000 && memo.text.trim().isNotEmpty;
        String won(int v) => v.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (x) => '${x[1]},');
        body = [
          title('$picked 포인트 회수',
              '보유 ${won(bal)}P${protect > 0 ? ' · 출금 대기 ${won(protect)}P 보호 → 회수 가능 ${won(avail)}P' : ''} · 회수 한도 ${limit == null ? '무제한 (1등급)' : '${won(limit)}P (2등급)'}${jobRef != null ? '\n관련 근무: $jobRef' : ''}'),
          const SizedBox(height: 12),
          const Text('회수 금액', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
          const SizedBox(height: 6),
          Row(children: [
            _JobListPageState._stepBtn('−', () => setS(() => amount = (amount - 1000).clamp(1000, maxAmt < 1000 ? 1000 : maxAmt))),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text('${won(amount)}P',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: JColors.red,
                      fontFeatures: [FontFeature.tabularFigures()])),
            ),
            _JobListPageState._stepBtn('＋', () => setS(() => amount = (amount + 1000).clamp(1000, maxAmt < 1000 ? 1000 : maxAmt))),
            const Spacer(),
            for (final a in [1000, 3000, 5000])
              if (a <= maxAmt)
                Padding(
                  padding: const EdgeInsets.only(left: 5),
                  child: InkWell(
                    onTap: () => setS(() => amount = a),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                      decoration: BoxDecoration(
                          color: amount == a ? JColors.ink : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: amount == a ? JColors.ink : JColors.hairline)),
                      child: Text('${a ~/ 1000}천',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                              color: amount == a ? Colors.white : JColors.ink)),
                    ),
                  ),
                ),
          ]),
          const SizedBox(height: 12),
          const Text('회수 사유 — 알바생에게 그대로 전달돼요 (필수)',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
          const SizedBox(height: 6),
          TextField(
            controller: memo,
            autofocus: true,
            maxLines: 3,
            maxLength: 200,
            onChanged: (_) => setS(() {}),
            style: const TextStyle(fontSize: 13, color: JColors.ink, height: 1.5),
            decoration: InputDecoration(
              isDense: true,
              hintText: '예: 8/24 곤지암 주간 40분 지각 — 사전 연락 없어 포인트 1,000P 회수합니다',
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: JColors.hairline)),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: InkWell(
              onTap: () => openTemplatePicker(ctx).then((t) { if (t != null) setS(() => memo.text = t); }),
              borderRadius: BorderRadius.circular(6),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Text('자주 쓰는 문구', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.blue)),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Row(children: [
            Expanded(
              child: jPill('다른 사람', bg: Colors.white, fg: JColors.muted, border: JColors.muted,
                  onTap: () => setS(() => picked = null)),
            ),
            const SizedBox(width: 7),
            Expanded(
              flex: 2,
              child: jPill('${won(amount)}P 회수 · 메시지 전송',
                  bg: canSubmit ? JColors.red : const Color(0xFFC7C7CC), fg: Colors.white, onTap: () async {
                if (!canSubmit) return;
                if (amount > 50000) {
                  final go = await showDialog<bool>(
                    context: ctx,
                    builder: (d) => AlertDialog(
                      backgroundColor: Colors.white,
                      surfaceTintColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                      title: const Text('5만P 초과 회수', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink)),
                      content: Text('${won(amount)}P를 회수합니다. 맞나요?', style: const TextStyle(fontSize: 12.5, color: JColors.muted)),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(d), child: const Text('취소', style: TextStyle(color: JColors.muted))),
                        TextButton(onPressed: () => Navigator.pop(d, true), child: const Text('회수', style: TextStyle(color: JColors.red, fontWeight: FontWeight.w800))),
                      ],
                    ),
                  );
                  if (go != true) return;
                }
                gRecoveries.add(Recovery(picked!, amount, memo.text.trim(), admin?.name ?? '관리자', jobRef ?? '', DateTime.now()));
                audit('point_recover', picked!, '−${won(amount)}P · ${memo.text.trim()}', jobRef: jobRef ?? '');
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
                jSnack(context, '$picked — ${won(amount)}P 회수 · 메시지를 알바생에게 보냈어요');
              }),
            ),
          ]),
        ];
      }

      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: body),
          ),
        ),
      );
    }),
  );
}
