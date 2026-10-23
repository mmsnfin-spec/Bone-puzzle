# BONE PUZZLE — Godot PC Edition

실제 BodyParts3D 오른손 뼈 27개를 조립하고 영어 해부학 명칭을 학습하는 독립 실행형 PC 게임이다. 편집 가능한 **Godot 4.7.2 Stable / GDScript** 프로젝트이며 배포 대상은 **Windows 10/11 x86-64**다. 게임 실행에는 Godot 에디터, Node.js, npm, 웹 브라우저, 웹 서버, Vercel 또는 인터넷 연결이 필요하지 않다.

이 프로젝트는 `migration/godot` 브랜치의 `godot/`에 있다. 기존 React 웹게임의 `src/`, `public/`, `scripts/`, `package.json`과 Vercel 설정은 독립적으로 보존한다.

검증: 코어 212 assertions, Linux GUI 137 assertions 통과. GUIDE OFF에서 실제 포인터로 27개를 조립해 완료했다. Windows Debug/Release export와 두 ZIP 무결성·독립 소스 임포트를 확인했으며, 실제 Windows 그래픽/입력/성능 검수는 별도다.

## Windows 실행

1. `Bone-Puzzle-0.2.0-Windows-x64.zip`을 일반 폴더에 완전히 압축 해제한다.
2. 안의 `Bone-Puzzle-0.2.0-Windows-x64.exe`를 실행한다. 별도 설치 프로그램이 없는 휴대형 배포이며 게임 데이터/폰트는 실행 파일에 포함된다.
3. 검은 타이틀에서 일반 키 또는 마우스 왼쪽 버튼을 누른다.
4. Stage Select에서 난이도를 고르고 HAND를 시작하거나 CONTINUE로 저장을 복원한다.

릴리스 ZIP에는 실행 파일, README, `BUILD-INFO.json`, `licenses/`, `docs/`를 동봉한다. 게임 자체는 오프라인으로 플레이할 수 있으며 출처 웹 링크 열기만 인터넷 연결을 사용한다. 실제 Windows PC 실행/성능의 검수 상태는 [테스트 결과](docs/TEST_REPORT.ko.md)와 [성능 기록](docs/PERFORMANCE.ko.md)을 확인한다. Linux에서 Windows 실행 파일을 생성한 사실만으로 Windows 실행 검수가 끝났다고 간주하지 않는다.

## 플레이

- 왼쪽 드래그로 조각을 옮긴다. 작은/겹친 조각은 오른쪽 Piece Index에서 선택한다.
- 오른쪽 드래그는 궤도 회전, 가운데 드래그는 Pan, 휠은 확대/축소다. 조각을 드래그하는 동안 카메라는 고정된다.
- 회전 버튼과 X/Y/Z, Q/E, 방향키, Page Up/Down으로 정밀 조작한다. Enter 또는 Space로 배치를 확인한다.
- Easy는 위치 중심으로 검사하며 회전을 보정한다. Normal과 Hard는 위치와 회전을 모두 검사한다.
- GUIDE 토글 또는 G로 정답 골격을 켜거나 끈다. 꺼도 스냅 규칙과 이미 조립한 뼈는 유지된다. 가이드가 꺼지면 투명도 조절은 비활성화된다.
- Save note는 오답 메모도 보존한다. Check는 공식 영어 명칭 또는 등록된 별칭만 인정한다. 조립과 이름 학습 진행률은 독립적이다.
- 힌트는 서로 다른 뼈 최대 5개에 사용한다. 이미 공개한 힌트를 다시 열어도 차감되지 않으며 자동 정답 처리하지 않는다.
- Esc는 일시정지다. Restart/Replay는 현재 조립·명칭·힌트·시간을 초기화하고 가이드·투명도·모션 설정은 유지한다.

세부 키는 [조작 안내](docs/CONTROLS.ko.md)를 참조한다. HAND만 플레이 가능하며 다른 부위는 Coming Soon이다.

## 편집 가능한 프로젝트 열기

Godot 4.7.2 Stable 표준 에디터를 설치하고 `project.godot`을 Import/Open한다. .NET 또는 별도 플러그인은 필요하지 않다. F6은 현재 씬, F5는 전체 게임 실행이다. 첫 Import에서는 GLB 27개와 번들 폰트를 에디터가 처리한다.

`Bone-Puzzle-Godot-Source.zip`은 `project.godot`, 소스, 데이터, 모델, `.glb.import` 설정, 라이선스, 테스트와 빌드 도구를 포함한다. 재생성 가능한 `.godot/` 캐시와 `build/` 산출물은 제외한다. 원본 React 코드가 필요한 경우 같은 GitHub 저장소의 상위 디렉터리를 참조한다.

렌더러는 PC 호환성을 위한 GL Compatibility다. 기준 UI는 1920×1080이며 1280×720 이상 창 크기를 지원한다. 1080p 60FPS는 개발 목표이고 확정 최소 사양/보장 성능은 실제 Windows 하드웨어 측정 후 정한다.

