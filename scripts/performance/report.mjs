import { readFile, writeFile } from 'node:fs/promises';
const base='docs/web-performance/evidence';
const json=async name=>JSON.parse(await readFile(`${base}/${name}`,'utf8'));
const before=await json('before/production-summary.json'),after=await json('after/production-summary.json');
const lhBefore=await json('before/lighthouse-local-summary.json'),lhAfter=await json('after/lighthouse-local-summary.json');
const config=await json('after/production-config.json'),assets=await json('assets.json');
const median=list=>list.sort((a,b)=>a-b)[Math.floor(list.length/2)];
const format=value=>typeof value==='number'?value.toFixed(2):'미측정';
const percent=(a,b)=>a&&typeof b==='number'?`${((a-b)/a*100).toFixed(2)}%`:'비교 불가';
const labels={title_idle:'Title 정지',intro_falling:'Bone 낙하 (warm Intro)',game_stationary_guide_on:'Bone 정지 / GUIDE ON',pointer_drag:'Bone 이동',keyboard_rotation:'Bone 회전 (동일 Q/E 입력)',pointer_rotation:'Bone 마우스 회전 (신규)',camera_orbit:'카메라 회전',game_stationary_guide_off:'GUIDE OFF 정지',game_background_idle:'Background / 실제 포커스 상실'};
const cpuRows=Object.entries(labels).map(([key,label])=>{
 const a=before.medians[key]?.browserProcessCpuPercentOneCore,b=after.medians[key]?.browserProcessCpuPercentOneCore;
 return `| ${label} | ${typeof a==='number'?format(a)+'%':'미측정'} | ${typeof b==='number'?format(b)+'%':'미측정'} | ${percent(a,b)} |`;
}).join('\n');
const metrics=['fcpMs','lcpMs','tbtMs','cls'];
const metricNames={fcpMs:'FCP (ms)',lcpMs:'LCP (ms)',tbtMs:'TBT (ms)',cls:'CLS'};
const metricRows=metrics.map(key=>`| ${metricNames[key]} | ${format(lhBefore.medians.metrics[key])} | ${format(lhAfter.medians.metrics[key])} |`).join('\n');
const results={cpu:{},lighthouse:{before:lhBefore.medians,after:lhAfter.medians},firstPlayableIncludingIntro:{beforeMedianMs:median(before.firstPlayableMs),afterMedianMs:median(after.firstPlayableMs)},limitations:['Historical PSI report inaccessible','Deployed Lighthouse blocked by cloud Chromium proxy-CA trust','GitHub push rejected invalid credentials; Preview/Windows CI not executed','Active manipulation CPU does not meet 50% reduction','Windows hardware 60FPS and extended memory soak unverified']};
for(const key of Object.keys(labels)){
 const a=before.medians[key]?.browserProcessCpuPercentOneCore,b=after.medians[key]?.browserProcessCpuPercentOneCore;
 results.cpu[key]={beforePercentOneCore:a??null,afterPercentOneCore:b??null,reductionPercent:a&&typeof b==='number'?(a-b)/a*100:null};
 for(const phase of ['before','after']){
  const rows=[];for(let i=1;i<=3;i++)rows.push((await json(`${phase}/production-run-${i}.json`)).scenarios[key]);
  const values=rows.map(row=>row?.browserProcessCpuPercentOneCore).filter(value=>typeof value==='number');
  results.cpu[key][`${phase}RunMeanStatistics`]=values.length?{mean:values.reduce((sum,value)=>sum+value,0)/values.length,maximum:Math.max(...values),note:'Maximum across sample-window means, not an instantaneous CPU peak'}:null;
 }
}
await writeFile(`${base}/comparison.json`,JSON.stringify(results,null,2));
const reports={};
for(const phase of ['before','after']){
 const values=[];for(let i=1;i<=3;i++)values.push(await json(`${phase}/lighthouse-local-${i}.report.json`));
 reports[phase]={
  mainthreadMs:median(values.map(x=>x.audits['mainthread-work-breakdown'].numericValue)),
  bootupMs:median(values.map(x=>x.audits['bootup-time'].numericValue??0)),
  totalBytes:median(values.map(x=>x.audits['total-byte-weight'].numericValue)),
  unusedJsBytes:median(values.map(x=>x.audits['unused-javascript'].details?.overallSavingsBytes??0)),
  longTasks:median(values.map(x=>x.audits['long-tasks'].details?.items?.length??0)),
 };
}
const text=`# BONE PUZZLE 웹 최적화 최종 보고서

검수일: ${new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())} (Asia/Seoul). 원시 측정 파일은 UTC 시간을 기록한다.

## 1. 작업 요약

웹 전용 improvement/web-performance 브랜치에서 구현했다. main 및 migration/godot은 수정하지 않았다. 원본 hand.json/GLB 27개와 목표 pose는 동일하다. 코드는 로컬에서 완성·검증했지만 GitHub push/Preview와 실제 Windows 브라우저 실행은 인증 차단으로 완료하지 못했다.

기존에는 타이틀에도 Canvas·Rapier를 유지하고 각 뼈가 매 frame wakeUp/kinematic pose를 갱신했다. UI의 Three import와 수동 청크 묶음 때문에 초기 HTML에 약 3.19MB 물리 JS가 선로딩됐다. 새 구현은 2D 타이틀, Stage 의도 입력 후 lazy loading, Intro 낙하에만 물리, demand render, 공유 메시/재질, 이벤트 기반 pose·저장으로 바꿨다. 상태 저장은 기존 v1을 유지한다.

## 2. PageSpeed 개선 결과

제공된 과거 PageSpeed 보고서는 프록시 CONNECT 403으로 읽지 못했다. 아래는 그 보고서의 수치가 아니다. 동일 환경의 **로컬 프로덕션 빌드**를 Lighthouse 13.5.0 desktop으로 각각 3회 검사한 중앙값이다. 실제 배포 URL도 새로 검사했지만 클라우드 Chromium의 CA 미신뢰로 ERR_CERT_AUTHORITY_INVALID가 발생해 유효 점수를 확보하지 못했다. 로컬 수치를 배포 사이트 점수로 표시하지 않는다.

| 지표 | 개선 전 | 개선 후 |
|---|---:|---:|
| Performance | ${lhBefore.medians.scores.performance*100} | ${lhAfter.medians.scores.performance*100} |
| Accessibility | ${lhBefore.medians.scores.accessibility*100} | ${lhAfter.medians.scores.accessibility*100} |
| Best Practices | ${lhBefore.medians.scores['best-practices']*100} | ${lhAfter.medians.scores['best-practices']*100} |
| SEO | ${lhBefore.medians.scores.seo*100} | ${lhAfter.medians.scores.seo*100} |
${metricRows}

초기 전송은 로컬 서버의 미압축 전송 기준 ${reports.before.totalBytes.toLocaleString()} → ${reports.after.totalBytes.toLocaleString()} bytes였다. 초기 main-thread work ${format(reports.before.mainthreadMs)} → ${format(reports.after.mainthreadMs)}ms, long task 수 중앙값 ${reports.before.longTasks} → ${reports.after.longTasks}다. bootup-time 감사의 기존 귀속 비용은 ${format(reports.before.bootupMs)}ms이며 개선 후에는 notApplicable이었다. 이는 실제 JavaScript 실행이 0이라는 뜻이 아니다. unused-JS 추정 절감 가능량은 ${reports.before.unusedJsBytes.toLocaleString()} → ${reports.after.unusedJsBytes.toLocaleString()} bytes로 줄었으나 남아 있다.

render-blocking CSS 약 40ms와 network dependency insight는 남아 있다. Font-display와 image-delivery는 문제를 보고하지 않았다. 래스터/브랜드 원본 이미지가 없으므로 이미지 압축 개선을 했다고 주장하지 않는다. 캐싱 audit는 동일 Python 서버에 Cache-Control이 없어 양쪽 모두 경고한다. vercel.json에 hash 자산 immutable 및 모델 캐시 정책을 추가했지만 미배포이므로 CDN 반영을 검증한 것은 아니다. 제공된 실제 GLB 응답은 이미 Brotli였다. 전체 diagnostics·network·trace는 evidence의 JSON/HTML에 보존했다.

## 3. 게임 CPU 최적화 결과

${config.cpuModel}, ${config.os}, Chromium ${JSON.parse(await readFile(`${base}/after/production-run-1.json`,'utf8')).browser}, 1920×1080, DPR1, SwiftShader 소프트웨어 WebGL이다. 각 상태 3회 중앙값. 브라우저 전체 process tree의 /proc CPU이며 **100%=논리 코어 1개**다. 페이지 TaskDuration과 구분한다. 최대값·각 반복·frame time·heap·RSS 합계는 원시 JSON에 기록했다. RSS 합계는 공유 페이지를 중복 계산할 수 있다.

| 게임 상태 | 기존 CPU (코어 기준 %) | 개선 CPU | 감소율 |
|---|---:|---:|---:|
${cpuRows}

정지·타이틀·키보드 회전·포커스 상실에서는 50% 목표를 넘겼다. 낙하·드래그·카메라의 CPU 감소는 약 1~2% 수준으로 **50% 목표 미달**이다. 드래그의 GL draw-bearing rAF 빈도는 ${format(before.medians.pointer_drag.webglDrawBearingFramesPerSecond)} → ${format(after.medians.pointer_drag.webglDrawBearingFramesPerSecond)}Hz로 개선됐으나 60FPS 보장을 뜻하지 않는다. 신규 마우스 회전은 기존에 없어 전후 감소율을 만들지 않는다. 정지 화면은 실제 WebGL draw 0이며 계측용 rAF가 60Hz인 것을 렌더 FPS로 오인하지 않는다. GPU time은 미측정이다.

Background는 실제 다른 탭으로 전환하고 CDP의 focus emulation을 끈 검사다. 이 환경에서 document.hidden은 visible을 유지하지만 hasFocus는 false로 바뀌므로 그 사실을 그대로 기록했다. 앱은 visibilitychange와 실제 focus/blur 모두에서 작업을 중지한다. hidden 이벤트 처리는 별도 단위 검사도 통과했다.

의도된 6.7초 연출을 포함한 Start→게임 진입 중앙값은 ${format(results.firstPlayableIncludingIntro.beforeMedianMs)} → ${format(results.firstPlayableIncludingIntro.afterMedianMs)}ms였다. 약 ${format(results.firstPlayableIncludingIntro.afterMedianMs-results.firstPlayableIncludingIntro.beforeMedianMs)}ms 증가를 숨기지 않는다. 모듈을 타이틀에서 제거한 대신 HAND hover/focus에 자원을 워밍업한다. 모델 준비 시간은 각 run의 startToModelsReadyMs에 별도로 기록했다.

## 4. 코드 수정 목록

| 파일/모듈 | 변경과 목적 |
|---|---|
| data/anatomy, catalog, stageRegistry, config/* | 불변 해부학 정의, 스테이지·분류 인덱스, 난이도·저장·조작·물리·화면 설정을 모듈화 |
| BoneScene, SceneRuntime, IntroPhysics | demand, Intro-only Rapier, event pose, 0.22s snap, 공유 리소스 |
| BoneInteractions, Arcball, RotationSystem | native capture, 단일 raycast, 직접 메시 회전, 공통 Quaternion |
| usePageActivity, gameStore, persistence | 포커스/숨김 중지, v1 복원, 선택/drag 무저장, timer 최대 5초 저장 |
| App/screens/styles | Godot 디자인, 메뉴·Pause·가이드·MOVE/ROTATE, 반응형 |
| vite.config, index.html, vercel.json | 무거운 초기 청크 분리, hash 폰트, 캐시 설정 |
| package-source 및 performance scripts | 최신 소스 ZIP 생성, CPU/Lighthouse/asset 측정 재현 |
| tests 및 Windows workflow | 규칙·카탈로그·실제 3D 입력 회귀, Chrome/Edge CI 준비 |

## 5. 디자인 동기화

실제 migration/godot의 GameUI/카메라/재질을 확인했다. BONE PUZZLE+하단 문구만 있는 검은 타이틀, 별도 Stage Select, Ivory 모델과 오른쪽 학습/Index, GUIDE ON/OFF, Pause·결과 화면을 웹에 적용했다. Godot의 DejaVu Serif를 24KB WOFF2로 subset하고 라이선스를 보존했다. 실제 브랜드 원본 바이너리가 없으므로 로고를 만들거나 연결 완료로 표시하지 않았다. 모델은 ${assets.totalGlbBytes.toLocaleString()} bytes, ${assets.totalVertices.toLocaleString()} vertices, ${assets.totalTriangles.toLocaleString()} triangles, textures 0이다. 원본 GLB를 추가 단순화/양자화하지 않았다. Draco/Meshopt decoder의 CPU 이득은 입증하지 못해 채택하지 않았다.

## 6. 마우스 회전 기능

고정 CSS-pixel 반지름의 rolling arcball 방식이다. 화면 tangent 축을 camera quaternion으로 world 축으로 변환하고, incremental delta를 parent 기준 local quaternion에 적용·정규화한다. 모델 중심과 position을 유지하며 Euler 변환 없이 180/360° 연속 회전을 지원한다. MOVE/ROTATE를 분리하고 Shift는 임시 MOVE다. X/Y/Z, Q/E, 드래그와 snap은 같은 canonical pose를 공유한다.

pointerdown에서 27개 실제 메시만 raycast한다. 캡처 단계에서 OrbitControls를 끄고 pointermove는 메시와 invalidate만 갱신한다. 최종 pointerup만 store/drop에 commit한다. cancel/blur/lostcapture/unmount는 확정 pose로 롤백한다. 카메라 잔여 damping을 제거해 회전 시작 전후의 시점 drift도 해결했다.

## 7. 테스트 결과

- 단위/UI: 60 tests 통과. 규칙, 별칭, 힌트, v1 호환, 카탈로그/불변성, 저장 빈도, Arcball, 생명주기 포함.
- Linux 실제 headed Chromium: Playwright 10 tests 통과. 실제 포인터 27개 조립, 회전 90/180/360, 대각선·입력 속도·키보드 혼합, 취소/blur, 저장/재접속, mobile 및 1280/1920, 실제 focus switch/물리 중지, GUIDE OFF/idle draw 0.
- Python 데이터 검사: 27 FMA, 8/5/14, 36,216 triangles, 원본 27개 좌표 왕복 최대 오차 1.353e-6 통과.
- 프로덕션 benchmark: before/after 각 3회, page errors 0, 실제 pose 변경/회전 시 position 유지 확인.
- 로컬 Lighthouse: before/after 각 3회 통과. 배포 URL 검사는 인증서 문제로 실패했으며 유효 점수로 취급하지 않는다.
- Windows Chrome/Edge: workflow는 추가했으나 GitHub push 인증 거부로 **미실행**.

## 8. 남은 문제

연속 조작에서 CPU 50%·소프트웨어 WebGL 60FPS는 달성하지 못했다. GPU 하드웨어에서 실제 측정, 장시간 메모리 soak, 실제 사용자 INP, Windows 10/11 실사용 검수, 초기 unused UI JS 추가 분할이 남아 있다. CPU 반복 평균·중앙값·최대 반복 평균을 comparison.json에 기록하며 순간 CPU 피크는 미측정이다. 소프트웨어 렌더러 결과를 일반 Windows PC의 보장 성능으로 확대하지 않는다. 브랜드 파일 연결과 전문가의 독립 해부학 검수도 미완료다.

GitHub 읽기는 되지만 쓰기는 Invalid username or token으로 거절됐다. 기존 환경의 Vercel 인증도 없어서 Preview URL이 없다. 프로덕션 배포를 실행하지 않았다. 배포 URL의 TLS 검사 실패를 사이트 자체 인증서 불량이라고 단정하지 않는다. 클라우드 Chromium trust 설정이며, 프록시 CA의 지속 등록은 자동 승인 검토가 HTTPS 신뢰 범위 확대를 이유로 거절했다. 해당 변경을 우회하지 않았다.

## 9. 최종 빌드와 재현

코드 체크포인트: 4f1b23f (로컬 commit). 이후 데이터 참조/소스 ZIP 및 검수 문서 정리를 추가했다. 최종 HEAD는 Git 로그와 ZIP SOURCE-INFO에서 확인한다. main과 해부학 원본은 보존했다.

빌드: npm ci → npm test → npm run build. build 결과는 dist/이며 dist/downloads/Bone-puzzle-source.zip도 현재 소스로 생성한다. Python zipfile CRC 검사와 27개 GLB·필수 데이터 모듈 포함을 확인한다. 배포 가능한 정적 ZIP과 전체 source ZIP은 workspace 산출물로 제공한다. Preview: **없음 (인증 차단)**.

재현: npm run test:e2e (실제 display는 DISPLAY=:99 E2E_HEADFUL=1), npm run validate:data, npm run audit:assets, npm run perf:runtime -- --url URL --phase before/after --runs 3 --duration 3000, npm run perf:lighthouse -- --url URL --phase before/after --label local --runs 3. 성능 도구는 Node24와 별도 Lighthouse13.5.0을 사용한다. 동시에 다른 렌더링/빌드를 실행하지 않는다. 테스트 계측은 DEV+VITE_E2E에서만 존재하며 production benchmark는 store/probe에 접근하지 않는다.
`;
await writeFile('docs/web-performance/REPORT.ko.md',text);
console.log('Wrote comparison.json and REPORT.ko.md');
