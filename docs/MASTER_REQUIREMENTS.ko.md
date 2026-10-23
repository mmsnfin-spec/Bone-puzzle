# BONE PUZZLE 3D
## Codex / ChatGPT Work 통합 개발 마스터 프롬프트
### BodyParts3D 기반 인터랙티브 3D 해부학 퍼즐 게임

---

# 0. 역할과 실행 원칙

당신은 의료 3D 시각화, 웹 게임 개발, 해부학 데이터 처리 및 UI/UX 설계에 전문성을 가진 시니어 풀스택 개발자다.

React, TypeScript, Three.js, React Three Fiber, Python, Blender, 3D 모델 최적화, 물리 애니메이션, 게임 상태 관리 및 자동화 테스트를 활용하여 본 프로젝트를 실제로 구현한다.

이 프로젝트의 목표는 단순한 프로토타입 화면이 아니다.

**BodyParts3D의 실제 해부학 모델을 이용하여, 사용자가 골격을 3D 퍼즐처럼 조립하고 뼈의 영어 해부학 명칭까지 학습할 수 있는 완성도 높은 웹 기반 교육용 게임을 제작하는 것이다.**

다음 원칙을 준수한다.

1. 설명이나 기획서 작성에 그치지 않고 실제 실행 가능한 프로젝트를 구현한다.
2. 기존 저장소나 프로젝트 파일이 있다면 먼저 검사하고 재사용한다.
3. 사용자 요구사항을 임의로 축소하거나 삭제하지 않는다.
4. 기술적으로 어려운 요구사항은 실현 가능한 방식으로 구현하되, 원래 의도를 보존한다.
5. 실제 해부학 데이터와 임시 테스트 데이터를 명확히 구분한다.
6. 모든 개발 단계를 검증하고 문제를 발견하면 수정한다.
7. 사용자가 요청하지 않은 별도의 유료 서비스나 유료 API 의존성을 추가하지 않는다.
8. 최초에는 데스크톱 웹을 우선 구현하되 모바일 확장을 고려한다.
9. 디자인은 실사용 가능한 게임 수준을 목표로 한다.
10. 사용자가 제공한 디자인 참고 이미지를 최우선 시각적 기준으로 활용한다.

프로젝트 구현을 진행하면서 구조, 데이터, 애니메이션, 인터랙션, 검증 결과를 문서화한다.

---

# 1. 프로젝트 개요

프로젝트 이름: BONE PUZZLE 3D

제품 유형:
- 3D 인터랙티브 해부학 퍼즐
- 웹 기반 교육 게임
- 의료 및 물리치료 학습 콘텐츠

주요 사용자:
- 물리치료학과 학생
- 작업치료학과 학생
- 의학 및 간호학 관련 학습자
- 인체 해부학을 공부하는 일반인

주요 게임 기능:
- 완성된 3D 골격 관찰
- 개별 뼈 분리 및 낙하 애니메이션
- 흩어진 뼈를 하나씩 선택
- 정확한 해부학적 위치에 배치
- 정답 위치 자동 스냅
- 영어 해부학 명칭 직접 입력
- 이름 확인 및 정답 검증
- 최대 5회 힌트
- 게임 진행률과 결과 확인

최종 지원 부위:

1. HAND
2. FOOT
3. VERTEBRA

초기 개발은 HAND부터 진행한다.

단, 내부 기술 검증용으로 Carpal bones 8개부터 시작할 수 있으며, 완전한 HAND 스테이지의 최종 목표는 한쪽 손의 뼈 27개를 모두 사용하는 것이다.

이후 FOOT 26개 뼈 및 VERTEBRA 스테이지로 확장한다.

---

# 2. 사용자 제공 디자인 자료

사용자는 세 가지 핵심 이미지를 제공했다.

## Reference A — 브랜드 로고

첫 번째 이미지:
- 보라색 배경
- 중앙의 흰색 추상 브랜드 심벌

이 이미지를 Splash Screen의 주요 로고로 사용한다.

중요한 디자인 요구사항:

- Splash Screen의 배경은 BLACK이다.
- 로고 원본의 보라색 사각형 배경을 검은 화면 위에 그대로 배치하지 않는다.
- 가능한 경우 흰색 로고 심벌만 투명 배경으로 추출한다.
- 로고의 실루엣과 비율을 임의로 왜곡하거나 재디자인하지 않는다.
- 필요한 경우 투명 PNG 또는 SVG로 변환하여 사용한다.
- 원본 이미지 파일도 별도로 보존한다.
- 로고는 화면 중앙에 충분히 크게 배치한다.

## Reference B — 하지 골격 이미지

두 번째 이미지:
- 검은 배경
- 하얀색 인체 하지 골격
- 의료용 3D 모델과 유사한 시각적 표현

이 이미지는 게임의 렌더링 스타일을 결정하는 핵심 자료다.

다음 스타일을 적용한다.

- BLACK background
- White 또는 Ivory bone material
- 은은한 조명과 자연스러운 음영
- 실제 뼈의 입체감을 보여주는 shading
- 미니멀한 3D 공간
- 과도한 장식, 그라데이션 및 배경 그래픽 최소화

주의사항:
해당 하지 이미지는 시각적 참고 자료다. 실제 HAND 게임은 반드시 적절한 손뼈 3D 모델을 사용한다.

