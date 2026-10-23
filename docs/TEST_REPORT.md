# 검수 결과

검수일: 2026-10-23 (Asia/Seoul). 대상: 현재 `/workspace/Bone-puzzle`의 HAND 구현.
환경: Node 24.19.0 / npm 11.9.0 / Python 3.12 / Linux Chromium + 소프트웨어 WebGL.

## 실행 완료 및 통과

| 검사 | 실제 결과 |
|---|---|
| 잠금 파일 기반 재설치 | `npm ci --cache /workspace/.cache/npm` 성공, 169 packages |
| TypeScript | `npm run typecheck` 및 빌드 내 `tsc -b` 오류 없음 |
| 프로덕션 빌드 | `npm run build` 성공 |
| 단위·컴포넌트 | `npm test`: 5 files, **30 passed**, 0 failed/0 skipped |
| 실제 Chromium | `npm run test:e2e`: **4 passed**, 0 failed/0 skipped, 약 1.8분 |
| 데이터 | 27개 unique 오른손 FMA, 8/5/14 구성, GLB 27개, 36,216 triangles 확인 |
| 재생성 반복성 | 변환기를 다시 실행해 27개 GLB 및 target JSON이 byte-for-byte 동일함 확인 |
| 원본 보존 | 원본 27개 SHA-256 일치, 전체 정점 round trip 최대 오차 **0.000001353** 원본 좌표 단위 |
| HTTP 응답 | 개발·프로덕션 서버의 앱 HTML 및 27개 GLB magic header 검증 |
| 프로덕션 브라우저 | Start → Game → Piece 07 → capitate → Check 성공, 콘솔 오류 0, 테스트 probe 없음 |

## 브라우저 테스트의 실제 조작 범위

1. 사용자의 Start를 기다리는 Title, 완성 골격 → 물리 낙하 → 큰 HAND 표시·제거 → Gameplay. 낙하 후 27개 물체가 각 트레이 위치로 수렴하고 최종 메시 최저점이 바닥 위인지 확인. 실제 메시를 클릭해 이름 입력, 오답 저장/거부, Capitate 대소문자·공백 허용, 중복 힌트 차감 방지. 오답 위치 실제 드래그 후 미배치 확인. **27개를 모두 실제 마우스 이벤트로 각 목표까지 드래그**하여 완료 화면까지 도달. 게임 상태를 직접 변경해 성공시키지 않았다. 이후 타이틀/새로고침 복원과 Replay 초기화 확인.
2. 실제 카메라 orbit·wheel zoom, 회전된 시점에서 실제 드래그·스냅, 드래그 중 카메라 고정, 서로 다른 5개 힌트 소진 후 6번째 비활성, Restart 초기화.
3. 390×844 모바일 레이아웃의 수평 넘침 없음, reduced-motion 건너뛰기, 실제 입력·정답 확인. GLB 요청 실패를 주입해 오류 안내 확인. 이는 모바일 크기의 Chromium 검수이며 실제 iOS/Android 터치 기기 검수는 아니다.
4. Normal에서 목표 위치라도 잘못된 회전을 거부. UI로 X축을 회전한 뒤 키보드 Enter 배치 성공. Shift+방향키 미세 이동 확인.

테스트 전용 scene probe는 실제 3D 화면의 위치·카메라를 **읽기만** 하여 포인터 좌표를 구한다. 프로덕션에 게임 상태 조작 도구나 테스트 probe를 제공하지 않는다.

## 단위·UI 검사 범위

각 난이도의 거리·회전 허용치, 잘못된 목표 거부, quaternion 부호 동등성, NaN 거부, 검증된 별칭만 허용, 손가락별 지골 명칭 구분, 조립/명칭 독립 진행, 배치 후 고정, 메모 수정, 저장 복원 및 손상된 저장 거부, 5개 힌트 상한과 중복 차감 방지, 전체 Restart, 화면 상태 머신, 미구현 스테이지 비활성, HAND 타이포 단계, 실제 Save/Check 입력 컴포넌트를 검증했다.

## 발견 후 수정

- npm 기본 캐시 경로 쓰기 오류: 쓰기 가능한 프로젝트/워크스페이스 캐시 적용.
- 초기 TypeScript 타입 및 Vite 8 chunk 설정 불일치: 실제 버전 API에 맞춰 수정.
- Rapier의 동적 낙하에서 kinematic으로 전환한 일부 몸체가 다음 pose를 소비하지 않아 트레이 정리가 멈춤: 퍼즐 제어 단계에서는 현재 pose와 다음 pose를 함께 설정. 실제 모델 27개 위치 수렴 및 포인터 조립으로 재검증.
- 낙하 후 회전하며 정리되는 중 바닥을 침범할 수 있는 경로: 회전된 bounds 기반 바닥 지지 보정 적용.
- 단위 테스트의 status 선택자가 회전 output까지 포함: 이름 확인 영역을 접근성 이름으로 명시.
- 이전 E2E 실행 중 개발 서버 HMR로 probe가 사라져 테스트가 중단됨: 코드 변경을 마친 상태의 새 브라우저에서 전체 테스트 재실행, 최종 4개 통과.

## 남아 있는 경고와 미검증

- 물리 라이브러리/Three 관련 lazy chunk는 약 3.19MB (gzip 약 1.10MB)라 Vite의 500KB 경고가 남아 있다. HAND GLB 전체는 약 0.90MB이다. 빌드 실패는 아니다.
- 개발 콘솔에 일부 상위 라이브러리의 Clock 및 Rapier 초기화 API 사용 중단 예고 경고가 있다. 앱 실행 오류와 WebGL 모델 로딩 오류는 최종 정상 시나리오에서 없었다.
- 실제 사용자 로고 표시·정확한 투명 추출 및 원본 이미지 3장 보존은 파일 미전달로 미완료. Splash fade 코드는 존재하나 브랜드 검수 통과로 표시하지 않는다.
- 공식 서버 OBJ 직접 다운로드 및 최신 공식 라이선스 서버 확인은 proxy 403으로 미완료. 미러에 보존된 실제 배포 문서/라이선스/명칭표는 확인했다.
- 전문가의 해부학 검수, 실제 모바일 터치·다양한 GPU/브라우저 성능, 모든 시점에서의 임의 물리 궤적, Hard 전체 27개 수동 완주는 미검증. Hard 판정 규칙 자체는 단위 테스트 통과.
- FOOT / VERTEBRA는 미구현이며 실행 불가로 명확히 표시한다.
- 환경 설정 초안 저장과 현재 인스턴스 검증을 완료했다. 환경 Publish 및 새 작업에서의 snapshot 복원은 실행하지 않았다.

## 화면 증거

- [Title](evidence/title.png)
- [HAND intro](evidence/hand-intro.png)
- [Gameplay](evidence/gameplay.png)
- [27개 실제 드래그 후 Completion](evidence/complete.png)
- [모바일 크기](evidence/mobile.png)

이미지의 해부학 모델 및 파생 렌더링에는 LICENSES.md의 BodyParts3D CC BY-SA 2.1 Japan 표기가 적용된다.
