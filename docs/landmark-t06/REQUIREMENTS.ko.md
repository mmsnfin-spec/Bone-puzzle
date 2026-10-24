현재 BONE PUZZLE 웹버전에 **landmark-by-landmark puzzle system**을 추가한다.

이번 작업에서는 전체 신체로 확장하지 말고, **BodyParts3D 기반 Thoracic Vertebra 1개를 테스트 케이스로 추가**한다.

기존 프로젝트에 이미 구현된 조작, UI, 카메라, 회전, 드래그, 퍼즐 완료 기능 등은 그대로 사용한다. 이번 작업에서는 해당 기능을 새로 만들거나 불필요하게 수정하지 않는다.

---

# 1. 새로운 퍼즐 설계 원칙

BONE PUZZLE은 앞으로 두 가지 해부학적 분할 방식을 사용한다.

### Bone-by-Bone

손, 발, skull, ribs처럼 원래 여러 개의 독립된 bone으로 구성된 부위는 실제 bone 하나를 하나의 puzzle piece로 사용한다.

예:

- Hand → 27 bones
- Foot → 26 bones
- Ribs → each rib
- Skull → individual cranial/facial bones

### Landmark-by-Landmark

Humerus, Femur, Scapula, Vertebra처럼 하나의 bone 자체가 크고 단일 piece로 만들면 퍼즐성이 부족한 경우에는 하나의 bone을 **해부학적으로 의미 있는 landmark와 structural region을 기준으로 가상 분할**한다.

핵심 원칙:

> Every puzzle seam should represent anatomical meaning, not merely geometric division.

즉 퍼즐을 어렵게 만들기 위해 임의의 직선이나 동일 간격으로 자르지 않는다.

사용자가 조립 과정에서 해당 bone의 주요 anatomical structure와 3D orientation을 자연스럽게 학습할 수 있도록 분할한다.

작거나 표면에 존재하는 모든 landmark를 독립적인 piece로 만들 필요는 없다.

다음 조건을 만족하는 구조를 우선 physical puzzle piece로 만든다.

- 외형적으로 구분 가능함
- 3D orientation 학습에 도움됨
- 관절 또는 운동학적으로 의미가 있음
- 조각 크기가 충분하여 조작 가능함

너무 작거나 얇은 landmark는 별도 piece가 아니라 metadata/label landmark로 유지한다.

---

# 2. 난이도 설계 원칙

난이도는 다음 3단계로 통일한다.

- EASY
- NORMAL
- HARD

중요:

**난이도에 따라 anatomical piece의 개수나 구조를 변경하지 않는다.**

EASY / NORMAL / HARD 모두 동일한 전체 anatomical pieces를 조립한다.

난이도는 다음 요소를 중심으로 변화시킨다.

1. 시작 시 piece의 rotation/orientation
2. orientation을 추론할 수 있는 보조 정도
3. snap 시 허용되는 rotation 오차
4. 필요 시 position tolerance

핵심 원칙:

> Difficulty changes orientation, not anatomy.

그리고:

> Every player assembles the complete anatomy.

---

# 3. EASY

EASY에서도 모든 anatomical pieces를 직접 조립한다.

다만 각 piece는 **거의 올바른 해부학적 방향**에서 시작한다.

정답 orientation을 기준으로 작은 random rotation만 적용한다.

기준 예시:

```text
X: ±10~15°
Y: ±10~15°
Z: ±10~15°
```

조각이 완전히 거꾸로 뒤집히거나 anterior/posterior 또는 superior/inferior가 심하게 반전된 상태로 시작하지 않도록 한다.

목표는 처음 플레이하는 사용자가 형태와 landmark 위치 자체를 익히는 것이다.

초기 snap 기준:

```text
rotationTolerance ≈ 20~25°
```

---

# 4. NORMAL

EASY와 동일한 anatomical pieces를 사용한다.

각 piece에 중간 수준의 3D rotation을 적용한다.

예:

```text
약 ±45~90° 범위의 여러 축 회전
```

한 축만 회전시키지 말고 여러 축을 조합한다.

