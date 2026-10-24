# T06 landmark-by-landmark 구현·검수

검수일: 2026-10-25 (Asia/Seoul). 브랜치: `feature/landmark-t06`. 원본 요청은 [REQUIREMENTS.ko.md](REQUIREMENTS.ko.md)에 보존했다.

## 구현 범위

BodyParts3D 3.0의 고정 미러 커밋 f0eeb6e843380cfe6b83797cf8c3e1af74de5e61에서 FMA9945를 확보했다. 배포 parts_list_e.txt의 실제 명칭은 **sixth thoracic vertebra**다. 따라서 T06으로 명명했다. 원본 STL SHA-256은 591757ab8228e95d93733e276f424b240ce9e050cf7bf7ec10775c35004f908b다. 다른 흉추나 다른 부위로 확장하지 않았다.

모든 난이도에서 다음 7개 piece ID와 모델, 위치, 목표 pose는 동일하다.

| ID | 영역 | 방향 역할 |
|---|---|---|
| T06_P01_Body | 척추뼈몸통 | anterior |
| T06_P02_PosteriorArch | 뒤쪽 척추고리 | posterior |
| T06_P03_SpinousProcess | 가시돌기 | posterior / inferior |
| T06_P04_LeftTransverseProcess | 왼쪽 가로돌기 | left / posterior |
| T06_P05_RightTransverseProcess | 오른쪽 가로돌기 | right / posterior |
| T06_P06_LeftArticularRegion | 왼쪽 관절돌기 영역 | left / superior / inferior / posterior |
| T06_P07_RightArticularRegion | 오른쪽 관절돌기 영역 | right / superior / inferior / posterior |

## 분할과 정확성의 범위

원본은 overwrite하지 않았다. 몸통-pedicle 접합부, 가시돌기 뿌리, 가로돌기 뿌리, 관절돌기 complex의 junction을 기준으로 원본 전용 곡면 mask를 배치하고 solid Boolean으로 분할했다. 동일 간격의 평면 절단이나 connector를 사용하지 않았다. source-specific 숫자와 의미 metadata는 `scripts/anatomy/t06-segmentation.json`에서 관리한다. 작은 분리된 junction volume은 가장 큰 접촉면을 가진 인접 영역에 붙여 각 영역을 하나의 연결 입체로 유지했다.

원본 외부 표면은 seam 교차점에서 삼각형을 세분화하며 유지한다. 절단된 내부 곡면은 조각끼리 상보적으로 맞는다. 원본 외부 smooth normal을 보간하고 내부 면의 normal은 분리해 조립 완료 시 경계의 음영을 줄였다. 조각 하나가 여러 자연적인 독립 bone이라는 의미는 아니다.

원본 4,896 triangles에서 내부 절단면을 포함한 파생 메시를 생성했다. 원본은 이미 BP3D의 감소된 배포본이며 추가 외형 decimation은 하지 않았다. 시각 검수용 [조립·분해도](segmentation-review.png), [실제 완료 화면](evidence/t06-hard-complete.png)을 첨부한다.

**독립 해부학 전문가의 경계 검수는 미완료다.** 곡면 mask는 morphology에 맞춰 저작한 프로토타입으로, 정확한 임상 segmentation이라고 확정하지 않는다. 기하학적 복원 성공과 전문가 해부학 검수는 별개다. 보존한 source STL, 파라미터, 원본/파생 GLB로 경계를 검토·수정할 수 있다.

## 난이도

| 난이도 | 초기 방향 | 회전 허용치 | 조각 수 |
|---|---|---:|---:|
| EASY | 정답 기준 각 축 ±12° | 25° | 7 |
| NORMAL | 세 축 각각 부호를 달리한 45~75° 회전의 조합 | 15° | 7 |
| HARD | Shoemake uniform random quaternion | 8° | 7 |

position tolerance와 anatomical pieces는 동일하다. 초기 방향은 New Game/Restart에서 생성되고 저장·이어하기 때 재생성하지 않는다. HARD의 quaternion 정규화, 성분 평균·분산, superior/anterior inversion 비율을 고정 seed 12,000개 샘플로 검사했다. HAND의 초기 방향·기존 Easy 위치 보정·Normal/Hard 규칙은 바꾸지 않았다.

