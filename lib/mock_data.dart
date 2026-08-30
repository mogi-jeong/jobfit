part of 'main.dart';

// ══════════════════════════════════════════════════════════════
//  Mock 데이터 — Supabase 연결 전 더미
//  ★ 이 파일 전체가 교체 지점입니다.
//    rosterOf / gpsReqsOf / pendingAppsFor / cancelReqsFor / waitlistFor /
//    inquiriesFor / lateReportsFor / buildTodayJobs / buildPastJobs
//    → 같은 시그니처로 Supabase 조회 함수를 만들면 화면 코드는 그대로 동작.
//  ★ 모든 날짜·시각은 DateTime.now() 기준 상대값 (고정 날짜 없음) — 언제 열어도 "오늘" 데이터
//  ★ 명단은 앱 시작 시 날짜순으로 한 번에 생성 (화면 여는 순서와 무관하게 항상 같은 결과)
// ══════════════════════════════════════════════════════════════

// ─── 근무지 (실제 11곳 — CJ 6 · 롯데 3 · 컨벤션 2) ───
class Site {
  final String name, partner, region, contact; // contact = 근무지 담당자 전화 (기획: 공고마다 필수·알바생에게 공개)
  final bool bus;
  final int consent; // 긴급 구인 알림 동의자 수 (Mock 고정값 → Supabase workers.marketing_consent 집계)
  const Site(this.name, this.partner, this.region, this.bus, [this.contact = '010-1234-5678', this.consent = 20]);
}

const sites = [
  Site('곤지암 MegaHub', 'CJ대한통운', '경기 광주시 도척면', true, '010-3101-1001', 42),
  Site('용인 Hub', 'CJ대한통운', '경기 용인시 양지면', true, '010-3102-1002', 31),
  Site('군포 Hub_A', 'CJ대한통운', '경기 군포시 부곡동', false, '010-3103-1003', 18),
  Site('군포 Hub_B', 'CJ대한통운', '경기 군포시 금정동', false, '010-3104-1004', 12),
  Site('이천 MpHub', 'CJ대한통운', '경기 이천시 부발읍', true, '010-3105-1005', 27),
  Site('안성 MpHub', 'CJ대한통운', '경기 안성시 공도읍', true, '010-3106-1006', 15),
  Site('진천 MegaHub', '롯데택배', '충북 진천군 이월면', true, '010-3201-2001', 23),
  Site('남양주 Hub', '롯데택배', '경기 남양주시 화도읍', false, '010-3202-2002', 9),
  Site('군포 Hub', '롯데택배', '경기 군포시 당정동', true, '010-3203-2003', 21),
  Site('L타워 웨딩홀', '컨벤션', '서울 강남구 테헤란로', false, '010-3301-3001', 36),
  Site('W힐스 웨딩홀', '컨벤션', '서울 서초구 서초대로', false, '010-3302-3002', 29),
];
final List<String> allSites = sites.map((s) => s.name).toList();
Site? siteOf(String name) => sites.where((s) => s.name == name).firstOrNull;
int consentCountOf(String site) => siteOf(site)?.consent ?? 0;