단, 모든 조각을 완전히 무작위 orientation으로 만들지는 않는다.

사용자가 형태를 관찰하면 anterior/posterior, left/right, superior/inferior를 어느 정도 추론할 수 있는 수준으로 설정한다.

초기 snap 기준:

```text
rotationTolerance ≈ 10~15°
```

---

# 5. HARD

동일한 anatomical pieces를 모두 사용한다.

각 piece는 **완전한 3D random orientation**으로 시작한다.

가능하면 단순하게 Euler X/Y/Z 각각에 0~360° 난수를 넣기보다 **uniform random quaternion** 방식으로 orientation을 생성하여 방향 분포가 편향되지 않도록 한다.

Hard에서는 다음 상태가 모두 가능해야 한다.

- upside down
- anterior/posterior reversed
- medial/lateral reversed
- multiple-axis rotation
- superior/inferior reversed

사용자는 해당 구조의 실제 morphology만 보고 올바른 orientation을 판단해야 한다.

초기 snap 기준:

```text
rotationTolerance ≈ 5~8°
```

Hard의 핵심은 조각을 더 많이 사용하는 것이 아니라 **3D spatial anatomy를 이해해야 해결할 수 있다는 것**이다.

---

# 6. Thoracic Vertebra 테스트 대상

이번 작업에서는 **typical thoracic vertebra 1개만 구현**한다.

가능하면 BodyParts3D 데이터에서 전형적인 중간 흉추 형태를 가진 vertebra를 선택한다.

예:

- T6
- T7

단, 실제 사용 asset의 vertebral level을 확인한 후 정확한 번호를 사용한다.

확인하지 않은 상태에서 임의로 T6/T7 이름을 붙이지 않는다.

아래 예시는 `T06`을 사용하지만 실제 asset이 다르면 전체 naming을 그 번호에 맞춰 변경한다.

---

# 7. Thoracic Vertebra Physical Pieces

EASY / NORMAL / HARD에서 모두 다음 **7개의 동일한 anatomical pieces**를 사용한다.

```text
T06_P01_Body
T06_P02_PosteriorArch
T06_P03_SpinousProcess
T06_P04_LeftTransverseProcess
T06_P05_RightTransverseProcess
T06_P06_LeftArticularRegion
T06_P07_RightArticularRegion
```

이 7개가 Thoracic Vertebra landmark puzzle의 기본 atomic pieces다.

난이도별로 서로 합치거나 제거하지 않는다.

---

# 8. P01 — Vertebral Body

파일명:

```text
T06_P01_Body
```

포함:

- vertebral body 전체
- superior/inferior endplate region
- body 자체의 기본 morphology

분할 기준:

**vertebral body와 pedicle이 연결되는 body-pedicle junction 부근**을 기준으로 posterior elements와 분리한다.

vertebral body에 존재하는 costal facet은 별도의 작은 physical piece로 만들지 않는다.

Label:

```text
EN: Vertebral Body
KO: 척추뼈몸통
```

해부학적 역할:

Thoracic vertebra의 anterior direction을 판단하는 핵심 구조.

---

# 9. P02 — Posterior Arch

파일명:

```text
T06_P02_PosteriorArch
```

포함:

- central posterior vertebral arch
- 주요 lamina region
- spinous/transverse/articular processes가 제거된 central structural region
- 필요한 경우 pedicle 일부

분할 시 지나치게 얇거나 구조적으로 불안정한 mesh가 생기지 않도록 한다.

Label:

```text
EN: Posterior Vertebral Arch
KO: 뒤쪽 척추고리
```

---

# 10. P03 — Spinous Process

파일명:

```text
T06_P03_SpinousProcess
```

분할 기준:

spinous process가 bilateral lamina에서 후방으로 돌출되기 시작하는 **spinous process root**를 기준으로 한다.

Thoracic vertebra의 특징인 길고 posterior/inferior 방향으로 향하는 morphology가 온전히 유지되어야 한다.

Label:

```text
EN: Spinous Process
KO: 가시돌기
```

학습 역할:

posterior direction을 판단하게 하는 주요 landmark.

---

# 11. P04 — Left Transverse Process

