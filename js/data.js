// 잡핏(JobFit) 관리자 웹 — 샘플 데이터
// 실제 앱 구현 시 Supabase 테이블과 1:1 매핑 참고용
// worksites · jobs · workers · applications · negotiations · pointTxs · admins · inquiries · waitlist · templates

const worksites = {
  cj: {
    name: 'CJ대한통운', count: 6,
    sites: [
      { id: 'gonjiam',  name: '곤지암 MegaHub', addr: '경기 광주시 도척면 진우리 산10', lat: 37.3575, lng: 127.2600, bus: true, wage: 110000, holiday: '주 4일 만근', gps: true,  vertices: 6, area: 52400, contact: '010-1234-5678', manager1: '김관리', manager2: '이담당', polygon: [[37.3570,127.2590],[37.3582,127.2592],[37.3585,127.2610],[37.3578,127.2614],[37.3565,127.2605],[37.3568,127.2595]], activeJobs: 2 },
      { id: 'yongin',   name: '용인 Hub',       addr: '경기 용인시 처인구 양지면', lat: 37.2636, lng: 127.0286, bus: true, wage: 105000, holiday: '주 4일 만근', gps: true,  vertices: 5, area: 38100, contact: '010-2345-6789', manager1: '김관리', manager2: '박담당', polygon: [[37.2630,127.0278],[37.2642,127.0280],[37.2644,127.0294],[37.2634,127.0296],[37.2628,127.0286]], activeJobs: 1 },
      { id: 'gunpo_a',  name: '군포 Hub_A',     addr: '경기 군포시 부곡동', lat: 37.3547, lng: 126.9386, bus: true, wage: 100000, holiday: '주 4일 만근', gps: true,  vertices: 4, area: 22800, contact: '010-3456-7890', manager1: '최관리', manager2: '김담당', polygon: [[37.3542,126.9380],[37.3552,126.9380],[37.3552,126.9392],[37.3542,126.9392]], activeJobs: 1 },
      { id: 'gunpo_b',  name: '군포 Hub_B',     addr: '경기 군포시 금정동', lat: 37.3617, lng: 126.9430, bus: true, wage: 100000, holiday: '주 4일 만근', gps: false, vertices: 0, area: 0, contact: '010-4567-8901', manager1: '최관리', manager2: '이담당', polygon: [], activeJobs: 0 },
      { id: 'icheon',   name: '이천 MpHub',     addr: '경기 이천시 부발읍', lat: 37.2896, lng: 127.4682, bus: true, wage: 105000, holiday: '주 4일 만근', gps: true,  vertices: 5, area: 45200, contact: '010-5678-9012', manager1: '김관리', manager2: '정담당', polygon: [[37.2890,127.4675],[37.2902,127.4676],[37.2905,127.4688],[37.2894,127.4692],[37.2888,127.4684]], activeJobs: 1 },
      { id: 'anseong',  name: '안성 MpHub',     addr: '경기 안성시 공도읍', lat: 37.0072, lng: 127.1875, bus: true, wage: 105000, holiday: '주 4일 만근', gps: true,  vertices: 6, area: 48900, contact: '010-6789-0123', manager1: '최관리', manager2: '정담당', polygon: [[37.0066,127.1868],[37.0076,127.1865],[37.0080,127.1876],[37.0078,127.1884],[37.0068,127.1882],[37.0064,127.1875]], activeJobs: 2 },
    ]
  },
  lotte: {
    name: '롯데택배', count: 3,
    sites: [
      { id: 'jincheon', name: '진천 MegaHub', addr: '충북 진천군 이월면', lat: 36.9078, lng: 127.4322, bus: true, wage: 115000, holiday: '주 4일 만근', gps: true,  vertices: 6, area: 61200, contact: '010-7890-1234', manager1: '박관리', manager2: '김담당', polygon: [[36.9072,127.4314],[36.9084,127.4313],[36.9087,127.4324],[36.9083,127.4332],[36.9073,127.4330],[36.9070,127.4321]], activeJobs: 1 },
      { id: 'namyangju',name: '남양주 Hub',   addr: '경기 남양주시 화도읍', lat: 37.6364, lng: 127.2074, bus: true, wage: 110000, holiday: '주 4일 만근', gps: false, vertices: 0, area: 0, contact: '010-8901-2345', manager1: '박관리', manager2: '이담당', polygon: [], activeJobs: 0 },
      { id: 'gunpo_l',  name: '군포 Hub',     addr: '경기 군포시 당정동', lat: 37.3489, lng: 126.9428, bus: true, wage: 105000, holiday: '주 4일 만근', gps: true,  vertices: 4, area: 24600, contact: '010-9012-3456', manager1: '박관리', manager2: '박담당', polygon: [[37.3484,126.9420],[37.3494,126.9422],[37.3494,126.9434],[37.3484,126.9434]], activeJobs: 1 },
    ]
  },
  convention: {
    name: '컨벤션', count: 2,
    sites: [
      { id: 'ltower', name: 'L타워 웨딩홀', addr: '서울 강남구 테헤란로', lat: 37.5010, lng: 127.0396, bus: false, wage: 120000, holiday: '주 2일 출근', gps: true,  vertices: 5, area: 4200, contact: '010-0123-4567', manager1: '김관리', manager2: '한담당', polygon: [[37.5008,127.0393],[37.5013,127.0393],[37.5013,127.0400],[37.5008,127.0400],[37.5006,127.0397]], activeJobs: 1 },
      { id: 'whills', name: 'W힐스 웨딩홀', addr: '서울 서초구 서초대로', lat: 37.4903, lng: 127.0167, bus: false, wage: 125000, holiday: '주 2일 출근', gps: true,  vertices: 4, area: 3800, contact: '010-1234-0987', manager1: '김관리', manager2: '한담당', polygon: [[37.4901,127.0164],[37.4906,127.0165],[37.4906,127.0171],[37.4900,127.0170]], activeJobs: 1 },
    ]
  }
};

// 오늘 기준(개발 중): 2026-04-23
const TODAY = '2026-04-23';

// 잡핏 운영 정책 상수 — 매직 넘버 통합
// 정책 변경 시 여기만 수정하면 전체 시스템 반영
const POLICY = {
  // 포인트
  POINT_MIN_WITHDRAW:    30000,   // 출금 가능 최저 보유 포인트
  POINT_WITHDRAW_UNIT:   10000,   // 출금 단위
  POINT_DAILY_MAX:      100000,   // 1일 최대 출금
  POINT_CANCEL_DEDUCT:    1000,   // 단순 변심 취소 자동 차감
  // 시간 (분 단위)
  AUTO_CHECKOUT_MIN:    6 * 60,   // 종료 + 6시간 자동 퇴근
  APPROVAL_LIMIT_MIN:   6 * 60,   // 신청 승인 6시간 초과 경고 (N19)
  URGENT_RECRUIT_MIN:  12 * 60,   // 시작 12시간 내 미충원 → 긴급
  CANCEL_FREE_MIN:     12 * 60,   // 시작 12시간 전까지 자유 취소
  // 경고
  WARN_LIMIT:                3,   // 경고 N회 누적 → 협의대상
  // 대기열
  WL_OFFER_FAR_MIN:    2 * 60,    // 24h 전 자리 제안 수락 시간
  WL_OFFER_NEAR_MIN:        30,   // 24h 이내 자리 제안 수락 시간
  WL_FACTOR:                 2,   // 대기열 상한 = cap × 이 값
};

