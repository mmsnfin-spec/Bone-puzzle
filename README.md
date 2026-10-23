# BONE PUZZLE 3D

검은 3D 공간에서 실제 오른손 뼈 27개를 조립하고 영어 해부학 명칭을 학습하는 웹 애플리케이션입니다. 첨부 마스터 요구사항을 보존하면서 HAND를 먼저 구현했습니다. 별도 서버·로그인·유료 API가 필요하지 않습니다.

## 실행

Node.js **22.12 이상** (검증: 24.19.0), npm을 사용합니다.

```sh
npm ci
npm run dev
```

프로덕션 빌드 및 실행:

```sh
npm run build
npm run preview
```

현재 클라우드 체크아웃은 `/workspace/Bone-puzzle`입니다. 각 클라우드 작업은 이미 격리되어 있으므로 기존 체크아웃을 사용하며 별도 Git worktree를 만들 필요가 없습니다.

## 플레이

- Start를 누르면 완성된 오른손 → 물리 낙하 → HAND 타이포그래피 → 조립 화면으로 이어집니다.
- 뼈를 클릭하면 이름 입력 패널이 열립니다. 작은 뼈는 Piece index에서도 선택할 수 있습니다.
- 뼈를 반투명 골격의 해당 위치로 드래그합니다. Easy는 위치만 검사하고 회전을 보정합니다. Normal/Hard는 회전과 위치를 모두 검사합니다.
- 빈 공간 드래그: 궤도 회전. 휠: 확대/축소. 오른쪽 드래그: pan. 드래그 중 카메라 잠금.
- Save note는 오답도 기록합니다. Check는 정식 이름/명시된 별칭만 검증합니다. 대소문자와 앞뒤 공백은 무시합니다.
- 힌트는 최대 5개의 서로 다른 뼈에 쓸 수 있습니다. 공개했던 힌트를 다시 봐도 차감되지 않으며 자동 정답 처리가 되지 않습니다.
- 조립과 이름 학습 진행률은 별개입니다. 27개 배치 후 결과와 관찰 모드를 표시합니다.
- Restart/Replay는 조립·메모·정답·힌트·시간을 모두 초기화합니다. 타이틀 이동/새로고침은 LocalStorage에 저장한 진행을 유지합니다. 저장소 사용이 차단된 브라우저에서는 현재 세션만 동작합니다.
- 조각을 선택한 후 방향키로 XY 이동, Page Up/Down으로 깊이 이동, Q/E로 회전, Enter로 배치합니다. Shift는 미세 조정입니다. 회전 패널은 XYZ 축별 회전도 지원합니다.

## 검증

```sh
npm test                 # Vitest + React Testing Library
npm run typecheck
npm run build
npm run validate:data    # 27개/FMA/GLB 검증; 원본 캐시가 있으면 좌표 왕복까지
npm run test:e2e         # 실제 Chromium WebGL/마우스 조립 검사
```

브라우저 테스트는 `CHROMIUM_PATH`(기본 `/usr/bin/chromium`)를 사용합니다. Chromium이 없으면 설치 후 이 변수로 경로를 지정하세요. 테스트 서버는 5174 포트에서 시작하며 `VITE_E2E=1`일 때만 읽기 전용 scene probe를 활성화합니다. 프로덕션 빌드에는 probe가 포함되지 않습니다. 브라우저에서 27개를 실제 드래그하므로 소프트웨어 GPU 환경에서는 수 분이 걸릴 수 있습니다. 포트 5174에 일반 개발 서버가 있다면 종료한 뒤 테스트를 실행하세요.

## 데이터

앱에는 **실제 BodyParts3D 3.0 오른손 메시 27개**가 GLB로 포함되어 있습니다. 8 carpals / 5 metacarpals / 14 phalanges, 36,216 triangles. 원본 공유 좌표를 하나의 회전·균일 축척으로 변환하고 정답 위치를 기록했습니다. 형상에 추가 decimation을 적용하지 않았습니다.

공식 서버 직접 접근이 차단되어, 출처와 배포 문서를 보존한 공개 미러의 특정 커밋을 사용했습니다. [데이터 파이프라인](docs/DATA_PIPELINE.md), [라이선스](LICENSES.md), 모델별 `public/models/hand/source/manifest.json`을 참조하세요.

원본 다운로드 및 재생성(선택 사항, 앱 실행에는 불필요):

```sh
npm run data:fetch
npm run data:convert
npm run validate:data
```

Python 3 표준 라이브러리만 사용합니다. 공식 OBJ에도 대응하는 변환기를 포함합니다. 공유 변환·원본 중심·원본 SHA-256·FMA ID를 보존합니다.

## 현재 범위와 남은 작업

- HAND의 조립·학습·완료 흐름과 실제 27개 모델을 구현했습니다. 검증 결과는 [TEST_REPORT](docs/TEST_REPORT.md)에 기록합니다.
- 사용자 브랜드 로고 이미지의 바이너리 파일은 이 환경에 전달되지 않았습니다. Splash fade 기능은 있지만 실제 브랜드 로고 연결은 미완료입니다. `docs/DESIGN_SPEC.md`에 원본과 투명 PNG 배치 경로를 기록했습니다. 대체 브랜드 심벌을 만들지 않았습니다.
- FOOT 26개와 VERTEBRA는 아직 데이터 검증 및 스테이지 구현이 필요합니다. 선택 화면에는 Coming Soon으로 표시합니다. 전체 요구사항을 제거한 것이 아니라 HAND 다음 개발 단계입니다.
- 공식 최신 OBJ 직접 확보·직접 서버 라이선스 재확인, 해부학 전문가 검수, 물리 낙하의 다양한 실제 GPU/터치 기기 검수는 남아 있습니다.
- 현재 앱은 오른손에 대한 단일 스테이지 저장 세션입니다. 다른 스테이지를 활성화할 때 저장 데이터 버전과 stage별 초기화/복원을 함께 확장해야 합니다.

## 구조

```text
src/app/             화면 전환, 안내/출처 dialog
src/screens/         Splash, Title, Stage Intro, Game, Completion
src/components/game/ 이름 입력, 힌트·회전 패널, 진행률
src/scene/           GLB 렌더링, Rapier 낙하, ghost, 드래그, 카메라
src/systems/         스냅·명칭·힌트·애니메이션 규칙
src/state/           Zustand 게임 상태, 화면 상태 머신
src/data/            실제 HAND 정의, 스테이지·브랜드 설정
src/types/           정적 해부학 데이터와 동적 플레이 타입
src/utils/           저장 상태 검증 및 복원
scripts/             원본 추출, OBJ/STL→GLB 변환, 좌표 검증
public/models/hand/  GLB 및 원본 출처·라이선스·체크섬
public/assets/       사용자 원본/처리 에셋의 교체 위치
tests/              단위·화면·실제 브라우저 검사
docs/               요구사항, 구현 상태, 데이터, 디자인, 검수 결과
```

## Vercel 배포

`vercel.json`에 Vite 빌드와 `dist` 출력 설정을 저장했습니다. GitHub의 `mmsnfin-spec/Bone-puzzle` 저장소를 Vercel에서 Import하여 배포하면 정적 사이트로 실행됩니다. 본 앱에는 별도 환경 변수나 서버가 필요하지 않습니다. 배포 후 About & credits에서 ZIP을 다운로드할 수 있습니다.

현재 환경의 Vercel CLI는 로그인되어 있지 않고 Vercel API는 프록시에서 403을 반환합니다. 따라서 실제 배포 URL은 배포 완료와 기능 재검증 전까지 준비됐다고 표시하지 않습니다.