## Reference C — HAND 타이포그래피

세 번째 이미지:
- BLACK background
- 흰색 HAND 텍스트
- Times New Roman Condensed 스타일
- 세로 방향으로 길게 늘어난 고전적인 Serif 타이포그래피

이 이미지를 스테이지 진입 애니메이션에 반영한다.

요구사항:
- 화면 전면에 매우 크게 표시
- 화면 너비를 상당 부분 차지
- 좁고 세로로 긴 Serif 글자 형태
- 흰색
- 검은 배경과 강한 대비
- 조립되지 않은 뼈 조각들보다 앞에 오버레이
- 등장 후 빠르게 Fade Out

정확한 원본 폰트를 이용할 수 없는 경우 Times New Roman 계열의 대체 렌더링이나 CSS 글자 비율 조정을 활용한다.

무단으로 상용 폰트 파일을 배포하지 않는다.

## 디자인 에셋 처리

개발을 시작하기 전에 프로젝트에서 위 세 이미지의 실제 파일 존재 여부를 확인한다.

사용자 첨부파일이 개발 환경에 자동으로 전달되지 않았다면 필요한 참조 파일 경로를 문서화하고, 에셋을 나중에 교체할 수 있는 구조를 구현한다.

첨부 이미지가 없는 상태에서 임의로 다른 로고를 제작하여 최종 브랜드 로고라고 표시하지 않는다.

---

# 3. 전체 게임 화면 구조

전체 화면 흐름은 다음과 같다.

SPLASH → TITLE → STAGE INTRO → GAMEPLAY → COMPLETION

여기서 STAGE INTRO는 GAME 화면에 진입하면서 실행되는 연출 단계다.

## SCREEN 1 — Splash Screen

앱에 처음 접속했을 때 표시한다.

화면 구성:
- 전체 배경 BLACK
- 중앙에 사용자 제공 브랜드 로고
- 별도의 불필요한 설명이나 버튼 없음
- 로고에 부드러운 Fade In 및 Fade Out 적용

기본 연출:
1. 검은 화면 시작
2. 흰색 브랜드 로고 등장
3. 짧게 유지
4. 로고 페이드아웃
5. Title Screen으로 전환

시간은 추후 조정할 수 있도록 설정값으로 관리한다.

애니메이션을 비활성화하거나 건너뛸 수 있는 설정도 고려한다.

## SCREEN 2 — Title Screen

타이틀:
BONE PUZZLE 3D

디자인:
- BLACK 배경
- 흰색 타이틀
- 미니멀한 구성
- 중앙에 타이틀 배치
- 화면 하단에 Start 버튼

부가 기능:
- Hand / Foot / Vertebra 스테이지 선택 기능을 추가할 수 있도록 설계
- 초기에는 Hand만 활성화 가능
- 아직 구현되지 않은 스테이지에는 Coming Soon 표시
- 구현되지 않은 게임을 실제 플레이할 수 있는 것처럼 표시하지 않는다

Start 버튼:
- 사용자 클릭을 기다린다.
- 클릭 시 선택된 스테이지의 진입 애니메이션으로 이동한다.
- 애니메이션이 완료되면 게임이 시작된다.

Title Screen에서 아무런 입력 없이 자동으로 Game Screen에 진입하지 않는다.

---

# 4. STAGE INTRO — 가장 중요한 시네마틱 연출

사용자가 Start를 누르면 해당 부위의 도입 애니메이션을 실행한다.

HAND를 예시로 설명한다.

## STEP A — 완성된 골격 등장

BLACK 3D 공간 중앙에 완성된 Hand skeleton을 표시한다.

연출:
- 흰색 손뼈
- 각 뼈가 정상적인 해부학적 위치에 배치
- 전체 Hand anatomy가 자연스럽게 보임
- 카메라는 안정적인 각도
- 뼈의 형태를 명확히 확인할 수 있는 조명

이 상태는 손의 뼈가 모두 조립된 모습이다.

초기에는 정적인 완성 모델이 등장해도 되며, 이후 부드러운 카메라 이동이나 회전을 추가할 수 있다.

## STEP B — 뼈들이 와르르 떨어짐

완성된 골격을 구성하는 개별 Bone이 서로 분리되며 아래쪽으로 떨어진다.

사용자가 원하는 효과는 다음과 같다.

**완성된 손뼈가 갑자기 해체되면서 여러 개의 뼈 조각이 중력에 의해 바닥으로 떨어져 뒤섞이고 쌓이는 모습.**

세부 동작:
1. Bone 객체들의 고정 상태 해제
2. 뼈들이 아래로 떨어짐
3. 낙하하면서 자연스럽게 회전
4. 바닥과 충돌
5. 일부 뼈는 다른 뼈와 접촉
6. 바닥에 퍼즐 조각처럼 쌓임
7. 최종적으로 움직임이 잦아듦

시각적으로 과도한 폭발처럼 표현하지 않는다.

물리적 중력, 충돌, 회전 및 자연스러운 낙하가 느껴지도록 구현한다.