파일명:

```text
T06_P04_LeftTransverseProcess
```

분할 기준:

left transverse process가 vertebral arch에서 lateral direction으로 돌출되는 **transverse process base/root**를 따라 분리한다.

Label:

```text
EN: Left Transverse Process
KO: 왼쪽 가로돌기
```

---

# 12. P05 — Right Transverse Process

파일명:

```text
T06_P05_RightTransverseProcess
```

P04의 right-side counterpart다.

동일한 anatomical 기준으로 분리한다.

Label:

```text
EN: Right Transverse Process
KO: 오른쪽 가로돌기
```

P04/P05를 통해 사용자가 left/right orientation을 학습할 수 있어야 한다.

---

# 13. P06 — Left Articular Region

파일명:

```text
T06_P06_LeftArticularRegion
```

superior articular process와 inferior articular process를 각각 지나치게 작은 physical piece로 분리하지 않는다.

좌측의 articular process complex를 하나의 조작 가능한 anatomical region으로 만든다.

가능하면 다음 surface morphology가 유지되어야 한다.

- Superior articular facet
- Inferior articular facet

Label:

```text
EN: Left Articular Region
KO: 왼쪽 관절돌기 영역
```

---

# 14. P07 — Right Articular Region

파일명:

```text
T06_P07_RightArticularRegion
```

P06의 right-side counterpart다.

Label:

```text
EN: Right Articular Region
KO: 오른쪽 관절돌기 영역
```

P06/P07은 superior/inferior orientation 및 posterior element의 spatial relationship 학습에 사용한다.

---

# 15. Physical Piece로 분리하지 않는 Landmark

다음 구조는 중요하지만 별도의 physical piece로 만들지 않는다.

```text
Superior costal facet
Inferior costal facet
Transverse costal facet

Superior articular facet
Inferior articular facet

Pedicle
Lamina
Vertebral foramen
```

이 구조들은 향후 learning mode, label, tooltip, highlight 등에 사용할 수 있도록 metadata로 유지한다.

특히 Thoracic Vertebra의 특징을 보여주는 다음 세 구조는 반드시 landmark metadata에 포함한다.

```text
Superior costal facet
Inferior costal facet
Transverse costal facet
```

---

# 16. Mesh Cut 원칙

BodyParts3D 원본 geometry를 보존하고 작업용 사본에서 분할한다.

원본 asset을 overwrite하지 않는다.

분할은 단순 horizontal/vertical plane cut이나 동일한 크기의 geometric division으로 처리하지 않는다.

각 cut은 가능한 한 anatomical morphology를 따른다.

주요 기준:

```text
Body ↔ Posterior structure
= body-pedicle junction

Spinous Process ↔ Arch
= spinous process root

Transverse Process ↔ Arch
= transverse process base

Articular Region ↔ Arch
= articular process가 posterior arch에서 형태적으로 구분되는 junction
```

절단 후에도 완성된 상태에서 원본 thoracic vertebra의 외형이 최대한 자연스럽게 복원되어야 한다.

---

# 17. Cut Surface 원칙

cut surface 자체가 지나치게 눈에 띄거나 퍼즐 장난감처럼 보이지 않도록 한다.

과도한 male/female connector, 큰 돌기, 홈 등은 만들지 않는다.

필요하다면 조립 방향을 미묘하게 인지할 수 있는 매우 얕은 asymmetric contour 정도만 허용한다.

실제 정답 판정은 cut shape가 아니라 기존 puzzle의 snap/transform 시스템을 이용한다.

원칙:

> Shape gives the clue.  
> Orientation determines the challenge.

---

# 18. Thoracic Vertebra에서 학습해야 할 방향

이 퍼즐의 핵심 학습 목표는 단순히 7개 조각을 맞추는 것이 아니다.

사용자가 morphology를 통해 다음 anatomical directions를 판단하게 만드는 것이다.

```text
Anterior
Posterior
Superior
Inferior
Left
Right
```

대표적인 형태 단서:

```text
Vertebral Body
→ anterior orientation

Spinous Process
→ posterior orientation

Left/Right Transverse Processes
→ lateral orientation

Articular Regions
→ superior/inferior 및 posterior orientation
```