## 개발 검증과 빌드

Godot와 Python 3 표준 라이브러리만 사용한다. `GODOT_BIN`을 설치한 4.7.2 에디터 실행 파일로 지정할 수 있다.

```sh
# 저장소 루트에서 데이터/복사 체크섬 검사
python3 godot/tools/validate_assets.py

# godot/에서 에디터 임포트와 코어 자동 검사
godot --headless --path . --editor --import --quit
godot --headless --path . --script res://tests/run_tests.gd
godot --headless --path . --script res://tools/validate_import.gd

# 저장소 루트에서 Windows Release + Debug 및 ZIP 생성
bash godot/tools/build_windows.sh
```

Windows PowerShell에서는 Godot의 Export Template Manager에서 **4.7.2** 템플릿을 설치한 뒤 다음을 실행한다. 패키징에는 Python 3가 필요하며 게임 실행에는 필요하지 않다.

```powershell
cd godot
.\tools\build_windows.ps1 -GodotBin 'C:\Godot\Godot_v4.7.2-stable_win64.exe'
```

산출물은 `build/windows/Bone-Puzzle-0.2.0-Windows-x64.exe`, `build/windows-debug/Bone-Puzzle-0.2.0-Windows-x64-Debug.exe`, `build/Bone-Puzzle-0.2.0-Windows-x64.zip`, `build/Bone-Puzzle-Godot-Source.zip`, `build/SHA256SUMS.txt`다. 패키징 도구는 ZIP CRC, Windows x64 PE 형식, 내장 Godot pack과 필수 라이선스를 검사한다. Windows 코드 서명은 적용하지 않는다.

클라우드에서는 `/workspace/tooling/godot/4.7.2/Godot_v4.7.2-stable_linux.x86_64`를 사용하며 `build_windows.sh`가 이를 자동 감지한다. 해당 환경의 쓰기 가능한 Godot 설정 경로는 `XDG_DATA_HOME=/workspace/.local/share`, `XDG_CACHE_HOME=/workspace/.cache/godot-runtime`, `XDG_CONFIG_HOME=/workspace/.config/godot`다. 시스템에 남아 있는 다른 Godot 버전과 혼용하지 않는다.

## 저장과 구조

저장은 Godot `user://save_v1.json`과 백업 `.bak`을 사용한다. Windows의 기본 위치는 `%APPDATA%\BonePuzzle\`다. 스테이지 기록과 일반 설정에 버전을 두고, 잘못된 JSON/transform/이름 검증·힌트 상태를 검사한다. 브라우저 LocalStorage 기록과 별개이며 자동 이관하지 않는다.

```text
scenes/main/       실행 진입 씬
scripts/core/     App, GameSession 및 상태 전이
scripts/ui/       최소 타이틀, 메뉴, 학습·진행 UI
scripts/puzzle/   선택·드래그·스냅·GuideSystem
scripts/camera/   orbit/pan/zoom
scripts/physics/  Intro 전용 동적 물리
scripts/learning/ 명칭 정규화·정답 검증
scripts/save/     버전 JSON 및 손상 복구
assets/           오른손 GLB 27개와 배포 허용 폰트
data/             원본 필드를 보존한 JSON과 해시 manifest
tests/            헤드리스 코어·GUI 통합 검사
tools/            데이터 검증, 성능 측정, Windows 빌드·ZIP
licenses/         BodyParts3D/Godot/폰트의 고지·라이선스
docs/             기능 비교·조작·검수·성능·스테이지 확장
```

## 데이터와 출처

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.**

오른손은 8 carpals / 5 metacarpals / 14 phalanges, 총 27개 FMA 모델과 36,216 triangles다. GLB를 원본 웹 데이터에서 바이트 그대로 복사했고, 공통 좌표·회전·상대적인 크기와 원본 SHA-256을 보존했다. Godot의 임포트 압축과 자동 LOD를 끈 설정도 함께 제공하여 원본 정점과 엄격히 비교한다. 새 형상 생성·추가 decimation·축 반전은 적용하지 않는다.

BodyParts3D 파생 모델/메타데이터/해부학 렌더링에는 CC BY-SA 2.1 Japan이 적용된다. 고정 미러 커밋과 원본 배포 README, 명칭표, 체크섬은 `licenses/bodyparts3d/`에 있다. Godot는 MIT, DejaVu Serif와 Noto Sans CJK는 각 번들 라이선스를 따른다. [NOTICE](licenses/NOTICE.md)를 참조한다. 원본 브랜드 이미지 파일이 없으므로 임의 브랜드 로고를 만들지 않았다.

기능 비교와 기존 한계는 [FEATURE_PARITY](docs/FEATURE_PARITY.ko.md), 다른 부위 추가 방법은 [STAGE_EXTENSION](docs/STAGE_EXTENSION.ko.md)을 참조한다.