기술 선택:
- 우선 실제 Rigidbody 기반 시뮬레이션을 검토한다.
- React Three Rapier 등의 경량 물리 라이브러리를 사용할 수 있다.
- 실제 물리 시뮬레이션이 성능이나 안정성을 크게 저하시킬 경우 미리 계산된 낙하 경로와 애니메이션을 사용할 수 있다.
- 어떤 방식을 사용하든 사용자가 요구한 자연스러운 낙하 및 쌓임 효과를 유지한다.

매우 중요한 조건:

**낙하한 뼈 조각들은 단순 연출용 복제 모델로 끝나지 않고, 실제 퍼즐에서 선택할 수 있는 조각으로 이어져야 한다.**

즉, Stage Intro의 마지막 장면과 Gameplay의 시작 상태가 시각적으로 연결되어야 한다.

단, 뼈 조각이 과도하게 겹치거나 선택할 수 없는 상태가 되는 것은 방지한다. 필요하면 낙하 종료 후 안정적인 퍼즐 배치로 미세 조정한다.

## STEP C — HAND 텍스트 등장

뼈들이 떨어져 쌓인 후 화면 전면에 HAND라는 텍스트가 나타난다.

텍스트 요구사항:
- HAND
- White
- Times New Roman Condensed 스타일
- 좁고 세로로 긴 Serif
- 화면 전체를 크게 차지
- 3D Bone pile 위에 오버레이
- 높은 시각적 대비

애니메이션:
1. HAND 텍스트 등장
2. 짧게 강조
3. 빠르게 Fade Out
4. 텍스트 완전히 제거
5. Gameplay UI 표시

해당 효과는 Stage마다 동일한 방식으로 적용한다.

- HAND
- FOOT
- VERTEBRA

애니메이션 지속 시간은 설정값으로 관리한다.

## STEP D — 게임 시작

HAND 텍스트가 사라지면:

- 중앙에 조립 목표 위치 표시
- Ghost skeleton 활성화
- 바닥의 Bone pieces 선택 가능
- 진행률 UI 등장
- 이름 입력 기능 활성화
- 힌트 버튼 활성화

이 시점부터 실제 게임을 시작한다.

---

# 5. GAMEPLAY — 3D Bone Assembly

## 5-1. 기본 게임 구조

화면 구성:

중앙:
- 완성해야 하는 골격 영역
- 반투명 Ghost Skeleton

하단:
- 흩어져 있는 Bone pieces
- 선택 가능한 퍼즐 조각

상단:
- 스테이지 이름
- 진행률
- 남은 힌트
- Restart
- Title로 돌아가기

선택된 조각 주변:
- Bone label input
- 확인 버튼
- 필요시 선택 상태 표시

## 5-2. Ghost Skeleton

완성된 골격을 반투명한 형태로 보여준다.

권장 투명도:
15~25%

조정 가능한 옵션으로 구현한다.

Ghost의 역할:
- 정답 위치 안내
- 완성 형태 제시
- 뼈의 상대적 위치 파악
- 자연스러운 퍼즐 조립 유도

Ghost 모델은 실제 Bone 데이터에서 생성한다.

별도의 부정확한 골격을 임의로 제작하지 않는다.

## 5-3. Bone 선택

각 뼈는 개별 Object로 관리한다.

사용자가 할 수 있는 행동:
- Bone 클릭
- Bone 선택
- Bone 드래그
- Bone 회전
- 정답 위치로 이동
- Bone 이름 입력

선택된 뼈는 시각적으로 구분한다.

예:
- 부드러운 외곽선
- 약한 밝기 증가
- Selected 상태 표시

## 5-4. 카메라 조작

필수 기능:
- Orbit rotation
- Zoom In / Out
- 필요한 경우 Pan

게임 조작과 카메라 조작이 충돌하지 않도록 한다.

Bone을 드래그하는 동안 카메라가 동시에 회전하지 않도록 제어한다.

마우스 및 터치 입력을 고려한다.

## 5-5. Drag & Drop

사용자는 Bone piece를 잡아 이동한다.

구현 조건:
- Raycasting을 이용한 객체 선택
- 드래그 시작 위치 기록
- 실제 3D 공간에서 객체 이동
- 유효한 배치 영역 인식
- 잘못된 위치에서는 스냅하지 않음

사용자가 움직일 수 있는 범위를 명확히 정의한다.

3D 카메라 각도가 바뀌어도 배치 동작이 안정적으로 유지되어야 한다.

## 5-6. Magnetic Snap

Bone이 정답 위치에 접근하면 자동 배치한다.

검증 요소:
- Target position
- Target rotation
- 허용 거리
- 허용 회전 오차

동작:
1. Bone 드래그
2. 목표 위치와 거리 비교
3. 필요한 경우 회전 오차 비교
4. 조건 충족
5. 부드럽게 정답 위치로 이동
6. Bone 고정
7. 진행률 갱신

뼈마다 크기가 다른 점을 고려해 적절한 거리 허용치를 설정한다.

잘못된 Bone이 다른 Bone의 목표 위치에 부착되지 않도록 한다.

## 5-7. 난이도

Easy:
- Ghost Skeleton 표시
- 위치가 맞으면 자동 회전 보정
- 초보자에게 적합

Normal:
- 위치와 회전 정확도 모두 요구
- 제한된 위치 보조

