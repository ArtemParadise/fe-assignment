import { useEffect } from "react";

export function useClickOutside(ref, onOutsideClick, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleMouseDown = (e) => {
      // ref.current is null before the element attaches and after it unmounts.
      if (ref.current && !ref.current.contains(e.target)) {
        onOutsideClick(e);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);

    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onOutsideClick, enabled]);
}
