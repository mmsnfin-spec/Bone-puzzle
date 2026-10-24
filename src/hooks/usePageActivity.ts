import { useEffect, useState } from "react";

/** Suspend costly 3D work for hidden tabs and unfocused windows alike. */
export function usePageActivity() {
  const [active, setActive] = useState(() => !document.hidden);
  useEffect(() => {
    const focus = () => setActive(!document.hidden);
    const blur = () => setActive(false);
    const visibility = () => setActive(!document.hidden && document.hasFocus());
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return active;
}
