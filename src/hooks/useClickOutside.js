import { useEffect } from "react";

export function useClickOutside(ref, onOutsideClick, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMouseDown = (e) => {
      if (!ref.current.contains(e.target)) {
        onOutsideClick(e);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);

    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onOutsideClick, enabled]);
}
