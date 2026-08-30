// 잡핏 출결·포인트 정책 상수 — 관리자 앱 · 알바생 앱 공용
// ★ 알바생 앱 프로젝트에 이 파일을 그대로 복사해서 사용 (두 앱이 같은 숫자·같은 상태값을 봐야 매칭됨)
// ★ Supabase 쪽도 같은 값으로 (DB 함수/트리거에서 재검증)
// 근거: 잡핏_기획안_v1_4 §4-2 출근 · §4-3 퇴근 · §5-5 대기열 · §6 포인트 + 사용자 결정 2026-08-24

class Policy {
  Policy._();

  // ── 출근 (알바생 앱이 기록, 관리자 앱이 확인·보정) ──
  static const checkInOpenBeforeMin = 60; // 근무 시작 60분 전부터 출근 버튼 활성화 (GPS 영역 안에서만)
  static const lateAfterMin = 0; // 시작 시각 이후 출근 = 지각 (시작+0분부터)
  static const absentAfterMin = 30; // 시작+30분까지 GPS 미확인 = 결근 후보 (관리자 앱 '미도착' → 수동 보정 가능)

  // ── 퇴근 ──
  static const autoCheckoutHours = 6; // 종료 + 6시간 후 시스템 자동 퇴근 처리 (그 전엔 관리자 수동 처리 대상)
  static const checkoutAlarmRepeatMin = 5;
  static const checkoutOpenAfterEnd = true; // 알바생 앱 [퇴근] 버튼은 근무 종료 시각 이후에만 활성화 (조퇴는 관리자 표시로만) // 종료 시각부터 퇴근 미처리 시 5분 간격 알림 (최대 6시간)

  // ── 정정 ──
  static const correctionDays = 7; // 종료 후 7일까지 앱에서 정정 가능 (이후 PC 관리자 웹)

  // ── 대기열 ──
  static const waitlistFactor = 2; // 대기 정원 = 모집 인원 × 2
  static const waitAcceptFarMin = 60; // 근무 24시간 전이면 자리 제안 수락 제한 1시간 (웹과 통일 2026-08-30)
  static const waitAcceptNearMin = 30; // 근무 24시간 이내면 30분

  // ── 포인트 ──
  static const defaultPoint = 1000; // 공고 기본 1,000P (공고별 조정)
  static const buddyBonus = 3000; // 같이하기 보너스 (각자)
  static const cancelDeduct = 1000; // 단순 변심 취소 차감

  // ── 신청 ──
  static const autoApproveBeforeHours = 12; // 근무 12시간 전 신청 = 자동 승인 / 이내 = 관리자 승인
  static const freeCancelBeforeHours = 12; // 12시간 전까지 자유 취소
  static const approvalWaitMaxHours = 6; // 관리자 승인 대기 제한 (초과 시 관리자 앱에 빨강 표시 · N19 방침 대기)
}

/// 출결 상태 — 알바생 앱(GPS 기록)과 관리자 앱(판정·보정)이 같은 문자열 사용
class AttStatus {
  AttStatus._();
  static const wait = 'wait'; // 출근 전 (근무 시작 전)
  static const none = 'none'; // 미도착 (시작 후 GPS 출근 기록 없음)
  static const ok = 'ok'; // 출근 (정상)
  static const late = 'late'; // 지각 — 출근으로 인정 (포인트 대상, 경고 사유는 별개)
  static const early = 'early'; // 조퇴 — 관리자 표시, 포인트 자동 지급 없음
  static const runaway = 'runaway'; // 무단이탈 — 관리자 표시, 포인트 자동 지급 없음
  static const absent = 'absent'; // 결근
}

/// 퇴근 기록 — 출결 상태와 **별개 필드** (checkout_at / checkout_source)
/// source: gps(영역 내 자동) · approved(영역 밖 사유 → 관리자 승인) · manual(관리자 수동) · auto(종료+6h 자동)
/// 반려(rejected)는 기록은 남기되 '정상 퇴근'으로 인정하지 않음
class CheckoutSource {
  CheckoutSource._();
  static const gps = 'gps';
  static const approved = 'approved';
  static const manual = 'manual';
  static const auto = 'auto';
  static const rejected = 'rejected';
}

/// 포인트 자동 지급 규칙 (종료 후 정산에서만 실행)
///   status ∈ {ok, late}  AND  checkout 존재  AND  checkout.source != rejected  → point 지급
///   early / runaway / absent / none → 자동 지급 없음 (PC에서 수동 판단)
///   ✅ 확정(2026-08-24): 지각자도 자동 지급(관리자 판단으로 사후 회수 가능) · auto(6h 자동 퇴근)도 정상 퇴근으로 인정
bool pointEligible(String status, String? checkoutSource) =>
    (status == AttStatus.ok || status == AttStatus.late) &&
    checkoutSource != null &&
    checkoutSource != CheckoutSource.rejected;

/// 취소 사유 분류 코드 — DB · 알바생 앱 · 관리자 앱 동일 키 (UI에는 한국어 라벨만 노출)
class CancelCategory {
  CancelCategory._();
  static const normal = 'normal'; // 단순변심 (−1,000P 자동 차감 대상)
  static const sick = 'sick'; // 질병
  static const family = 'family'; // 가족
  static const transport = 'transport'; // 교통
  static const weather = 'weather'; // 천재지변
  static const other = 'other'; // 기타
  static const labelOf = {
    normal: '단순변심', sick: '질병', family: '가족', transport: '교통', weather: '천재지변', other: '기타',
  };
  static const codes = [normal, sick, family, transport, weather, other];
  static const labels = ['단순변심', '질병', '가족', '교통', '천재지변', '기타']; // codes 순서와 동일
  static String codeOf(String label) {
    for (final e in labelOf.entries) {
      if (e.value == label) return e.key;
    }
    return other;
  }
}
