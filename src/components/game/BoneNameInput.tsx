import { useEffect, useState } from "react";
import { bonesById, handBoneIndexById } from "../../data/bones";
import { HINT_CONFIG, SAVE_CONFIG } from "../../data/config/gameplay";
import { INTERACTION_CONFIG } from "../../data/config/interaction";
import { useGameStore } from "../../state/gameStore";

export default function BoneNameInput() {
  const id = useGameStore((s) => s.selectedBoneId);
  const piece = useGameStore((s) => (id ? s.pieces[id] : null));
  const hints = useGameStore((s) => s.hintsRemaining);
  const mode = useGameStore((s) => s.interactionMode);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setValue(piece?.userLabel ?? "");
    setFeedback("");
  }, [id]);
  if (!id || !piece)
    return (
      <section className="selection-panel empty-selection">
        <span className="small-kicker">YOUR NEXT PIECE</span>
        <div className="selection-symbol" aria-hidden="true">
          ↗
        </div>
        <h2>
          한 조각에서
          <br />
          시작하세요.
        </h2>
        <p>
          뼈를 클릭해 선택한 뒤
          <br />
          마우스 회전 또는 이동을 선택하세요.
        </p>
        <p className="muted">
          작은 조각은 오른쪽 목록에서도
          <br />
          선택할 수 있습니다.
        </p>
      </section>
    );
  const bone = bonesById[id];
  const number = handBoneIndexById[id] + 1;
  const save = () => {
    useGameStore.getState().saveLabel(id, value);
    setFeedback("메모를 저장했습니다. 정답 여부는 Check로 확인하세요.");
  };
  const check = () => {
    const correct = useGameStore.getState().checkName(id, value);
    setFeedback(
      correct
        ? "정답입니다. 이름 학습을 완료했습니다."
        : "아직 맞지 않습니다. 영어 해부학 명칭을 다시 입력해 보세요.",
    );
  };
  return (
    <section className="selection-panel" aria-label="선택한 뼈 학습">
      <div className="panel-heading">
        <span className="small-kicker">SELECTED BONE</span>
        <button
          className="icon-button"
          onClick={() => useGameStore.getState().select(null)}
          aria-label="선택 해제"
        >
          ×
        </button>
      </div>
      <h2>
        Piece <span>{String(number).padStart(2, "0")}</span>
      </h2>
      <div className="piece-status">
        <span>{bone.category.toUpperCase()}</span>
        <span className={piece.placed ? "success" : ""}>
          {piece.placed ? "● 배치 완료" : "○ 미배치"}
        </span>
      </div>
      <p className="bone-id">{bone.fmaId}</p>
      {!piece.placed && (
        <div className="selected-manipulation">
          <div className="interaction-modes" role="group" aria-label="선택한 뼈 마우스 조작">
            <button aria-pressed={mode === "move"} onClick={(event) => { useGameStore.getState().setInteractionMode("move"); event.currentTarget.blur(); }}>마우스로 이동</button>
            <button aria-pressed={mode === "rotate"} onClick={(event) => { useGameStore.getState().setInteractionMode("rotate"); event.currentTarget.blur(); }}>마우스로 회전</button>
          </div>
          <p>{mode === "rotate" ? "선택한 뼈 위에서 왼쪽 버튼을 누른 채 드래그하면 자유롭게 회전합니다. Shift + 드래그는 이동입니다." : "선택한 뼈를 드래그해 이동하세요. 회전하려면 ‘마우스로 회전’을 선택하세요."}</p>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <label htmlFor="bone-name">ENGLISH ANATOMICAL NAME</label>
        <input
          id="bone-name"
          value={value}
          maxLength={SAVE_CONFIG.maximumLabelLength}
          autoComplete="off"
          spellCheck={false}
          placeholder="Enter bone name…"
          onChange={(e) => {
            setValue(e.target.value);
            setFeedback("");
          }}
        />
        <div className="input-actions">
          <button type="button" onClick={save}>
            Save note
          </button>
          <button className="light-button" type="submit">
            Check <span>↗</span>
          </button>
        </div>
      </form>
      <p
        className={`feedback ${piece.nameVerified ? "success" : ""}`}
        role="status"
        aria-label="이름 확인 결과"
      >
        {feedback ||
          (piece.nameVerified
            ? "✓ 이름 확인 완료"
            : "저장한 메모와 정답 확인은 별도로 기록됩니다.")}
      </p>
      <button
        className="hint-button"
        disabled={!piece.hintShown && hints === 0}
        onClick={() => useGameStore.getState().revealHint()}
      >
        <span>✧ {piece.hintShown ? "공개한 힌트" : "이름 힌트 보기"}</span>
        <span>{hints} / {HINT_CONFIG.maximumUniqueBones}</span>
      </button>
      {piece.hintShown && (
        <div className="revealed-hint">
          <span className="small-kicker">REVEALED NAME</span>
          <strong>{bone.englishName}</strong>
          <span>{bone.koreanName}</span>
          <small>힌트 공개는 이름 정답으로 기록되지 않습니다.</small>
        </div>
      )}
      {!piece.placed && <RotationControls id={id} />}
    </section>
  );
}
export function rotateBone(id: string, axis: "x" | "y" | "z", degrees: number) {
  useGameStore.getState().rotate(id, axis, degrees);
}
function RotationControls({ id }: { id: string }) {
  return (
    <details className="rotation-controls">
      <summary>조각 회전 · 키보드 조작</summary>
      <p>축별로 15° 회전합니다. Shift를 누르면 5°씩 조정합니다.</p>
      {(["x", "y", "z"] as const).map((axis) => (
        <div className="rotation-row" key={axis}>
          <span>{axis.toUpperCase()}</span>
          <button
            aria-label={`${axis}축 반시계 회전`}
            onClick={(e) => rotateBone(id, axis, -(e.shiftKey ? INTERACTION_CONFIG.preciseRotationDegrees : INTERACTION_CONFIG.rotationDegrees))}
          >
            −15°
          </button>
          <button
            aria-label={`${axis}축 시계 회전`}
            onClick={(e) => rotateBone(id, axis, e.shiftKey ? INTERACTION_CONFIG.preciseRotationDegrees : INTERACTION_CONFIG.rotationDegrees)}
          >
            +15°
          </button>
        </div>
      ))}
      <p>
        방향키: 좌우·상하 이동
        <br />
        Page Up / Down: 깊이 이동
        <br />
        Shift: 미세 이동 · Q / E: 회전
        <br />
        Enter: 현재 위치에 놓기
      </p>
    </details>
  );
}
