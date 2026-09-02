part of 'main.dart';

// ══════════════════════════════════════════════════════════════
//  Mock 데이터 — Supabase 연결 전 더미 (최종 현실 시나리오 테스트용)
//  ★ 이 파일 전체가 교체 지점입니다.
//    rosterOf / gpsReqsOf / pendingAppsFor / cancelReqsFor / waitlistFor /
//    inquiriesFor / lateReportsFor / buildTodayJobs / buildPastJobs
//    → 같은 시그니처로 Supabase 조회 함수를 만들면 화면 코드는 그대로 동작.
//  ★ 모든 날짜·시각은 DateTime.now() 기준 상대값 (고정 날짜 없음) — 언제 열어도 "오늘" 데이터
//  ★ 기간: 지난주 월~일 + 이번 주 + 다음 주 (3주)
//  ★ 명단은 앱 시작 시 날짜순으로 한 번에 생성 (화면 여는 순서와 무관하게 항상 같은 결과)
//  ★ 인위적 테스트 케이스(정원 초과 신청 등) 없음 — 전부 정상 운영 상황만
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
// 라벨 분포: 단골 5 · 성실 A/B 다수 · 보통 C/D · 경고 1~2회 · 협의대상 3명 · 출금 대기 4명
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
  Member('배수지', '010-2240-1140', '단골 · 출근 16회'),
];

// 명단 생성용 이름 풀 — 회원 40 + 추가 10 = 총 50명
const _extraNames = [
  '강하늘', '고윤정', '김가영', '박건우', '서현진', '송강', '이도현', '정해인', '차은우', '한소희',
];
final List<String> _names = [...mockMembers.map((m) => m.name), ..._extraNames];

