# 원본 기능 분석 및 Godot 기능 일치표

분석 기준은 `main`의 `db6d87768a541c4378c7899978d93193d5ff2b04`이다. 신규 구현은 `migration/godot`의 `godot/`에서 독립 실행형 Godot/GDScript 게임으로 수행한다. React, Three.js, Rapier, Zustand, Vercel은 원본 분석 대상이며 Godot 게임의 런타임 의존성이 아니다. 이 문서의 원본 검증 결과는 기존 `docs/TEST_REPORT.md`의 기록과 소스 확인 결과다. Godot 실행 결과는 별도 검수 보고서에서 실제 실행 증거와 함께 기록한다.

## 읽은 원본과 책임

| 파일 | 실제 책임 및 확인 사항 |
|---|---|
| `README.md`, `package.json` | HAND 1개 스테이지, 정적 웹앱 실행/검증 명령, 기존 의존성, 미구현 범위 |
| `src/app/App.tsx` | Splash/Title/Intro/Game/Complete 화면, 도움말·출처 모달, reduced-motion 감지 |
| `src/scene/BoneScene.tsx` | GLB 27개, 카메라, Rapier 낙하, ghost, 선택 강조, 포인터 드래그 |
| `src/scene/BoneDragController.ts` | 목표를 지나는 카메라 정면 평면과 grab offset, 좌표 clamp |
| `src/screens/TitleScreen.tsx` | 원본 복합 타이틀·난이도·미구현 스테이지·이어하기·모션 설정 |
| `src/screens/StageIntroScreen.tsx` | HAND typography, Skip intro |
| `src/screens/GameScreen.tsx` | 시간·조립/학습 진행률·목록·ghost slider·키보드 조작 |
| `src/screens/CompletionScreen.tsx` | 27개 배치 시 결과, 시간/힌트/명칭, Replay, 관찰 |
| `src/state/gameStore.ts`, `screenStore.ts` | 게임 규칙, 허용 화면 전이, 저장 및 초기화 경계 |
| `src/systems/{SnapSystem,AnimationSystem,NameValidationSystem,HintSystem}.ts` | 거리/회전, 연출 시간, 명칭/별칭, 5개 고유 힌트 규칙 |
| `src/utils/persistence.ts` | 저장 transform/형식 검증, 배치 완료 pose의 정답 복원 |
| `src/data/{hand.json,stages.ts,bones.ts}`, `src/types/{bone,game}.ts` | FMA 27개 정적 데이터, 동적 플레이 상태, 준비된/미구현 스테이지 |
| `src/components/game/{BoneNameInput,ProgressDisplay}.tsx` | Save note/Check 분리, 힌트, 축별 회전, 별개 진행률 |
| `docs/{DESIGN_SPEC,TEST_REPORT,DATA_PIPELINE}.md`, `LICENSES.md` | 참조 이미지의 부재, 기존 검증 범위, 좌표/출처/라이선스 |
| `public/models/hand/`와 `source/` | GLB 27개 및 원본 배포 README/명칭표/미러 커밋/체크섬 |
| `tests/` | 스냅·이름·힌트·저장·화면 단위 테스트와 Chromium 실제 드래그 테스트 |

## 기능 일치 및 의도된 변경

아래 대상은 현재 `App + GameSession + PuzzleWorld + GameUI`로 구현했다. `scripts/core/app.gd`가 화면과 world 수명을, `game_session.gd`가 규칙·저장을, `puzzle_world.gd`가 3D 입력·모델을, `game_ui.gd`가 메뉴·학습 UI를 맡는다. 코어 212 assertions/0 failures와 Linux GUI 137 assertions/0 failures를 확인했다. 실제 Windows 검수와 성능 결과는 `TEST_REPORT.ko.md`에서 별도로 구분한다.

