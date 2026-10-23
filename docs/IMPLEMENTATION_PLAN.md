# 구현 상태 · HAND 우선

최종 기준은 `MASTER_REQUIREMENTS.ko.md`와 대화의 이미지 3장이다. 요구사항을 대체하지 않는다.

1. PHASE 1 — 빈 저장소에서 Vite / React / TypeScript / Three.js / R3F / Drei / Rapier / Zustand 초기화. UI, 상태, 판정, 데이터, 변환 스크립트 분리.
2. PHASE 2 — Splash 상태 및 설정 가능한 fade 구현. 원본 브랜드 이미지 파일은 아직 전달되지 않아 실제 로고 표시는 미완료. 대체 로고를 생성하지 않고 검은 시작 화면을 짧게 지난다. Title은 Start 입력을 기다린다.
3. PHASE 3 — BodyParts3D 3.0 공개 미러에서 오른손 27개 STL, FMA 명칭표, 원본 배포 README·라이선스 사본 확보. 원본 OBJ 직접 확보는 공식 서버 접근 제한으로 미완료. OBJ/STL 공통 변환 코드 및 GLB 데이터 검증 구현.
4. PHASE 4 — 조립 상태 → Rapier 중력/회전/convex-hull 충돌 → 선택성을 위한 트레이 정리 → 대형 HAND 오버레이 → 게임. 전 단계에서 동일 객체 ID·메시 사용. 모션 생략도 동일 초기 플레이 상태 생성.
5. PHASE 5 — raycast 선택, camera-facing target plane 드래그, 카메라 잠금, 자체 target 기반 스냅, Easy/Normal/Hard 판정, 회전 조작, 키보드 이동, 진행률, 전체 Restart.
6. PHASE 6 — 조각별 Save와 Check 분리, 검증된 명칭만 허용, 5회 힌트·중복 차감 방지, 이름 진행률 분리, LocalStorage 복원.
7. PHASE 7 — 8 수근골 → 5 중수골 → 14 지골, 총 27개의 실제 모델 및 동일 엔진 적용. 정답 좌표는 계산으로 생성하며 손으로 임의 배치하지 않는다.
8. PHASE 8 — 완료 결과/관찰/Replay/Title, 모바일 레이아웃, reduced motion, 모델 오류 표시, 단위·UI·실제 WebGL 브라우저 검사.
9. PHASE 9 — FOOT 26개, VERTEBRA 및 세부 구조 분할은 후속 범위로 남아 있다. 데이터 및 실제 게임 미구현; Coming Soon으로 비활성 표시. 요구사항은 유지한다.

검수 실측 결과는 TEST_REPORT.md에 별도로 기록한다. HAND 우선 구현을 전체 3개 스테이지 완성으로 표시하지 않는다.