// ─── 가입 알바생 풀 40명 (직접 추가 검색·명단 생성용) ───
const mockMembers = [
  Member('권나라', '010-2201-1101', '단골 · 출근 14회', false, 20000),
  Member('김철수', '010-2202-1102', '성실 B'),
  Member('안재현', '010-2203-1103', '보통 C'),
  Member('백소라', '010-2204-1104', '경고 2회'),
  Member('유지태', '010-2205-1105', '협의대상', true),
  Member('박서준', '010-2206-1106', '성실 A'),
  Member('이지은', '010-2207-1107', '성실 A'),
  Member('최민호', '010-2208-1108', '단골 · 출근 21회', false, 30000),
  Member('윤아름', '010-2209-1109', '성실 B'),
  Member('오세훈', '010-2210-1110', '협의대상', true),
  Member('정하늘', '010-2211-1111', '성실 A'),
  Member('한지민', '010-2212-1112', '경고 1회'),
  Member('강도윤', '010-2213-1113', '보통 C'),
  Member('김도현', '010-2214-1114', '성실 B'),
  Member('이수민', '010-2215-1115', '단골 · 출근 18회', false, 10000),
  Member('박준영', '010-2216-1116', '성실 B'),
  Member('최유나', '010-2217-1117', '경고 1회'),
  Member('장민석', '010-2218-1118', '성실 A'),
  Member('한서윤', '010-2219-1119', '보통 C'),
  Member('서지우', '010-2220-1120', '성실 B'),
  Member('임하늘', '010-2221-1121', '성실 A'),
  Member('조은비', '010-2222-1122', '단골 · 출근 11회'),
  Member('김민준', '010-2223-1123', '보통 C'),
  Member('나예린', '010-2224-1124', '성실 B'),
  Member('도경수', '010-2225-1125', '경고 2회'),
  Member('류지안', '010-2226-1126', '성실 A'),
  Member('문서연', '010-2227-1127', '보통 D'),
  Member('고은채', '010-2228-1128', '성실 B'),
  Member('박도윤', '010-2229-1129', '경고 1회'),
  Member('신유나', '010-2230-1130', '성실 A'),
  Member('이준호', '010-2231-1131', '단골 · 출근 25회', false, 10000),
  Member('전소민', '010-2232-1132', '협의대상', true),
  Member('차민규', '010-2233-1133', '성실 B'),
  Member('감우주', '010-2234-1134', '보통 C'),
  Member('민들레', '010-2235-1135', '성실 A'),
  Member('송가온', '010-2236-1136', '경고 1회'),
  Member('오하람', '010-2237-1137', '성실 B'),
  Member('한별이', '010-2238-1138', '보통 D'),
  Member('홍길동', '010-2239-1139', '성실 B'),
  Member('배수지', '010-2240-1140', '단골 · 출근 16회', false, 15000),
];

// 명단 생성용 이름 풀 (회원 40 + 추가 60)
const _extraNames = [
  '강하늘', '고윤정', '구자욱', '권지용', '김가영', '김나현', '김도영', '김보라', '김성민', '김시우',
  '김예준', '김지호', '김태양', '남주혁', '노유진', '문가영', '박건우', '박세진', '박시현', '박은빈',
  '배현성', '변우석', '서강준', '서현진', '손예진', '송강', '신세경', '안효섭', '양세종', '여진구',
  '오정세', '유승호', '윤계상', '이도현', '이성경', '이세영', '이재욱', '이정은', '이하늬', '임시완',
  '장기용', '전여빈', '정해인', '조보아', '주지훈', '지창욱', '차은우', '천우희', '최우식', '하지원',
  '한소희', '한지현', '홍수현', '황민현', '황인엽', '김유정', '남지현', '박보영', '신혜선', '이유비',
];
final List<String> _names = [...mockMembers.map((m) => m.name), ..._extraNames];

// 승인·취소·대기열 더미에 쓰는 이름 — 명단 생성에서 제외 (같은 날 중복 배정 검사와 충돌하지 않도록)
const _reservedNames = {
  '한지민', '류지안', '오세훈', '백소라', '전소민', '김민준', '도경수', '박준영', '최유나', // 신청 대기
  '홍길동', '나예린', '감우주', '차민규', '신유나', '한별이', // 취소 검토
  '서지우', '임하늘', '조은비', '배수지', '고은채', '김철수', // 대기열
};

// ─── 공고 내용 템플릿 5종 (마스터/1급이 미리 작성 → 등록 시 불러오기, 수정 가능) ───
class JobTemplate {
  final String key, title, body;
  const JobTemplate(this.key, this.title, this.body);
}

const jobTemplates = [
  JobTemplate('A', '택배 상하차',
      '업무: 택배 상하차 및 레일 분류\n준비물: 장갑, 편한 운동화, 긴바지\n특이사항: 통근버스 운영 · 휴게 12:00–13:00 식사 제공 · 무거운 물품 있음'),
  JobTemplate('B', '소형 분류·스캔',
      '업무: 소형 택배 스캔 및 구역별 분류\n준비물: 장갑\n특이사항: 서서 하는 작업 · 초보 가능 · 휴게 시간 교대'),
  JobTemplate('C', '웨딩홀 서빙',
      '업무: 연회 서빙, 테이블 세팅·정리\n준비물: 검정 정장 바지, 흰 셔츠, 검정 구두 (유니폼 상의 대여)\n특이사항: 두발 단정, 손톱 짧게 · 식사 제공 · 예식 사이 대기 있음'),
  JobTemplate('D', '야간 간선 상차',
      '업무: 야간 간선 차량 상차\n준비물: 장갑, 방한 복장(겨울)\n특이사항: 야간수당 포함 일급 · 휴게 02:00–02:30 · 통근버스 심야 운행'),
  JobTemplate('E', '행사 세팅·철수',
      '업무: 행사장 의자·테이블 세팅 및 철수\n준비물: 편한 복장, 운동화\n특이사항: 단시간 고강도 · 조기 종료 시 일급 전액 지급'),
];

