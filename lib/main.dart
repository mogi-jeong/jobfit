// 잡핏 관리자 앱 — 현장용
// 디자인: 텍스트 온리 미니멀 (2026-08-04 확정)
// 데이터: 현재 Mock — 이후 Supabase 저장소로 교체 (repository 패턴)

import 'dart:async';
import 'package:flutter/material.dart';

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

const allSites = ['곤지암 MegaHub', '이천 MpHub', '용인 Hub', '군포 Hub', '진천 MegaHub', 'L타워 웨딩홀'];

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
    if (me == null) return LoginPage(onPick: (a) => setState(() => me = a));
    return AdminShell(admin: me!, onLogout: () => setState(() => me = null));
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
  final DateTime start, end;
  final int cap, ok, short;
  const Job(this.site, this.slot, this.status, this.start, this.end, this.cap, this.ok, this.short);

  String get timeLabel =>
      '${_hm(start)} – ${_hm(end)}';
  static String _hm(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  static const _wd = ['월', '화', '수', '목', '금', '토', '일'];
  String get dateLabel => '${start.month}/${start.day}(${_wd[start.weekday - 1]})';
}

// 데모용: 항상 그럴듯하게 보이도록 현재 시각 기준으로 생성
List<Job> buildMockJobs() {
  final now = DateTime.now();
  return [
    // 1시간 41분 전에 시작한 근무 (진행 중 · 2명 부족)
    Job('곤지암 MegaHub', '주간', '진행중',
        now.subtract(const Duration(hours: 1, minutes: 41)),
        now.add(const Duration(hours: 7, minutes: 19)), 8, 6, 2),
    // 2시간 15분 뒤 시작 (부족 1명 → 임박하면 빨강)
    Job('이천 MpHub', '야간', '마감',
        now.add(const Duration(hours: 2, minutes: 15)),
        now.add(const Duration(hours: 10, minutes: 15)), 6, 5, 1),
    // 25분 뒤 시작 (충원 완료)
    Job('용인 Hub', '주간', '대기',
        now.add(const Duration(minutes: 25)),
        now.add(const Duration(hours: 9, minutes: 25)), 8, 8, 0),
    // 1시간 전에 끝난 근무 (종료)
    Job('군포 Hub', '주간', '완료',
        now.subtract(const Duration(hours: 10)),
        now.subtract(const Duration(hours: 1)), 6, 5, 0),
  ];
}

// 지난 공고 (수동 관리·사후 정정용 — N30: 허용 기간 추후 결정)
List<Job> buildPastJobs() {
  final now = DateTime.now();
  DateTime d(int daysAgo, int h, [int m = 0]) {
    final t = now.subtract(Duration(days: daysAgo));
    return DateTime(t.year, t.month, t.day, h, m);
  }

  return [
    Job('곤지암 MegaHub', '주간', '완료', d(1, 8), d(1, 17), 8, 7, 0),
    Job('이천 MpHub', '야간', '완료', d(1, 22), d(0, 6), 6, 6, 0),
    Job('L타워 웨딩홀', '오후', '완료', d(2, 11), d(2, 19), 12, 11, 0),
    Job('곤지암 MegaHub', '주간', '완료', d(3, 8), d(3, 17), 8, 8, 0),
    Job('군포 Hub', '주간', '완료', d(9, 9), d(9, 18), 6, 6, 0), // 7일 경과 → 정정 잠김 데모
  ];
}

// 앱 전역 공고 목록 (1급이 등록하면 여기 추가 → Supabase jobs 테이블 교체 지점)
final List<Job> gJobs = buildMockJobs();
final List<Job> gPastJobs = buildPastJobs();

// ─── 알바생 출결 Mock (→ Supabase attendance 교체 지점) ───
class Worker {
  final String name;
  final String status; // ok / late / none / out / absent / wait
  final String? time;
  final String? org; // 외부인력 소속 (업체명 메모)
  final String? phone; // 외부인력 전화번호
  const Worker(this.name, this.status, [this.time, this.org, this.phone]);
}

// GPS 영역 밖 퇴근 — 사유 검토 대기 (알바생 앱에서 제출 → 여기서 승인/반려)
class GpsReq {
  final String name, reason, dist, time;
  const GpsReq(this.name, this.reason, this.dist, this.time);
}

const mockGpsReqs = {
  '곤지암 MegaHub': [
    GpsReq('정하늘', '셔틀 정류장까지 이동 후 퇴근 처리했어요', '영역 밖 180m', '17:04'),
  ],
};