| 기능 | 원본 실제 동작 | Godot 대상 및 변경점 |
|---|---|---|
| 시작 화면 | Splash 뒤 복잡한 타이틀, 손 모델과 B/P/3D/여러 설명/버튼 | 검은 화면 중앙 `BONE PUZZLE`, 하단 `아무 key나 눌러 시작하시오`만 표시. 일반 키 1회/마우스로 별도 Stage Select 진입, key echo 무시 |
| Splash | 실제 브랜드 이미지 없음. 빈 Splash는 80ms 뒤 건너뜀 | 이미지 부재 유지. 브랜드 심벌을 새로 만들지 않음. 로고가 확보될 때 별도 연결 |
| 메뉴 | 타이틀에 난이도·이어하기·Credits | Stage Select/Main Menu에 HAND, 난이도, 이어하기, 설정, Credits 배치 |
| 스테이지 | HAND 활성, FOOT/VERTEBRA 비활성 | HAND만 활성. 데이터가 없는 FOOT/UPPER LIMB/LOWER LIMB/PELVIS/SPINE/THORAX/SKULL 등 Coming Soon |
| 데이터 | 오른손 27개, 8 carpals/5 metacarpals/14 phalanges | 동일 FMA/영한 이름/별칭/모델/정답/좌표·체크섬 보존, Godot용 별도 복사 |
| 모델 로드 | 최초 비-Splash 화면에서 모든 HAND 자원 로드 | 타이틀에는 모델을 로드하지 않고 선택된 스테이지 진입 시 로드·재사용 |
| 선택 | 실제 메시 클릭, 작은 뼈를 위한 Piece index, 선택 강조 | 클릭과 Piece index 모두 유지. 겹친/작은 조각은 목록을 통해 확실히 선택 |
| 드래그 | 카메라 정면 평면 + grab offset, dragging 중 OrbitControls 잠금 | 현재 카메라 기준 ray/plane 변환과 offset 유지. 드래그 중 궤도/Pan/Zoom 잠금 |
| 카메라 | 빈 곳 좌드래그 orbit, 우드래그 pan, 휠 zoom, reset | orbit/pan/zoom/reset 유지. PC 조작 설명은 Godot의 실제 버튼 매핑에 맞춤 |
| 정밀 조작 | 방향키 XY, PageUp/Down Z, Q/E Z회전, Shift 미세, Enter drop | 키보드 이동/XYZ 회전 및 배치 유지. 입력창에서는 게임 단축키를 소비하지 않음 |
| 스냅 | 자기 자신의 target만 검사, 난이도별 거리/회전, 성공 시 정답 고정 | 동일 규칙. 0.22s pose 보간, 배치 완료한 뼈 이동 금지, GUIDE와 판정 독립 |
| 가이드 | 미배치 뼈 ghost 항상 켜짐, opacity .05–.25, Hard는 최대 .075 | 독립 GuideSystem. G/UI로 ON/OFF, 기본 ON, OFF는 실제 hide로 draw 제거. 난이도와 별개 설정·복원, OFF에서 opacity 조작 비활성 |
| 메모 | Save note는 오답도 최대 120자로 저장 | 입력 중 메모도 debounce 보존하고 Save note는 즉시 기록. 저장만으로 nameVerified를 true로 만들지 않음 |
| 명칭 확인 | 공식 영어명/등록 별칭만, trim/lowercase/중복 공백 정규화 | 동일. 이름을 틀린 값으로 수정하면 검증 상태 해제. 손가락 구분 없는 일반 지골명 거부 |
| 힌트 | 최대 5개의 서로 다른 bone, 공개했던 이름 재열람 무료 | 동일. 힌트는 메모 덮어쓰기·자동 정답 확인을 하지 않음 |
| 진행률 | 조립 27개와 이름 학습 27개는 독립 | 동일. 이름 확인이 0개여도 27개 배치 시 조립 완료 |
| 시간 | 게임 화면에서만 증가, 문서 hidden 동안 제외 | playing 상태에서만 증가. Intro/메뉴/일시정지/완료는 제외 |
| 일시정지 | 독립 Pause 메뉴 없음 | Escape로 Resume/설정/Restart/Stage Select/종료 제공 |
| 저장 | 브라우저 LocalStorage v1, 단일 HAND 세션 | `user://` 버전 JSON, 검증/손상 복구, stage별 기록과 일반 설정 분리. 웹 저장을 자동 읽지 않음 |
| Restart/Replay | pose·배치·이름·힌트·시간 초기화, 일반 설정 유지 | 동일. GUIDE ON/OFF·opacity·reduced-motion 취향 유지 |
| Intro | 완성 손 → 낙하 → 정리 → HAND → 조립 | 같은 기능/시간 경계. 동적 RigidBody는 낙하 중에만 존재하고 조립 전에 제거 |
| 완료 | 27개 조립, 시간, 힌트, 명칭, Replay, 타이틀 이동, 관찰 | 결과 유지, Stage Select 이동, 완성 손 orbit 관찰 |
| 출처 | 모든 비-Intro 화면 출처 모달, 모델 배포 고지 | 후속 메뉴 Credits와 Windows 배포 LICENSE/출처 사본. 타이틀에 Credits를 넣지 않음 |

