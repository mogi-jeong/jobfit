// 잡핏 관리자 앱 — 현장용
// 디자인: 텍스트 온리 미니멀 (2026-08-04 확정)
// 데이터: 현재 Mock — 이후 Supabase 저장소로 교체 (repository 패턴)

import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
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
  const Job(this.site, this.slot, this.status, this.start, this.end, this.cap, this.ok, this.short,
      {this.id = '', this.desc = '', this.point = 1000});

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
String effStatus(Job j, Worker w) => gOverrides[jobKey(j)]?[w.name] ?? w.status;

// 퇴근 기록 (출결 상태와 별개) — jobKey → (이름 → 시각/방식, '' = 기록 취소)
final Map<String, Map<String, String>> gOut = {};
String? outOf(Job j, Worker w) {
  final v = gOut[jobKey(j)]?[w.name];
  if (v != null) return v.isEmpty ? null : v;
  return w.outTime;
}

// 종료 후 수동 처리 필요 인원 (출근/지각인데 퇴근 기록 없음 + 퇴근 승인 대기) — 종료 6시간 지나면 자동 처리로 간주
int manualCount(Job j) {
  final now = DateTime.now();
  if (!now.isAfter(j.end) || now.difference(j.end).inHours >= Policy.autoCheckoutHours) return 0;
  // 사람 기준으로 합산 (사유 제출자도 퇴근 기록이 없으므로 같은 사람 = 1명)
  final names = <String>{};
  for (final w in rosterOf(j)) {
    final s = effStatus(j, w);
    if ((s == 'ok' || s == 'late') && outOf(j, w) == null) names.add(w.name);
  }
  for (final r in gpsReqsOf(j)) {
    if (!gGpsDone.contains('${jobKey(j)}|${r.name}')) names.add(r.name);
  }
  return names.length;
}

bool needsManual(Job j) => manualCount(j) > 0;

// 같이하기 보너스 자격 — 짝꿍 둘 다 정시 출근(ok, 지각 X) + 정상 퇴근(반려 X)일 때만 (기획 §4-9 정책4)
bool buddyBonusEligible(Job j, Worker w) {
  final p = buddyOf(j, w.name);
  if (p == null) return false;
  final pw = rosterOf(j).where((x) => x.name == p).firstOrNull;
  if (pw == null) return false;
  bool onTime(Worker x) {
    final o = outOf(j, x);
    return effStatus(j, x) == 'ok' && o != null && !o.startsWith('반려');
  }
  return onTime(w) && onTime(pw);
}

// 포인트 자동 지급 대상 판정 — policy.dart 규칙 사용 (알바생 앱과 동일)
bool jobPointEligible(Job j, Worker w) {
  final o = outOf(j, w);
  return pointEligible(effStatus(j, w), o == null ? null : (o.startsWith('반려') ? CheckoutSource.rejected : CheckoutSource.manual));
}

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
          Text('한도 ${limit ~/ 1000},000P (${admin?.roleLabel ?? '관리자'})',
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
  jSnack(context, '$name — +${amount ~/ 1000},000P 지급 · 메시지 전송');
}

// ─── 공고 공지 — 공고별 · 확정자에게만 · 이후 확정되는 사람도 자동 수신 (→ Supabase notifications 교체 지점) ───
class JobNotice {
  final String jobKey, text, by;
  final DateTime at;
  final int sentTo; // 발송 당시 확정자 수
  const JobNotice(this.jobKey, this.text, this.by, this.at, this.sentTo);
}

final List<JobNotice> gNotices = [];
final List<(String, String, DateTime)> gNoticeLate = []; // (jobKey, 이름, 시각) — 확정 후 자동 수신 기록
List<JobNotice> noticesOf(String key) => gNotices.where((n) => n.jobKey == key).toList();

// 승인·직접추가로 확정되는 순간 호출 → 그 공고의 기존 공지를 자동 전달, 전달 건수 반환
int deliverNotices(String key, String name) {
  final n = noticesOf(key).length;
  if (n > 0) gNoticeLate.add((key, name, DateTime.now()));
  return n;
}