// 공고 샘플 데이터 — 시간대: 주간/야간/새벽/웨딩
const jobs = [
  // ───── 오늘 (2026-04-23) 진행중 · 관제 시스템 주요 노출 대상 ─────
  // 시뮬 시각 15:30 기준: 종료 / 진행중 / 모집중 골고루 분포

  // 오전 일찍 종료된 공고 (effective done @ 15:30)
  { id: 'j001', siteId: 'gonjiam',   date: '2026-04-23', slot: '주간', start: '07:00', end: '15:00', cap: 30, apply: 28, wage: 110000, wageType: '일급', contact: '010-1234-5678', contract: true, safety: true },
  { id: 'j021', siteId: 'gonjiam',   date: '2026-04-23', slot: '새벽', start: '04:00', end: '09:00', cap: 20, apply: 19, wage: 112000, wageType: '일급', contact: '010-1234-5678', contract: true, safety: true },
  { id: 'j022', siteId: 'yongin',    date: '2026-04-23', slot: '주간', start: '06:00', end: '12:00', cap: 18, apply: 16, wage: 105000, wageType: '일급', contact: '010-2345-6789', contract: true, safety: true },
  { id: 'j023', siteId: 'anseong',   date: '2026-04-23', slot: '주간', start: '09:00', end: '13:00', cap: 15, apply: 13, wage: 105000, wageType: '일급', contact: '010-6789-0123', contract: true, safety: true },
  { id: 'j024', siteId: 'gunpo_a',   date: '2026-04-23', slot: '주간', start: '08:00', end: '14:00', cap: 20, apply: 18, wage: 100000, wageType: '일급', contact: '010-3456-7890', contract: true, safety: true },
  { id: 'j031', siteId: 'gunpo_b',   date: '2026-04-23', slot: '새벽', start: '02:00', end: '08:00', cap: 15, apply: 13, wage: 108000, wageType: '일급', contact: '010-4567-8901', contract: true, safety: true },

  // 진행중 (effective progress @ 15:30)
  { id: 'j003', siteId: 'jincheon',  date: '2026-04-23', slot: '주간', start: '08:00', end: '17:00', cap: 25, apply: 22, wage: 115000, wageType: '일급', contact: '010-7890-1234', contract: true, safety: false },
  { id: 'j004', siteId: 'ltower',    date: '2026-04-23', slot: '웨딩', start: '10:00', end: '18:00', cap: 12, apply: 10, wage: 120000, wageType: '일급', contact: '010-0123-4567', contract: true, safety: true },
  { id: 'j025', siteId: 'icheon',    date: '2026-04-23', slot: '주간', start: '13:00', end: '21:00', cap: 22, apply: 18, wage: 108000, wageType: '일급', contact: '010-5678-9012', contract: true, safety: true },
  { id: 'j026', siteId: 'whills',    date: '2026-04-23', slot: '웨딩', start: '11:00', end: '19:00', cap: 12, apply: 10, wage: 125000, wageType: '일급', contact: '010-1234-0987', contract: true, safety: true },
  { id: 'j027', siteId: 'gunpo_l',   date: '2026-04-23', slot: '주간', start: '14:00', end: '22:00', cap: 16, apply: 12, wage: 105000, wageType: '일급', contact: '010-9012-3456', contract: true, safety: true },
  { id: 'j032', siteId: 'namyangju', date: '2026-04-23', slot: '주간', start: '10:00', end: '16:00', cap: 12, apply: 11, wage: 110000, wageType: '일급', contact: '010-8901-2345', contract: true, safety: true },

  // 저녁/야간 예정 (effective open @ 15:30)
  { id: 'j002', siteId: 'icheon',    date: '2026-04-23', slot: '야간', start: '22:00', end: '06:00', cap: 20, apply: 20, wage: 115000, wageType: '일급', contact: '010-5678-9012', contract: true, safety: true },
  { id: 'j028', siteId: 'ltower',    date: '2026-04-23', slot: '웨딩', start: '17:00', end: '23:00', cap: 10, apply: 6,  wage: 120000, wageType: '일급', contact: '010-0123-4567', contract: true, safety: true },
  { id: 'j029', siteId: 'jincheon',  date: '2026-04-23', slot: '야간', start: '18:00', end: '02:00', cap: 20, apply: 14, wage: 118000, wageType: '일급', contact: '010-7890-1234', contract: true, safety: true },
  { id: 'j030', siteId: 'anseong',   date: '2026-04-23', slot: '야간', start: '21:00', end: '05:00', cap: 18, apply: 10, wage: 110000, wageType: '일급', contact: '010-6789-0123', contract: true, safety: true },

  // 모집 중 (내일 이후)
  { id: 'j005', siteId: 'gonjiam',  date: '2026-04-24', slot: '주간', start: '07:00', end: '15:00', cap: 30, apply: 18, wage: 110000, wageType: '일급', contact: '010-1234-5678', contract: true, safety: true },
  { id: 'j006', siteId: 'gonjiam',  date: '2026-04-24', slot: '야간', start: '22:00', end: '06:00', cap: 25, apply: 12, wage: 115000, wageType: '일급', contact: '010-1234-5678', contract: true, safety: true },
  { id: 'j007', siteId: 'yongin',   date: '2026-04-25', slot: '주간', start: '07:00', end: '15:00', cap: 20, apply: 8,  wage: 105000, wageType: '일급', contact: '010-2345-6789', contract: true, safety: true },
  { id: 'j008', siteId: 'anseong',  date: '2026-04-25', slot: '새벽', start: '04:00', end: '12:00', cap: 18, apply: 5,  wage: 108000, wageType: '일급', contact: '010-6789-0123', contract: true, safety: true },
  { id: 'j009', siteId: 'whills',   date: '2026-04-26', slot: '웨딩', start: '09:00', end: '17:00', cap: 15, apply: 7,  wage: 125000, wageType: '일급', contact: '010-1234-0987', contract: true, safety: true },
  { id: 'j010', siteId: 'gunpo_l',  date: '2026-04-26', slot: '주간', start: '08:00', end: '16:00', cap: 22, apply: 3,  wage: 105000, wageType: '일급', contact: '010-9012-3456', contract: true, safety: true },
  { id: 'j011', siteId: 'icheon',   date: '2026-04-27', slot: '주간', start: '07:00', end: '15:00', cap: 20, apply: 4,  wage: 105000, wageType: '일급', contact: '010-5678-9012', contract: true, safety: true },
  { id: 'j012', siteId: 'jincheon', date: '2026-04-28', slot: '야간', start: '22:00', end: '06:00', cap: 25, apply: 0,  wage: 120000, wageType: '일급', contact: '010-7890-1234', contract: true, safety: true },
  { id: 'j013', siteId: 'ltower',   date: '2026-04-30', slot: '웨딩', start: '10:00', end: '20:00', cap: 15, apply: 2,  wage: 120000, wageType: '일급', contact: '010-0123-4567', contract: true, safety: true },

  // 마감 (모집 완료 · 시작 전)
  { id: 'j014', siteId: 'gonjiam',  date: '2026-04-24', slot: '새벽', start: '04:00', end: '12:00', cap: 15, apply: 15, wage: 112000, wageType: '일급', contact: '010-1234-5678', contract: true, safety: true },
  { id: 'j015', siteId: 'anseong',  date: '2026-04-25', slot: '주간', start: '07:00', end: '15:00', cap: 20, apply: 20, wage: 105000, wageType: '일급', contact: '010-6789-0123', contract: true, safety: true },
  { id: 'j016', siteId: 'gunpo_a',  date: '2026-04-26', slot: '주간', start: '08:00', end: '16:00', cap: 18, apply: 18, wage: 100000, wageType: '일급', contact: '010-3456-7890', contract: true, safety: true },

  // 종료 (과거)
  { id: 'j017', siteId: 'gonjiam',  date: '2026-04-22', slot: '주간', start: '07:00', end: '15:00', cap: 30, apply: 29, wage: 110000, wageType: '일급', contact: '010-1234-5678', contract: true, safety: true },
  { id: 'j018', siteId: 'jincheon', date: '2026-04-22', slot: '야간', start: '22:00', end: '06:00', cap: 25, apply: 24, wage: 120000, wageType: '일급', contact: '010-7890-1234', contract: true, safety: true },
  { id: 'j019', siteId: 'whills',   date: '2026-04-20', slot: '웨딩', start: '10:00', end: '18:00', cap: 15, apply: 14, wage: 125000, wageType: '일급', contact: '010-1234-0987', contract: true, safety: true },
  { id: 'j020', siteId: 'icheon',   date: '2026-04-21', slot: '주간', start: '07:00', end: '15:00', cap: 20, apply: 19, wage: 105000, wageType: '일급', contact: '010-5678-9012', contract: true, safety: true },
];