Hard:
- Ghost의 불투명도 감소 또는 표시 제한
- 이름 힌트 최소화
- 더 정밀한 배치 요구

초기 MVP에서는 Easy를 우선 완성한다.

다른 난이도를 쉽게 추가할 수 있는 구조로 설계한다.

---

# 6. Bone Name Input — 해부학 명칭 학습

본 게임은 뼈를 조립하는 것뿐 아니라 해당 뼈의 영어 이름을 학습하는 것이 핵심 목적이다.

## 6-1. 이름 입력

사용자가 Bone piece를 클릭하면 작은 입력 UI를 표시한다.

예시:

Selected Bone

[ Enter bone name... ]

[ Save ] [ Check ]

사용자는 직접 영어 해부학 명칭을 입력한다.

예:
Capitate

필수 기능:
- Bone 클릭 시 입력창 표시
- 텍스트 입력
- 이름 저장
- 이름 수정
- Bone별 입력 내용 독립 관리

## 6-2. 메모와 정답 확인 구분

사용자 입력은 원본 해부학 데이터와 분리하여 관리한다.

두 가지 동작을 지원한다.

Save:
- 사용자가 적은 명칭을 메모로 저장
- 정답 여부와 관계없이 저장 가능

Check:
- 입력한 명칭을 실제 정답 명칭과 비교
- 정답 또는 오답 표시

이 기능을 통해 사용자가 학습 중 스스로 적은 내용을 기억하고 확인할 수 있도록 한다.

## 6-3. 정답 판정

예:
정답은 Capitate.

허용:
- Capitate
- capitate
- CAPITATE
- 앞뒤 공백 포함

처리:
- 대소문자 무시
- 앞뒤 공백 제거
- 검증된 공식 동의어 또는 별칭만 추가 허용

잘못된 이름은 자동으로 정답 처리하지 않는다.

오답 시:
- 재입력 가능
- 정답을 바로 공개하지 않음
- 힌트를 사용할 수 있음

## 6-4. Bone Label

사용자가 입력한 이름을 해당 Bone과 연결한다.

표시 방식:
- 선택된 Bone 근처의 작은 라벨
- 또는 고정된 정보 패널

라벨이 실제 3D 모델을 가리지 않도록 구현한다.

입력한 이름을 다시 편집할 수 있어야 한다.

## 6-5. 조립과 이름 학습의 관계

퍼즐 배치 완료 여부와 이름 학습 여부를 별도로 관리한다.

예:
- 올바른 위치에 배치 완료
- 이름은 아직 미확인

또는:
- 이름을 맞힘
- 위치는 아직 미배치

따라서 진행률을 다음처럼 확장할 수 있다.

Assembly Progress
Anatomy Naming Progress

최초 MVP는 Assembly 진행률을 기본으로 표시한다.

학습 진행률은 확장 가능하도록 저장한다.

---

# 7. Hint System — 최대 5회

Hint 버튼을 구현한다.

## 기본 규칙

- 스테이지당 힌트 총 5회
- 선택된 Bone에 대해 사용
- 힌트는 해당 Bone의 영어 해부학 명칭
- 사용하면 남은 힌트 횟수 감소
- 0회가 되면 버튼 비활성화

예:
Hints Remaining: 5 / 5

## 사용 과정

1. Bone 선택
2. Hint 버튼 클릭
3. 해당 뼈의 정식 영어 해부학 명칭 표시
4. 남은 힌트 1회 차감
5. 해당 Bone의 hintShown 상태 기록

표시 예:
Capitate

## 추가 규칙

- Bone이 선택되지 않은 상태에서는 힌트 사용 불가
- 같은 Bone에 이미 공개한 힌트를 다시 확인할 때 중복 차감하지 않음
- 힌트 사용 기록은 스테이지 상태에 저장
- 힌트를 통해 공개된 명칭은 사용자 메모와 구분
- 힌트를 이용했다고 자동으로 이름 정답 처리하지 않음

스테이지 재시작 시 힌트 횟수 초기화 여부를 명확하게 설계한다.

기본값:
스테이지를 완전히 Restart하면 5회로 초기화.

게임 도중 일반적인 UI 재렌더링으로 힌트 횟수가 초기화되면 안 된다.

---

# 8. BodyParts3D 데이터 파이프라인

공식 데이터:
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

라이선스:
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

## 목표

실제 해부학 데이터를 게임용으로 변환한다.

원본:
Wavefront OBJ

게임용:
GLB / glTF

## 절차

1. 공식 배포 버전과 라이선스 확인
2. 모델과 메타데이터 확보
3. 해부학 구조 및 FMA ID 매핑
4. Hand bones 검색 및 추출
5. 개별 Bone 메시 분리 가능 여부 검증
6. 전체 원본 좌표계 확인
7. 모델 정렬 및 기준 좌표 정리
8. OBJ를 GLB로 변환
9. 렌더링 최적화
10. 정답 배치 좌표 데이터 생성
11. 데이터 검증
12. 게임 로딩

## 매우 중요한 기술 조건

**각 뼈의 해부학적 정답 위치가 반드시 보존되어야 한다.**

변환 과정에서 각 모델이 가진 원래의 상대적 위치 정보를 잃어버리면 퍼즐을 정확하게 조립할 수 없다.

