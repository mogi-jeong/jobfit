// 기본 스모크 테스트 — 앱이 크래시 없이 뜨는지 확인
import 'package:flutter_test/flutter_test.dart';
import 'package:jobpit_admin/main.dart';

void main() {
  testWidgets('앱이 뜨고 공고 화면이 보인다', (tester) async {
    await tester.pumpWidget(const JobpitAdminApp());
    // 로그인 화면 → 2등급으로 로그인
    expect(find.textContaining('김현장'), findsOneWidget);
    await tester.tap(find.textContaining('김현장'));
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(find.text('일정'), findsWidgets); // 첫 탭 = 일정(달력)
    // 공고 탭으로 이동
    await tester.tap(find.text('공고').last);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(find.text('곤지암 MegaHub'), findsWidgets);
    expect(find.text('지난'), findsOneWidget); // 오늘/예정/지난 전환 스위치
  });
}