// 알바생(근무자) 샘플 데이터
const workers = [
  { id: 'w001', name: '김서연', phone: '010-1111-2001', warnings: 0, total: 45, noshow: 0, negotiation: false, points: 54000,  lastWorked: '2026-04-22', joinedAt: '2025-08-14', favParts: ['cj','convention'] },
  { id: 'w002', name: '이준호', phone: '010-1111-2002', warnings: 3, total: 12, noshow: 3, negotiation: true,  points: 8500,   lastWorked: '2026-03-30', joinedAt: '2025-11-02', favParts: ['cj'] },
  { id: 'w003', name: '박민지', phone: '010-1111-2003', warnings: 2, total: 28, noshow: 1, negotiation: false, points: 31000,  lastWorked: '2026-04-20', joinedAt: '2025-09-10', favParts: ['lotte'] },
  { id: 'w004', name: '최예린', phone: '010-1111-2004', warnings: 0, total: 8,  noshow: 0, negotiation: false, points: 12000,  lastWorked: '2026-04-18', joinedAt: '2026-02-01', favParts: ['convention'] },
  { id: 'w005', name: '정다은', phone: '010-1111-2005', warnings: 1, total: 33, noshow: 1, negotiation: false, points: 47000,  lastWorked: '2026-04-21', joinedAt: '2025-07-22', favParts: ['cj','lotte'] },
  { id: 'w006', name: '강시우', phone: '010-1111-2006', warnings: 3, total: 7,  noshow: 4, negotiation: true,  points: 3000,   lastWorked: '2026-03-15', joinedAt: '2025-12-18', favParts: ['cj'] },
  { id: 'w007', name: '한지민', phone: '010-1111-2007', warnings: 0, total: 62, noshow: 0, negotiation: false, points: 132000, lastWorked: '2026-04-23', joinedAt: '2025-04-05', favParts: ['cj','lotte','convention'] },
  { id: 'w008', name: '오채원', phone: '010-1111-2008', warnings: 0, total: 3,  noshow: 0, negotiation: false, points: 5500,   lastWorked: '2026-04-19', joinedAt: '2026-03-28', favParts: [] },
  { id: 'w009', name: '송현우', phone: '010-1111-2009', warnings: 2, total: 19, noshow: 2, negotiation: false, points: 28000,  lastWorked: '2026-04-15', joinedAt: '2025-10-11', favParts: ['lotte'] },
  { id: 'w010', name: '윤하늘', phone: '010-1111-2010', warnings: 0, total: 51, noshow: 0, negotiation: false, points: 89000,  lastWorked: '2026-04-22', joinedAt: '2025-06-30', favParts: ['cj','convention'] },
  // 추가 40명 — 다양한 프로필 (경고/협의대상/신규/베테랑 혼합)
  { id: 'w011', name: '정수아', phone: '010-2222-3011', warnings: 0, total: 5,  noshow: 0, negotiation: false, points: 8000,   lastWorked: '2026-04-19', joinedAt: '2026-02-14', favParts: ['cj'] },
  { id: 'w012', name: '김태현', phone: '010-2222-3012', warnings: 0, total: 28, noshow: 0, negotiation: false, points: 42000,  lastWorked: '2026-04-22', joinedAt: '2025-09-03', favParts: ['lotte','convention'] },
  { id: 'w013', name: '이서우', phone: '010-2222-3013', warnings: 1, total: 15, noshow: 1, negotiation: false, points: 18000,  lastWorked: '2026-04-18', joinedAt: '2025-12-01', favParts: ['cj'] },
  { id: 'w014', name: '박도윤', phone: '010-2222-3014', warnings: 0, total: 3,  noshow: 0, negotiation: false, points: 6500,   lastWorked: '2026-04-20', joinedAt: '2026-03-15', favParts: [] },
  { id: 'w015', name: '최하윤', phone: '010-2222-3015', warnings: 2, total: 22, noshow: 2, negotiation: false, points: 27000,  lastWorked: '2026-04-17', joinedAt: '2025-10-08', favParts: ['cj','lotte'] },
  { id: 'w016', name: '정예준', phone: '010-2222-3016', warnings: 0, total: 58, noshow: 0, negotiation: false, points: 95000,  lastWorked: '2026-04-23', joinedAt: '2025-05-12', favParts: ['lotte'] },
  { id: 'w017', name: '강지우', phone: '010-2222-3017', warnings: 0, total: 12, noshow: 0, negotiation: false, points: 17000,  lastWorked: '2026-04-21', joinedAt: '2025-11-20', favParts: ['convention'] },
  { id: 'w018', name: '조서연', phone: '010-2222-3018', warnings: 0, total: 38, noshow: 0, negotiation: false, points: 61000,  lastWorked: '2026-04-22', joinedAt: '2025-07-18', favParts: ['cj','convention'] },
  { id: 'w019', name: '윤민재', phone: '010-2222-3019', warnings: 3, total: 9,  noshow: 4, negotiation: true,  points: 2500,   lastWorked: '2026-02-28', joinedAt: '2025-12-05', favParts: ['cj'] },
  { id: 'w020', name: '장수아', phone: '010-2222-3020', warnings: 0, total: 25, noshow: 0, negotiation: false, points: 38000,  lastWorked: '2026-04-20', joinedAt: '2025-08-25', favParts: ['lotte'] },
  { id: 'w021', name: '임지호', phone: '010-2222-3021', warnings: 1, total: 7,  noshow: 1, negotiation: false, points: 11000,  lastWorked: '2026-04-16', joinedAt: '2026-01-22', favParts: ['cj'] },
  { id: 'w022', name: '한채원', phone: '010-2222-3022', warnings: 0, total: 41, noshow: 0, negotiation: false, points: 72000,  lastWorked: '2026-04-23', joinedAt: '2025-06-10', favParts: ['cj','convention','lotte'] },
  { id: 'w023', name: '오건우', phone: '010-2222-3023', warnings: 0, total: 18, noshow: 0, negotiation: false, points: 29000,  lastWorked: '2026-04-22', joinedAt: '2025-10-30', favParts: ['lotte'] },
  { id: 'w024', name: '서하은', phone: '010-2222-3024', warnings: 2, total: 14, noshow: 1, negotiation: false, points: 16000,  lastWorked: '2026-04-10', joinedAt: '2025-09-28', favParts: ['cj'] },
  { id: 'w025', name: '신지유', phone: '010-2222-3025', warnings: 0, total: 6,  noshow: 0, negotiation: false, points: 9500,   lastWorked: '2026-04-21', joinedAt: '2026-02-03', favParts: [] },
  { id: 'w026', name: '권도윤', phone: '010-2222-3026', warnings: 0, total: 32, noshow: 0, negotiation: false, points: 48000,  lastWorked: '2026-04-22', joinedAt: '2025-08-05', favParts: ['cj'] },
  { id: 'w027', name: '황유나', phone: '010-2222-3027', warnings: 0, total: 2,  noshow: 0, negotiation: false, points: 4000,   lastWorked: '2026-04-19', joinedAt: '2026-04-01', favParts: [] },
  { id: 'w028', name: '안우진', phone: '010-2222-3028', warnings: 3, total: 11, noshow: 3, negotiation: true,  points: 5000,   lastWorked: '2026-03-22', joinedAt: '2025-11-08', favParts: ['cj'] },
  { id: 'w029', name: '송예린', phone: '010-2222-3029', warnings: 0, total: 47, noshow: 0, negotiation: false, points: 84000,  lastWorked: '2026-04-23', joinedAt: '2025-05-25', favParts: ['convention','cj'] },
  { id: 'w030', name: '유지후', phone: '010-2222-3030', warnings: 1, total: 20, noshow: 1, negotiation: false, points: 24000,  lastWorked: '2026-04-20', joinedAt: '2025-10-15', favParts: ['lotte'] },
  { id: 'w031', name: '홍지민', phone: '010-2222-3031', warnings: 0, total: 10, noshow: 0, negotiation: false, points: 14000,  lastWorked: '2026-04-18', joinedAt: '2026-01-05', favParts: ['cj'] },
  { id: 'w032', name: '김현우', phone: '010-2222-3032', warnings: 0, total: 35, noshow: 0, negotiation: false, points: 55000,  lastWorked: '2026-04-22', joinedAt: '2025-07-22', favParts: ['cj','lotte'] },
  { id: 'w033', name: '이민우', phone: '010-2222-3033', warnings: 0, total: 16, noshow: 0, negotiation: false, points: 22000,  lastWorked: '2026-04-21', joinedAt: '2025-12-14', favParts: ['convention'] },
  { id: 'w034', name: '박서윤', phone: '010-2222-3034', warnings: 2, total: 26, noshow: 2, negotiation: false, points: 35000,  lastWorked: '2026-04-14', joinedAt: '2025-09-12', favParts: ['cj'] },
  { id: 'w035', name: '최예지', phone: '010-2222-3035', warnings: 0, total: 44, noshow: 0, negotiation: false, points: 68000,  lastWorked: '2026-04-23', joinedAt: '2025-06-28', favParts: ['lotte','convention'] },
  { id: 'w036', name: '정하늘', phone: '010-2222-3036', warnings: 0, total: 8,  noshow: 0, negotiation: false, points: 12500,  lastWorked: '2026-04-17', joinedAt: '2026-02-20', favParts: ['cj'] },
  { id: 'w037', name: '강민재', phone: '010-2222-3037', warnings: 0, total: 4,  noshow: 0, negotiation: false, points: 7000,   lastWorked: '2026-04-15', joinedAt: '2026-03-08', favParts: [] },
  { id: 'w038', name: '조지호', phone: '010-2222-3038', warnings: 1, total: 21, noshow: 1, negotiation: false, points: 26000,  lastWorked: '2026-04-19', joinedAt: '2025-11-25', favParts: ['cj','lotte'] },
  { id: 'w039', name: '윤예린', phone: '010-2222-3039', warnings: 0, total: 30, noshow: 0, negotiation: false, points: 45000,  lastWorked: '2026-04-22', joinedAt: '2025-08-18', favParts: ['convention'] },
  { id: 'w040', name: '장건우', phone: '010-2222-3040', warnings: 0, total: 52, noshow: 0, negotiation: false, points: 98000,  lastWorked: '2026-04-23', joinedAt: '2025-04-30', favParts: ['cj','lotte','convention'] },
  { id: 'w041', name: '임민지', phone: '010-2222-3041', warnings: 0, total: 13, noshow: 0, negotiation: false, points: 19000,  lastWorked: '2026-04-20', joinedAt: '2025-12-20', favParts: ['lotte'] },
  { id: 'w042', name: '한수아', phone: '010-2222-3042', warnings: 0, total: 5,  noshow: 0, negotiation: false, points: 8500,   lastWorked: '2026-04-16', joinedAt: '2026-02-28', favParts: ['cj'] },
  { id: 'w043', name: '오서연', phone: '010-2222-3043', warnings: 0, total: 39, noshow: 0, negotiation: false, points: 63000,  lastWorked: '2026-04-22', joinedAt: '2025-07-08', favParts: ['cj','convention'] },
  { id: 'w044', name: '서도윤', phone: '010-2222-3044', warnings: 2, total: 17, noshow: 1, negotiation: false, points: 21000,  lastWorked: '2026-04-12', joinedAt: '2025-10-22', favParts: ['cj'] },
  { id: 'w045', name: '신현우', phone: '010-2222-3045', warnings: 0, total: 1,  noshow: 0, negotiation: false, points: 2000,   lastWorked: '2026-04-20', joinedAt: '2026-04-05', favParts: [] },
  { id: 'w046', name: '권채원', phone: '010-2222-3046', warnings: 0, total: 27, noshow: 0, negotiation: false, points: 41000,  lastWorked: '2026-04-23', joinedAt: '2025-09-05', favParts: ['lotte'] },
  { id: 'w047', name: '황지우', phone: '010-2222-3047', warnings: 1, total: 19, noshow: 1, negotiation: false, points: 23000,  lastWorked: '2026-04-18', joinedAt: '2025-11-10', favParts: ['cj','convention'] },
  { id: 'w048', name: '안하은', phone: '010-2222-3048', warnings: 0, total: 36, noshow: 0, negotiation: false, points: 57000,  lastWorked: '2026-04-22', joinedAt: '2025-06-15', favParts: ['cj'] },
  { id: 'w049', name: '송지유', phone: '010-2222-3049', warnings: 0, total: 9,  noshow: 0, negotiation: false, points: 13000,  lastWorked: '2026-04-19', joinedAt: '2026-01-28', favParts: ['lotte'] },
  { id: 'w050', name: '유서우', phone: '010-2222-3050', warnings: 3, total: 6,  noshow: 3, negotiation: true,  points: 4000,   lastWorked: '2026-03-05', joinedAt: '2025-11-30', favParts: ['cj'] },
];
function findWorker(id) { return workers.find(w => w.id === id); }

