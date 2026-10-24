import { useEffect, useRef } from "react";
import { useScreenStore } from "../state/screenStore";

export default function TitleScreen() {
  const entered = useRef(false);
  const enter = () => {
    if (entered.current) return;
    entered.current = true;
    useScreenStore.getState().go("menu");
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(event.key)) return;
      event.preventDefault();
      enter();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <button className="title-screen" aria-label="Start" onClick={enter}>
      <h1>BONE PUZZLE</h1>
      <span className="title-prompt">아무 key나 눌러 시작하시오</span>
    </button>
  );
}
