# 스테이지 확장 가이드

HAND는 원본 데이터 27개로 구현하는 첫 스테이지다. FOOT, UPPER LIMB, LOWER LIMB, PELVIS, SPINE, THORAX, SKULL은 실제 모델·명칭·목표 좌표 검증이 끝나기 전에는 Coming Soon으로 유지한다. 임의 모델, 손뼈 복제, 근거 없는 뼈 분할로 스테이지를 채우지 않는다.

## 책임 경계

- `StageCatalog`는 정적 JSON과 Vector3/Quaternion 변환을 제공한다. 현재 `load_hand()`를 사용하며 새 스테이지를 활성화할 때 ID 기반 `load_stage(stage_id)`와 등록 정보를 확장한다.
- `GameSession`은 catalog/bones, bone_states, 난이도, selected_id, 시간, GUIDE 설정, 힌트/학습/저장을 소유한다. `changed`, `bone_changed(id)`, `completed` 신호로 UI/3D에 알리고 렌더링 자원을 직접 생성하지 않는다.
- `PuzzleWorld.setup(session)`은 전달받은 세션의 bones와 bone_states로 모델을 생성한다. 선택·드래그·회전 결과는 세션 메서드로 전달하며 UI 노드를 직접 수정하지 않는다.
- `GuideSystem`은 동일한 target transform으로 가이드를 표시한다. GUIDE를 꺼도 스냅 데이터와 배치 완료 모델은 유지한다.
- `PhysicsIntro`는 선택한 스테이지의 연출을 담당한다. 낙하 중에만 동적 물체를 사용하고 조립 전에 제거한다.
- SaveSystem은 `user://` 버전 파일을 처리한다. 스테이지마다 정적 정의를 검증하고 다른 스테이지의 bones/선택/시간을 잘못 복원하지 않는다.

## 새 데이터 준비

1. 고정 출처/배포 버전/라이선스를 확인한다. 기존 원본과 manifest는 보존하고 새 입력·체크섬을 별도로 기록한다.
2. 실제 FMA와 영문·한글 명칭, 인정할 별칭, 분류, 고유 Bone ID를 결정한다. 실제 독립 메시 단위를 확인하며 임의 분할하지 않는다.
3. `godot/assets/models/<stage>/`에 검증된 GLB를 넣고 `godot/data/<stage>.json`에 사본 메타데이터를 작성한다.
4. 원본 전체에 같은 원점/rigid rotation/균일 scale을 적용하고 모델별 local center와 되돌릴 수 있는 targetPosition을 기록한다. 좌우 반전을 사용하지 않는다.
5. 실제 world bounds를 기준으로 카메라/트레이 범위를 결정한다. 개별 뼈를 늘이거나 정답 위치를 눈대중으로 바꾸지 않는다.
6. 처음에는 완성 pose 렌더링으로 상대 위치와 연속된 골격을 원본 결과와 비교한다. GLB vertices/bounds, source checksum, 변환 왕복 오차도 함께 검사한다.

## 데이터 계약

스테이지 루트는 `stageId`, `side`, `dataset`, `source`, `coordinateMapping`, `bones`를 가진다. 뼈마다 아래 원본 필드를 유지한다.

```text
id / fmaId
englishName / koreanName / acceptedAliases[]
category / modelPath (res://assets/models/<stage>/...glb)
initialTransform.position[3] / initialTransform.rotation[4]
targetPosition[3] / targetRotation[4] / targetScale[3]
originalCenter[3] / size[3] / snapDistance
sourceSha256 / vertexCount / triangleCount
```

JSON quaternion 순서는 `[x,y,z,w]`다. 좌표는 유한해야 하고 quaternion은 정규화 가능해야 한다. `sourceSha256`은 원본 입력 메시 해시이므로 새 GLB의 해시로 덮어쓰지 않는다. Godot 임포트에 이미 구워진 회전·스케일을 중복 적용하지 않는다.

HAND의 현재 category 값은 carpals/metacarpals/phalanges다. 다른 부위를 추가할 때 UI 그룹을 HAND 상수에 고정하지 말고 데이터의 category 목록/표시명으로 구성한다. 전체 수, 완료 조건, progress denominator도 `bones.size()`를 사용한다.

## 등록·저장 확장

후속 메뉴에 새 stage_id, 표시명, JSON 경로, available 플래그를 등록한다. available=true는 모델과 검증이 모두 준비된 뒤에만 적용한다. 현재 HAND 중심인 코드 경계가 남아 있으면 먼저 다음 항목을 수정하고 테스트한다.

- Catalog 로더를 ID/경로 기반으로 확장하고 UI가 현재 데이터에서 목록을 구성하게 한다.
- 새 세션은 해당 catalog의 initialTransform으로 생성한다. 이전 선택 ID/힌트/시간이 다음 stage로 새지 않게 한다.
- 저장은 stage_id별 기록을 구분하고 일반 설정(GUIDE/opacity/reduced-motion)은 공유한다.
- 저장 버전 변경 시 이전 HAND 파일을 검증·변환하거나 안전하게 거부하는 명시적 migration 함수를 둔다. 브라우저 LocalStorage 파일과 혼동하지 않는다.
- Restart는 현재 스테이지만 초기화하고 일반 설정과 다른 스테이지 기록을 유지한다.

## 활성화 전 검수

- 고유 ID/실제 모델 수와 해부학 구성, 원본 체크섬, 모델 임포트/좌표 검증.
- 모든 뼈의 exact target이 Easy/Normal/Hard에서 성공하고 잘못된 위치/회전은 거부되는 자동 검사.
- 이름/별칭의 중복·오인식, 새 부위별 구분이 필요한 명칭, 최대 5개 고유 힌트 검사.
- 저장/복원/손상/다른 스테이지 전환/Restart/완료 상태 전이 검사.
- 실제 GUI에서 작은/겹친 뼈 선택, camera orbit 후 드래그, 끝까지 조립, 관찰.
- 반복 진입 후 동적 물리 객체/노드/메모리 누적 없음, GUIDE OFF draw 제거, 대표 PC 성능.
- Windows export/실행/라이선스 동봉과 문서 갱신.

새 부위를 추가하는 작업은 별도 브랜치에서 진행하고 웹의 `src/`, `public/`, `scripts/`, `package.json`, Vercel 설정은 이동하거나 변경하지 않는다. 기존 웹 데이터가 필요하면 Godot 경계로 복사/변환하며 원본을 보존한다.