// 공고별 신청 — 상태: pending(대기) / approved / rejected
// reason: normal(일반·12h이전) / urgent(12h이내) / warn3(경고3회) / neg(협의대상번호)
const applications = [
  // 7건 pending (사이드바 뱃지 숫자 일치)
  { id: 'a001', workerId: 'w001', jobId: 'j005', appliedAt: '2026-04-23 20:15', status: 'pending', reason: 'urgent' },   // 내일 주간 · 12h 이내
  { id: 'a002', workerId: 'w002', jobId: 'j006', appliedAt: '2026-04-23 15:40', status: 'pending', reason: 'neg' },       // 협의대상
  { id: 'a003', workerId: 'w003', jobId: 'j007', appliedAt: '2026-04-24 22:10', status: 'pending', reason: 'urgent' },
  { id: 'a004', workerId: 'w005', jobId: 'j008', appliedAt: '2026-04-24 19:30', status: 'pending', reason: 'urgent' },
  { id: 'a005', workerId: 'w006', jobId: 'j009', appliedAt: '2026-04-25 20:00', status: 'pending', reason: 'neg' },
  { id: 'a006', workerId: 'w009', jobId: 'j011', appliedAt: '2026-04-26 15:20', status: 'pending', reason: 'warn3' },     // 경고 가까운 케이스
  { id: 'a007', workerId: 'w004', jobId: 'j010', appliedAt: '2026-04-25 18:45', status: 'pending', reason: 'urgent' },
  // 최근 처리된 것 (오늘 처리 완료 카운트용)
  { id: 'a008', workerId: 'w007', jobId: 'j005', appliedAt: '2026-04-23 09:00', status: 'approved', reason: 'urgent', processedAt: '2026-04-23 10:12', processedBy: '테스트(마스터)' },
  { id: 'a009', workerId: 'w008', jobId: 'j007', appliedAt: '2026-04-23 11:00', status: 'approved', reason: 'normal', processedAt: '2026-04-23 11:02', processedBy: '자동' },
  { id: 'a010', workerId: 'w010', jobId: 'j011', appliedAt: '2026-04-23 08:30', status: 'rejected', reason: 'urgent', processedAt: '2026-04-23 09:15', processedBy: '테스트(마스터)', rejectReason: '해당 근무지 주 4일 초과' },
];

function findJob(id) { return jobs.find(j => j.id === id); }
function findApp(id) { return applications.find(a => a.id === id); }

