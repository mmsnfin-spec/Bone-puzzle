import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useScreenStore } from "../state/screenStore";
import { flushGameSave, useGameStore } from "../state/gameStore";
import SplashScreen from "../screens/SplashScreen";
import TitleScreen from "../screens/TitleScreen";
import StageSelectScreen from "../screens/StageSelectScreen";
import PauseScreen from "../screens/PauseScreen";
import StageIntroScreen from "../screens/StageIntroScreen";
import GameScreen from "../screens/GameScreen";
import CompletionScreen from "../screens/CompletionScreen";
import { loadBoneScene } from "../scene/loadStage";
import { PROJECT, ANATOMY_ATTRIBUTION } from "../data/project";
const BoneScene = lazy(loadBoneScene);

export default function App() {
  const screen = useScreenStore((s) => s.screen);
  const [modal, setModal] = useState<"help" | "credits" | "settings" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reduced = useGameStore((s) => s.reducedMotion);
  const guide = useGameStore((s) => s.guideEnabled);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) useGameStore.getState().setMotion(true);
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat || dialog.current?.open) return;
      const current = useScreenStore.getState().screen;
      if (current === "game" || current === "paused") {
        event.preventDefault();
        flushGameSave();
        useScreenStore.getState().go(current === "game" ? "paused" : "game");
      }
    };
    const focusLost = () => {
      if (useScreenStore.getState().screen === "game") {
        flushGameSave();
        useScreenStore.getState().go("paused");
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("blur", focusLost);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("blur", focusLost); };
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  const hasScene = ["stageIntro", "game", "paused", "complete"].includes(screen);
  return (
    <div className="app" data-screen={screen}>
      {hasScene && <Suspense fallback={<div className="model-loading" role="status">Loading anatomy…</div>}><BoneScene screen={screen} /></Suspense>}
      {screen === "splash" && <SplashScreen />}
      {screen === "title" && <TitleScreen />}
      {screen === "menu" && <StageSelectScreen onSettings={() => setModal("settings")} onCredits={() => setModal("credits")} onHelp={() => setModal("help")} />}
      {screen === "stageIntro" && <StageIntroScreen />}
      {screen === "game" && <GameScreen onHelp={() => setModal("help")} />}
      {screen === "paused" && <PauseScreen onSettings={() => setModal("settings")} onHelp={() => setModal("help")} />}
      {screen === "complete" && <CompletionScreen />}
      <dialog ref={dialog} className="info-dialog" onCancel={() => setModal(null)} onClick={(event) => { if (event.target === dialog.current) setModal(null); }} aria-labelledby="dialog-title">
        <button className="dialog-close icon-button" onClick={() => setModal(null)} aria-label="닫기">×</button>
        {modal === "settings" ? <>
          <p className="small-kicker">PREFERENCES</p><h2 id="dialog-title">설정</h2>
          <label className="settings-row"><input type="checkbox" checked={reduced} onChange={(e) => useGameStore.getState().setMotion(e.target.checked)} />모션 줄이기</label>
          <label className="settings-row"><input type="checkbox" checked={guide} onChange={(e) => useGameStore.getState().setGuide(e.target.checked)} />조립 가이드 표시</label>
          <p>가이드와 모션 설정은 난이도와 독립적으로 저장됩니다.</p>
        </> : modal === "help" ? <>
          <p className="small-kicker">A GUIDE TO ASSEMBLY</p><h2 id="dialog-title">한 조각씩, 정확하게.</h2>
          <ol><li>실제 뼈를 클릭하거나 Piece index에서 선택하세요.</li><li>MOVE에서는 왼쪽 드래그로 이동하고, ROTATE에서는 왼쪽 드래그로 자유 회전합니다. Shift를 누르면 잠시 이동합니다.</li><li>오른쪽 드래그는 카메라 궤도 회전, 가운데 드래그는 Pan, 휠은 확대/축소입니다. 조각 조작 중에는 카메라가 고정됩니다.</li><li>영어 명칭을 입력하세요. Save note는 오답도 메모하고 Check는 정답을 확인합니다.</li><li>힌트는 서로 다른 뼈 5개까지 공개하며 자동 정답으로 처리하지 않습니다.</li></ol>
          <p>G: 가이드 켜기/끄기 · 방향키: XY 이동 · Page Up/Down: 깊이 · X/Y/Z: 축 회전 · Q/E: Z축 회전 · Enter: 배치 확인. Shift는 미세 조정입니다. 입력창에서는 게임 단축키가 동작하지 않습니다.</p>
          <p>Easy는 위치 중심으로 회전을 보정합니다. Normal은 회전 .35 rad, Hard는 .16 rad 이내여야 합니다. 가이드를 꺼도 판정은 같습니다.</p>
          <p>Esc: 일시정지 · Restart: 조립·이름·힌트·시간 초기화. 가이드·모션 설정은 유지합니다.</p>
        </> : <>
          <p className="small-kicker">ABOUT / CREDITS</p><h2 id="dialog-title">Anatomy, piece by piece.</h2>
          <p>실제 오른손 해부학 메시 27개를 조립하고 영어 명칭을 학습하는 게임입니다.</p>
          <p>{ANATOMY_ATTRIBUTION.name}, © {ANATOMY_ATTRIBUTION.copyright} licensed under <a href={ANATOMY_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">{ANATOMY_ATTRIBUTION.license}</a>.</p>
          <p>BodyParts3D 3.0 (20110915), 95% polygon-reduced distribution. <a href="https://github.com/Kevin-Mattheus-Moerman/BodyParts3D" target="_blank" rel="noreferrer">고정 미러</a>의 STL에서 GLB로 변환했습니다. 공유 좌표와 상대적인 크기를 보존했으며 추가 메시 단순화는 하지 않았습니다.</p>
          <p><a href={ANATOMY_ATTRIBUTION.readme} target="_blank" rel="noreferrer">원본 배포 문서·라이선스</a> · <a href={ANATOMY_ATTRIBUTION.manifest} target="_blank" rel="noreferrer">모델 출처·체크섬</a></p>
          <p><a href={PROJECT.sourceArchive}>최신 웹 소스 ZIP 다운로드 ↓</a></p>
          <p className="muted">HAND 외 부위와 실제 브랜드 이미지 연결은 아직 준비 중입니다. 공식 서버 직접 접근과 전문가의 해부학 검수는 미완료이며 의료 진단용이 아닙니다.</p>
        </>}
      </dialog>
    </div>
  );
}
