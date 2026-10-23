import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useScreenStore } from "../state/screenStore";
import { useGameStore } from "../state/gameStore";
import SplashScreen from "../screens/SplashScreen";
import TitleScreen from "../screens/TitleScreen";
import StageIntroScreen from "../screens/StageIntroScreen";
import GameScreen from "../screens/GameScreen";
import CompletionScreen from "../screens/CompletionScreen";
const BoneScene = lazy(() => import("../scene/BoneScene"));
export default function App() {
  const screen = useScreenStore((s) => s.screen);
  const [modal, setModal] = useState<"help" | "credits" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) useGameStore.getState().setMotion(true);
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  return (
    <div className="app" data-screen={screen}>
      {screen !== "splash" && (
        <Suspense
          fallback={<div className="model-loading">Loading anatomy…</div>}
        >
          <BoneScene screen={screen} />
        </Suspense>
      )}
      {screen === "splash" && <SplashScreen />}
      {screen === "title" && (
        <TitleScreen onCredits={() => setModal("credits")} />
      )}
      {screen === "stageIntro" && <StageIntroScreen />}
      {screen === "game" && <GameScreen onHelp={() => setModal("help")} />}
      {screen === "complete" && <CompletionScreen />}
      {screen !== "splash" && screen !== "stageIntro" && (
        <div className="data-credit">
          <button onClick={() => setModal("credits")}>
            BodyParts3D / CC BY-SA 2.1 JP <span>↗</span>
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="info-dialog"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <button
          className="dialog-close icon-button"
          onClick={() => setModal(null)}
          aria-label="닫기"
        >
          ×
        </button>
        {modal === "help" ? (
          <>
            <span className="small-kicker">A GUIDE TO ASSEMBLY</span>
            <h2 id="dialog-title">
              한 조각씩,
              <br />
              정확하게.
            </h2>
            <ol>
              <li>바닥의 조각을 클릭하거나 Piece index에서 선택하세요.</li>
              <li>
                뼈를 반투명 골격의 올바른 위치로 드래그하세요. Easy에서는 회전이
                자동 보정됩니다.
              </li>
              <li>
                선택한 뼈의 영어 이름을 입력하세요. Save는 메모만 저장하고
                Check는 정답을 확인합니다.
              </li>
              <li>
                막힐 때는 이름 힌트를 사용할 수 있습니다. 스테이지당 5회, 같은
                뼈는 중복 차감되지 않습니다.
              </li>
            </ol>
            <p>
              빈 공간 드래그: 카메라 회전 · 휠: 확대/축소 · 오른쪽 드래그: 이동.
              조각을 드래그하는 동안 카메라는 고정됩니다.
            </p>
            <p>
              키보드: 조각 선택 후 방향키로 이동, Page Up/Down으로 깊이 조절,
              Q/E로 회전, Enter로 배치. Shift를 누르면 미세 조정됩니다.
              입력창에서는 게임 단축키가 작동하지 않습니다.
            </p>
            <p>
              Normal은 회전 오차 20°, Hard는 9° 이내여야 합니다. Restart는
              조립·이름·힌트·시간을 모두 초기화합니다. 타이틀로 돌아가거나
              새로고침해도 현재 진행은 이 브라우저에 저장됩니다.
            </p>
          </>
        ) : (
          <>
            <span className="small-kicker">ABOUT THIS EXPERIENCE</span>
            <h2 id="dialog-title">
              Anatomy,
              <br />
              piece by piece.
            </h2>
            <p>
              BONE PUZZLE 3D는 오른손의 실제 해부학 메시 27개를 조립하며 영어
              명칭을 학습하는 교육용 경험입니다.
            </p>
            <p>
              BodyParts3D, © The Database Center for Life Science licensed
              under{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en"
                target="_blank"
                rel="noreferrer"
              >
                CC Attribution-Share Alike 2.1 Japan
              </a>
              .
            </p>
            <p>
              BodyParts3D 3.0 (20110915), 95% polygon-reduced distribution.{" "}
              <a
                href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D"
                target="_blank"
                rel="noreferrer"
              >
                Kevin-Mattheus-Moerman 미러
              </a>
              의 STL을 GLB로 변환했습니다. 메시 형태를 추가 단순화하지 않았으며,
              공유 좌표를 회전·균일 축소하고 조각별 중심과 정답 위치를
              기록했습니다. 파생 모델에는 동일 라이선스가 적용됩니다.
            </p>
            <p>
              <a
                href="/models/hand/source/original-README.html"
                target="_blank"
                rel="noreferrer"
              >
                원본 배포 문서·라이선스 사본
              </a>{" "}
              ·{" "}
              <a
                href="/models/hand/source/manifest.json"
                target="_blank"
                rel="noreferrer"
              >
                모델 출처·체크섬
              </a>
            </p>
            <p>
              <a
                href="/downloads/Bone-puzzle-source.zip"
                download="Bone-puzzle-source.zip"
              >
                전체 소스 ZIP 다운로드 ↓
              </a>
            </p>
            <p className="muted">
              공식 배포 서버의 직접 접근은 현재 환경에서 차단되어 있습니다.
              미러에 보존된 배포 문서와 명칭표를 기준으로 확인했습니다. 의료
              진단용 모델이 아닙니다.
            </p>
            <p className="muted">
              제공된 브랜드 이미지의 원본 파일은 아직 연결되지 않았습니다. FOOT
              및 VERTEBRA는 후속 개발 스테이지입니다.
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