String templateBody(String key) => jobTemplates.where((t) => t.key == key).firstOrNull?.body ?? '';

// 근무지·시간대 기준 기본 내용 (Mock 공고용)
String _defaultDesc(String site, String slot) {
  final p = siteOf(site)?.partner ?? '';
  if (p == '컨벤션') return templateBody(slot == '오후' ? 'C' : 'E');
  if (slot == '야간') return templateBody('D');
  return templateBody(p == '롯데택배' ? 'B' : 'A');
}

// ─── 공고 ───
DateTime _today0() {
  final n = DateTime.now();
  return DateTime(n.year, n.month, n.day);
}

(int, int) _slotHours(String slot) => switch (slot) {
      '야간' => (22, 6),
      '오후' => (11, 19),
      '새벽' => (4, 12),
      _ => (8, 17),
    };

// 공고 생성 — dayOffset(일 단위) 기준, startAt 주면 시작 시각을 현재 기준 상대값으로 덮어씀
Job _mk(String id, String site, String slot, int dayOffset, int cap, int ok, int short,
    {DateTime? startAt, bool closed = false}) {
  final base = _today0().add(Duration(days: dayOffset));
  final (sh, eh) = _slotHours(slot);
  var start = base.add(Duration(hours: sh));
  var end = slot == '야간' ? base.add(Duration(days: 1, hours: eh)) : base.add(Duration(hours: eh));
  if (startAt != null) {
    final len = end.difference(start);
    start = startAt;
    end = startAt.add(len);
  }
  final now = DateTime.now();
  final st = now.isAfter(end)
      ? '완료'
      : now.isAfter(start)
          ? '진행중'
          : closed
              ? '수동 마감'
              : (short > 0 ? '모집중' : '마감');
  return Job(site, slot, st, start, end, cap, ok, short, id: id, desc: _defaultDesc(site, slot), closed: closed);
}

// 오늘 + 예정 공고 — 오늘 건은 "항상 그럴듯하게" 현재 시각 기준으로 배치 (진행 중 3 · 시작 전 5 · 종료 3)
List<Job> buildTodayJobs() {
  final now = DateTime.now();
  DateTime ago(int h, [int m = 0]) => now.subtract(Duration(hours: h, minutes: m));
  DateTime later(int h, [int m = 0]) => now.add(Duration(hours: h, minutes: m));
  // 오늘 22:00 야간 — 21시가 넘었으면 내일 22:00 (항상 24시간 안에 시작)
  var night = DateTime(now.year, now.month, now.day, 22);
  if (now.isAfter(night.subtract(const Duration(hours: 1)))) night = night.add(const Duration(days: 1));
  return [
    // ── 오늘 · 2급 담당(곤지암·이천) ──
    _mk('j-t-1', '곤지암 MegaHub', '주간', 0, 8, 6, 2, startAt: ago(1, 41)), // 진행 중 · 미도착 2
    _mk('j-t-2', '이천 MpHub', '야간', 0, 6, 5, 1, startAt: night), // 오늘 야간 22:00
    _mk('j-t-3', '곤지암 MegaHub', '야간', 0, 10, 7, 3, startAt: later(5, 30)), // 시작 전 · 신청 대기
    _mk('j-t-4', '이천 MpHub', '주간', 0, 6, 6, 0, startAt: ago(9, 30)), // 종료 30분 · 퇴근 미처리
    // ── 오늘 · 1급만 보임 ──
    _mk('j-t-5', '용인 Hub', '주간', 0, 8, 8, 0, startAt: later(0, 25)), // FULL + 대기열
    _mk('j-t-6', '군포 Hub', '주간', 0, 6, 5, 0, startAt: ago(10)), // 종료 1시간 · 퇴근 미처리
    _mk('j-t-7', '진천 MegaHub', '주간', 0, 12, 11, 1, startAt: ago(3, 10)), // 진행 중
    _mk('j-t-8', 'W힐스 웨딩홀', '오후', 0, 14, 11, 3, startAt: later(4)), // 시작 전 · 같이하기 신청
    _mk('j-t-9', '군포 Hub_A', '주간', 0, 6, 5, 0, startAt: ago(16)), // 종료 7시간 → 자동 퇴근 처리됨
    _mk('j-t-10', '안성 MpHub', '주간', 0, 10, 6, 4, startAt: later(20)), // 24시간 안
    _mk('j-t-11', 'L타워 웨딩홀', '오후', 0, 12, 11, 1, startAt: ago(0, 50)), // 진행 중
    // ── 예정 (내일 ~ 2주) ──
    _mk('j-u-1', '곤지암 MegaHub', '주간', 1, 8, 5, 3),
    _mk('j-u-2', '이천 MpHub', '야간', 1, 6, 6, 0), // FULL + 대기열
    _mk('j-u-3', '남양주 Hub', '주간', 1, 6, 2, 4),
    _mk('j-u-4', 'L타워 웨딩홀', '오후', 2, 12, 9, 3),
    _mk('j-u-5', '곤지암 MegaHub', '주간', 2, 8, 8, 0), // FULL + 대기열
    _mk('j-u-6', '안성 MpHub', '주간', 3, 10, 4, 6),
    _mk('j-u-7', '진천 MegaHub', '야간', 4, 12, 7, 5),
    _mk('j-u-8', '용인 Hub', '주간', 5, 8, 6, 2, closed: true), // 수동 마감
    _mk('j-u-9', 'W힐스 웨딩홀', '오후', 6, 14, 8, 6),
    _mk('j-u-10', '군포 Hub_A', '주간', 8, 6, 5, 1),
    _mk('j-u-11', '이천 MpHub', '주간', 10, 6, 4, 2),
    _mk('j-u-12', '군포 Hub', '야간', 12, 6, 3, 3),
    _mk('j-u-13', '곤지암 MegaHub', '주간', 14, 8, 0, 8),
  ];
}

