# 성능 구조와 측정 기록

개발 목표는 일반적인 PC의 1920×1080에서 안정적인 60FPS다. 최소 사양과 목표 달성 여부는 실제 Windows PC 측정 후 결정한다. 현재 Linux 소프트웨어 렌더러의 결과를 Windows 하드웨어 성능 보장이나 원본 React 대비 동일 PC 개선률로 표시하지 않는다.

## 구현한 비용 감소 구조

| 영역 | 구현 방식 | 확인할 지표 |
|---|---|---|
| 타이틀/메뉴/정지 조립 | low_processor_usage_mode로 변경될 때만 redraw. 타이틀에는 3D world 없음 | 실제 drawn frames와 process cadence 분리, CPU idle |
| Intro | 27개 단순 box 충돌 RigidBody는 낙하 구간만 활성 | physics time, 종료 후 dynamic body 0 |
| 조립 | Node3D/Area3D의 직접 transform 제어. 입력·세션 신호에 반응 | 반복 rigid simulation 없음, 변하지 않은 pose 갱신 생략 |
| 가이드 | 별도 collision 없는 shared transparent material, OFF에서 실제 hide | GUIDE ON/OFF draw calls 및 visible guide 수 |
| 모델 | 선택 스테이지에서 로드, PackedScene/mesh 자원 캐시 | 진입 시간, 반복 진입 resource count/메모리 |
| 재질/조명 | 공통 ivory·선택·배치 재질, 제한된 조명/후처리 | draw calls, GPU/CPU frame time |
| UI | GameSession 신호 갱신, UI 변경 시 3D world 재생성 없음 | 이름/GUIDE/선택 갱신 반응성 |
| pose 보간 | 성공한 조각의 snap tween만 실행 | 조작 중 frame spike, 완료 후 idle |
| 원본 정확도 | 임포트 mesh 압축/자동 LOD 비활성화, 원본 정점 보존 | 정점 비교, 해부학 형상/상대 크기 |

Intro용 dynamic 물체가 조립 단계에 남지 않게 분리하고 완성 골격의 클릭 충돌체는 간단한 Area3D로 사용한다. 모델 형상을 줄이거나 왜곡하여 성능 수치를 높이지 않는다.

## 측정 도구

`tools/benchmark.gd`는 Godot Performance monitors와 실제 process_frame 간격을 측정해 `build/evidence/performance.json`에 기록한다. 타이틀, GUIDE ON, GUIDE OFF, 조작 중 상태를 각각 120 frame 샘플링하고, 5회 Stage Select→재진입 후 static memory/node/resource/dynamic body 수를 남긴다.

```sh
# 실제 display와 렌더러를 사용할 때
godot --path godot --rendering-method gl_compatibility --script res://tools/benchmark.gd
```

기록 항목은 평균 FPS, 최저 순간 FPS, 평균/p95/최대 frame ms, CPU process ms, physics process ms, draw calls, static/video memory, node/resource count, stage load ms다. portable harness에서 GPU frame time은 얻지 못하면 `null`로 기록하며 Windows Godot GPU Profiler 측정이 필요하다. headless의 FPS/draw calls는 렌더 성능 검증 자료로 사용하지 않는다.

## 최종 Linux 실측

공식 Godot 4.7.2 editor/debug, AMD EPYC 9V74(환경에서 보이는 CPU 5개), X11/Xvfb, 1920×1080, Mesa llvmpipe LLVM 19.1.7 소프트웨어 렌더러다. `evidence/performance.json`이 최종 원시 결과이며 프레임 제한은 60이다. 다른 GPU 작업·빌드·압축과 겹치지 않게 측정했다.

| 상태 | 실제 redraw | 관측 결과 |
|---|---:|---|
| 정지 타이틀, 120 process frames/약 2초 | 0 frames | 3D world 없음, Linux process CPU 0.080초 = 평균 0.040 CPU core |
| 정지 GUIDE ON | 2 frames/약 2.04초 | 타이머 UI에 따른 약 0.981 Hz redraw, CPU 평균 0.221 core |
| 정지 GUIDE OFF | 2 frames/약 2초 | 약 1.000 Hz redraw, CPU 평균 0.140 core |
| 27개를 순환하며 이동/회전, GUIDE ON | 28.09 rendered FPS | 평균 35.604ms, 렌더된 frame당 172 draw calls |
| 같은 이동/회전, GUIDE OFF | 38.15 rendered FPS | 평균 26.214ms, 렌더된 frame당 145 draw calls |
| HAND 자원 로딩 | — | 31.140ms. 의도된 6.7초 Intro 연출 시간과 구분 |
| 조립 물리 | — | 모든 상태에서 동적 RigidBody 0. 정확한 physics monitor 샘플은 JSON 참조 |
| 5회 재진입 | — | nodes 280/resources 123으로 고정. static bytes 83,462,312 → 83,477,860, 취소 Intro timer가 정리된 7초 후 83,459,388 |