// 협의대상 — 전화번호 기반 관리 (재가입 시 자동 매칭)
// reason: auto(경고 3회 자동) / manual(수동 등록) / rematch(전화번호 재가입 매칭)
const negotiations = [
  { id: 'n001', phone: '010-1111-2002', name: '이준호',     registeredAt: '2026-01-28', reason: 'auto',    sub: '경고 3회 누적 (지각)',        lastSite: 'CJ 진천 MegaHub',  lastDate: '2026-03-30', workerId: 'w002', registeredBy: '시스템' },
  { id: 'n002', phone: '010-1111-2006', name: '강시우',     registeredAt: '2026-02-15', reason: 'auto',    sub: '경고 3회 누적 (무단결근 반복)', lastSite: 'CJ 안성 MpHub',    lastDate: '2026-03-15', workerId: 'w006', registeredBy: '시스템' },
  { id: 'n003', phone: '010-2222-3001', name: '(탈퇴 · 번호만)', registeredAt: '2025-11-10', reason: 'manual',  sub: '지속적 무응답 — 마스터 직접 등록', lastSite: '롯데 남양주 Hub',  lastDate: '2025-11-08', workerId: null,  registeredBy: '테스트(마스터)' },
  { id: 'n004', phone: '010-2222-3002', name: '홍길동',     registeredAt: '2025-09-05', reason: 'manual',  sub: '도난 의심 사안 — 조사 후 등록', lastSite: 'CJ 군포 Hub_A',    lastDate: '2025-09-01', workerId: null,  registeredBy: '테스트(마스터)' },
  { id: 'n005', phone: '010-1111-2099', name: '(탈퇴)',     registeredAt: '2025-08-14', reason: 'rematch', sub: '과거 번호 재가입 자동 매칭',     lastSite: '컨벤션 L타워 웨딩홀', lastDate: '2025-07-20', workerId: null,  registeredBy: '시스템' },
  { id: 'n006', phone: '010-2222-3019', name: '윤민재',     registeredAt: '2026-02-28', reason: 'auto',    sub: '경고 3회 누적 (무단결근 반복)', lastSite: 'CJ 용인 Hub',       lastDate: '2026-02-28', workerId: 'w019', registeredBy: '시스템' },
  { id: 'n007', phone: '010-2222-3028', name: '안우진',     registeredAt: '2026-03-22', reason: 'auto',    sub: '경고 3회 누적 (지각 반복)',     lastSite: 'CJ 곤지암 MegaHub', lastDate: '2026-03-22', workerId: 'w028', registeredBy: '시스템' },
  { id: 'n008', phone: '010-2222-3050', name: '유서우',     registeredAt: '2026-03-05', reason: 'auto',    sub: '경고 3회 누적 (무응답)',        lastSite: 'CJ 이천 MpHub',     lastDate: '2026-03-05', workerId: 'w050', registeredBy: '시스템' },
];
function findNeg(id) { return negotiations.find(n => n.id === id); }

// 포인트 트랜잭션 — type: withdraw(출금) / deduct(회수·차감) / earn(지급)
// status: pending / processing / done / failed
const pointTxs = [
  // 출금 요청 (pending)
  { id: 'p001', workerId: 'w001', type: 'withdraw', status: 'pending', amount: 30000, bank: '국민은행',   account: '123456-78-901234', requestedAt: '2026-04-22 18:30' },
  { id: 'p002', workerId: 'w007', type: 'withdraw', status: 'pending', amount: 50000, bank: '신한은행',   account: '110-234-567890',   requestedAt: '2026-04-23 08:15' },
  { id: 'p003', workerId: 'w005', type: 'withdraw', status: 'pending', amount: 30000, bank: '카카오뱅크', account: '3333-01-2345678',  requestedAt: '2026-04-23 11:40' },
  { id: 'p004', workerId: 'w010', type: 'withdraw', status: 'pending', amount: 40000, bank: '우리은행',   account: '1002-123-456789',  requestedAt: '2026-04-23 13:05' },
  // 출금 처리 완료 (done)
  { id: 'p005', workerId: 'w010', type: 'withdraw', status: 'done',    amount: 40000, bank: '우리은행',   account: '1002-123-456789',  requestedAt: '2026-04-20 20:00', processedAt: '2026-04-21 10:30', processedBy: '테스트(마스터)' },
  { id: 'p006', workerId: 'w007', type: 'withdraw', status: 'done',    amount: 80000, bank: '신한은행',   account: '110-234-567890',   requestedAt: '2026-04-15 09:00', processedAt: '2026-04-15 14:20', processedBy: '테스트(마스터)' },
  { id: 'p007', workerId: 'w001', type: 'withdraw', status: 'done',    amount: 30000, bank: '국민은행',   account: '123456-78-901234', requestedAt: '2026-04-10 15:00', processedAt: '2026-04-11 11:10', processedBy: '테스트(마스터)' },
  // 출금 실패 (failed)
  { id: 'p008', workerId: 'w003', type: 'withdraw', status: 'failed',  amount: 30000, bank: '우리은행',   account: '1002-999-999999',  requestedAt: '2026-04-18 14:00', processedAt: '2026-04-19 09:00', processedBy: '테스트(마스터)', failReason: '계좌번호 오류 — 수동 재처리 필요' },
  // 회수/차감 (deduct)
  { id: 'p009', workerId: 'w003', type: 'deduct', status: 'done', amount: -1000,  reason: '단순 변심 취소 자동 차감',         requestedAt: '2026-04-18 11:00', processedBy: '시스템' },
  { id: 'p010', workerId: 'w002', type: 'deduct', status: 'done', amount: -5000,  reason: '무단결근 후 수동 회수 — 마스터 처리', requestedAt: '2026-04-10 15:30', processedBy: '테스트(마스터)' },
  { id: 'p011', workerId: 'w006', type: 'deduct', status: 'done', amount: -3000,  reason: '단순 변심 취소 자동 차감',         requestedAt: '2026-03-28 09:20', processedBy: '시스템' },
  { id: 'p012', workerId: 'w009', type: 'deduct', status: 'done', amount: -1000,  reason: '단순 변심 취소 자동 차감',         requestedAt: '2026-04-05 18:00', processedBy: '시스템' },
];
function findTx(id) { return pointTxs.find(t => t.id === id); }

// 관리자 계정 — role: master / admin1 / admin2
const admins = [
  { id: 'adm_master', name: '테스트',   phone: '010-0000-0001', role: 'master', sites: [],                           active: true,  lastLogin: '2026-04-23 08:42', joinedAt: '2025-04-01', createdBy: '시스템' },
  { id: 'adm_001',    name: '김관리',   phone: '010-0000-0101', role: 'admin1', sites: [],                           active: true,  lastLogin: '2026-04-23 10:15', joinedAt: '2025-05-10', createdBy: '테스트(마스터)' },
  { id: 'adm_002',    name: '박관리',   phone: '010-0000-0102', role: 'admin1', sites: [],                           active: true,  lastLogin: '2026-04-22 19:30', joinedAt: '2025-07-22', createdBy: '테스트(마스터)' },
  { id: 'adm_003',    name: '최관리',   phone: '010-0000-0103', role: 'admin1', sites: [],                           active: false, lastLogin: '2026-02-10 14:00', joinedAt: '2025-06-05', createdBy: '테스트(마스터)' },
  { id: 'adm_004',    name: '이담당',   phone: '010-0000-0201', role: 'admin2', sites: ['gonjiam','gunpo_b'],        active: true,  lastLogin: '2026-04-23 07:30', joinedAt: '2025-09-01', createdBy: '김관리(1등급)' },
  { id: 'adm_005',    name: '박담당',   phone: '010-0000-0202', role: 'admin2', sites: ['yongin','gunpo_l'],         active: true,  lastLogin: '2026-04-23 09:05', joinedAt: '2025-10-12', createdBy: '김관리(1등급)' },
  { id: 'adm_006',    name: '김담당',   phone: '010-0000-0203', role: 'admin2', sites: ['gunpo_a','jincheon'],       active: true,  lastLogin: '2026-04-22 22:10', joinedAt: '2025-11-20', createdBy: '박관리(1등급)' },
  { id: 'adm_007',    name: '정담당',   phone: '010-0000-0204', role: 'admin2', sites: ['icheon','anseong'],         active: true,  lastLogin: '2026-04-23 06:45', joinedAt: '2026-01-05', createdBy: '김관리(1등급)' },
  { id: 'adm_008',    name: '한담당',   phone: '010-0000-0205', role: 'admin2', sites: ['ltower','whills'],          active: true,  lastLogin: '2026-04-22 18:20', joinedAt: '2025-08-15', createdBy: '김관리(1등급)' },
];
function findAdmin(id) { return admins.find(a => a.id === id); }