Future<void> openNoticeSheet(BuildContext context, Job job, int confirmed) async {
  final ctrl = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: const Text('공고 공지 발송',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${job.site} ${job.dateLabel} ${job.slot}\n대상: 확정자 $confirmed명 · 이후 확정되는 사람도 자동 수신\n22~08시엔 아침 8시에 발송돼요',
            style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
        const SizedBox(height: 8),
        TextField(
          controller: ctrl,
          autofocus: true,
          maxLines: 3,
          maxLength: 500,
          style: const TextStyle(fontSize: 14, color: JColors.ink),
          decoration: const InputDecoration(hintText: '예: 오늘 물량 많아요, 10분 일찍 와주세요'),
        ),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx),
            child: const Text('취소', style: TextStyle(color: JColors.muted, fontWeight: FontWeight.w600))),
        TextButton(onPressed: () => Navigator.pop(ctx, true),
            child: const Text('발송', style: TextStyle(color: JColors.blue, fontWeight: FontWeight.w800))),
      ],
    ),
  );
  if (ok != true || ctrl.text.trim().isEmpty || !context.mounted) return;
  gNotices.add(JobNotice(jobKey(job), ctrl.text.trim(), gAdmin?.name ?? '관리자', DateTime.now(), confirmed));
  jSnack(context, '공지 발송 · 확정 $confirmed명 (이후 확정자도 자동 수신)');
}

// GPS 영역 밖 퇴근 — 사유 검토 대기 (알바생 앱에서 제출 → 여기서 승인/반려)
class GpsReq {
  final String name, reason, dist, time;
  const GpsReq(this.name, this.reason, this.dist, this.time);
}



// ─── 가입 알바생 풀 Mock (직접 추가 검색용 → Supabase workers 교체 지점) ───
class Member {
  final String name, phone, label;
  final bool neg; // 협의대상
  const Member(this.name, this.phone, this.label, [this.neg = false]);
}


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
              0 => JobListPage(admin: widget.admin),
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
  const JobListPage({super.key, required this.admin});
  @override
  State<JobListPage> createState() => _JobListPageState();
}

