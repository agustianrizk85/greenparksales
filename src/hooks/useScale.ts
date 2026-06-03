import { useEffect } from "react";

/** Scale the fixed 1920×1080 canvas to fit the viewport. */
export function useScale(elementId = "canvas") {
  useEffect(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const fit = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      el.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [elementId]);
}