// 문의 — category: general(일반) / bug(앱버그) / point(포인트/결제) / account(계정)
// status: pending(대기) / answered(답변완료)
const inquiries = [
  { id: 'q001', category: 'bug',     title: '출근 버튼이 눌리지 않아요',            body: '곤지암 근무지인데 GPS는 켜놨는데도 출근 버튼이 회색이에요. 영역 안에 있는 거 확인했습니다.',         workerId: 'w001', createdAt: '2026-04-23 07:05', status: 'pending', answer: '', answeredBy: '', answeredAt: '' },
  { id: 'q002', category: 'point',   title: '출금 신청했는데 입금이 안 됐어요',   body: '어제 3만 포인트 출금 신청했는데 아직 입금이 안 들어왔습니다. 확인 부탁드려요.',                workerId: 'w005', createdAt: '2026-04-23 10:22', status: 'pending', answer: '', answeredBy: '', answeredAt: '' },
  { id: 'q003', category: 'general', title: '통근버스 탑승 위치가 궁금해요',       body: '이천 MpHub 근무 신청했는데 통근버스 탑승 위치가 어디인가요? 지도상 가까운 곳으로 알려주세요.',     workerId: 'w004', createdAt: '2026-04-22 19:40', status: 'pending', answer: '', answeredBy: '', answeredAt: '' },
  { id: 'q004', category: 'account', title: '전화번호 변경하고 싶어요',             body: '번호를 바꿨습니다. 어떻게 변경하나요?',                                                        workerId: 'w010', createdAt: '2026-04-22 14:10', status: 'answered', answer: '앱 내 "내 정보 > 전화번호 변경"에서 인증 후 변경 가능합니다. 협의대상 이력은 기존 번호 기준으로 유지됩니다.', answeredBy: '테스트(마스터)', answeredAt: '2026-04-22 15:30' },
  { id: 'q005', category: 'general', title: '주휴수당 조건 질문',                   body: 'CJ에서 이번 주 이미 3일 만근했는데 4일차 신청하면 주휴수당 받을 수 있나요?',                      workerId: 'w007', createdAt: '2026-04-22 11:05', status: 'answered', answer: '네, 4회 만근하시면 주휴수당 대상입니다. 신청 시 팝업으로도 안내됩니다.',                                                         answeredBy: '테스트(마스터)', answeredAt: '2026-04-22 12:00' },
  { id: 'q006', category: 'bug',     title: '계약서 서명 화면에서 튕겨요',         body: 'iPhone 15 Pro에서 계약서 서명할 때 앱이 자주 종료됩니다. 이번 근무 서명 못했어요.',           workerId: 'w003', createdAt: '2026-04-21 22:15', status: 'answered', answer: '개발팀에 전달했습니다. 다음 업데이트 (v1.0.3)에서 수정 예정입니다. 임시로 웹 버전 이용 부탁드립니다.', answeredBy: '테스트(마스터)', answeredAt: '2026-04-22 09:00' },
];
function findInquiry(id) { return inquiries.find(q => q.id === id); }

// 대기열 — FULL 공고에 대기 신청 · 모집인원의 2배까지
// status: waiting(대기 중) / pending_accept(자리 제안됨, 타이머 실행) / accepted(수락 완료) / auto_rejected(시간 초과) / declined(본인 거절)
// _initialRemainingSec — 페이지 최초 로드 시 pending_accept 상태의 남은 시간(초) · 초기화 후 offerDeadline으로 변환됨
const waitlist = [
  // j014 곤지암 새벽 (cap 15, apply 15) — FULL, 대기 4명
  { id: 'wl001', jobId: 'j014', workerId: 'w020', order: 1, status: 'waiting', joinedAt: '2026-04-23 16:00' },
  { id: 'wl002', jobId: 'j014', workerId: 'w030', order: 2, status: 'waiting', joinedAt: '2026-04-23 17:30' },
  { id: 'wl003', jobId: 'j014', workerId: 'w045', order: 3, status: 'waiting', joinedAt: '2026-04-23 18:45' },
  { id: 'wl004', jobId: 'j014', workerId: 'w031', order: 4, status: 'waiting', joinedAt: '2026-04-23 19:10' },

  // j015 안성 주간 (cap 20, apply 20) — FULL, 6명 대기 · 1번은 현재 수락 대기 중 (40분 타이머 — 페이지 로드 시 시작)
  { id: 'wl005', jobId: 'j015', workerId: 'w017', order: 1, status: 'pending_accept', joinedAt: '2026-04-22 10:00', _initialRemainingSec: 40 * 60 },
  { id: 'wl006', jobId: 'j015', workerId: 'w022', order: 2, status: 'waiting', joinedAt: '2026-04-22 11:00' },
  { id: 'wl007', jobId: 'j015', workerId: 'w025', order: 3, status: 'waiting', joinedAt: '2026-04-22 12:30' },
  { id: 'wl008', jobId: 'j015', workerId: 'w036', order: 4, status: 'waiting', joinedAt: '2026-04-22 14:00' },
  { id: 'wl009', jobId: 'j015', workerId: 'w042', order: 5, status: 'waiting', joinedAt: '2026-04-23 08:00' },
  { id: 'wl010', jobId: 'j015', workerId: 'w049', order: 6, status: 'waiting', joinedAt: '2026-04-23 09:30' },

  // j016 군포_A 주간 (cap 18, apply 18) — FULL, 1번 본인 거절, 2번 시간초과, 3번 대기 중
  { id: 'wl011', jobId: 'j016', workerId: 'w033', order: 1, status: 'declined',      joinedAt: '2026-04-22 13:00', offeredAt: '2026-04-23 08:00', respondedAt: '2026-04-23 08:15' },
  { id: 'wl012', jobId: 'j016', workerId: 'w041', order: 2, status: 'auto_rejected', joinedAt: '2026-04-22 14:00', offeredAt: '2026-04-23 08:15', offerDeadline: '2026-04-23 10:15', respondedAt: '2026-04-23 10:15' },
  { id: 'wl013', jobId: 'j016', workerId: 'w048', order: 3, status: 'waiting',       joinedAt: '2026-04-22 15:30' },
];
function findWl(id) { return waitlist.find(w => w.id === id); }

// 템플릿 (근로계약서 · 안전교육 자료)
// type: contract(근로계약서) / safety(안전교육)
// partnerKeys: 적용 파트너사 (복수) / siteIds: 특정 근무지 한정 (optional)
const templates = [
  { id: 't001', type: 'contract', name: '택배 허브 표준 근로계약서',  partnerKeys: ['cj','lotte'],   siteIds: [],          version: 'v2.1', uploadedAt: '2026-02-10', fileName: 'contract_logistics_v21.pdf', fileSize: '312KB', inUse: 15, uploadedBy: '테스트(마스터)' },
  { id: 't002', type: 'contract', name: '웨딩홀 기본 근로계약서',       partnerKeys: ['convention'],  siteIds: [],          version: 'v1.3', uploadedAt: '2025-12-05', fileName: 'contract_wedding_v13.pdf',    fileSize: '198KB', inUse: 4,  uploadedBy: '테스트(마스터)' },
  { id: 't003', type: 'safety',   name: '물류센터 표준 안전교육',       partnerKeys: ['cj','lotte'],   siteIds: [],          version: 'v3.0', uploadedAt: '2026-01-20', fileName: 'safety_logistics_v30.pdf',    fileSize: '2.1MB', inUse: 9,  uploadedBy: '김관리(1등급)' },
  { id: 't004', type: 'safety',   name: '웨딩홀 안전수칙',             partnerKeys: ['convention'],  siteIds: [],          version: 'v1.0', uploadedAt: '2025-11-15', fileName: 'safety_wedding_v10.pdf',      fileSize: '540KB', inUse: 2,  uploadedBy: '김관리(1등급)' },
  { id: 't005', type: 'safety',   name: 'CJ 곤지암 특수 안전교육',     partnerKeys: ['cj'],           siteIds: ['gonjiam'], version: 'v1.0', uploadedAt: '2026-03-01', fileName: 'safety_cj_gonjiam.pdf',       fileSize: '1.3MB', inUse: 5,  uploadedBy: '테스트(마스터)' },
  { id: 't006', type: 'safety',   name: '이천·안성 공통 안전교육',      partnerKeys: ['cj'],           siteIds: ['icheon','anseong'], version: 'v2.0', uploadedAt: '2026-02-28', fileName: 'safety_cj_mphub.pdf',   fileSize: '890KB', inUse: 4, uploadedBy: '김관리(1등급)' },
];
function findTemplate(id) { return templates.find(t => t.id === id); }