const mockWorkers = {
  '곤지암 MegaHub': [
    Worker('한지민', 'none'), Worker('강도윤', 'none'),
    Worker('박서준', 'ok', '08:02'), Worker('이지은', 'late', '08:14'),
    Worker('최민호', 'ok', '07:58'), Worker('윤아름', 'ok', '08:01'),
    Worker('오세훈', 'out'), Worker('정하늘', 'ok', '08:05'),
  ],
  '이천 MpHub': [
    Worker('김도현', 'none'), Worker('이수민', 'ok', '21:55'),
    Worker('박준영', 'ok', '22:01'), Worker('최유나', 'late', '22:12'),
    Worker('장민석', 'ok', '21:58'),
  ],
  '용인 Hub': [
    Worker('서지우', 'none'), Worker('임하늘', 'none'), Worker('조은비', 'none'),
    Worker('김민준', 'none'), Worker('나예린', 'none'), Worker('도경수', 'none'),
    Worker('류지안', 'none'), Worker('문서연', 'none'),
  ],
  '군포 Hub': [
    Worker('고은채', 'ok', '08:58'), Worker('박도윤', 'late', '09:12'),
    Worker('신유나', 'ok', '08:55'), Worker('이준호', 'out'),
    Worker('전소민', 'absent'), Worker('차민규', 'out'),
  ],
  'L타워 웨딩홀': [
    Worker('감우주', 'out'), Worker('민들레', 'out'),
    Worker('송가온', 'late', '11:14'), Worker('오하람', 'out'),
    Worker('한별이', 'absent'),
  ],
};

// ─── 가입 알바생 풀 Mock (직접 추가 검색용 → Supabase workers 교체 지점) ───
class Member {
  final String name, phone, label;
  final bool neg; // 협의대상
  const Member(this.name, this.phone, this.label, [this.neg = false]);
}

