# 데이터 출처 및 변환

공식 배포: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
공식 라이선스: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
두 URL 및 lifesciencedb.jp는 현재 실행 환경의 egress proxy에서 403을 반환했다. 접근 제한을 우회하거나 TLS 검증을 해제하지 않았다.

사용한 데이터는 Kevin-Mattheus-Moerman/BodyParts3D 공개 미러의 BodyParts3D 3.0 / 20110915, 원래 `BodyParts3D_3.0_obj_95.zip`에서 STL로 변환된 모델이다. 미러 커밋 `f0eeb6e843380cfe6b83797cf8c3e1af74de5e61`을 고정했다. `public/models/hand/source`에 배포 README(라이선스 포함), 미러 설명, 명칭표와 모델별 URL·SHA-256을 보존한다. 공식 서버를 현재 직접 확인했다는 의미는 아니다. 모델 형상은 실제 배포 유래이며 합성 테스트 메시가 아니다.

## 재생성

```sh
npm run data:fetch
npm run data:convert
npm run validate:data
```

Python 표준 라이브러리만 필요하다. 원본 STL은 `.cache/bodyparts3d/`에 다운로드하며 앱은 저장소에 포함된 GLB만 읽는다. Blender는 추가 메시 검수를 위해 사용할 수 있지만 이 변환에는 필요하지 않다. 공식 OBJ를 확보한 경우 동일 FMA 파일명을 유지하고 `python scripts/convert-obj-to-glb.py --input-dir /path/to/obj`로 변환한다. 배포판/출처/명칭표가 다르면 manifest를 먼저 갱신하고 검증해야 한다.

## 공유 좌표 보존

원본 STL의 모든 vertex는 전신 공유 좌표에 있다. bone별 원본 AABB 중심을 기록한다. HAND 전체에 **동일한** 원점, 회전, 균일 축척을 적용한다.

- 원점: 전체 오른손 AABB 중심
- 회전: `(-x, -z, -y)`, determinant +1 (거울 반사 없음)
- 축척: 전체 원본 Z 길이가 게임 공간 7이 되도록 균일 적용
- 게임 offset: `(0, 1.5, 0)`
- 로컬 GLB: 회전/축소한 `(source vertex - originalCenter)`
- targetPosition: 같은 전역 변환을 originalCenter에 적용
- targetRotation: identity, targetScale: unit (형상에 전역 회전과 스케일이 이미 적용됨)

`local vertex + targetPosition`으로 정답 조립을 복원한다. 원래 상대 좌표와 거리를 유지하며 손가락 방향, 뼈 간 거리, 회전을 개별 수정하지 않는다. 원본 단위를 임상적 mm로 단정하지 않는다. 기본 뷰는 손가락이 위를 향하도록 배치한 오른손이다. 대칭변환 없이 시점만 회전한다.

정점은 같은 위치끼리 용접하고 면적 가중 평균 법선을 생성한다. 추가 decimation은 하지 않았다. GLB는 재질 하나, bone당 메시 하나. 총 36,216 triangles. 배포 자체는 이미 polygon-reduced 모델이므로 고해상도 CT와 같은 품질로 표시하지 않는다.

검증 스크립트는 8/5/14 구성, 오른쪽 FMA 이름 매핑, thumb의 두 지골, 개별 GLB 버퍼와 면 수, 원본 SHA-256, 전 정점의 원본 좌표 왕복을 검사한다. 해부학 전문가의 독립 검수는 아직 수행되지 않았다.

## 데이터 확장

`BoneDefinition`과 `stages.ts`가 스테이지 확장 경계다. 현재 실행 상태 저장소는 검증된 HAND에 고정되어 있다. FOOT/VERTEBRA를 활성화하려면 별도 manifest·GLB·정답 transform을 검증하고 저장소 초기화/복원에 stage별 definition을 전달하도록 확장해야 한다. 세부 척추 구조가 독립 메시인지 확인하지 않았으며 임의 분할 데이터는 포함하지 않았다.
