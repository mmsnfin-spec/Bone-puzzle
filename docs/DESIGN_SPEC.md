# 사용자 이미지 반영

- A: 대화의 보라색 정사각형 안 흰 브랜드 심벌을 확인했다. 파일시스템에는 첨부 텍스트만 있고 이미지 3장은 없다. 임의 심벌로 대체하지 않았다. 원본 `public/assets/brand/logo-original.png`, 투명 처리본 `logo-white-transparent.png`를 배치하고 `src/data/brand.ts`의 logoPath를 설정하면 검은 Splash에 원비율로 fade in/out된다. 현재 실제 로고 검수는 미완료다.
- B: 검은 공간, 흰색/ivory 뼈, 은은한 음영을 반영했다. 제공된 하지 이미지는 참고 전용이며 HAND에 재사용하지 않았다. 실제 오른손 BodyParts3D 메시를 사용한다. 참고 원본 보존 경로는 `public/assets/references/lower-limb-reference.png`다.
- C: Times New Roman / Times / serif 시스템 폰트와 비율 조정으로 큰 흰 HAND 오버레이를 구현했다. 상용 폰트 파일을 배포하지 않는다. 참고 원본 보존 경로는 `public/assets/references/hand-typography-reference.png`다.

UI는 검은 배경, ivory 글자, 작은 안내와 얇은 구분선, 넓은 3D 공간을 사용한다. 회전·이름 패널은 조립 공간 밖에 둔다. 모바일은 3D 공간 아래에 학습 패널과 목록을 배치한다. 화면의 B/P는 제품명 약자 텍스트이며 제공된 브랜드 심벌을 대체하는 에셋이 아니다.

시간 설정은 `src/systems/AnimationSystem.ts`에서 관리한다. reduced-motion 설정 또는 Skip intro는 타이틀에서 사용자의 Start 입력을 대신하지 않는다. 브랜드 파일이 없으면 빈 Splash를 80ms 후 지나며, 실제 브랜드 화면이 완료됐다고 표시하지 않는다.