const mockMembers = [
  Member('권나라', '010-2222-1111', '단골 · 출근 14회'),
  Member('김철수', '010-3333-2222', '성실 B'),
  Member('안재현', '010-4444-3333', '보통 C'),
  Member('백소라', '010-5555-4444', '경고 2회'),
  Member('유지태', '010-6666-5555', '협의대상', true),
  Member('박서준', '010-7777-6666', '성실 A'),
];

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
  static const tabs = ['공고', '승인', '소통', '내정보'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: switch (tab) {
              0 => JobListPage(admin: widget.admin),
              1 => const ApprovalPage(),
              2 => const CommPage(),
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
              child: Row(
                children: List.generate(tabs.length, (i) {
                  final on = tab == i;
                  return Expanded(
                    child: InkWell(
                      onTap: () => setState(() => tab = i),
                      borderRadius: BorderRadius.circular(18),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(tabs[i],
                              style: TextStyle(
                                fontSize: 13,
                                letterSpacing: -.3,
                                fontWeight: on ? FontWeight.w800 : FontWeight.w600,
                                color: on ? JColors.ink : JColors.inactive,
                              )),
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
  List<Job> get jobs => gJobs.where(_inScope).toList()..sort((a, b) => a.start.compareTo(b.start));
  List<Job> get pastJobs => gPastJobs.where(_inScope).toList();

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
                          view == 'today'
                              ? '${widget.admin.sites == null ? '전 근무지' : '담당 ${widget.admin.sites!.length} 근무지'} · 오늘 ${jobs.length}건'
                              : '지난 공고 · 사후 정정 가능',
                          style: const TextStyle(fontSize: 12.5, color: JColors.muted)),
                    ],
                  ),
                ),
                // 공고 등록 — 마스터·1등급 전용 (2026-08-24 확정)
                if (widget.admin.isA1)
                  InkWell(
                    onTap: _registerSheet,
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
              for (final v in const [('today', '오늘'), ('past', '지난')])
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
                      child: Text(v.$2,
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: view == v.$1 ? FontWeight.w700 : FontWeight.w600,
                              color: view == v.$1 ? JColors.ink : JColors.muted)),
                    ),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 12),
          if (view == 'today')
            ...jobs.map((j) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _JobCard(job: j),
                ))
          else
            ..._pastList(),
        ],
      ),
    );
  }

  // 공고 등록 (1등급 전용) — 근무지·날짜·시간대·인원·일급·포인트
  void _registerSheet() {
    String site = allSites.first;
    int dayOffset = 1; // 0 오늘 / 1 내일 / 2 모레
    String slot = '주간';
    int cap = 8;
    final wageCtrl = TextEditingController(text: '110000');
    final pointCtrl = TextEditingController(text: '1000');

    showModalBottomSheet(
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
                label('날짜'),
                chips(const [(0, '오늘'), (1, '내일'), (2, '모레')], dayOffset, (v) => dayOffset = v),
                label('시간대'),
                chips(const [('주간', '주간 08–17'), ('야간', '야간 22–06'), ('오후', '오후 11–19')], slot, (v) => slot = v),
                label('모집 인원'),
                Row(children: [
                  _stepBtn('−', () => setSheet(() => cap = (cap - 1).clamp(1, 50))),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: Text('$cap명',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: JColors.ink,
                            fontFeatures: [FontFeature.tabularFigures()])),
                  ),
                  _stepBtn('＋', () => setSheet(() => cap = (cap + 1).clamp(1, 50))),
                ]),
                label('일급 (원 · 파트너사 지급)'),
                TextField(controller: wageCtrl, keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 14, color: JColors.ink),
                    decoration: const InputDecoration(isDense: true)),
                label('포인트 (P · 잡핏 지급, 기본 1,000)'),
                TextField(controller: pointCtrl, keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 14, color: JColors.ink),
                    decoration: const InputDecoration(isDense: true)),
                const SizedBox(height: 16),
                SizedBox(
                  height: 42, width: double.infinity,
                  child: jPill('등록하기', bg: JColors.blue, fg: Colors.white, onTap: () {
                    final now = DateTime.now();
                    final base = DateTime(now.year, now.month, now.day).add(Duration(days: dayOffset));
                    final (sh, eh) = switch (slot) { '야간' => (22, 6), '오후' => (11, 19), _ => (8, 17) };
                    final start = base.add(Duration(hours: sh));
                    final end = slot == '야간'
                        ? base.add(Duration(days: 1, hours: eh))
                        : base.add(Duration(hours: eh));
                    Navigator.pop(ctx);
                    setState(() => gJobs.add(Job(site, slot, '모집중', start, end, cap, 0, cap)));
                    jSnack(context, '공고 등록 완료 — 알바생 앱에 게시됐어요');
                  }),
                ),
              ]),
            ),
          ),
        );
      }),
    );
  }

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

  // 지난 공고 — 날짜별 그룹
  List<Widget> _pastList() {
    final out = <Widget>[];
    String? lastDate;
    for (final j in pastJobs) {
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
      timerText = '근무 종료';
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
          Text('${job.slot} ${job.timeLabel}', style: const TextStyle(fontSize: 12, color: JColors.muted)),
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
                  ? const Text('근무 완료',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: JColors.inactive))
                  : started
                      ? Text(short ? '${job.short}명 미출근 · 확인해주세요' : '이상 없음',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                              color: short ? JColors.red : JColors.green))
                      : Text(short ? '${job.short}명 부족' : '충원 완료',
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
  final Map<String, String> overrides = {}; // 이름 → 수동 상태 (ok/absent)
  final List<Worker> extWorkers = []; // 외부인력 (기획안: 외부 구인)
  final List<Worker> invited = []; // 직접 추가한 가입 알바생 (기획안 §5-3, 즉시 승인)
  late final List<GpsReq> gpsReqs =
      List.of(mockGpsReqs[widget.job.site] ?? const <GpsReq>[]); // 퇴근 승인 대기
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
    setState(() => overrides[name] = s);
    snack('$name — ${_stMeta(s).$1} 처리');
  }

  // 상태 라벨·색 (전 화면 공통)
  static (String, Color) _stMeta(String s) => switch (s) {
        'ok' => ('출근', JColors.green),
        'late' => ('지각', const Color(0xFF9A6B00)),
        'early' => ('조퇴', const Color(0xFF9A6B00)),
        'runaway' => ('무단이탈', JColors.red),
        'out' => ('퇴근', JColors.muted),
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
            if (statusEditable) ...[
              const SizedBox(height: 13),
              Wrap(spacing: 7, runSpacing: 7, children: [
                for (final s in const ['ok', 'late', 'early', 'runaway', 'absent', 'out']) _stChip(ctx, w, s),
              ]),
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
    final base = mockWorkers[widget.job.site] ?? const <Worker>[];
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
          snack('${m.name} — 배정했어요 (즉시 승인)');
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
    final base = mockWorkers[job.site] ?? const <Worker>[];

    // 상태별로 완전히 다른 페이지 내용
    final content = ended
        ? _endedContent(base)
        : started
            ? _activeContent(base)
            : _upcomingContent(base, now);

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
      return s == 'ok' || s == 'late';
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
                  Text(w.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: JColors.ink)),
                  const Text('미도착', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: JColors.inactive)),
                ]),
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
      const SizedBox(height: 12),
      _sect('확정 명단 · ${roster.length}명'),
      if (roster.isEmpty)
        _card(const Center(
            child: Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('아직 확정된 인원이 없어요', style: TextStyle(fontSize: 12, color: JColors.inactive)),
        )))
      else
        _rosterCard(roster),
      ..._extSection(statusEditable: false),
    ];
  }

  // ── 종료: 최종 집계 (읽기 전용) ──
  List<Widget> _endedContent(List<Worker> base) {
    final mapped = [...base, ...invited]
        .map((w) => statusOf(w) == 'none' ? Worker(w.name, 'absent') : w)
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    int ok = 0, late = 0, early = 0, runaway = 0, absent = 0, out = 0;
    for (final w in mapped) {
      switch (statusOf(w)) {
        case 'ok': ok++;
        case 'late': late++;
        case 'early': early++;
        case 'runaway': runaway++;
        case 'out': out++;
        default: absent++;
      }
    }
    final attended = ok + late + out + early;

    return [
      _card(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _bigCount(attended, widget.job.cap, '출근'),
            Text(absent > 0 ? '결근 $absent명' : '결근 없음',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700,
                    color: absent > 0 ? JColors.red : JColors.green)),
          ],
        ),
        const SizedBox(height: 4),
        Text(
            [
              '출근 ${ok + out}',
              '지각 $late',
              if (early > 0) '조퇴 $early',
              if (runaway > 0) '무단이탈 $runaway',
              '결근 $absent',
              '${Job._hm(widget.job.end)} 종료',
            ].join(' · '),
            style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
      ])),
      ..._gpsSection(),
      const SizedBox(height: 12),
      // 정정 허용 7일 (사용자 결정 2026-08-24, N30)
      if (DateTime.now().difference(widget.job.end).inDays >= 7) ...[
        _sect('최종 명단 · ${mapped.length}명'),
        _rosterCard(mapped),
        ..._extSection(statusEditable: false),
        const SizedBox(height: 10),
        const Padding(
          padding: EdgeInsets.only(left: 2),
          child: Text('종료 후 7일이 지나 정정할 수 없어요 · 필요하면 PC 관리자 웹에 문의하세요',
              style: TextStyle(fontSize: 11, color: JColors.inactive)),
        ),
      ] else ...[
        _sect('최종 명단 · ${mapped.length}명 — 눌러서 정정'),
        _rosterCard(mapped, onTap: (w) => _statusSheet(w)),
        ..._extSection(),
        const SizedBox(height: 10),
        const Padding(
          padding: EdgeInsets.only(left: 2),
          child: Text('지난 출결은 종료 후 7일까지 정정할 수 있어요 · 변경은 모두 기록에 남아요',
              style: TextStyle(fontSize: 11, color: JColors.inactive)),
        ),
      ],
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
                      child: _pill('승인 · 포인트 지급', bg: JColors.blue, fg: Colors.white, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      overrides[r.name] = 'out';
                    });
                    snack('${r.name} — 퇴근 승인 · 포인트 지급');
                  })),
                  const SizedBox(width: 7),
                  Expanded(
                      child: _pill('반려', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                    setState(() {
                      gpsReqs.remove(r);
                      overrides[r.name] = 'out';
                    });
                    snack('${r.name} — 반려 · 퇴근 기록만, 포인트 미지급');
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
    final (label, color) = switch (s) {
      'ok' => ('출근', JColors.green),
      'late' => ('지각', const Color(0xFF9A6B00)),
      'out' => ('퇴근', JColors.muted),
      'absent' => ('결근', JColors.red),
      'wait' => ('출근 전', JColors.inactive),
      _ => ('미도착', JColors.inactive),
    };
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

void jSnack(BuildContext context, String msg) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
    content: Text(msg, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
    behavior: SnackBarBehavior.floating,
    backgroundColor: JColors.ink,
    duration: const Duration(milliseconds: 1300),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
  ));
}