## 규칙과 수치: 원본 그대로 이식할 값

거리 `d = |position - targetPosition|`는 모델마다 정의된 `snapDistance`와 비교한다. 표의 경계는 `<=`로 포함한다.

| 난이도 | 허용 거리 | 회전 검사 |
|---|---:|---:|
| Easy | `snapDistance × 1.0` | 무시하고 target 회전으로 보정 |
| Normal | `snapDistance × 0.75` | `0.35 rad` 이하, 약 20.05° |
| Hard | `snapDistance × 0.50` | `0.16 rad` 이하, 약 9.17° |

Quaternion 각도는 `2 * acos(min(1, abs(dot(a,b)/(|a||b|))))`다. `q`와 `-q`는 같은 회전으로 처리하며, 위치/회전의 NaN/Infinity 및 길이 0인 quaternion은 거부한다. `snapDistance`는 뼈별 약 0.22–0.42다. 일반 이름 문자열 비교로 다른 뼈 정답을 허용하지 않는다.

| Intro 구간 | 원본 길이 | 누적 종료 |
|---|---:|---:|
| assembled/reveal | 1.7s | 1.7s |
| falling | 2.6s | 4.3s |
| settle | 0.9s | 5.2s |
| typography | 1.5s | 6.7s |
| snap | 0.22s | 독립 |

모션 감소 또는 Skip intro는 즉시 조립으로 이동한다. 타이틀 입력을 자동으로 대신하지 않는다. 원본 낙하는 gravity `(0,-15,0)`, restitution `.22`, friction `.9`, linear damping `.6`, angular damping `.8`이며 복잡한 hull collider를 사용했다. Godot에서는 간단한 box 충돌체로 비용을 줄이고 실제 낙하만 동적 처리한다.

키보드 원본 이동량은 기본 `.25`, Shift `.05`, 회전은 기본 15°/Shift 5°다. 원본 포인터 clamp는 X `[-7,7]`, Y `[-3.7,6]`, Z `[-5,5]`이며, 키보드 Z clamp는 `[-7,7]`이었다. Godot의 최종 조작 범위는 일관되게 문서화하고 정확한 목표 좌표를 모두 포함해야 한다.

## 원본 상태 전이와 저장 검증

원본 허용 화면 전이는 다음과 같다.

```text
splash → title
title → stageIntro | game | complete
stageIntro → game | title
game → complete | stageIntro | title
complete → stageIntro | title | game
```

Godot는 후속 `menu`, `intro`, `playing`, `paused`, `completed` 경계를 추가한다. 메뉴 재진입은 현재 세션을 보존하고 Restart는 현재 스테이지를 재초기화한다. `GameSession`은 UI와 독립적으로 상태·규칙을 소유하고, `PuzzleWorld`는 시각/포인터 조작만 맡는다.

원본 저장은 27개 ID 전부가 있고, position 3개/rotation 4개가 유한하며 절댓값 100 미만, quaternion 길이 오차 .01 이내, 메모 최대 120자, bool 필드 형식, 고유 힌트 5개 이하일 때만 복원한다. 배치 완료 pose는 데이터 정답으로 덮어쓰고 nameVerified를 실제 이름으로 재검증한다. 힌트 잔여 개수는 `hintShown`에서 재계산한다. Godot 역시 파생 카운트를 파일 값으로 신뢰하지 않아야 한다.

## 해부학 데이터와 라이선스 보존

HAND 27개는 GLB 총 36,216 triangles이며 추가 decimation 없는 BodyParts3D 3.0 / 20110915 파생 모델이다. `sourceSha256`은 원본 STL 해시이며 복사된 GLB 해시와 혼동하지 않는다. GLB 복사 해시도 따로 검증한다.

공유 좌표 변환은 원본 AABB 중심을 원점으로, `(-x,-z,-y)` 회전(det +1), 균일 scale `0.044034301971768254`, stage offset `(0,1.5,0)`이다. GLB에는 이미 회전·스케일이 적용돼 있다. 각 local vertex에 `targetPosition`을 더하면 조립된 world vertex가 된다. Godot 임포트에서 개별 축 반전·추가 90° 회전·개별 scale 보정을 중복 적용하지 않는다. `targetRotation`은 identity, `targetScale`은 unit이다.

