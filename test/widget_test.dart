// 기본 스모크 테스트 — 앱이 크래시 없이 뜨는지 확인
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jobpit_admin/main.dart';

void main() {
  testWidgets('앱이 뜨고 공고 화면이 보인다', (tester) async {
    await tester.pumpWidget(const JobpitAdminApp());
    // 로그인 화면 → 2등급(field1 / 1234)으로 로그인
    expect(find.text('로그인'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(0), 'field1');
    await tester.enterText(find.byType(TextField).at(1), '1234');
    await tester.tap(find.text('로그인'));
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(find.text('일정'), findsWidgets); // 첫 탭 = 일정(달력)
    // 공고 탭으로 이동
    await tester.tap(find.text('공고').last);
    await tester.pumpAndSettle(const Duration(milliseconds: 300));
    expect(find.text('곤지암 MegaHub'), findsWidgets);
    expect(find.textContaining('종료'), findsWidgets); // 24시간/예정/종료 전환 스위치
  });
}