class _JobListPageState extends State<JobListPage> {
  String view = 'today'; // today | past
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
                              '${widget.admin.sites == null ? '전 근무지' : '담당 ${widget.admin.sites!.length} 근무지'} · 진행 ${jobs.where((j) => DateTime.now().isAfter(j.start)).length} · 24시간 내 시작 ${jobs.where((j) => !DateTime.now().isAfter(j.start)).length}',
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
          // [오늘] [지난] 전환
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(color: const Color(0xFFE8E8ED), borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              for (final v in const [('today', '24시간'), ('upcoming', '예정'), ('past', '종료')])
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
            ..._todayList()
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
  List<Widget> _todayList() {
    final now = DateTime.now();
    final active = jobs.where((j) => now.isAfter(j.start)).toList();
    final soon = jobs.where((j) => !now.isAfter(j.start)).toList();
    if (active.isEmpty && soon.isEmpty) return [_emptyCard('24시간 안에 진행·시작하는 공고가 없어요')];
    Widget head(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 7, left: 2, top: 4),
        child: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: JColors.muted)));
    return [
      if (active.isNotEmpty) head('진행 중 · ${active.length}'),
      ...active.map((j) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _JobCard(job: j))),
      if (soon.isNotEmpty) head('앞으로 24시간 · ${soon.length}'),
      ...soon.map((j) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _JobCard(job: j))),
    ];
  }

  List<Widget> _pastList() => _grouped(pastJobs, '종료된 공고가 없어요');

  static Widget _emptyCard(String msg) => jCard(Center(
      child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Text(msg, style: const TextStyle(fontSize: 12, color: JColors.inactive)))));

  // 날짜별 그룹 리스트 (예정·지난 공통)
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
    final short = job.short > 0;
    final started = now.isAfter(job.start);
    final ended = now.isAfter(job.end);

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
                    text: '${job.ok} / ${job.cap} ',
                    style: const TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w800, color: JColors.ink,
                        fontFeatures: [FontFeature.tabularFigures()])),
                const TextSpan(text: '출근', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.muted)),
              ])),
              // 시작 전엔 '부족'(모집), 시작 후엔 '미출근'(출결) — 단어 구분
              ended
                  ? (manualCount(job) > 0
                      ? Text('퇴근 미처리 ${manualCount(job)}명',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.amber))
                      : const Text('근무 완료',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.inactive)))
                  : started
                      ? Text(short ? '${job.short}명 미출근 · 확인해주세요' : '이상 없음',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                              color: short ? JColors.red : JColors.green))
                      : Text(
                          (short ? '${job.short}명 부족' : '충원 완료') +
                              (waitlistOf(job).isNotEmpty ? ' · 대기 ${waitlistOf(job).length}' : ''),
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                              color: short ? JColors.red : JColors.green)),
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
  String? outOf_(Worker w) {
    final v = outs[w.name];
    if (v != null) return v.isEmpty ? null : v;
    return w.outTime;
  }

  // 포인트 자동 지급 대상 = 정상 출근(출근·지각) + 정상 퇴근 기록(반려 제외). 조퇴·이탈·결근은 자동 지급 없음
  bool _eligible(Worker w) {
    final s = statusOf(w);
    final o = outOf_(w);
    return (s == 'ok' || s == 'late') && o != null && !o.startsWith('반려');
  }
  final List<Worker> extWorkers = []; // 외부인력 (기획안: 외부 구인)
  final List<Worker> invited = []; // 직접 추가한 가입 알바생 (기획안 §5-3, 즉시 승인)
  late final List<GpsReq> gpsReqs = List.of(gpsReqsOf(widget.job)
      .where((r) => !gGpsDone.contains('${jobKey(widget.job)}|${r.name}'))); // 퇴근 승인 대기 (처리분 제외)
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

  String statusOf(Worker w) => overrides[w.name] ?? w.status;
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

  void mark(String name, String s) {
    setState(() {
      overrides[name] = s;
      // 퇴근 기록은 별개 — 조퇴·이탈은 이미 떠난 것이라 기록 자동, 결근·미도착이면 기록 제거
      if (s == 'early') outs[name] = '조퇴';
      if (s == 'runaway') outs[name] = '이탈';
      if (s == 'absent' || s == 'none') outs[name] = '';
    });
    snack('$name — ${_stMeta(s).$1} 처리');
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
            if (statusEditable) ...[
              const SizedBox(height: 13),
              Wrap(spacing: 7, runSpacing: 7, children: [
                for (final s in const ['ok', 'late', 'early', 'runaway', 'absent']) _stChip(ctx, w, s),
              ]),
              // 퇴근 기록 — 출결 상태와 별개로 켜고 끔 (출근·지각일 때만 의미 있음)
              if (statusOf(w) == 'ok' || statusOf(w) == 'late') ...[
                const SizedBox(height: 10),
                _pill(
                    outOf_(w) == null ? '퇴근 처리 (기록 없음)' : '퇴근 기록 취소 · 현재 ${outOf_(w)}',
                    bg: outOf_(w) == null ? JColors.amber : Colors.white,
                    fg: outOf_(w) == null ? Colors.white : JColors.muted,
                    border: outOf_(w) == null ? null : JColors.muted, onTap: () {
                  Navigator.pop(ctx);
                  final had = outOf_(w) != null;
                  setState(() => outs[w.name] = had ? '' : '수동');
                  snack('${w.name} — ${had ? '퇴근 기록 취소' : '퇴근 처리'}');
                }),
              ],
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
                setState(() {
                  invited.removeWhere((e) => e.name == w.name);
                  overrides.remove(w.name);
                });
                snack('${w.name} — 배정을 취소했어요');
              }),
            ],
            const SizedBox(height: 4),
          ]),
        ),
      ),
    );
  }

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
    final base = rosterOf(widget.job);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        final q = ctrl.text.trim();
        final list = mockMembers.where((m) => q.isEmpty || m.name.contains(q)).toList();

        void doAdd(Member m) {
          Navigator.pop(ctx);
          setState(() => invited.add(Worker(m.name, 'none')));
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
                    final booked = base.any((w) => w.name == m.name) || isInvited(m.name);
                    final (right, rightColor) = booked
                        ? ('이미 배정', JColors.inactive)
                        : m.neg
                            ? ('협의대상', JColors.red)
                            : (m.label, JColors.muted);
                    return InkWell(
                      onTap: booked
                          ? null
                          : m.neg
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
    final base = rosterOf(widget.job);

    // 상태별로 완전히 다른 페이지 내용
    final content = ended
        ? _endedContent(base)
        : started
            ? _activeContent(base)
            : _upcomingContent(base, now);
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
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${job.site} · ${job.slot}',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.4, color: JColors.ink)),
                  Text('${job.dateLabel} · ${job.timeLabel}',
                      style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                ]),
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
      return (s == 'ok' || s == 'late') && outOf_(w) == null; // 지금 현장에 있는 인원 (퇴근자 제외)
    }).length;
    final short = widget.job.cap - okCount;

    return [
      _card(Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _bigCount(okCount, widget.job.cap, '출근'),
          Text(none.isEmpty ? '전원 처리' : '${none.length}명 미도착',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                  color: none.isEmpty ? JColors.green : JColors.red)),
        ],
      )),
      if (short > 0) ...[
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _pill('알바생 추가', bg: JColors.blue, fg: Colors.white, onTap: _inviteSheet)),
          const SizedBox(width: 7),
          Expanded(child: _pill('외부인력 추가', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: addExternal)),
        ]),
      ],
      ..._gpsSection(),
      ..._waitSection(),
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
                  const Text('미도착', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.inactive)),
                ]),
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
        _sect('처리됨 · ${done.length}명 — 눌러서 정정'),
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
    final short = widget.job.cap - filled;
    final roster = members.map((w) => Worker(w.name, 'wait')).toList()
      ..sort((a, b) => a.name.compareTo(b.name));

    return [
      _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _bigCount(filled, widget.job.cap, '확정'),
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
      ])),
      if (short > 0) ...[
        const SizedBox(height: 12),
        _sect('모집 · $short명 더 필요해요'),
        Row(children: [
          Expanded(child: _pill('알바생 추가', bg: JColors.blue, fg: Colors.white, onTap: _inviteSheet)),
          const SizedBox(width: 7),
          Expanded(child: _pill('외부인력', bg: Colors.white, fg: JColors.blue, border: JColors.blue, onTap: addExternal)),
          const SizedBox(width: 7),
          Expanded(child: _pill('긴급 알림', bg: Colors.white, fg: JColors.blue, border: JColors.blue,
              onTap: () => snack('긴급 구인 알림 발송 (동의자 대상)'))),
        ]),
      ],
      ..._waitSection(),
      const SizedBox(height: 12),
      _sect('확정 명단 · ${roster.length}명'),
      if (roster.isEmpty)
        _card(const Center(
            child: Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('아직 확정된 인원이 없어요', style: TextStyle(fontSize: 12, color: JColors.inactive)),
        )))
      else
        _rosterCard(roster, onTap: (w) => openWorker(context, w.name)), // 시작 전엔 이름 탭 → 프로필
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
      // 6시간 지나 자동 처리된 뒤에도 사유가 남아 있으면 그것만 따로
      if (pending.isEmpty) ..._gpsSection(),
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
        _sect('${pending.isEmpty ? '최종' : '처리된'} 명단 · ${done.length}명 — 눌러서 정정'),
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
    final late = gNoticeLate.where((e) => e.$1 == key).map((e) => e.$2).toSet().toList();
    if (!canSend && list.isEmpty) return const [];
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
    ];
  }

  // ── 대기열 (FULL 시 줄서기, 모집×2까지) — 자리 나면 1번에게 자동 제안 ──
  List<Widget> _waitSection() {
    final rows = waitlistOf(widget.job);
    if (rows.isEmpty) return const [];
    final now = DateTime.now();
    String fmt(Duration d) {
      final h = d.inHours, m = d.inMinutes % 60, s = d.inSeconds % 60;
      final ss = s.toString().padLeft(2, '0');
      return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:$ss' : '$m:$ss';
    }

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
                right = '시간 초과 · 다음 대기자로';
                color = JColors.inactive;
              } else {
                right = '자리 제안 중 · ${fmt(left)}';
                color = left.inMinutes < 5 ? JColors.red : JColors.amber;
              }
            } else {
              right = '대기 중';
              color = JColors.inactive;
            }
            return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              InkWell(
                onTap: () => openWorker(context, r.name),
                borderRadius: BorderRadius.circular(6),
                child: Text('${r.order}번  ${r.name}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: JColors.ink)),
              ),
              Text(right,
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color,
                      fontFeatures: const [FontFeature.tabularFigures()])),
            ]);
          }(),
        ],
      ])),
      const Padding(
        padding: EdgeInsets.only(top: 6, left: 2),
        child: Text('자리가 나면 1번에게 자동 제안 · 수락 제한 24시간 전 2시간 / 이내 30분 · 전원 실패 시 일반 모집 재개',
            style: TextStyle(fontSize: 11, color: JColors.inactive)),
      ),
    ];
  }

  // ── 퇴근 승인 대기 (GPS 영역 밖 사유 검토) — 사용자 결정 2026-08-24: 앱 포함 ──
  List<Widget> _gpsSection() {
    if (gpsReqs.isEmpty) return const [];
    return [
      const SizedBox(height: 12),
      _sect('퇴근 승인 대기 · ${gpsReqs.length}명'),
      ...gpsReqs.map((r) => Padding(
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
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                      child: _pill('승인 · 퇴근 인정', bg: JColors.blue, fg: Colors.white, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      gGpsDone.add('${jobKey(widget.job)}|${r.name}');
                      outs[r.name] = r.time; // 정상 퇴근으로 기록 → 종료 후 정산 때 포인트 대상
                    });
                    snack('${r.name} — 퇴근 인정 · 종료 후 정산 때 포인트 지급 대상');
                  })),
                  const SizedBox(width: 7),
                  Expanded(
                      child: _pill('반려', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      gGpsDone.add('${jobKey(widget.job)}|${r.name}');
                      outs[r.name] = '반려 ${r.time}'; // 퇴근 시각은 남기되 '미인정' → 포인트 대상 제외
                    });
                    snack('${r.name} — 반려 · 퇴근 미인정, 포인트 대상 제외');
                  })),
                ]),
              ],
            )),
          )),
    ];
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

  Widget _bigCount(int a, int b, String label) => Text.rich(TextSpan(children: [
        TextSpan(text: '$a / $b ',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: JColors.ink,
                fontFeatures: [FontFeature.tabularFigures()])),
        TextSpan(text: label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: JColors.muted)),
      ]));

  Widget _rosterCard(List<Worker> list, {void Function(Worker)? onTap}) => _card(Column(
        children: [
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

  Widget _row(Worker w) {
    final s = statusOf(w);
    final manual = overrides.containsKey(w.name);
    final (label, color) = _stMeta(s);
    final o = outOf_(w);
    final pendingOut = DateTime.now().isAfter(widget.job.end) && (s == 'ok' || s == 'late') && o == null;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text.rich(TextSpan(children: [
          TextSpan(text: w.name,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: JColors.ink)),
          if (w.org != null)
            TextSpan(text: '  ${w.org}',
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w500, color: JColors.inactive)),
          if (w.phone != null)
            TextSpan(text: '  ${w.phone}',
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w500, color: JColors.inactive)),
        ])),
        Text.rich(TextSpan(children: [
          TextSpan(text: label + (!manual && w.time != null ? ' ${w.time}' : ''),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color,
                  fontFeatures: const [FontFeature.tabularFigures()])),
          if (o != null)
            TextSpan(text: ' · 퇴근 $o',
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: JColors.muted)),
          if (pendingOut)
            const TextSpan(text: ' · 퇴근 미처리',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: JColors.amber)),
          // 종료 후에만 포인트 대상 표시 (정상 출근+퇴근 = 자동 / 조퇴·이탈·반려 = 없음)
          if (DateTime.now().isAfter(widget.job.end) && !pendingOut &&
              (s == 'ok' || s == 'late' || s == 'early' || s == 'runaway'))
            TextSpan(
                text: _eligible(w) ? ' · +${widget.job.point}P' : ' · 포인트 없음',
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700,
                    color: _eligible(w) ? JColors.green : JColors.inactive)),
          // 같이하기 짝꿍 + 보너스 (종료 후, 둘 다 정시 출근·정상 퇴근일 때만)
          if (buddyOf(widget.job, w.name) != null) ...[
            TextSpan(
                text: ' · 짝 ${buddyOf(widget.job, w.name)}',
                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: JColors.muted)),
            if (DateTime.now().isAfter(widget.job.end) && !pendingOut)
              TextSpan(
                  text: buddyBonusEligible(widget.job, w) ? ' +${Policy.buddyBonus ~/ 1000},000P' : ' 보너스 없음',
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700,
                      color: buddyBonusEligible(widget.job, w) ? JColors.green : JColors.inactive)),
          ],
          TextSpan(
              text: '  ${isExt(w.name) ? '외부' : isInvited(w.name) ? '추가' : (s == 'wait' ? '' : (manual ? '수동' : '자동'))}',
              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600, color: Color(0xFFC7C7CC))),
        ])),
      ],
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
    if (onlyShort && !(j.short > 0 && !now.isAfter(j.end))) return false;
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
                          : (j.short > 0 && !now.isAfter(j.end) ? const Color(0x1AC22A2A) : const Color(0xFFF0F0F2)),
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
                                : (j.short > 0 && !now.isAfter(j.end) ? JColors.red : JColors.ink))),
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
  late final List<PendingApp> apps = List.of(pendingAppsFor(widget.admin));
  late final List<CancelReq> cancels = List.of(cancelReqsFor(widget.admin));
  late final List<WaitEntry> waits = List.of(waitlistFor(widget.admin));
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

  Future<void> _reject(PendingApp a) async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text('${a.name} — 거절',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
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
    if (!mounted) return;
    if (ok != true || ctrl.text.trim().isEmpty) {
      if (ok == true) jSnack(context, '거절 사유를 입력해야 해요');
      return;
    }
    // 같이하기: 짝꿍도 함께 거절 (cascade) — 짝은 자리 여유 있을 때 단독 재신청 가능
    final mate = a.buddy == null ? null : apps.where((x) => x.name == a.buddy).firstOrNull;
    setState(() {
      apps.remove(a);
      if (mate != null) apps.remove(mate);
    });
    gDecided.add('app|${a.name}|${a.siteName}');
    if (mate != null) gDecided.add('app|${mate.name}|${mate.siteName}');
    gPendingTick.value++;
    jSnack(context, mate != null ? '${a.name} · ${mate.name} — 짝 함께 거절 · 사유 전달' : '${a.name} — 거절 · 사유가 전달됐어요');
  }

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
          if (sub == 'apply') ..._applyList(),
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
            Text('${a.siteName} · ${a.slotTime}\n${a.note}',
                style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
            if (a.buddy != null)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text('같이하기 · ${a.buddy}와 함께 신청 — 승인·거절이 둘 다 같이 처리돼요',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: JColors.blue)),
              ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: jPill('승인', bg: JColors.blue, fg: Colors.white, onTap: () {
                // 같이하기: 짝꿍도 함께 승인 (cascade)
                final mate = a.buddy == null ? null : apps.where((x) => x.name == a.buddy).firstOrNull;
                setState(() {
                  apps.remove(a);
                  if (mate != null) apps.remove(mate);
                });
                gDecided.add('app|${a.name}|${a.siteName}');
                if (mate != null) gDecided.add('app|${mate.name}|${mate.siteName}');
                gPendingTick.value++;
                // 확정 즉시 그 공고의 기존 공지 자동 전달
                var delivered = a.jobId == null ? 0 : deliverNotices(a.jobId!, a.name);
                if (mate?.jobId != null) delivered += deliverNotices(mate!.jobId!, mate.name);
                jSnack(context,
                    (mate != null ? '${a.name} · ${mate.name} — 같이하기 짝 함께 승인' : '${a.name} — 승인했어요') +
                        (delivered > 0 ? ' · 공고 공지 자동 전달' : ''));
              })),
              const SizedBox(width: 7),
              Expanded(child: jPill('거절', bg: Colors.white, fg: JColors.red, border: JColors.red,
                  onTap: () => _reject(a))),
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
            Text('${c.siteName} · ${c.slotTime}\n신청 ${c.appliedAt}  →  취소 ${c.cancelledAt}\n사유: ${c.reason}',
                style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: jPill('차감', bg: Colors.white, fg: JColors.red, border: JColors.red,
                  onTap: () => _decideCancel(c, 'deduct'))),
              const SizedBox(width: 7),
              Expanded(child: jPill('면제', bg: JColors.blue, fg: Colors.white,
                  onTap: () => _decideCancel(c, 'exempt'))),
              const SizedBox(width: 7),
              Expanded(child: jPill('반려', bg: Colors.white, fg: JColors.ink, border: JColors.muted,
                  onTap: () => _decideCancel(c, 'reject'))),
            ]),
          ])),
        )).toList();
  }

  void _decideCancel(CancelReq c, String d) {
    setState(() => cancels.remove(c));
    gDecided.add('cancel|${c.name}|${c.siteName}');
    gCancelDecisions.add(CancelDecision(c, d, widget.admin.name, DateTime.now()));
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
      cancels.add(r.req);
    });
    gDecided.remove('cancel|${r.req.name}|${r.req.siteName}');
    gPendingTick.value++;
    jSnack(context,
        r.decision == 'deduct'
            ? '${r.req.name} — 차감 취소 · ${Policy.cancelDeduct ~/ 1000},000P 복원 · 다시 검토 대기'
            : '${r.req.name} — 처리 취소 · 다시 검토 대기');
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
        child: Text('대기열은 자동 처리 (수락 제한: 24시간 전 2시간 · 이내 30분) — 여기선 상황만 확인해요',
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
          ...lates.map((l) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    InkWell(
                      onTap: () => openWorker(context, l.name),
                      borderRadius: BorderRadius.circular(6),
                      child: Text('${l.name} — ${l.delayMin}분 늦어요',
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
                    ),
                    Text(l.ago, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF9A6B00))),
                  ]),
                  const SizedBox(height: 2),
                  Text('${l.siteName} ${l.slot} · 사유: ${l.reason}',
                      style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
                ])),
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
        ],
      ),
    );
  }

  Widget _inqRow(BuildContext context, Inquiry q) {
    final color = switch (q.status) {
      '답변 대기' => JColors.red,
      '진행중' => JColors.blue,
      _ => JColors.inactive,
    };
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

    // 근무 내역 — 모든 공고 명단에서 이 사람 찾기 (→ Supabase applications+attendance 조회로 교체)
    final work = <(Job, Worker)>[];
    for (final j in [...gJobs, ...gPastJobs]) {
      for (final w in rosterOf(j)) {
        if (w.name == name) work.add((j, w));
      }
    }
    work.sort((a, b) => b.$1.start.compareTo(a.$1.start));
    final ended = work.where((e) => now.isAfter(e.$1.end)).toList();
    final attended = ended.where((e) {
      final s = effStatus(e.$1, e.$2);
      return s == 'ok' || s == 'late' || s == 'early';
    }).length;
    final balance = mockBalance(name) - recoveredOf(name) + grantedOf(name) - cancelDeductOf(name);

    // 포인트 내역 (최신순): 근무 보상 + 지급 + 회수
    final pts = <(DateTime, String, int)>[
      for (final e in ended)
        if (jobPointEligible(e.$1, e.$2))
          (e.$1.end, '근무 보상 · ${e.$1.site.split(' ').first} ${e.$1.dateLabel}', e.$1.point),
      for (final e in ended)
        if (buddyBonusEligible(e.$1, e.$2))
          (e.$1.end, '같이하기 보너스 · ${e.$1.site.split(' ').first} ${e.$1.dateLabel} (짝 ${buddyOf(e.$1, name)})', Policy.buddyBonus),
      for (final g in gGrants)
        if (g.name == name) (g.at, '지급 · ${g.memo}', g.amount),
      for (final r in gRecoveries)
        if (r.name == name) (r.at, '회수 · ${r.memo}', -r.amount),
      for (final d in gCancelDecisions)
        if (d.req.name == name && d.decision == 'deduct' && !d.reverted)
          (d.at, '취소 차감 · ${d.req.siteName.split(' ').first} ${d.req.slotTime} (단순변심)', -Policy.cancelDeduct),
    ]..sort((a, b) => b.$1.compareTo(a.$1));

    final inq = _inquiriesAll.where((q) => q.name == name).firstOrNull;

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
                Text(m.phone, style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
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
                    if (warns > 0)
                      TextSpan(text: '  ·  경고 $warns회',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700,
                              color: warns >= 2 ? JColors.red : JColors.amber)),
                    if (m.neg)
                      const TextSpan(text: '  ·  협의대상',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: JColors.red)),
                  ])),
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
          const SizedBox(height: 14),
          jPill('로그아웃', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: widget.onLogout),
        ],
      ),
    );
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
                chips(allSites.map((s) => (s, s.split(' ').first)).toList(), site, (v) => site = v),
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
                      Text('보유 ${(mockBalance(m.name) - recoveredOf(m.name)).toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (x) => '${x[1]},')}P',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.muted)),
                    ]),
                  ),
                ),
            ]),
          ),
        ];
      } else {
        // 2단계 — 금액 + 메시지
        final bal = mockBalance(picked!) - recoveredOf(picked!);
        final maxAmt = [bal, ?limit].reduce((a, b) => a < b ? a : b);
        if (amount > maxAmt) amount = (maxAmt ~/ 1000) * 1000;
        final canSubmit = amount >= 1000 && memo.text.trim().isNotEmpty;
        String won(int v) => v.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (x) => '${x[1]},');
        body = [
          title('$picked 포인트 회수',
              '보유 ${won(bal)}P · 회수 한도 ${limit == null ? '무제한 (1등급)' : '${won(limit)}P (2등급)'}${jobRef != null ? '\n관련 근무: $jobRef' : ''}'),
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