EASY → NORMAL → HARD로 갈수록 이러한 방향을 사용자 스스로 판단해야 하는 비중이 증가한다.

---

# 19. Piece Metadata 기본 구조

각 piece는 최소한 다음 정보를 가져야 한다.

```javascript
{
  id: "T06_P03_SpinousProcess",

  region: "spine",
  section: "thoracic",
  bone: "T06",

  puzzleType: "landmark",

  label: {
    en: "Spinous Process",
    ko: "가시돌기"
  },

  anatomicalDirectionRole: [
    "posterior"
  ],

  difficulty: {
    easy: {
      rotationRange: "small",
      rotationTolerance: 25
    },

    normal: {
      rotationRange: "medium",
      rotationTolerance: 15
    },

    hard: {
      rotationRange: "uniform_random_3d",
      rotationTolerance: 8
    }
  },

  learning: {
    category: "process",
    relatedLandmarks: []
  }
}
```

현재 프로젝트 구조에 맞춰 TypeScript interface, JavaScript object 또는 JSON data로 구현한다.

동일 정보를 여러 코드 파일에 hard-code하지 않는다.

---

# 20. 전체 Thoracic Landmark Metadata

향후 교육 기능을 위해 최소한 다음 landmark 목록을 데이터로 유지한다.

```text
Vertebral Body
Posterior Vertebral Arch
Spinous Process
Left Transverse Process
Right Transverse Process

Left Superior Articular Facet
Right Superior Articular Facet
Left Inferior Articular Facet
Right Inferior Articular Facet

Superior Costal Facet
Inferior Costal Facet
Transverse Costal Facet

Pedicle
Lamina
Vertebral Foramen
```

현재 단계에서는 모든 landmark를 UI로 표시하거나 클릭 가능하게 만들 필요는 없다.

그러나 향후 anatomy learning mode에서 바로 사용할 수 있도록 데이터 구조에는 포함한다.

---

# 21. 이번 구현 범위

이번 작업에서 실제로 구현할 것은 다음뿐이다.

```text
BodyParts3D Thoracic Vertebra 1개
↓
7 anatomical landmark pieces로 분할
↓
EASY / NORMAL / HARD 모두 동일한 7 pieces 사용
↓
난이도에 따라 초기 orientation과 rotation tolerance만 변화
```

다음 부위로 아직 확장하지 않는다.

- Cervical vertebrae
- Lumbar vertebrae
- Humerus
- Scapula
- Radius / Ulna
- Pelvis
- Femur
- Tibia / Fibula
- Hand 재설계
- Foot
- Muscle attachment
- Ligament
- Full kinesiology animation

Thoracic Vertebra를 통해 이 landmark-by-landmark 구조가 정상적으로 작동하는지 먼저 검증한다.

---

# 22. 구현 성공 기준

완료 후 다음 조건을 충족해야 한다.

### Anatomy

- Thoracic Vertebra가 7개의 의미 있는 anatomical pieces로 분할됨
- 임의의 기하학적 절단이 아니라 landmark morphology에 근거함
- 조립 완료 시 원본 vertebra 형태가 자연스럽게 복원됨

### EASY

- 7 pieces 모두 사용
- 거의 올바른 orientation에서 시작
- 작은 회전만 해결하면 됨

### NORMAL

- 동일한 7 pieces 사용
- 여러 축에서 중간 수준으로 회전됨
- morphology를 보고 방향을 일부 판단해야 함

### HARD

- 동일한 7 pieces 사용
- uniform random 3D orientation 사용
- 실제 형태를 보고 anterior/posterior, superior/inferior, left/right를 판단해야 함

가장 중요한 최종 원칙:

> **The number of anatomical pieces never changes with difficulty.**

> **Difficulty is determined by how much 3D anatomical orientation the player must solve.**

그리고 BONE PUZZLE의 landmark puzzle 전체 철학은 다음으로 유지한다.

> **Do not divide a bone simply to create more pieces.  
> Divide it only when the separation teaches meaningful anatomy.**