// GPS 미검증 퇴근 승인 요청 — 알바생이 근무지 GPS 폴리곤 밖에서 퇴근 시 사유 제출
// status: pending (관리자 대기) / approved (포인트 지급) / denied (포인트 미지급)
// distance: 폴리곤 가장자리로부터 몇 m 벗어났는지
const gpsRequests = [
  // 대기 (pending) — 10건 · 테스트용
  { id: 'gr001', workerId: 'w007', jobId: 'j001', submittedAt: '2026-04-23 15:22', reason: '퇴근 직후 편의점 들르러 이동했는데 GPS 잡히는 순간 이미 영역 밖이었어요. 근무는 정상 완료했습니다.',      distance: 187, status: 'pending' },
  { id: 'gr002', workerId: 'w022', jobId: 'j002', submittedAt: '2026-04-23 06:12', reason: '근무 종료 후 바로 통근버스 타야 해서 정류장으로 이동했어요. 버스 시간 맞추려고 뛰어갔습니다.',              distance: 342, status: 'pending' },
  { id: 'gr003', workerId: 'w032', jobId: 'j003', submittedAt: '2026-04-23 17:08', reason: '화장실이 건물 밖에 있어서 잠깐 나갔다가 GPS 영역을 살짝 벗어났어요.',                                       distance: 52,  status: 'pending' },
  { id: 'gr007', workerId: 'w010', jobId: 'j001', submittedAt: '2026-04-23 15:05', reason: '근무 마치고 흡연 구역이 영역 밖에 있어서 그쪽에서 퇴근 버튼을 눌렀습니다.',                                   distance: 128, status: 'pending' },
  { id: 'gr008', workerId: 'w016', jobId: 'j002', submittedAt: '2026-04-23 06:30', reason: '새벽에 너무 피곤해서 퇴근을 깜빡했다가 주차장에서 기억나서 눌렀어요. 죄송합니다.',                            distance: 215, status: 'pending' },
  { id: 'gr009', workerId: 'w029', jobId: 'j003', submittedAt: '2026-04-23 17:14', reason: '물품 정리하느라 늦게 나갔는데 이미 통근버스 탑승하러 가는 길이라 거기서 처리했습니다.',                          distance: 398, status: 'pending' },
  { id: 'gr010', workerId: 'w035', jobId: 'j004', submittedAt: '2026-04-23 18:05', reason: '웨딩홀 대기실 뒷편에 있는데 건물 구조상 GPS가 튀어요. 매번 그래서 사유 제출합니다.',                            distance: 18,  status: 'pending' },
  { id: 'gr011', workerId: 'w043', jobId: 'j001', submittedAt: '2026-04-23 15:40', reason: '퇴근하고 동료랑 같이 버스 정류장으로 이동했어요.',                                                        distance: 256, status: 'pending' },
  { id: 'gr012', workerId: 'w046', jobId: 'j003', submittedAt: '2026-04-23 17:20', reason: '근무 끝나고 화장실 갔다가 퇴근 버튼을 눌렀어요. 실내인데 GPS 영역 밖으로 잡혔네요.',                           distance: 88,  status: 'pending' },
  { id: 'gr013', workerId: 'w048', jobId: 'j002', submittedAt: '2026-04-23 06:08', reason: '야간 근무 끝나고 피곤해서 바로 통근버스 탔어요. 버스 안에서 퇴근 처리했습니다.',                              distance: 510, status: 'pending' },
  // 과거 처리 이력
  { id: 'gr004', workerId: 'w040', jobId: 'j004', submittedAt: '2026-04-22 18:15', reason: '연회장 옆 대기실이 GPS 밖에 있는 것 같아요. 퇴근 시 대기실에서 찍혔습니다.',                                   distance: 23,  status: 'approved', reviewedAt: '2026-04-22 18:24', reviewedBy: '테스트(마스터)', adminNote: '상시 이슈로 확인됨 — 해당 근무지 GPS 영역 조정 필요 (근무지 관리 안건으로 이월)' },
  { id: 'gr005', workerId: 'w050', jobId: 'j001', submittedAt: '2026-04-20 15:30', reason: '모름',                                                                                                  distance: 820, status: 'denied',   reviewedAt: '2026-04-20 15:45', reviewedBy: '김관리(1등급)', adminNote: '거리 과도 + 사유 불명확 + 협의대상 이력 — 포인트 미지급' },
  { id: 'gr006', workerId: 'w013', jobId: 'j003', submittedAt: '2026-04-19 17:02', reason: '휴게실이 외부 건물이라 퇴근 버튼 누르니 영역 밖이었습니다.',                                                   distance: 74,  status: 'approved', reviewedAt: '2026-04-19 17:10', reviewedBy: '박관리(1등급)', adminNote: '휴게실 위치 이슈 반복 — 다음 공고부터 영역 재조정' },
];
function findGpsReq(id) { return gpsRequests.find(g => g.id === id); }

// 공고 상태 판정: open(모집중) · closed(마감·시작전) · progress(진행중) · done(종료)
// recruitClosed(수동 구인 완료) 또는 apply+외부 구인 >= cap 이면 모집 마감
// 오늘 공고는 "근무 진행" 의미 우선 → progress 유지하되, 마감 표시는 jobMarketStatus 로 별도 조회
function jobStatus(j) {
  if (j.date < TODAY) return 'done';
  const ext = Array.isArray(j.externalWorkers) ? j.externalWorkers.length : 0;
  const filled = j.apply + ext;
  if (j.date === TODAY) return 'progress';
  if (j.recruitClosed || filled >= j.cap) return 'closed';
  return 'open';
}

// 모집 채워짐 여부 (오늘 공고 포함) — 공고 list / 관제에서 "구인 마감" 표시용
function jobIsRecruitFilled(j) {
  const ext = Array.isArray(j.externalWorkers) ? j.externalWorkers.length : 0;
  return j.recruitClosed || (j.apply + ext) >= j.cap;
}
const STATUS_LABEL = { open: '모집중', closed: '마감', progress: '진행중', done: '종료' };

// ───────────────────────────────────────────────────────────
// 공용 헬퍼 — app.js / control.js 양쪽에서 사용
// ───────────────────────────────────────────────────────────

// 근무지 ID로 파트너사/근무지 찾기
function findSite(siteId) {
  for (const key in worksites) {
    const s = worksites[key].sites.find(s => s.id === siteId);
    if (s) return { site: s, partner: worksites[key].name, partnerKey: key };
  }
  return null;
}

// HH:MM + m분 → HH:MM (24시간 래핑)
function addMin(hhmm, m) {
  const [h, mm] = hhmm.split(':').map(Number);
  const total = h * 60 + mm + m;
  return String(Math.floor(total/60) % 24).padStart(2,'0') + ':' + String(total%60).padStart(2,'0');
}

// 도넛 SVG — segments: [{value, color}]
function donutSvg(segments, size = 90, thick = 10) {
  const center = size / 2;
  const r = (size - thick) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let paths = '';
  if (total === 0) {
    paths = `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#E5E7EB" stroke-width="${thick}"/>`;
  } else {
    let offset = 0;
    paths = `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#F3F4F6" stroke-width="${thick}"/>`;
    segments.forEach(seg => {
      if (seg.value === 0) return;
      const len = (seg.value / total) * circ;
      paths += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thick}"
        stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 ${center} ${center})"/>`;
      offset += len;
    });
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