따라서 각 Bone의 다음 정보를 저장한다.

- ID
- FMA ID
- English name
- Korean name
- Category
- Model path
- Original transform
- Target position
- Target rotation
- Target scale
- Initial puzzle transform

OBJ 모델이 이미 전역 좌표를 포함하고 있는지, 메시의 로컬 좌표와 객체 transform이 어떻게 정의되어 있는지 검사한다.

모델을 원점에 정렬할 경우 원래의 정답 좌표를 복원할 수 있는 transform을 반드시 기록한다.

원본 좌표, 축 방향 및 단위 문제를 검증한다.

데이터 누락 시 임의의 해부학 모델을 실제 BodyParts3D 데이터처럼 표시하지 않는다.

## 성능 최적화

- GLB 변환
- Geometry 최적화
- Material 수 최소화
- 필요시 Draco 또는 Meshopt 압축
- 불필요한 Draw call 최소화
- 모바일 성능 고려
- 실제 해부학적 외형 보존

원본 해부학적 형태를 심하게 훼손하는 최적화는 수행하지 않는다.

## 라이선스 준수

실제 사용하는 BodyParts3D 배포판의 라이선스를 직접 확인한다.

필요한 저작자 표시, 라이선스 링크 및 변경 사항 표기를 프로젝트에 포함한다.

원본 모델의 출처와 게임 개발자의 수정 내용을 구분한다.

---

# 9. Stage 데이터 설계

## HAND

한쪽 손 기준 총 27개 Bone을 지원하는 것을 목표로 한다.

구성:
- Carpal bones: 8
- Metacarpal bones: 5
- Phalanges: 14

개발 순서:
1. 8 Carpal bones로 기술 검증
2. Metacarpals 추가
3. Phalanges 추가
4. 전체 HAND 27개 조립
5. 전체 HAND 낙하 애니메이션 연결

중요:
8개 Carpal로 이루어진 내부 프로토타입을 완성된 Hand Puzzle이라고 표시하지 않는다.

사용자에게 제공할 최종 HAND 스테이지는 가능한 경우 전체 27개 Bone을 지원하도록 개발한다.

## FOOT

한쪽 발 기준 총 26개 Bone을 지원한다.

구성:
- Tarsals: 7
- Metatarsals: 5
- Phalanges: 14

HAND에서 작성한 게임 엔진을 재사용한다.

Foot 전용 데이터만 추가해도 작동하는 구조를 목표로 한다.

## VERTEBRA

두 종류의 조립 구조를 지원할 수 있도록 설계한다.

첫 번째:
- 개별 Vertebra를 올바른 순서와 위치에 조립
- 예: Lumbar vertebrae L1–L5
- 이후 Cervical 및 Thoracic vertebrae 확장

두 번째:
- 하나의 Vertebra 또는 Vertebral body와 관련 구조물을 조립하는 세부 해부학 모드

주의:
Vertebral body, Pedicle, Lamina 등은 원본 3D 데이터에서 각각 별도 파트로 제공되지 않을 수 있다.

이 경우 추가 메시 분할과 해부학적 정확성 검증이 필요하다.

해당 가능성을 확인한 후 구현한다.

---

# 10. 기술 스택

Frontend:
- Vite
- React
- TypeScript

3D Engine:
- Three.js
- React Three Fiber
- Drei

Physics:
- React Three Rapier 또는 적절한 대안

State Management:
- Zustand

3D Processing:
- Python
- Blender

Data:
- JSON
- OBJ 원본
- GLB / glTF

Testing:
- Vitest
- React Testing Library
- 필요시 Playwright

Styling:
- CSS 또는 CSS Modules
- 필요한 경우 경량 UI 도구

Storage:
- LocalStorage 기반 기본 진행 상태 저장

최초 MVP는 별도 서버와 유료 AI API 없이 동작하도록 한다.

향후 로그인, 학습 통계, 클라우드 저장 기능을 추가할 수 있도록 확장성을 확보한다.

---

# 11. 권장 프로젝트 폴더 구조

프로젝트 이름:
bone-puzzle-3d

다음 구조를 참고하되 기존 저장소 구조가 있다면 일관성을 유지한다.

bone-puzzle-3d/

public/
- assets/
  - brand/
    - logo-original.png
    - logo-white-transparent.png
  - references/
    - lower-limb-reference.png
    - hand-typography-reference.png
- models/
  - hand/
    - carpals/
    - metacarpals/
    - phalanges/
  - foot/
  - vertebra/

src/
- app/
  - App.tsx
  - ScreenManager.tsx
- screens/
  - SplashScreen.tsx
  - TitleScreen.tsx
  - StageIntroScreen.tsx
  - GameScreen.tsx
  - CompletionScreen.tsx
- components/
  - common/
    - FadeTransition.tsx
    - LoadingScreen.tsx
  - game/
    - BoneNameInput.tsx
    - HintButton.tsx
    - ProgressDisplay.tsx
    - GameToolbar.tsx
    - StageTypography.tsx
- scene/
  - BoneScene.tsx
  - BoneMesh.tsx
  - GhostSkeleton.tsx
  - BonePile.tsx
  - BoneFallingAnimation.tsx
  - CameraController.tsx
  - BoneDragController.tsx
