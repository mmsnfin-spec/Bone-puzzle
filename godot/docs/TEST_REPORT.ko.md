# Godot 이식 검수 결과

검수 기준일: 2026-10-24 (Asia/Seoul). 개발 브랜치: `migration/godot`. 원본 보존 기준: `db6d87768a541c4378c7899978d93193d5ff2b04`의 React 웹게임과 해부학 데이터. 이 보고서는 신규 Godot 구현의 실제 검증과 미실행 항목을 구분한다.

## 환경과 실행 범위

- 대상 엔진: 공식 Godot **4.7.2 Stable**, GDScript, GL Compatibility.
- 현재 검증 호스트: Linux x86-64 Codex Cloud. Windows Export Templates는 동일 4.7.2 x86-64를 사용한다.
- Windows 대상: Windows 10/11 x86-64. **실제 Windows PC 실행/그래픽·입력 검수는 아직 미실행이다.**
- headless는 규칙·자원·상태를 검증하지만 실제 GPU 렌더링/마우스 사용성/Windows 실행을 대신하지 않는다.

## 완료된 자동 검증

| 검사 | 실제 확인 결과 |
|---|---|
| 코어 헤드리스 | `tests/run_tests.gd`: **212 assertions, 0 failures** |
| 원본 모델·데이터 | 27개 고유 FMA, category 8/5/14, 전체 36,216 triangles, 원본 필드·GLB 복사 체크섬 보존 |
| 원본 좌표 왕복 | 모든 원본 정점 비교의 최대 좌표 오차 **1.353×10⁻⁶** 원본 좌표 단위 |
| Godot 임포트 정점 | GLB 27개, 총 **18,164 vertices**를 엄격 비교하여 원본 로컬 정점과 일치 |
| 임포트 설정 | 모든 GLB sidecar에서 `meshes/force_disable_compression=true`, `meshes/generate_lods=false`; 축 반전/형상 변형 없음 |
| 원본 저장소 경계 | 신규 구현은 godot/ 하위. 기존 React 소스·public 데이터·npm 선언·Vercel 설정은 보존 |
| 원본 웹 참고 baseline | 같은 클라우드 호스트/1920×1080에서 Title/Game 각 120 RAF frame 측정, page error 0. 비교 한계와 값은 PERFORMANCE 문서 참조 |

코어 검사는 데이터 개수/고유 ID, 모든 exact target, 잘못된 위치, Easy 회전 보정, Normal/Hard 거리·회전 허용 경계, quaternion 부호 동등성/유한값 검증, 이름/별칭/손가락 구분, 메모와 정답의 분리, 5개 고유 힌트·재열람, GUIDE 설정, 저장 직렬화/복원/손상/백업, Restart, 27개 완료와 명칭 독립성을 포함한다. 최종 assertion 수가 변경되면 마지막 실행 로그를 기준으로 갱신한다.

## GUI·전체 흐름: 통과

`tests/gui_smoke.gd`를 실제 X11 display와 Godot 4.7.2 GL Compatibility에서 실행했다. **137 assertions, 0 failures**이며 별도 Easy replay에서 목표 transform을 직접 쓰지 않고 실제 ray-pick → 포인터 motion/release로 **27/27**을 조립했다. GUIDE OFF 상태에서도 완료 화면에 도달했다. 소프트웨어 렌더러의 VSync 미지원 고지 외 애플리케이션 오류는 없었다. 원시 결과와 화면은 `evidence/`에 있다.

| 검사 | 상태 |
|---|---|
| 최소 타이틀 두 문구, 키 1회/echo/클릭 전환 | 통과 |
| Stage Select, 난이도, Coming Soon, 설정·Credits·Pause | 메뉴·설정·Credits·Pause 입력 통과, 모든 난이도 수치 규칙은 코어에서 검증 |
| 실제 27개 GLB 화면, 작은/겹친 뼈 Piece Index 선택 | 전체 27개 Index 버튼 및 XYZ 조작 통과 |
| 실제 포인터 드래그, orbit/pan/zoom, 회전 카메라 후 드래그 | 통과. 별도 포인터 전체 조립 27/27 |
| 드래그 중 카메라 고정, 입력창 단축키 차단 | 통과. 입력창 G/Q/E/방향키가 게임을 조작하지 않음 |
| GUIDE OFF 실제 hide/opacity 비활성/판정 독립/설정 재시작 복원 | 실제 guide branch hide, slider 비활성, Continue·Replay 복원 통과 |
| 실제 GUI 27개 배치 → 결과/관찰 → Replay/Continue | 통과. 목표 pose 직접 입력 코어 검사와 포인터 replay를 분리 |
| 1280×720 및 1920×1080 UI 잘림 없음 | 주요 패널 화면 경계 검사·스크린샷 확인 통과, Index는 의도된 스크롤 사용 |
| Intro 및 skip/reduced-motion | assembled 동적 0 → 낙하 27 → 조립 0과 skip 통과, 모션 감소 설정 저장 통과; 자연 전체 연출 시간은 코드 경계와 별도 intro smoke에서 확인 |
| 입력 중인 이름의 보존 | Save note/Check와 별개로 타이핑을 debounce 저장. Pause/Resume 및 다른 조각 선택 후 복원 통과 |
| 반복 진입 후 동적 물체 제거·노드/리소스 누적 | 5회 진입과 취소된 연출 timer 정리 후 측정. 정확한 값은 PERFORMANCE 참조 |