// 잡핏 포인트 보상 — 시간대별 (중계 수수료 성격 · 알바비와 별개)
const POINT_REWARDS = { 주간: 2000, 야간: 2500, 새벽: 3000, 웨딩: 2500 };
function pointRewardFor(job) {
  return POINT_REWARDS[job.slot] || 2000;
}

// 출결 → 도넛 segments + 중앙 텍스트
function attendanceDonut(sum, size = 90, thick = 10) {
  const segments = [
    { value: sum.출근, color: '#22C55E' },
    { value: sum.지각, color: '#F59E0B' },
    { value: sum.결근, color: '#EF4444' },
    { value: sum.대기, color: '#D1D5DB' },
  ];
  const attended = sum.출근 + sum.지각 + sum.결근;
  let centerHtml;
  if (attended === 0) {
    centerHtml = `<div class="ctrl-donut-pct">${sum.대기}</div><div class="ctrl-donut-label">대기 명</div>`;
  } else {
    const rate = Math.round((sum.출근 + sum.지각) / attended * 100);
    centerHtml = `<div class="ctrl-donut-pct">${rate}%</div><div class="ctrl-donut-label">출근율</div>`;
  }
  return `
    <div class="ctrl-donut-wrap" style="width:${size}px; height:${size}px;">
      ${donutSvg(segments, size, thick)}
      <div class="ctrl-donut-center">${centerHtml}</div>
    </div>
  `;
}

// 결정적 출결 시뮬레이션 — 공고 상태에 따라 분포 조정
function getAttendance(jobId) {
  const job = findJob(jobId); if (!job) return [];
  const st = jobStatus(job);
  const seed = [...jobId].reduce((s, c) => s + c.charCodeAt(0), 0);
  const actualCount = Math.min(job.apply, workers.length);
  const shuffled = [...workers].sort((a, b) =>
    ((seed + a.id.charCodeAt(3)) % 100) - ((seed + b.id.charCodeAt(3)) % 100)
  );
  const picked = shuffled.slice(0, actualCount);

  return picked.map((w, i) => {
    const r = (seed + i * 7) % 100;
    if (st === 'open' || st === 'closed') {
      return { worker: w, status: '대기', checkin: null, checkout: null };
    }
    if (st === 'progress') {
      if (r < 70) return { worker: w, status: '출근', checkin: job.start, checkout: null };
      if (r < 90) return { worker: w, status: '지각', checkin: addMin(job.start, 8 + (r % 20)), checkout: null };
      return { worker: w, status: '결근', checkin: null, checkout: null };
    }
    // done
    if (r < 85) return { worker: w, status: '출근', checkin: job.start, checkout: job.end };
    if (r < 95) return { worker: w, status: '지각', checkin: addMin(job.start, 5 + (r % 15)), checkout: job.end };
    return { worker: w, status: '결근', checkin: null, checkout: null };
  });
}

function attendanceSummary(jobId) {
  const list = getAttendance(jobId);
  const sum = { 출근: 0, 지각: 0, 결근: 0, 대기: 0 };
  list.forEach(a => sum[a.status]++);
  return sum;
}

// ───────────────────────────────────────────────────────────
// 데이터 mutation 헬퍼 — Supabase 전환 시 이 함수들만 await api.update(...) 로 교체
// ───────────────────────────────────────────────────────────

function nowStamp() {
  const d = new Date();
  return TODAY + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function uid(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// HTML 이스케이프 — 사용자 입력(메모/사유 등)을 innerHTML 에 삽입할 때 XSS 방지
// admin 1인 운영 prototype에선 위험 낮지만, Supabase 연동 후 알바생 입력이 들어오면 필수
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

// GPS 미검증 퇴근 승인/반려 + 포인트 트랜잭션 + 워커 보유 포인트 가산
function approveGpsRequest(gpsId, adminNote, by) {
  const g = findGpsReq(gpsId); if (!g || g.status !== 'pending') return null;
  const w = findWorker(g.workerId); const j = findJob(g.jobId);
  if (!w || !j) return null;
  const reward = pointRewardFor(j);
  g.status = 'approved';
  g.reviewedAt = nowStamp();
  g.reviewedBy = by || '시스템';
  g.adminNote = adminNote || '';
  w.points += reward;
  pointTxs.unshift({
    id: uid('p-gps'),
    workerId: w.id,
    type: 'reward',
    status: 'done',
    amount: reward,
    reason: 'GPS 미검증 퇴근 승인 — ' + (findSite(j.siteId)?.site.name || '') + ' ' + j.date + ' ' + j.slot,
    requestedAt: g.reviewedAt,
    processedBy: g.reviewedBy,
  });
  return { worker: w, job: j, reward };
}
function denyGpsRequest(gpsId, reason, by) {
  const g = findGpsReq(gpsId); if (!g || g.status !== 'pending') return null;
  g.status = 'denied';
  g.reviewedAt = nowStamp();
  g.reviewedBy = by || '시스템';
  g.adminNote = reason || '';
  return g;
}

// 외부 구인 인원 (앱 외부에서 직접 모집)
function addExternalWorker(jobId, name, phone, note, by) {
  const j = findJob(jobId); if (!j) return null;
  if (!Array.isArray(j.externalWorkers)) j.externalWorkers = [];
  const ex = {
    id: uid('ex'),
    name: String(name).trim(),
    phone: String(phone).trim(),
    note: String(note || '').trim(),
    attended: false,
    addedBy: by || '시스템',
    addedAt: nowStamp(),
  };
  j.externalWorkers.push(ex);
  return ex;
}
function removeExternalWorker(jobId, extId) {
  const j = findJob(jobId); if (!j || !Array.isArray(j.externalWorkers)) return false;
  const before = j.externalWorkers.length;
  j.externalWorkers = j.externalWorkers.filter(e => e.id !== extId);
  return j.externalWorkers.length < before;
}
function toggleExternalAttended(jobId, extId) {
  const j = findJob(jobId); if (!j || !Array.isArray(j.externalWorkers)) return null;
  const ex = j.externalWorkers.find(e => e.id === extId);
  if (!ex) return null;
  ex.attended = !ex.attended;
  return ex;
}

// 수동 구인 완료
function setRecruitClosed(jobId, value) {
  const j = findJob(jobId); if (!j) return false;
  j.recruitClosed = !!value;
  return true;
}

// 워커 경고 부여 (3회 누적 → 협의대상 자동 등록)
function addWorkerWarning(workerId, reason, siteId, memo, by) {
  const w = findWorker(workerId); if (!w) return null;
  if (w.negotiation) return { error: '이미 협의대상 상태' };
  w.warnings = Math.min(w.warnings + 1, POLICY.WARN_LIMIT);
  if (!Array.isArray(w.warnLog)) w.warnLog = [];
  w.warnLog.unshift({
    date: TODAY,
    reason,
    memo: memo || '',
    siteId: siteId || '',
    count: w.warnings,
    by: by || '시스템',
  });
  let escalated = false;
  if (w.warnings >= POLICY.WARN_LIMIT) {
    w.negotiation = true;
    escalated = true;
  }
  return { worker: w, escalated };
}
function releaseNegotiation(workerId) {
  const w = findWorker(workerId); if (!w) return null;
  w.negotiation = false;
  w.warnings = 0;
  return w;
}

// 정책상 출금 가능 여부 — 보유 포인트 + 단위 + 일 한도 체크
function canWithdraw(workerPoints, requestedAmount) {
  if (workerPoints < POLICY.POINT_MIN_WITHDRAW) return { ok: false, reason: '보유 포인트가 ' + POLICY.POINT_MIN_WITHDRAW.toLocaleString() + 'P 미만' };
  if (requestedAmount % POLICY.POINT_WITHDRAW_UNIT !== 0) return { ok: false, reason: POLICY.POINT_WITHDRAW_UNIT.toLocaleString() + 'P 단위로 출금 가능' };
  if (requestedAmount > POLICY.POINT_DAILY_MAX) return { ok: false, reason: '1일 최대 ' + POLICY.POINT_DAILY_MAX.toLocaleString() + 'P' };
  if (requestedAmount > workerPoints) return { ok: false, reason: '보유 포인트 초과' };
  return { ok: true };
}