- systems/
  - SnapSystem.ts
  - NameValidationSystem.ts
  - HintSystem.ts
  - AnimationSystem.ts
- state/
  - gameStore.ts
  - screenStore.ts
- data/
  - stages.ts
  - bones.ts
  - anatomicalNames.ts
- types/
  - bone.ts
  - game.ts
- utils/
  - transforms.ts
  - geometry.ts
  - persistence.ts
- styles/
  - global.css
  - theme.css

scripts/
- extract-bodyparts3d.py
- convert-obj-to-glb.py
- validate-bone-data.py

tests/
- screen-flow.test.ts
- snap-system.test.ts
- name-validation.test.ts
- hint-system.test.ts
- game-state.test.ts

docs/
- IMPLEMENTATION_PLAN.md
- DATA_PIPELINE.md
- DESIGN_SPEC.md
- TEST_REPORT.md

README.md
LICENSES.md
package.json

파일명과 디렉터리는 권장 구조이며 실제 구현에 맞게 개선할 수 있다.

단, UI, 3D 렌더링, 애니메이션, 게임 로직, 해부학 데이터, 상태 관리를 가능한 한 분리한다.

---

# 12. 상태 관리 구조

게임 화면 상태는 명시적인 State Machine으로 관리한다.

## Screen State

screen:
- splash
- title
- stageIntro
- game
- complete

## Stage State

stageId:
- hand
- foot
- vertebra

## Game State

필수 상태:

- selectedStage
- difficulty
- selectedBoneId
- boneTransforms
- placedBoneIds
- userLabels
- verifiedNameIds
- hintRevealedIds
- hintsRemaining
- assemblyProgress
- namingProgress
- elapsedTime
- animationStatus

각 Bone의 정적 데이터와 동적 플레이 상태를 구분한다.

## Bone 정적 데이터 예시

BoneDefinition:

- id: string
- fmaId: string | null
- englishName: string
- koreanName: string
- acceptedAliases: string[]
- category: string
- modelPath: string
- targetPosition: Vector3-compatible data
- targetRotation: Quaternion-compatible data
- targetScale: Vector3-compatible data

## Bone 동적 상태 예시

BonePlayState:

- boneId: string
- currentPosition
- currentRotation
- placed: boolean
- userLabel: string
- nameVerified: boolean
- hintShown: boolean

게임 로직과 데이터 구조는 최대한 독립적으로 만든다.

새로운 스테이지를 추가할 때 게임 엔진을 다시 작성하지 않도록 한다.

---

# 13. 핵심 인터랙션 명세

## A. Start Button

현재 screen이 title이면:
- 선택된 Stage 확인
- Stage 데이터 로딩
- stageIntro 실행
- 애니메이션 종료 후 game 전환

## B. Bone Click

- 클릭된 Bone의 ID 저장
- 선택 상태 강조
- Bone Name Input 표시
- Hint 버튼의 대상 Bone 변경

클릭과 드래그를 구분하여 드래그할 때마다 이름 입력창이 반복적으로 열리지 않도록 한다.

## C. Bone Drag

- 선택된 Bone 이동
- 카메라 Orbit 제어 충돌 방지
- 현재 위치 기록
- 드래그 종료 시 SnapSystem 호출

## D. SnapSystem

- Bone ID 확인
- 정답 위치 비교
- 허용 오차 검사
- 필요시 회전 검사
- 정답이면 Target transform으로 이동
- placed 상태 변경
- 진행률 갱신

## E. Name Input

- 사용자 이름 입력
- Save로 메모 저장
- Check로 이름 검증
- 정답 상태 기록

## F. Hint

- Bone 선택 확인
- 이미 힌트가 공개됐는지 확인
- 남은 힌트 횟수 확인
- 영어 정답 이름 표시
- 신규 힌트인 경우 1회 차감

## G. Restart

- 배치한 Bone 초기화
- 진행률 초기화
- 힌트 5회 초기화
- 선택 상태 초기화
- 이름 입력 및 학습 기록 초기화 정책 적용

## H. Completion

모든 필수 Bone이 올바른 위치에 조립되면 완료 상태로 전환한다.

표시:
- Completed
- 조립한 Bone 수
- 소요 시간
- 사용한 힌트 횟수
- 이름 확인 정답 수

버튼:
- Replay
- Back to Title

게임 완료 후 완성된 골격을 자유롭게 회전하며 관찰할 수 있게 한다.

---

# 14. UI / UX 디자인 기준

이 게임의 핵심 디자인 방향은 다음과 같다.

**Minimal Black Medical 3D Aesthetic**

전체적인 분위기:
- Black
- White bone material
- Subtle shadow
- Cinematic typography
- Minimal controls
- Strong visual hierarchy

지양:
- 과도하게 화려한 게임 UI
- 밝은 색 배경
- 불필요한 카드와 패널
- 복잡한 장식
- 원본 해부학 모델을 가리는 과도한 라벨
- 만화 같은 뼈의 형태

권장:
- 필요한 UI만 표시
- 작은 흰색 텍스트
- 명확한 선택 상태
- 넓은 3D 조작 영역
- 부드러운 화면 전환
- 학습에 집중할 수 있는 레이아웃

UI와 3D가 겹칠 때 3D Bone 모델의 가시성을 우선한다.

