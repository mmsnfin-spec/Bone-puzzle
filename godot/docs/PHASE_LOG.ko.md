# 개발 단계와 실제 검증

원본 기준은 React `main`의 `db6d877`이며 작업 브랜치는 `migration/godot`이다. 기존 웹 파일을 수정하지 않고 신규 파일을 `godot/`와 전용 Windows CI에 추가했다. 사용자 지시서 원문은 `MIGRATION_REQUIREMENTS.ko.md`에 보존했다.

| 단계 | 구현 파일·완료 기능 | 실행 검증 | 남은 제한 |
|---|---|---|---|
| Phase 1 분석·보존 | `FEATURE_PARITY.ko.md`, `project.godot`, `scenes/main/main.tscn`, `export_presets.cfg`; 원본 필수 파일 전체 분석, 별도 브랜치, Godot 4.7.2와 Windows x64 설정 | 공식 엔진·템플릿 SHA-512 검증, 원본 파일 Git diff 0 | 원본 브랜드 PNG 바이너리 미확보 |
| Phase 2 모델 | `assets/models/hand/`, `data/`, `stage_catalog.gd`, 데이터/임포트 검증 도구; 27개 GLB와 출처·좌표·폰트 | 8/5/14 분류, 모든 GLB 바이트 일치, 18,164 imported vertices 일치, 원본 STL 좌표 왕복 최대 오차 1.353×10⁻⁶ | 전문가 독립 해부학 검수 미실행 |
| Phase 3 퍼즐 | `puzzle_world.gd`, `bone_piece.gd`, `orbit_camera.gd`, `snap_system.gd`; 클릭·Index·드래그·회전·정밀 조작·고정·난이도 | 코어 경계 검사, 회전한 카메라에서 ray/plane drag와 카메라 잠금, 모든 27개 선택/XYZ 조작, Easy 실제 포인터 27개 완료 | 다양한 실제 입력 장치 검수는 Windows에서 필요 |
| Phase 4 UI | `app.gd`, `game_ui.gd`, `guide_system.gd`; 두 문구 타이틀, 키/클릭, 후속 메뉴, GUIDE/G/opacity, Pause | GUI 137 assertions/0 failures: 실제 버튼/키 입력, 1280×720·1920×1080, 실제 guide hide 및 opacity 비활성 | 초광폭·4K 배율별 별도 검수 미실행 |
| Phase 5 학습·저장 | `game_session.gd`, `name_validation.gd`, `save_system.gd`; 공식 이름/별칭, 메모, 고유 힌트 5개, 버전 저장·백업·이어하기·Restart·결과 | 코어 212 assertions/0 failures, GUIDE OFF Hard 27개 판정, 잘못된 version/JSON/transform 복구, GUI 이름 입력·저장·Replay | 웹 LocalStorage 자동 이관은 제공하지 않음 |
| Phase 6 연출·최적화 | `physics_intro.gd`, 신호 기반 pose/UI, 공유 메시/재질, 정지 화면 redraw 절약; 전체 손→낙하→HAND→조립, 0.22s snap | 동적 몸체 0→27→0, GUI 전체 흐름, 모니터 벤치마크와 5회 재진입/타이머 정리 측정 | Windows GPU profiler·장시간 soak·최소 사양 미확정 |
| Phase 7 배포 | Windows Release/Debug preset, `.sh`/`.ps1`, ZIP·PE·PCK·해시 검증 패키저, Windows CI | 최종 export/pack 검사 결과는 TEST_REPORT에 기록 | 실제 Windows 그래픽·입력·저장·성능은 별도 검수 필요 |

자동 목표 좌표 판정 테스트와 실제 포인터 검사를 구분했다. GUI 검사는 별도 Easy replay에서 초기 흩어진 27개 모델을 ray-pick하고 포인터 motion/release로 배치했으며, 이 경로에서 목표 transform을 직접 써넣지 않는다. Hard 전체 완료 검사는 수치 규칙을 확인하는 코어 검사다.

검증 도중 수정한 오류는 Godot 기본 메시 압축의 정점 오차, 과도한 조명 노출, 트레이 시점, UI 포커스와 드래그 해제, 손상 저장 version 형식 처리다. 최종 재현 명령과 정확한 성능·배포 범위는 TEST_REPORT/PERFORMANCE 문서에 있다.
