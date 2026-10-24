# BONE PUZZLE 데이터 모듈

해부학 원본과 실행 중 상태를 분리한다. `src/data/hand.json`과 `public/models/hand/`는 기존 데이터 그대로 유지하고, 원본 값의 변경 없이 읽기 전용 카탈로그와 인덱스를 만든다. 저장 호환성은 기존 v1 키를 유지한다.

| 모듈 | 관리 대상 | 소비 코드 |
|---|---|---|
| `data/hand.json` | 27개 FMA, 영한 명칭·별칭, 모델 경로, 초기/목표 pose, 스케일·좌표 변환·체크섬 | 해부학 원본, 기존 Python/Godot 변환 검증 |
| `data/anatomy/hand.ts` | HAND의 8/5/14 개수 계약과 카탈로그 생성 | 기존 `data/bones.ts` 호환 export |
| `data/catalog.ts` | FMA 중복·분류 검증, 깊은 불변화, ID·분류·순서 인덱스 | 씬, 선택, 학습, 저장 |
| `data/anatomy/categories.ts` | 분류 ID와 표시명 | Piece Index, 카탈로그 검증 |
| `data/stageRegistry.ts` | 스테이지 ID, 표시명, 가용성·개수 | Stage Select, 진행/완료 화면 |
| `data/config/gameplay.ts` | 난이도별 거리·각도, 가이드, 힌트, 저장 계약, 애니메이션 시간 | 순수 시스템, store, UI, snap tween |
| `data/config/interaction.ts` | 이동/회전 step, Arcball 감도, drag 임계값, 모델 공간 범위 | 키보드, 포인터, DragController |
| `data/config/physics.ts` | Intro 중력·고정 step·충돌/바닥·감쇠 | IntroPhysics 전용 lazy 청크 |
| `data/config/rendering.ts` | 시점·zoom·조명·공통 재질·DPR | BoneScene, 동일 조건 성능 도구 |
| `data/project.ts`, `data/brand.ts` | 저장소·최신 소스 ZIP·출처 URL, 실제 로고 연결 | Credits, Splash |
| `state/gameStore.ts`, `utils/persistence.ts` | 사용자 pose·학습·설정·시간의 가변 상태 | UI와 직접 메시 제어의 최종 commit |

카탈로그 정의는 깊게 freeze한다. `freshPieces()`는 초기 pose를 복제해 별도의 가변 상태를 만든다. 드래그 중에는 해당 Three.js Mesh만 갱신하고, pointerup에서 정규화된 Quaternion과 위치를 저장한다. 원본 target 배열을 플레이 상태로 재사용하거나 덮어쓰지 않는다. 취소된 제스처는 마지막 확정 pose로 복구한다.

Three.js 및 Rapier 객체를 데이터 모듈에 넣지 않는다. 설정은 숫자·문자열·배열로만 관리하며 엔진 객체 생성은 지연 로딩되는 씬 안에서 수행한다. 이를 통해 타이틀이 물리·3D 라이브러리를 선로딩하지 않는다.

새 부위를 추가할 때는 원본 JSON/GLB와 출처·체크섬, 분류 개수 계약, 카탈로그 모듈을 먼저 준비한다. 실제 모델과 정확한 목표 pose의 검사 및 저장 stage namespace 설계를 완료한 뒤 registry의 available을 활성화한다. 메타데이터만 추가했다고 플레이 가능한 것으로 표시하지 않는다. 현재 플레이 가능한 카탈로그는 HAND 하나이며 저장 키의 자동 변경·기존 기록 삭제는 하지 않는다.

검증 명령: `npm test`, `npm run validate:data`, `node scripts/audit-assets.mjs`. 카탈로그 검사는 원본과 동일한 pose·분류·체크섬, 원본 불변성, 가변 상태 분리, FMA 중복 거부를 확인한다. 실제 입력/판정/복원은 Playwright에서 별도로 검사한다.