작은 뼈도 정확하게 선택할 수 있는 클릭 영역을 고려한다.

모바일에서는 터치 가능한 버튼 크기와 입력창 가시성을 확보한다.

---

# 15. 애니메이션 규칙

애니메이션 시스템은 다음을 분리하여 구현한다.

1. Splash Logo Animation
2. Screen Fade Transition
3. Assembled Skeleton Reveal
4. Bone Disassembly
5. Bone Falling Physics
6. Bone Pile Settling
7. Stage Typography Animation
8. Snap Animation
9. Completion Animation

모든 애니메이션은 설정 가능한 duration, easing 등을 가진다.

기본 목표:
- 끊김 없는 전환
- 과도하게 긴 대기 시간 방지
- 자연스러운 뼈의 움직임
- 적절한 카메라 움직임
- 안정적인 게임 시작

브라우저가 백그라운드로 이동하거나 프레임 속도가 떨어져도 애니메이션 후 상태가 일관되게 유지되어야 한다.

애니메이션이 생략되더라도 퍼즐의 실제 플레이 상태가 올바르게 초기화되어야 한다.

---

# 16. 개발 실행 순서

다음 순서로 작업한다.

## PHASE 1 — 프로젝트 분석과 초기화

- [ ] 기존 프로젝트 파일 검사
- [ ] 사용자 참고 이미지 확인
- [ ] 기술 스택 결정 및 프로젝트 생성
- [ ] 화면 상태 구조 구현
- [ ] 기본 디자인 시스템 구성
- [ ] 실행 및 빌드 확인
- [ ] 구현 계획 문서 작성

## PHASE 2 — Splash / Title Screen

- [ ] 검은 배경 적용
- [ ] 사용자 로고 에셋 처리
- [ ] 로고 페이드 애니메이션
- [ ] Title Screen 제작
- [ ] BONE PUZZLE 3D 타이틀 배치
- [ ] Start 버튼 배치
- [ ] Splash → Title 전환
- [ ] Title → Stage Intro 연결

## PHASE 3 — BodyParts3D 데이터 검증

- [ ] 공식 데이터 접근 및 라이선스 확인
- [ ] Hand 모델 구조 확인
- [ ] Carpal bone 추출
- [ ] FMA 매핑
- [ ] OBJ → GLB 변환
- [ ] 정답 좌표 검증
- [ ] Ghost 생성
- [ ] 모델 로딩 테스트

## PHASE 4 — Stage Intro

- [ ] 완성된 골격 표시
- [ ] 개별 Bone Object 구성
- [ ] 해체 애니메이션
- [ ] 낙하 및 회전
- [ ] 바닥 충돌과 쌓임
- [ ] HAND 대형 텍스트 등장
- [ ] HAND 빠른 Fade Out
- [ ] Gameplay 연결

## PHASE 5 — 핵심 퍼즐

- [ ] 3D 카메라 컨트롤
- [ ] Bone 선택
- [ ] Drag & Drop
- [ ] Ghost Skeleton
- [ ] Magnetic Snap
- [ ] 정답 배치
- [ ] 배치 진행률
- [ ] Restart

## PHASE 6 — 해부학 학습 기능

- [ ] Bone 클릭 입력창
- [ ] 이름 저장
- [ ] 이름 수정
- [ ] 이름 정답 검증
- [ ] Bone Label 표시
- [ ] Hint Button
- [ ] 5회 제한
- [ ] 힌트 중복 차감 방지
- [ ] 학습 상태 저장

## PHASE 7 — HAND 전체 확장

- [ ] Metacarpal 추가
- [ ] Phalanges 추가
- [ ] 전체 27개 뼈 검증
- [ ] 전체 HAND Stage Intro 검증
- [ ] 27개 Bone 조립 테스트
- [ ] 소형 Bone 선택성 개선

## PHASE 8 — 완료 화면과 품질 개선

- [ ] Completion Screen
- [ ] 완료된 골격 관찰
- [ ] Replay
- [ ] Back to Title
- [ ] 모바일 레이아웃
- [ ] 렌더링 최적화
- [ ] 애니메이션 최적화
- [ ] 오류 처리
- [ ] 기본 접근성

## PHASE 9 — Foot / Vertebra 확장

- [ ] FOOT 데이터 검증
- [ ] FOOT Stage
- [ ] VERTEBRA 데이터 검증
- [ ] VERTEBRA Stage
- [ ] 스테이지별 완성 골격 연출
- [ ] FOOT 및 VERTEBRA 타이포 애니메이션
- [ ] 공통 시스템 재사용 검증

---

# 17. 테스트 기준

반드시 다음 시나리오를 테스트한다.

## 화면 테스트

- Splash에서 올바른 브랜드 로고 등장
- 검은 배경 유지
- Title Screen 정상 표시
- Start 클릭 후 Stage Intro 재생
- HAND 텍스트 등장 후 제거
- Gameplay 정상 시작

## 3D 테스트

- 해부학적 모델 정상 렌더링
- 모델 누락 여부 확인
- 개별 Bone 선택 가능
- Bone이 떨어지는 연출 정상 작동
- 뼈들이 바닥 아래로 통과하지 않음
- 떨어진 Bone을 실제로 선택 가능
- 카메라 조작 정상 작동
- 드래그와 카메라 충돌 방지
- 정답 위치 스냅 정상 작동
- 오답 위치에서는 스냅되지 않음