## Windows export·ZIP: 생성·무결성 통과

빌드 명령은 `bash godot/tools/build_windows.sh`다. 이 명령은 import와 코어 검사를 통과한 다음 `Windows Release`, `Windows Debug` preset으로 export하고 stdlib Python으로 ZIP을 만든다.

| 산출물 검사 | 상태 |
|---|---|
| Windows x64 Release export | 통과: `Bone-Puzzle-0.2.0-Windows-x64.exe`, 125,075,112 bytes |
| Windows x64 Debug export | 통과: Debug exe 및 console wrapper 생성 |
| x64 PE header 및 내장 GDPC resource pack | 통과. Windows EXE의 내장 pack을 Linux Godot 엔진으로 별도 로드하여 타이틀 시작 및 코어 212 assertions 재실행 통과. Windows ABI 실행 검증과는 구분 |
| 편집 가능 소스 ZIP의 27 GLB·project.godot·preset, cache/build 제외 | ZIP 내부 필수 파일/모델 개수 및 cache/build 제외 확인 통과 |
| 배포 ZIP CRC 및 SHA-256 목록 | 두 ZIP CRC 검사 통과, `SHA256SUMS.txt`에 ZIP SHA-256 기록. EXE 해시는 동봉 BUILD-INFO.json |
| licenses/README/조작/테스트/성능/비교표 동봉 | 통과. 스크린샷과 원시 JSON도 docs/evidence에 동봉 |
| 소스 ZIP 실제 개방·재사용 | 별도 `/tmp` 폴더에 풀어 cache 없이 editor import, 코어 212 검사, 18,164 정점 비교, standalone Python 데이터 검증 모두 통과. 미동봉 원본 web/STL 비교만 명시적으로 UNRUN |
| 실제 Windows 10/11 실행·종료·재실행·저장·전체 HAND | **미실행** |

`.github/workflows/godot-windows.yml`은 Windows runner에서 공식 엔진/템플릿 SHA-512 검증, import/코어 검사, Debug/Release export, 실제 Release EXE의 headless 시작·종료 및 artifact 업로드를 자동화한다. 워크플로 작성 자체를 실행 성공으로 표시하지 않는다. 이 테스트도 실제 Windows 그래픽·마우스·장시간 성능 검수를 대신하지 않는다.

## 남은 제한

Windows 실제 플레이, Windows GPU frame time/메모리/1080p60, 장시간 soak 및 다양한 GPU 검수는 미실행이다. 현재 Linux 자동·GUI 증거와 Windows 실행 여부를 혼동하지 않는다. BodyParts3D 공식 서버의 최신 직접 확보와 해부학 전문가의 독립 검수도 완료되지 않았다. 원본 브랜드 이미지 바이너리가 없으므로 Splash 브랜드 검수는 미완료이며 임의 로고는 만들지 않았다. HAND 외 부위는 플레이 가능한 것으로 표시하지 않는다.

## 재현 명령

```sh
python3 godot/tools/validate_assets.py
godot --headless --path godot --editor --import --quit
godot --headless --path godot --script res://tests/run_tests.gd
godot --headless --path godot --script res://tools/validate_import.gd
# 실제 display가 있는 환경에서만 렌더/포인터 통합 검사
godot --path godot --script res://tests/gui_smoke.gd
bash godot/tools/build_windows.sh
```

위 명령의 `godot`은 4.7.2 실행 파일이어야 한다. 클라우드에서는 README의 고정 절대 경로를 사용한다. 기존 웹의 Vitest/Chromium 통과 기록은 상위 `docs/TEST_REPORT.md`에 있으며 신규 Godot 검사를 대신하지 않는다.