## Metadata와 재사용

15개 semantic landmark를 모두 포함했다. 특히 superior/inferior/transverse costal facets를 별도 physical piece로 만들지 않았다. articular facets는 좌우 articular region과 연결한다. pedicle, lamina, vertebral foramen도 metadata로 유지한다. 아직 검증되지 않은 표면 anchor는 null이며 위치를 만들어 표시하지 않는다.

기존 Arcball/Quaternion, X/Y/Z, 드래그, 카메라, 가이드, 명칭·힌트, 스냅, 물리 intro, 완료 UI를 공통 puzzle contract에 연결했다. 새 조작 엔진이나 별도 완료 로직을 만들지 않았다. stage별 분류·count·이름·모델만 데이터에서 읽는다. 영속화는 HAND v1 키를 그대로 유지하고 T06 및 마지막 활성 stage를 별도 저장한다. stage 전환, reload, Restart, 활성 기록 삭제를 검사했다.

## 실제 검증

- 단위/UI **68개 통과**: 7개 동일 계약, metadata 불변성, 세 난이도 orientation, snap 경계, 모든 정답 pose, 저장 분리·복원·삭제 등.
- Linux headed Chromium 전체 **17개 통과**: 기존 HAND 13개 회귀와 신규 T06 4개. EASY/NORMAL/HARD 각각 실제 축 회전 버튼과 포인터로 7개를 조립해 완료 및 reload/이어하기 확인. 실제 마우스 자유 회전 시 위치·카메라 유지도 검사.
- 외부 normal 보정 후 T06 4개를 재실행해 **4개 통과**. 최종 targeted JSON과 실제 스크린샷은 evidence에 보존.
- T06 EASY의 전체 intro에서 화면 bounds를 반복 확인. HAND 1920×1080/900 intro 검사도 통과.
- 원본 HAND JSON/27개 GLB는 변경 없음. 기존 데이터 검사와 27개 source-coordinate 왕복 검사 통과.
- `validate:thoracic`: 원본 출처·체크섬, 7개 exported solid의 edge closure·연결성·양의 부피, 15 landmark 연결, 원본 외부 삼각형 평면 오차 검사 통과.
- 실제 export→역변환 결과: 최대 외부 평면 오차 0.000059876 source units, 최대 pair overlap volume 0.000020709, missing volume 0.003110811, outside volume 0.002719809, volume 합 오차 0.000158242. 비교 원본 volume 24289.090584. 임의로 임상 mm 단위라고 주장하지 않는다. Boolean 생성 단계의 overlap/union difference는 1e-7 미만이다.
- TypeScript·프로덕션 build 통과. 신규 runtime 패키지는 추가하지 않았다. Python 의존성은 에셋 제작·검사에만 필요하다.
- 이번 변경의 CPU/Lighthouse는 재측정하지 않았다. Windows Chrome/Edge 결과는 GitHub의 신규 커밋 workflow 결과로 구분해 확인해야 한다.

## 재현

웹 실행: `npm ci`, `npm run dev`. 빌드: `npm run build`.

에셋 도구 설치: `python -m pip install -r scripts/requirements-anatomy.txt`. 이후 `npm run data:thoracic`, `npm run validate:thoracic`.

브라우저: `npm run test:e2e`. Linux headed 검수에는 실제 DISPLAY/Xvfb가 필요하다. 이 환경에서는 workspace의 Xvfb와 DISPLAY=:99, XDG_CONFIG_HOME=/workspace/.config, XDG_CACHE_HOME=/workspace/.cache, E2E_HEADFUL=1을 사용했다. 초기 DISPLAY 미기동 실패와 headless 선행 성공을 최종 headed 성공과 구분했다.

main 및 기존 프로덕션 배포는 이 작업에서 변경하지 않는다. Preview 배포 주소와 Git 커밋은 최종 응답에서 제공한다. 라이선스·원본 경로는 LICENSES.md와 source/manifest.json에 기록했다.