`TIME_PROCESS` 모니터는 redraw가 없을 때 직전 렌더 frame의 값을 유지할 수 있으므로 정지 화면의 CPU 사용률로 해석하지 않는다. 별도 Linux `/proc/<pid>/stat` utime+stime 차이(CLK_TCK=100)로 process CPU seconds와 평균 core 수를 기록했다. memory static/video 값은 Godot 모니터의 정의이며 전체 OS RSS와 같지 않다. 평균/p95/최대 frame time, 최소 순간 FPS, CPU/physics monitor, video/static memory, node/resource와 모든 샘플 조건은 원시 JSON에 보존했다. GPU frame time은 얻지 못해 null이다.

## 같은 Godot·호스트에서 적용 전후

같은 프로젝트·렌더러·호스트의 연속 redraw 상태(`performance-continuous-baseline.json`)에서 정지 GUIDE ON/OFF는 각각 30.43/39.19 rendered FPS로 불필요하게 계속 그렸다. 최종 변경은 정지 상태를 약 1Hz로 그리며, 마우스·카메라·pose·snap tween의 변경은 정상적으로 redraw를 요청한다. 정지 상태 process loop가 약 60회/초라는 사실을 60 rendered FPS 또는 GPU 성능 달성으로 표시하지 않는다. 활성 조작의 소프트웨어 렌더링 수치는 위 28.09/38.15 FPS로 별도 공개한다.

5회 재진입에서 타이머 정리 후 누적 증가가 없었지만 장시간 메모리 누수가 없다고 단정하지 않는다. Windows Debug/Release의 실제 성능, GPU profiler, 장시간 soak, 확정 최소 사양 및 Windows 1080p60 달성은 **미측정**이다. 현재 호스트의 소프트웨어 렌더러 활성 조작은 60FPS에 미달하며 이를 숨기거나 Windows 성능으로 일반화하지 않는다.

## Windows 하드웨어 검수 절차

같은 Windows 10/11 PC, 1920×1080, 동일 전원/GPU/드라이버/프레임 제한으로 Debug와 Release를 분리한다. Intro 한 번을 마친 뒤 타이틀 idle, GUIDE ON/OFF, 27개 조작, 완료 관찰을 같은 길이로 측정한다. 평균 FPS만 보지 말고 p95/최대 frame time, physics time, draw calls, 메모리, stage load를 기록한다. 30분 이상 플레이와 반복 Restart/메뉴 이동 후 자원 증가를 확인한다. 원본 React 비교가 필요하면 같은 PC·모델·화면 크기·조작 순서를 맞춰 별도 브라우저 profiler로 측정하며 엔진별 지표의 정의 차이를 함께 남긴다.

## 원본 React의 같은 클라우드 호스트 참고 측정

`tools/benchmark_web.mjs`로 기존 production `dist`를 격리된 preview에서 실행해 1920×1080, 각 120 browser RAF frame을 측정했다. CPU는 AMD EPYC 9V74, Chromium 154.0.8037.57, WebGL은 ANGLE/SwiftShader다. 결과 원본은 `build/evidence/react-baseline.json`이며 page error는 0개였다. benchmark가 시작한 preview 프로세스만 측정 후 종료했다. 웹 소스는 수정하지 않았다.

| 원본 화면 | 평균 RAF FPS | 평균 frame ms | p95 ms | 최대 ms | CDP main-thread task 합계 | JS heap |
|---|---:|---:|---:|---:|---:|---:|
| Title | 60.00 | 16.67 | 16.70 | 16.80 | 135.63ms / 120 frames | 14,206,588 bytes |
| Game, ghost ON | 8.96 | 111.66 | 216.70 | 416.70 | 1,124.50ms / 120 frames | 15,412,628 bytes |

Start→Skip intro→Game UI 확인은 121.74ms였다. 원본은 타이틀 단계에서 이미 HAND 자원을 로드하므로 Godot의 메뉴→HAND 자원 로딩 시간과 같은 지표가 아니다. 웹 title에는 3D 완성 골격이 있고 신규 Godot title은 의도적으로 UI만 표시한다.

이 자료는 같은 호스트의 참고 baseline이다. Chromium SwiftShader와 Godot llvmpipe는 서로 다른 소프트웨어 그래픽 스택이며 RAF cadence/CDP task time/JS heap과 Godot process monitor/static memory는 정의가 다르다. 여기서 개선률을 계산하거나 Windows 60FPS/최소 사양을 결론 내리지 않는다. GPU frame time과 Rapier physics time은 이 도구로 분리 측정하지 않았으므로 null로 남겼다.