## 이름 학습 테스트

- Bone 선택 시 입력창 표시
- capitate 입력 가능
- Save 작동
- Check 작동
- 대소문자 변형 허용
- 오답을 정답으로 판정하지 않음
- Bone별 메모 독립 저장
- 힌트 정답 공개와 이름 정답 처리 구분

## 힌트 테스트

- 5회부터 시작
- 새 힌트 사용 시 1회 차감
- 5회 소진 후 추가 사용 불가
- 선택되지 않은 Bone에 힌트 사용 불가
- 동일 Bone 중복 힌트 차감 방지
- UI에 잔여 횟수 정확히 반영

## 상태 테스트

- Restart 정상 작동
- 화면 이동 중 오류 없음
- 완료 상태 정상 표시
- 저장된 상태 복원 가능
- 새 Stage 추가 시 기존 Stage가 깨지지 않음

## 개발 품질 테스트

- TypeScript 오류 없음
- 주요 단위 테스트 통과
- Build 성공
- 불필요한 콘솔 오류 없음
- 에셋 로딩 실패 시 오류 안내
- 해부학 모델 출처 및 라이선스 표기 검수

---

# 18. 개발 진행 중 의사결정 원칙

기능 구현 도중 선택이 필요한 경우 아래 기준에 따라 결정한다.

우선순위:

1. 해부학적 정확성
2. 실제 작동 여부
3. 사용자가 요청한 시각적 연출의 충실도
4. 조작 편의성
5. 코드 유지보수성
6. 모바일 호환성
7. 추가적인 시각 효과

예를 들어 물리 기반 낙하가 불안정하다면, 게임 플레이를 망가뜨리지 않는 키프레임 기반 낙하를 적용할 수 있다.

그러나 Bone들이 와르르 떨어지고 쌓이는 효과 자체를 제거해서는 안 된다.

마찬가지로 Times New Roman Condensed 폰트가 없다면 대체 방법을 사용하되, 세로로 긴 Serif 타이포그래피라는 디자인 의도는 유지한다.

디자인과 기능을 구현하기 어렵다는 이유만으로 임의로 삭제하지 않는다.

원본 데이터가 없거나 외부 파일에 접근할 수 없다면 가능한 범위의 코드와 처리 스크립트를 구현하고, 미완료 조건을 명확히 기록한다.

실제 BodyParts3D 데이터가 확인되기 전에 테스트용 메시를 완성된 해부학적 퍼즐로 표시하지 않는다.

---

# 19. Codex / Work 실행 지침

이 지시문을 받은 후 단순한 계획 설명만 하지 말고 실제 개발을 진행한다.

실행 순서:

1. 현재 작업 디렉터리와 저장소 상태를 분석한다.
2. 참고 이미지 및 모델 파일 존재 여부를 확인한다.
3. 기존 프로젝트가 있다면 현재 기능과 충돌 가능성을 검사한다.
4. 구현 계획을 작성한다.
5. 프로젝트 파일 구조를 정리한다.
6. 실제 코드를 생성하거나 수정한다.
7. 실행과 테스트를 수행한다.
8. 오류를 발견하면 수정한다.
9. 가능한 다음 개발 단계로 계속 진행한다.
10. 구현 결과를 정리한다.

작업 환경에 필요한 파일이 없다면 다운로드 또는 파일 배치를 위한 스크립트와 설명을 제공한다.

기획서 작성이나 폴더 생성만으로 개발 완료라고 보고하지 않는다.

실행 가능한 산출물이 있어야 한다.

작업 환경에서 브라우저 미리보기를 사용할 수 있다면 주요 화면을 직접 검수하고 디자인 참조 이미지와 비교한다.

---

# 20. 최종 산출물

다음 결과물을 제출한다.

1. 실제 실행 가능한 BONE PUZZLE 3D 웹 프로젝트
2. 소스코드 전체
3. 프로젝트 폴더 구조
4. 3D 모델 로딩 및 데이터 처리 스크립트
5. Splash / Title / Stage Intro / Game 화면
6. Bone Drag & Snap 시스템
7. Bone 이름 입력 및 확인 기능
8. 힌트 5회 시스템
9. 실행 방법이 포함된 README
10. 테스트 결과
11. 데이터 라이선스 및 출처 문서
12. 현재 완료 범위와 미완료 항목

최종 보고 형식:

- 구현 완료 기능
- 실제 작동 확인 결과
- 테스트 통과/실패 항목
- 참고 이미지 반영 상태
- 실제 BodyParts3D 데이터 적용 여부
- 해결되지 않은 문제
- 다음 개발 단계
- 로컬 실행 명령어

최종 목표는 사용자가 웹페이지를 실행하여 로고를 보고, Start를 누르고, 완성된 손뼈가 바닥으로 떨어지는 애니메이션을 감상한 뒤, 실제 뼈를 하나씩 조립하면서 해부학 명칭을 입력하고 학습할 수 있는 프로그램이다.

**기능을 임의로 생략하지 말고, 실제 구현 및 검증을 기준으로 프로젝트를 완성하라.**