// 지난 공고 2주치 30건 — 11개 근무지 순환 · 사후 정정(7일) 데모 포함
List<Job> buildPastJobs() {
  const cycle = [
    '곤지암 MegaHub', '이천 MpHub', '진천 MegaHub', '용인 Hub', 'L타워 웨딩홀', '군포 Hub',
    '안성 MpHub', 'W힐스 웨딩홀', '남양주 Hub', '군포 Hub_A', '군포 Hub_B',
  ];
  return [
    for (var i = 0; i < 30; i++)
      () {
        final day = 1 + (i * 14) ~/ 30; // 1 ~ 14일 전 (8일 이상 = 정정 잠김)
        final site = cycle[(i * 3) % cycle.length];
        final p = siteOf(site)!.partner;
        // 어제 야간은 오늘 06:00 종료라 새벽엔 아직 진행 중 → 어제는 주간만
        final slot = p == '컨벤션' ? '오후' : (day > 1 && i % 4 == 3 ? '야간' : '주간');
        final cap = 6 + (i % 4) * 2;
        final ok = cap - (i % 3 == 0 ? 1 : 0) - (i % 7 == 6 ? 1 : 0);
        return _mk('j-p-$i', site, slot, -day, cap, ok, 0);
      }(),
  ];
}

final List<Job> gJobs = buildTodayJobs();
final List<Job> gPastJobs = buildPastJobs();

Job _job(String id) => [...gJobs, ...gPastJobs].firstWhere((j) => j.id == id);

// ─── 명단 생성 (공고 id 기준, 세션 내 고정 · 앱 시작 시 날짜순 일괄 생성) ───
final Map<String, List<Worker>> _rosterCache = {};
bool _rostersWarmed = false;

void _warmRosters() {
  if (_rostersWarmed) return;
  _rostersWarmed = true;
  final all = [...gJobs, ...gPastJobs]..sort((a, b) => a.start.compareTo(b.start));
  for (final j in all) {
    if (j.id.isNotEmpty) _rosterCache.putIfAbsent(j.id, () => _genRoster(j));
  }
}

List<Worker> rosterOf(Job job) {
  if (job.id.isEmpty) return const []; // 방금 등록한 공고 — 아직 신청자 없음
  _warmRosters();
  return _rosterCache.putIfAbsent(job.id, () => _genRoster(job));
}