// ═══════════ 승인 탭 — 신청 / 취소 / 대기열 ═══════════
class PendingApp {
  final String name, site, time, flag; // flag: 12h이내 / 협의대상 / 경고2회 ...
  final bool danger;
  const PendingApp(this.name, this.site, this.time, this.flag, [this.danger = false]);
}

class CancelReq {
  final String name, site, reason;
  const CancelReq(this.name, this.site, this.reason);
}

class ApprovalPage extends StatefulWidget {
  const ApprovalPage({super.key});
  @override
  State<ApprovalPage> createState() => _ApprovalPageState();
}

class _ApprovalPageState extends State<ApprovalPage> {
  String sub = 'apply';
  final apps = <PendingApp>[
    const PendingApp('한지민', '곤지암 · 주간 08:00 – 17:00', '단골 · 출근 12회', '12시간 이내'),
    const PendingApp('오세훈', '이천 · 야간 22:00 – 06:00', '경고 3회', '협의대상', true),
  ];
  final cancels = <CancelReq>[
    const CancelReq('홍길동', '곤지암 · 주간 · 12시간 이내 취소', '개인사정 (단순 변심)'),
  ];
  // 대기열 자리 제안 — 수락 마감 카운트다운 (정책: 24h 전 2시간 / 24h 이내 30분)
  late DateTime wlDeadline = DateTime.now().add(const Duration(minutes: 28, seconds: 14));
  bool wlAlive = true;
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
    setState(() => apps.remove(a));
    jSnack(context, '${a.name} — 거절 · 사유가 전달됐어요');
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          jHeader('승인', '현장 즉시 처리'),
          // 서브탭
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(color: const Color(0xFFE8E8ED), borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              for (final s in [('apply', '신청 ${apps.length}'), ('cancel', '취소 ${cancels.length}'), ('wait', '대기열 1')])
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
                      child: Text(s.$2,
                          style: TextStyle(fontSize: 12,
                              fontWeight: sub == s.$1 ? FontWeight.w700 : FontWeight.w600,
                              color: sub == s.$1 ? JColors.ink : JColors.muted)),
                    ),
                  ),
                ),
            ]),
          ),
          const SizedBox(height: 12),
          if (sub == 'apply') ..._applyList(),
          if (sub == 'cancel') ..._cancelList(),
          if (sub == 'wait') ..._waitList(),
        ],
      ),
    );
  }

  List<Widget> _applyList() {
    if (apps.isEmpty) {
      return [jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 10),
          child: Text('승인 대기 없음', style: TextStyle(fontSize: 12, color: JColors.inactive)))))];
    }
    return apps.map((a) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(a.name, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: JColors.ink)),
              Text(a.flag,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                      color: a.danger ? JColors.red : const Color(0xFF9A6B00))),
            ]),
            const SizedBox(height: 2),
            Text('${a.site} · ${a.time}', style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: jPill('승인', bg: JColors.blue, fg: Colors.white, onTap: () {
                setState(() => apps.remove(a));
                jSnack(context, '${a.name} — 승인했어요');
              })),
              const SizedBox(width: 7),
              Expanded(child: jPill('거절', bg: Colors.white, fg: JColors.red, border: JColors.red,
                  onTap: () => _reject(a))),
            ]),
          ])),
        )).toList();
  }

  List<Widget> _cancelList() {
    if (cancels.isEmpty) {
      return [jCard(const Center(child: Padding(padding: EdgeInsets.symmetric(vertical: 10),
          child: Text('취소 검토 대기 없음', style: TextStyle(fontSize: 12, color: JColors.inactive)))))];
    }
    return cancels.map((c) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(c.name, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: JColors.ink)),
              const Text('12시간 이내',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF9A6B00))),
            ]),
            const SizedBox(height: 2),
            Text('${c.site}\n사유: ${c.reason}', style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: jPill('차감', bg: Colors.white, fg: JColors.red, border: JColors.red, onTap: () {
                setState(() => cancels.remove(c));
                jSnack(context, '${c.name} — 취소 승인 · 1,000P 차감');
              })),
              const SizedBox(width: 7),
              Expanded(child: jPill('면제', bg: JColors.blue, fg: Colors.white, onTap: () {
                setState(() => cancels.remove(c));
                jSnack(context, '${c.name} — 취소 승인 · 차감 면제');
              })),
              const SizedBox(width: 7),
              Expanded(child: jPill('반려', bg: Colors.white, fg: JColors.ink, border: JColors.muted, onTap: () {
                setState(() => cancels.remove(c));
                jSnack(context, '${c.name} — 반려 · 신청 복원 (출근 의무)');
              })),
            ]),
          ])),
        )).toList();
  }

  List<Widget> _waitList() {
    final left = wlDeadline.difference(DateTime.now());
    final expired = left.isNegative;
    final mm = (left.inMinutes).clamp(0, 999);
    final ss = (left.inSeconds % 60).clamp(0, 59);
    return [
      jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('곤지암 대기 1번 · 서지우',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: JColors.ink)),
          Text(expired ? '시간 초과' : '$mm:${ss.toString().padLeft(2, '0')}',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: expired ? JColors.inactive : (mm < 5 ? JColors.red : const Color(0xFF9A6B00)))),
        ]),
        const SizedBox(height: 3),
        Text(
            expired
                ? '수락 시간이 지나 자동 거절 — 다음 대기자에게 자리 제안이 갔어요'
                : '자리 제안 발송됨 · 수락 대기 중 (제한: 24시간 전 2시간 / 이내 30분)\n시간이 지나면 자동으로 다음 대기자에게 넘어가요',
            style: const TextStyle(fontSize: 11.5, color: JColors.muted, height: 1.5)),
      ])),
      const SizedBox(height: 8),
      const Padding(
        padding: EdgeInsets.only(left: 2),
        child: Text('대기열은 자동으로 처리돼요 — 여기선 상황만 확인합니다',
            style: TextStyle(fontSize: 11, color: JColors.inactive)),
      ),
    ];
  }
}