보존할 항목: 27개 `id/fmaId`, `englishName/koreanName/acceptedAliases`, category, 모델 경로, initialTransform, targetPosition/targetRotation/targetScale, size, snapDistance, originalCenter, sourceSha256, vertexCount/triangleCount, 전체 coordinateMapping 및 출처 manifest. 웹의 JSON/GLB는 이동·덮어쓰기하지 않고 Godot용 사본을 만든다.

`BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.` 고지와 동일 라이선스를 파생 GLB/데이터/해부학 렌더링에 유지한다. 미러 고정 커밋은 `f0eeb6e843380cfe6b83797cf8c3e1af74de5e61`이다. 보존된 README/명칭표/manifest와 라이선스 사본을 Windows 배포물에도 포함한다. 공식 서버 직접 검증이나 전문가 검수를 완료했다고 표시하지 않는다.

## 원본의 알려진 한계와 Godot 검수 대기 항목

기존 보고서에는 30개 단위·UI 검사 및 Chromium 4개가 통과했다고 기록돼 있다. 브라우저에서는 실제 마우스로 Easy 27개 배치, 카메라 orbit 후 드래그, 이름·힌트·저장·Replay, Normal 회전 거부/보정이 검사됐다. 이는 신규 Godot 게임에 대한 통과 증거가 아니다.

기존 웹앱은 매 프레임 각 뼈의 kinematic pose를 갱신하고 wakeUp을 호출한다. Godot 조립 단계에서는 상시 RigidBody/반복 Transform 갱신을 재현하지 않는다. 원본의 3.19MB physics/Three chunk 경고, LocalStorage 제약, Vercel API 접근 제한은 독립 PC 런타임에 가져오지 않는다.

- [x] Godot 4.7.2 공식 바이너리/Windows 템플릿 SHA-512 검증
- [x] Godot 데이터 복사·좌표/고유 ID/27개 모델 임포트 자동 검증: 18,164 imported vertices 엄격 비교
- [x] 모든 난이도의 거리·회전 경계와 GUIDE 독립 판정 자동 검증
- [x] 명칭·고유 힌트·메모·손상 저장·Restart 상태 자동 검증: 코어 212 assertions/0 failures
- [x] 타이틀 최소 문구·단일 키/클릭·Stage Select·Escape 실제 GUI 검수
- [x] GUI에서 27개 뼈 조작, orbit/zoom/pan, 회전 후 드래그 및 카메라 잠금 검수
- [x] GUIDE OFF 실제 hide·설정 복원·가이드 충돌 없음 검수
- [x] Linux GUI Easy 실제 포인터 27개 완료·관찰·Continue·Replay 검수
- [x] Intro 종료 후 동적 물리 객체 제거 및 5회 반복 진입 자원 누적 확인
- [ ] Debug/Release FPS·frame time·physics·draw calls·memory 측정 기록
- [x] Windows Release/Debug export, PE x64·내장 pack 및 배포 라이선스/실행 README 검수
- [ ] 실제 Windows 10/11 PC 실행 및 1080p 성능 측정
- [ ] 전문가의 독립 해부학 정확도 검수

## 실행 순서와 단계 기록

1. 원본 분석/보존, 위 일치표, 개발 브랜치, Godot 프로젝트와 Windows 대상 설정.
2. GLB 27개와 데이터 복사·검증, 완성 손을 카메라/조명/공통 재질로 렌더링.
3. 선택·드래그·XYZ 회전·카메라·스냅·난이도·배치 고정.
4. 최소 타이틀, 후속 메뉴, GUIDE ON/OFF/G/opacity, 창 크기 대응.
5. 메모·정답·힌트·별개 진행률·완료·이어하기·Restart·설정·저장.
6. 낙하 분리·정리·부드러운 스냅, idle/event 기반 갱신, 자원/성능 측정.
7. Debug/Release와 자동·GUI 검수, Windows export, 프로젝트/배포 ZIP과 라이선스.

각 단계는 변경 파일·완료 기능·실행한 명령 및 결과·남은 제한을 `godot/docs/TEST_REPORT.ko.md` 등 실제 검수 기록에 남긴다. 미실행 GUI/Windows 검사를 자동 검사 통과로 대신하지 않는다.