String _hmOf(DateTime t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

// 날짜별로 이미 배정된 이름 — 정책 '하루 1건'을 더미에서도 지킴 (같은 날 두 공고에 같은 사람 X)
final Map<String, Set<String>> _usedByDate = {};

List<Worker> _genRoster(Job job) {
  final rnd = Random(job.id.hashCode);
  final now = DateTime.now();
  final dayKey = '${job.start.year}-${job.start.month}-${job.start.day}';
  final used = _usedByDate.putIfAbsent(dayKey, () => {});
  final names = (List.of(_names)..shuffle(rnd))
      .where((n) => !used.contains(n) && !_reservedNames.contains(n))
      .take(job.cap)
      .toList();
  used.addAll(names); // 이 공고에 들어가는 이름은 같은 날 다른 공고에서 제외
  final started = now.isAfter(job.start), ended = now.isAfter(job.end);
  final out = <Worker>[];

  if (!started) {
    // 시작 전: 확정 인원 = cap - 부족, 전원 출근 전
    for (var i = 0; i < job.cap - job.short && i < names.length; i++) {
      out.add(Worker(names[i], 'wait'));
    }
    return out;
  }
  if (ended) {
    // 종료: 결근 = cap - ok, 나머지 출근/지각 + 퇴근 기록 (6h 지나면 시스템 자동 퇴근 = 기록 없어도 '자동')
    final absent = (job.cap - job.ok).clamp(0, job.cap);
    final autoDone = now.difference(job.end).inHours >= Policy.autoCheckoutHours;
    for (var i = 0; i < names.length; i++) {
      if (i < absent) {
        out.add(Worker(names[i], 'absent'));
      } else {
        final r = rnd.nextInt(10);
        final st = r < 2 ? 'late' : 'ok';
        final t = st == 'late'
            ? job.start.add(Duration(minutes: 8 + rnd.nextInt(20)))
            : job.start.subtract(Duration(minutes: rnd.nextInt(12)));
        // 퇴근 기록: 6h 지났으면 대부분 GPS 기록 / 최근 종료면 약 60%만 (나머지 = 퇴근 미처리 → 수동 처리 대상)
        final checkedOut = autoDone ? rnd.nextInt(10) < 8 : rnd.nextInt(10) < 6;
        final outT = checkedOut ? _hmOf(job.end.add(Duration(minutes: rnd.nextInt(9) - 3))) : null;
        out.add(Worker(names[i], st, _hmOf(t), null, null, outT));
      }
    }
    return out;
  }
  // 진행 중: 미도착 = short, 나머지 출근/지각 — 퇴근 기록 없음 (알바생 앱 [퇴근]은 종료 후에만 활성화, 조퇴는 관리자 표시)
  for (var i = 0; i < names.length; i++) {
    if (i < job.short) {
      out.add(Worker(names[i], 'none'));
    } else {
      final r = rnd.nextInt(10);
      final st = r < 2 ? 'late' : 'ok';
      final t = st == 'late'
          ? job.start.add(Duration(minutes: 8 + rnd.nextInt(20)))
          : job.start.subtract(Duration(minutes: rnd.nextInt(12)));
      out.add(Worker(names[i], st, _hmOf(t)));
    }
  }
  return out;
}

// ─── GPS 영역 밖 퇴근 승인 대기 (공고별) — (사유, 거리, 종료 후 몇 분에 제출) ───
const _gpsSpecs = {
  'j-t-1': ('몸이 안 좋아 먼저 나왔어요. 정문 밖에서 눌렀어요', '영역 밖 210m', -25), // 진행 중
  'j-t-4': ('셔틀 정류장까지 이동 후 퇴근 처리했어요', '영역 밖 180m', 4),
  'j-t-6': ('상차장 뒤편 출구로 나왔어요', '영역 밖 95m', -2),
  'j-p-0': ('배터리 방전으로 늦게 켰어요', '영역 밖 420m', 31), // 6h 지나 자동 퇴근됐지만 사유는 남음
};
final Map<String, GpsReq> _gpsCache = {};

List<GpsReq> gpsReqsOf(Job job) {
  final spec = _gpsSpecs[job.id];
  if (spec == null) return const [];
  final req = _gpsCache[job.id] ??= () {
    // 명단 뒤쪽의 정상 출근 + 퇴근 기록 없는 사람 한 명 (세션 내 고정)
    final w = rosterOf(job).where((w) => w.status == 'ok' && w.outTime == null).lastOrNull;
    final now = DateTime.now();
    final at = now.isAfter(job.end) ? job.end.add(Duration(minutes: spec.$3)) : now.add(Duration(minutes: spec.$3));
    return GpsReq(w?.name ?? '', spec.$1, spec.$2, _hmOf(at), at);
  }();
  if (req.name.isEmpty) return const [];
  // 이미 퇴근 기록이 생겼거나(승인·반려·수동) 출근 상태가 아니면 제출 건은 의미 없음
  final w = workerOf(job, req.name);
  if (w == null) return const [];
  final s = effStatus(job, w);
  if ((s != 'ok' && s != 'late') || outRecordOf(job, w) != null) return const [];
  return [req];
}

// ─── 승인 탭 ───
class PendingApp {
  final String name, siteName, slotTime, note, flag;
  final bool danger;
  final String? buddy; // 같이하기 짝꿍 이름 — 승인·거절이 둘 다 같이 처리됨 (기획 §4-9)
  final String? jobId; // 신청한 공고 — 승인 시 그 공고의 공지를 자동 전달
  final DateTime appliedAt; // 신청 시각 — 승인 대기 시간 (정책: 최대 6시간)
  final String? buddyState; // 같이하기 짝 응답: accepted / pending (pending이면 승인 불가)
  const PendingApp(this.name, this.siteName, this.slotTime, this.note, this.flag,
      {this.danger = false, this.buddy, this.jobId, required this.appliedAt, this.buddyState});
}

// ─── 같이하기(Buddy) 페어 — 공고별 (→ applications.buddy_app_id 교체 지점) ───
// 1:1 페어만 · 보너스 +3,000P 각자 = 둘 다 정시 출근(ok) + 정상 퇴근일 때만 자동
const _buddyJobs = {'j-t-1', 'j-t-4', 'j-t-5', 'j-u-1', 'j-u-2', 'j-p-0', 'j-p-3', 'j-p-8', 'j-p-14', 'j-p-21'};
final Map<String, Map<String, String>> _buddyCache = {};

Map<String, String> buddyMapOf(Job job) {
  if (!_buddyJobs.contains(job.id)) return const {};
  return _buddyCache.putIfAbsent(job.id, () {
    final r = rosterOf(job);
    if (r.length < 4) return {};
    final a = r[r.length - 1].name, b = r[r.length - 2].name; // 명단 뒤쪽 두 명을 짝으로
    return {a: b, b: a};
  });
}

String? buddyOf(Job job, String name) => buddyMapOf(job)[name];

class CancelReq {
  final String name, siteName, slotTime, reason, appliedAt, cancelledAt;
  final int beforeMin; // 근무 시작 몇 분 전에 취소했나 (12시간 이내만 검토 대상)
  final String category; // 단순변심 / 질병 / 가족 / 교통 / 천재지변 / 기타 — 권고 처리 기준
  const CancelReq(this.name, this.siteName, this.slotTime, this.reason, this.beforeMin,
      this.appliedAt, this.cancelledAt, [this.category = '기타']);
}

const cancelCategories = ['단순변심', '질병', '가족', '교통', '천재지변', '기타'];

// 40 → '40분', 200 → '3시간 20분', 660 → '11시간'
String beforeLabel(int m) {
  final h = m ~/ 60, mm = m % 60;
  if (h > 0 && mm > 0) return '$h시간 $mm분';
  if (h > 0) return '$h시간';
  return '$m분';
}

class WaitEntry {
  final String name, siteName, slotTime;
  final int order;
  final DateTime deadline;
  const WaitEntry(this.name, this.siteName, this.slotTime, this.order, this.deadline);
}

// 오늘/내일/날짜 + 시간대 + 시각 — 승인·취소 카드에 쓰는 공고 한 줄
String _dayWord(Job j) {
  final s0 = DateTime(j.start.year, j.start.month, j.start.day);
  final diff = s0.difference(_today0()).inDays;
  return diff == 0 ? '오늘' : (diff == 1 ? '내일' : j.dateLabel);
}

String _slotTime(Job j) => '${_dayWord(j)} ${j.slot} ${j.timeLabel}';

PendingApp _app(String name, String jobId, String note,
    {bool danger = false, String? buddy, String? buddyState, required int agoMin}) {
  final j = _job(jobId);
  final now = DateTime.now();
  final flag = danger ? '협의대상' : (j.start.difference(now).inHours < 12 ? '12시간 이내' : '경고 누적');
  return PendingApp(name, j.site, _slotTime(j), note, flag,
      danger: danger, buddy: buddy, jobId: jobId,
      appliedAt: now.subtract(Duration(minutes: agoMin)), buddyState: buddyState);
}

// 신청 대기 9건 — 12시간 이내 / 협의대상 / 같이하기 2쌍(1쌍은 짝 응답 대기) · 신청 30분~7시간 전
final List<PendingApp> _pendingAll = () {
  final negAt = DateTime.now().subtract(const Duration(days: 28));
  return [
    _app('한지민', 'j-t-3', '단골 · 출근 12회', buddy: '류지안', buddyState: 'accepted', agoMin: 95),
    _app('류지안', 'j-t-3', '성실 A', buddy: '한지민', buddyState: 'accepted', agoMin: 95),
    _app('오세훈', 'j-t-2', '경고 3회', danger: true, agoMin: 6 * 60 + 40), // 6시간 초과
    _app('백소라', 'j-u-1', '경고 2회', agoMin: 30),
    _app('전소민', 'j-u-2', '협의대상 등록 ${negAt.month}/${negAt.day}', danger: true, agoMin: 4 * 60 + 10),
    _app('김민준', 'j-t-5', '보통 C', agoMin: 55), // FULL 공고 → 승인 시 정원 검사에 걸림
    _app('도경수', 'j-u-3', '경고 2회', agoMin: 3 * 60),
    _app('박준영', 'j-t-8', '성실 B', buddy: '최유나', buddyState: 'accepted', agoMin: 120),
    _app('최유나', 'j-t-8', '경고 1회', buddy: '박준영', buddyState: 'pending', agoMin: 120), // 짝 응답 대기
  ];
}();

CancelReq _cancel(String name, String jobId, String reason, String category, int agoMin, int appliedDaysAgo) {
  final j = _job(jobId);
  final now = DateTime.now();
  final cancelledAt = now.subtract(Duration(minutes: agoMin));
  final beforeMin = j.start.difference(cancelledAt).inMinutes.clamp(1, 99999);
  return CancelReq(name, j.site, _slotTime(j), reason, beforeMin,
      hmOf(now.subtract(Duration(days: appliedDaysAgo, minutes: 37))), hmOf(cancelledAt), category);
}

// 취소 검토 6건 — 6개 사유 분류 전부
final List<CancelReq> _cancelAll = [
  _cancel('홍길동', 'j-t-3', '개인사정 (단순 변심)', '단순변심', 5, 3),
  _cancel('나예린', 'j-t-2', '본인 질병 (병원 진단서 있음)', '질병', 40, 5),
  _cancel('감우주', 'j-t-8', '가족 응급 — 부친 입원', '가족', 15, 1),
  _cancel('차민규', 'j-t-10', '통근버스 놓침, 대체 교통 없음', '교통', 120, 2),
  _cancel('신유나', 'j-t-2', '폭우로 도로 통제 (진입 불가)', '천재지변', 200, 4),
  _cancel('한별이', 'j-u-1', '면접 일정이 겹쳐서요', '기타', 30, 6),
];

// ─── 대기열 (공고별) — FULL 시 줄서기, 모집×2까지. 취소 나면 1번에게 자동 제안 ───
class WaitRow {
  final String name;
  final int order;
  String status; // waiting(대기 중) / offered(자리 제안 중) / auto_rejected(시간 초과) — 관리자 수동 제안으로 바뀔 수 있음
  DateTime? deadline; // offered일 때 수락 마감
  WaitRow(this.name, this.order, this.status, [this.deadline]);
}

// 공고 id → (이름, 상태, 제안 마감까지 초)
const _waitSpecs = {
  'j-t-5': [('서지우', 'offered', 28 * 60 + 14), ('임하늘', 'waiting', 0), ('조은비', 'waiting', 0)],
  'j-u-2': [('조은비', 'offered', 112 * 60), ('배수지', 'waiting', 0)],
  'j-u-5': [('배수지', 'offered', 4 * 60 + 30), ('고은채', 'waiting', 0), ('김철수', 'waiting', 0)],
};

final Map<String, List<WaitRow>> _waitCache = {};

// 반환 리스트는 캐시된 가변 리스트 — [대기열로 이동] 등으로 추가한 행이 유지됨
List<WaitRow> waitlistOf(Job job) {
  final spec = _waitSpecs[job.id] ?? const [];
  return _waitCache.putIfAbsent(job.id, () {
    final now = DateTime.now();
    return [
      for (var i = 0; i < spec.length; i++)
        WaitRow(spec[i].$1, i + 1, spec[i].$2,
            spec[i].$2 == 'offered' ? now.add(Duration(seconds: spec[i].$3)) : null),
    ];
  });
}

bool _scoped(Admin a, String siteName) => a.sites == null || a.sites!.contains(siteName);
// 처리된 건 (앱 전역) — 하단 탭 배지와 목록이 같은 숫자를 보도록. 키: appKey() / 'cancel|이름|근무지'
final Set<String> gDecided = {};
List<PendingApp> pendingAppsFor(Admin a) =>
    _pendingAll.where((p) => _scoped(a, p.siteName) && !gDecided.contains(appKey(p))).toList();
List<CancelReq> cancelReqsFor(Admin a) => _cancelAll
    .where((c) => _scoped(a, c.siteName) && !gDecided.contains('cancel|${c.name}|${c.siteName}'))
    .toList();
// 승인 탭용 — 전 공고의 대기열 중 '자리 제안 중'인 건만 (공고 상세와 같은 데이터)
List<WaitEntry> waitlistFor(Admin a) => [
      for (final j in gJobs)
        if (_scoped(a, j.site))
          for (final r in waitlistOf(j))
            if (r.status == 'offered')
              WaitEntry(r.name, j.site, '${j.dateLabel} ${j.slot} ${j.timeLabel}', r.order, r.deadline!),
    ];

// ─── 소통 탭 ───
class Inquiry {
  final String name, siteName, preview, status; // 답변 대기 / 진행중 / 종결
  final List<(String, String, String)> msgs; // (me|adm, text, time)
  const Inquiry(this.name, this.siteName, this.preview, this.status, this.msgs);
}

class LateReport {
  final String name, siteName, slot, reason, ago;
  final int delayMin;
  const LateReport(this.name, this.siteName, this.slot, this.delayMin, this.reason, this.ago);
}

const _inquiriesAll = [
  Inquiry('박서준', '곤지암 MegaHub', '출근 인증이 안 돼요', '답변 대기',
      [('me', '출근 인증이 안 돼요. 도착했는데 버튼이 안 눌려요', '18:22')]),
  Inquiry('최민호', '곤지암 MegaHub', '주차는 어디에 하나요?', '진행중', [
    ('me', '주차는 어디에 하나요?', '어제'),
    ('adm', '정문 옆 B주차장 이용하시면 돼요', '어제'),
    ('me', '감사합니다! B주차장 무료인가요?', '오늘 07:10'),
  ]),
  Inquiry('이수민', '이천 MpHub', '야간 근무 식사는 어떻게 하나요', '답변 대기',
      [('me', '야간 근무 식사는 어떻게 하나요? 매점 있나요', '20:05')]),
  Inquiry('강도윤', '곤지암 MegaHub', '지난주 포인트가 안 들어왔어요', '진행중', [
    ('me', '지난주 금요일 근무 포인트가 안 들어왔어요', '어제'),
    ('adm', '확인해볼게요. 퇴근 처리가 누락된 것 같아요', '어제'),
  ]),
  Inquiry('임하늘', '용인 Hub', '통근버스 시간 문의', '종결', [
    ('me', '용인 통근버스 첫차 몇 시인가요', '3일 전'),
    ('adm', '작업 08:00 기준 06:40 출발이에요. 앱 통근버스 가이드에서 정류장 확인하세요', '3일 전'),
  ]),
  Inquiry('민들레', 'W힐스 웨딩홀', '복장 규정 있나요?', '답변 대기',
      [('me', '웨딩홀 서빙 복장 규정이 있나요? 검정 구두 필수인가요', '09:40')]),
];

// 늦어요 보고 3건 — 지금 진행 중인 공고의 미도착자 중에서 뽑음 (출결 화면 '지각 예정'과 항상 일치)
final List<LateReport> _lateAll = () {
  final now = DateTime.now();
  const reasons = ['버스 지연', '교통 정체', '지하철 연착'];
  const agos = ['방금', '12분 전', '25분 전'];
  final out = <LateReport>[];
  for (final j in gJobs) {
    if (!(now.isAfter(j.start) && !now.isAfter(j.end))) continue;
    final w = rosterOf(j).where((w) => w.status == 'none').firstOrNull;
    if (w == null) continue;
    out.add(LateReport(w.name, j.site, j.slot, 10 * (out.length + 1), reasons[out.length], agos[out.length]));
    if (out.length == 3) break;
  }
  return out;
}();

List<Inquiry> inquiriesFor(Admin a) => _inquiriesAll.where((i) => _scoped(a, i.siteName)).toList();
List<LateReport> lateReportsFor(Admin a) => _lateAll.where((l) => _scoped(a, l.siteName)).toList();

// 이 공고·이 사람의 "늦어요" 보고 (오늘 공고 기준) → 출결 화면 미도착 카드에 '지각 예정' 표시
LateReport? lateReportFor(Job j, String name) =>
    _lateAll.where((l) => l.name == name && l.siteName == j.site && l.slot == j.slot).firstOrNull;