// 승인·취소·대기열 더미에 쓰는 이름 — 명단 생성에서 제외 (같은 날 중복 배정 검사와 충돌하지 않도록)
const _reservedNames = {
  '한지민', '류지안', '도경수', '오세훈', '백소라', '전소민', // 신청 대기
  '홍길동', '나예린', '감우주', '신유나', // 취소 검토
  '서지우', '임하늘', '조은비', // 대기열
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

// 이번 주 월요일 (오늘 기준 일 오프셋, 0 이하) — 지난주/이번 주/다음 주 범위 계산용
int get _monOffset => 1 - _today0().weekday;

(int, int) _slotHours(String slot) => switch (slot) {
      '야간' => (22, 6),
      '오후' => (11, 19),
      '새벽' => (4, 12),
      _ => (8, 17),
    };

// 공고 생성 — dayOffset(일 단위) 기준, startAt 주면 시작 시각을 현재 기준 상대값으로 덮어씀
Job _mk(String id, String site, String slot, int dayOffset, int cap, int ok, int short,
    {DateTime? startAt, bool closed = false, bool contract = true, bool safety = true}) {
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
  return Job(site, slot, st, start, end, cap, ok, short,
      id: id, desc: _defaultDesc(site, slot), closed: closed, contract: contract, safety: safety);
}

// 오늘 + 예정 공고 — 오늘 6건은 항상 현재 시각 기준으로 배치
//   진행 중 2 (j-t-1 곤지암 · j-t-2 진천) / 시작 전 3 (j-t-3 곤지암 야간 · j-t-5 L타워 · j-t-6 이천 22:00)
//   종료 1 (j-t-4 이천 — 퇴근 확인 필요 + GPS 사유 1건)
// 예정은 내일부터 다음 주 일요일까지 하루 2건 안팎 (j-u-2 = FULL+대기열, j-u-5 = 수동 마감)
List<Job> buildTodayJobs() {
  final now = DateTime.now();
  DateTime ago(int h, [int m = 0]) => now.subtract(Duration(hours: h, minutes: m));
  DateTime later(int h, [int m = 0]) => now.add(Duration(hours: h, minutes: m));
  // 오늘 22:00 야간 — 21시가 넘었으면 내일 22:00 (항상 곧 시작하는 야간 공고 하나 유지)
  var night = DateTime(now.year, now.month, now.day, 22);
  if (now.isAfter(night.subtract(const Duration(hours: 1)))) night = night.add(const Duration(days: 1));

  final jobs = <Job>[
    // ── 오늘 · 2급 담당(곤지암·이천) ──
    _mk('j-t-1', '곤지암 MegaHub', '주간', 0, 8, 6, 2, startAt: ago(1, 40)), // 진행 중 · 미도착 2 (늦어요 보고)
    _mk('j-t-3', '곤지암 MegaHub', '야간', 0, 6, 4, 2, startAt: later(5, 30)), // 시작 전 · 신청 대기(같이하기 쌍)
    _mk('j-t-4', '이천 MpHub', '주간', 0, 6, 6, 0, startAt: ago(9, 40)), // 종료 40분 · 퇴근 확인 + GPS 사유 1건
    _mk('j-t-6', '이천 MpHub', '야간', 0, 6, 4, 2, startAt: night), // 오늘 야간 22:00 · 협의대상 신청 대기
    // ── 오늘 · 1급만 보임 ──
    _mk('j-t-2', '진천 MegaHub', '주간', 0, 6, 5, 1, startAt: ago(2, 10)), // 진행 중
    _mk('j-t-5', 'L타워 웨딩홀', '오후', 0, 4, 3, 1, startAt: later(3)), // 시작 전 (12시간 이내 신청 대기)
    // ── 예정 · 시나리오 지정 ──
    _mk('j-u-1', '곤지암 MegaHub', '주간', 1, 8, 5, 3), // 내일 · 신청 대기 1
    _mk('j-u-2', '이천 MpHub', '야간', 1, 6, 6, 0), // 내일 · 정상 FULL + 대기열 3명 (신청 홀드 없음)
    _mk('j-u-3', '용인 Hub', '주간', 2, 8, 6, 2), // 모레 · 협의대상 신청 대기 1
    _mk('j-u-4', 'W힐스 웨딩홀', '오후', 2, 8, 5, 3),
    _mk('j-u-5', '안성 MpHub', '주간', 3, 8, 6, 2, closed: true), // 수동 마감
  ];

  // ── 예정 채움 — 모레+1일부터 다음 주 일요일까지 하루 2건 (야간 섞임) ──
  const upSites = [
    '진천 MegaHub', '군포 Hub_A', 'L타워 웨딩홀', '군포 Hub', '남양주 Hub', '이천 MpHub',
    '곤지암 MegaHub', '용인 Hub', 'W힐스 웨딩홀', '안성 MpHub', '군포 Hub_B',
  ];
  final lastDay = _monOffset + 13; // 다음 주 일요일
  var n = 6;
  for (var d = 3; d <= lastDay; d++) {
    for (var k = 0; k < 2; k++) {
      final site = upSites[(d * 2 + k) % upSites.length];
      final p = siteOf(site)!.partner;
      final slot = p == '컨벤션' ? '오후' : (k == 1 && d % 3 == 0 ? '야간' : '주간');
      final cap = 6 + ((d + k) % 3) * 2; // 6 / 8 / 10
      final short = 2 + k * 2; // 아직 자리 남은 모집 중 공고
      jobs.add(_mk('j-u-$n', site, slot, d, cap, cap - short, short));
      n++;
    }
  }
  return jobs;
}

// 지난 공고 — 지난주 월~일 18건 + 이번 주 지난 날 하루 2건 (전부 처리 완료 · 대기 건 없음)
List<Job> buildPastJobs() {
  const cycle = [
    '곤지암 MegaHub', '이천 MpHub', '진천 MegaHub', '용인 Hub', 'L타워 웨딩홀', '군포 Hub',
    '안성 MpHub', 'W힐스 웨딩홀', '남양주 Hub', '군포 Hub_A', '군포 Hub_B',
  ];
  final out = <Job>[];
  var i = 0;
  void add(int off, int k) {
    final site = cycle[(i * 3) % cycle.length];
    final p = siteOf(site)!.partner;
    // 어제 야간은 오늘 06:00 종료 — 새벽엔 아직 진행 중일 수 있어 어제(-1)는 주간만
    final slot = p == '컨벤션' ? '오후' : (k == 2 && off < -1 ? '야간' : '주간');
    final cap = 6 + (i % 3) * 2;
    final ok = cap - (i % 3 == 0 ? 1 : 0) - (i % 5 == 4 ? 1 : 0); // 결근 0~2명 섞임
    out.add(_mk('j-p-$i', site, slot, off, cap, ok, 0));
    i++;
  }

  // 지난주 월~일 — 3·2건 교대 = 18건
  for (var d = 0; d < 7; d++) {
    final off = _monOffset - 7 + d;
    for (var k = 0; k < (d.isEven ? 3 : 2); k++) {
      add(off, k);
    }
  }
  // 이번 주 지난 날 — 하루 2건 (오늘이 월요일이면 없음)
  for (var off = _monOffset; off < 0; off++) {
    add(off, 0);
    add(off, 2);
  }
  return out;
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

// ─── GPS 영역 밖 퇴근 승인 대기 — 오늘 방금 종료된 공고 1건만 (사유, 거리, 종료 후 몇 분에 제출) ───
const _gpsSpecs = {
  'j-t-4': ('셔틀 정류장까지 이동 후 퇴근 버튼을 눌렀어요', '영역 밖 180m', 6),
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
const _buddyJobs = {'j-t-1', 'j-t-4', 'j-p-2', 'j-p-9', 'j-p-15'};
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
  final String category; // 단순변심 / 질병 / 가족 / 교통 / 천재지변 / 기타 — 권고 처리 기준 (코드 키는 CancelCategory · UI는 한국어 라벨)
  const CancelReq(this.name, this.siteName, this.slotTime, this.reason, this.beforeMin,
      this.appliedAt, this.cancelledAt, [this.category = '기타']);
}

const cancelCategories = CancelCategory.labels; // 한국어 라벨 (코드 키 → CancelCategory.codes)

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

// 신청 대기 6건 — 전부 정상 케이스 (모든 공고 확정+홀드 ≤ 정원)
//   12시간 이내 3 (같이하기 쌍 포함) · 협의대상 2 · 경고 누적 1 · 신청 30분~4시간 전
final List<PendingApp> _pendingAll = [
  _app('한지민', 'j-t-3', '단골 · 출근 12회', buddy: '류지안', buddyState: 'accepted', agoMin: 95), // 같이하기 쌍 (둘 다 수락)
  _app('류지안', 'j-t-3', '성실 A', buddy: '한지민', buddyState: 'accepted', agoMin: 95),
  _app('도경수', 'j-t-5', '경고 2회', agoMin: 50), // 12시간 이내
  _app('오세훈', 'j-t-6', '협의대상 · 경고 3회', danger: true, agoMin: 4 * 60 + 10),
  _app('백소라', 'j-u-1', '경고 2회', agoMin: 30),
  _app('전소민', 'j-u-3', '협의대상 · 경고 3회', danger: true, agoMin: 2 * 60 + 20),
];

CancelReq _cancel(String name, String jobId, String reason, String category, int agoMin, int appliedDaysAgo) {
  final j = _job(jobId);
  final now = DateTime.now();
  final cancelledAt = now.subtract(Duration(minutes: agoMin));
  final beforeMin = j.start.difference(cancelledAt).inMinutes.clamp(1, 99999);
  return CancelReq(name, j.site, _slotTime(j), reason, beforeMin,
      hmOf(now.subtract(Duration(days: appliedDaysAgo, minutes: 37))), hmOf(cancelledAt), category);
}

// 취소 검토 4건 — 사유 분류 혼합 (전부 오늘 시작 전 공고 = 12시간 이내 취소)
final List<CancelReq> _cancelAll = [
  _cancel('홍길동', 'j-t-3', '개인 사정으로 못 가게 됐어요', '단순변심', 5, 3),
  _cancel('나예린', 'j-t-6', '몸살 기운이 심해서요 (병원 방문 예정)', '질병', 40, 5),
  _cancel('감우주', 'j-t-5', '통근버스를 놓쳤고 대체 교통이 없어요', '교통', 70, 2),
  _cancel('신유나', 'j-t-3', '모친 병원 응급 동행', '가족', 25, 1),
];

// ─── 대기열 (공고별) — FULL 시 줄서기, 모집×2까지. 취소 나면 1번에게 자동 제안 ───
class WaitRow {
  final String name;
  final int order;
  String status; // waiting(대기 중) / offered(자리 제안 중) / auto_rejected(시간 초과) — 관리자 수동 제안으로 바뀔 수 있음
  DateTime? deadline; // offered일 때 수락 마감
  WaitRow(this.name, this.order, this.status, [this.deadline]);
}

// 공고 id → (이름, 상태, 제안 마감까지 초) — FULL 공고 j-u-2에만 대기 3명 (아직 자리 안 남 = 전원 waiting)
const _waitSpecs = {
  'j-u-2': [('서지우', 'waiting', 0), ('임하늘', 'waiting', 0), ('조은비', 'waiting', 0)],
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

// 문의 5건 — 이름은 해당 공고의 실제 명단에서 뽑음 (근무지·상황이 항상 데이터와 일치)
final List<Inquiry> _inquiriesAll = () {
  // idx번째 명단 인원 이름 (명단이 비면 예비 이름)
  String pick(String jobId, int idx) {
    final r = rosterOf(_job(jobId));
    return r.isEmpty ? '박서준' : r[idx % r.length].name;
  }

  return [
    Inquiry(pick('j-t-1', 2), '곤지암 MegaHub', '출근 인증이 안 돼요', '답변 대기',
        [('me', '출근 인증이 안 돼요. 도착했는데 버튼이 안 눌려요', _hmOf(DateTime.now().subtract(const Duration(minutes: 50))))]),
    Inquiry(pick('j-t-4', 1), '이천 MpHub', '퇴근 처리가 안 된 것 같아요', '진행중', [
      ('me', '아까 퇴근했는데 앱에 기록이 안 보여요', _hmOf(DateTime.now().subtract(const Duration(minutes: 20)))),
      ('adm', '확인해볼게요. GPS 영역 밖이면 사유 승인 후 처리돼요', _hmOf(DateTime.now().subtract(const Duration(minutes: 12)))),
    ]),
    Inquiry(pick('j-t-2', 0), '진천 MegaHub', '휴게 시간에 매점 이용 가능한가요', '답변 대기',
        [('me', '휴게 시간에 매점 이용 가능한가요? 식사 제공 시간도 궁금해요', _hmOf(DateTime.now().subtract(const Duration(hours: 1))))]),
    Inquiry(pick('j-u-1', 0), '곤지암 MegaHub', '통근버스 시간 문의', '종결', [
      ('me', '곤지암 통근버스 첫차 몇 시인가요', '어제'),
      ('adm', '작업 08:00 기준 06:40 출발이에요. 앱 통근버스 가이드에서 정류장 확인하세요', '어제'),
    ]),
    Inquiry(pick('j-t-5', 0), 'L타워 웨딩홀', '복장 규정 있나요?', '답변 대기',
        [('me', '웨딩홀 서빙 복장 규정이 있나요? 검정 구두 필수인가요', _hmOf(DateTime.now().subtract(const Duration(hours: 2))))]),
  ];
}();

// 늦어요 보고 2건 — 지금 진행 중인 공고의 미도착자 중에서 뽑음 (출결 화면 '지각 예정'과 항상 일치)
final List<LateReport> _lateAll = () {
  final now = DateTime.now();
  const reasons = ['버스 지연', '교통 정체'];
  const agos = ['방금', '15분 전'];
  final out = <LateReport>[];
  for (final j in gJobs) {
    if (!(now.isAfter(j.start) && !now.isAfter(j.end))) continue;
    final w = rosterOf(j).where((w) => w.status == 'none').firstOrNull;
    if (w == null) continue;
    out.add(LateReport(w.name, j.site, j.slot, 10 * (out.length + 1), reasons[out.length], agos[out.length]));
    if (out.length == 2) break;
  }
  return out;
}();

List<Inquiry> inquiriesFor(Admin a) => _inquiriesAll.where((i) => _scoped(a, i.siteName)).toList();
List<LateReport> lateReportsFor(Admin a) => _lateAll.where((l) => _scoped(a, l.siteName)).toList();

// 이 공고·이 사람의 "늦어요" 보고 (오늘 공고 기준) → 출결 화면 미도착 카드에 '지각 예정' 표시
LateReport? lateReportFor(Job j, String name) =>
    _lateAll.where((l) => l.name == name && l.siteName == j.site && l.slot == j.slot).firstOrNull;
