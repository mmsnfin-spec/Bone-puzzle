import { useEffect } from "react";
import { useScreenStore } from "../state/screenStore";
import { useGameStore } from "../state/gameStore";
import { TIMING } from "../systems/AnimationSystem";
import { brand } from "../data/brand";
export default function SplashScreen() {
  const reduced = useGameStore((s) => s.reducedMotion);
  useEffect(() => {
    const timer = setTimeout(
      () => useScreenStore.getState().go("title"),
      brand.logoPath && !reduced ? TIMING.splash : 80,
    );
    return () => clearTimeout(timer);
  }, [reduced]);
  return (
    <div
      className="splash"
      onClick={() => useScreenStore.getState().go("title")}
      aria-label="브랜드 시작 화면"
    >
      {brand.logoPath && (
        <img
          src={brand.logoPath}
          alt="브랜드 로고"
          width={180}
          height={180}
          className="splash-logo"
          style={{ animationDuration: `${TIMING.splash}ms` }}
          onError={() => useScreenStore.getState().go("title")}
        />
      )}
    </div>
  );
}