// ═══════════ 소통 탭 — 공지 / 늦어요 / 1:1 문의 ═══════════
class CommPage extends StatefulWidget {
  const CommPage({super.key});
  @override
  State<CommPage> createState() => _CommPageState();
}

class _CommPageState extends State<CommPage> {
  Future<void> _notice() async {
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('공지 발송',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: JColors.ink)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Align(alignment: Alignment.centerLeft,
              child: Text('대상: 담당 근무지 오늘 근무자 12명',
                  style: TextStyle(fontSize: 11.5, color: JColors.muted))),
          const SizedBox(height: 6),
          TextField(
            controller: ctrl,
            autofocus: true,
            maxLines: 3,
            maxLength: 500,
            style: const TextStyle(fontSize: 14, color: JColors.ink),
            decoration: const InputDecoration(hintText: '내용 입력 (예: 오늘 물량 많아요, 10분 일찍 와주세요)'),
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
    if (!mounted) return;
    if (ok == true && ctrl.text.trim().isNotEmpty) {
      jSnack(context, '공지 발송 완료 · 12명 (야간엔 아침 8시에 나가요)');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
        children: [
          jHeader('소통', '알바생 알림 · 문의'),
          SizedBox(
            height: 44,
            child: jPill('담당 근무지에 공지 발송', bg: JColors.blue, fg: Colors.white, onTap: _notice),
          ),
          const SizedBox(height: 6),
          jSect('늦어요 보고 · 1건'),
          jCard(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [
              Text('이지은 — 10분 늦어요',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
              Text('방금', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF9A6B00))),
            ]),
            const SizedBox(height: 2),
            const Text('곤지암 주간 · 사유: 버스 지연', style: TextStyle(fontSize: 11.5, color: JColors.muted)),
          ])),
          jSect('1:1 문의 · 2건'),
          _inqRow(context, '박서준', '출근 인증이 안 돼요', '답변 대기', JColors.red,
              const [('me', '출근 인증이 안 돼요', '18:22')]),
          const SizedBox(height: 8),
          _inqRow(context, '최민호', '주차는 어디에 하나요?', '진행중', JColors.blue,
              const [('me', '주차는 어디에 하나요?', '어제'), ('adm', '정문 옆 B주차장 이용하시면 돼요', '어제')]),
        ],
      ),
    );
  }

  Widget _inqRow(BuildContext context, String name, String preview, String badge, Color badgeColor,
      List<(String, String, String)> msgs) {
    return Material(
      color: JColors.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => InquiryChatPage(name: name, initial: msgs))),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: JColors.hairline, width: .5),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: JColors.ink)),
              const SizedBox(height: 1),
              Text(preview, style: const TextStyle(fontSize: 11.5, color: JColors.muted)),
            ]),
            Text(badge, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: badgeColor)),
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
                  Text(widget.name,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.4, color: JColors.ink)),
                  const Text('1:1 문의', style: TextStyle(fontSize: 11.5, color: JColors.muted)),
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
