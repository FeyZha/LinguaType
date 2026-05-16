"use client";

import { useEffect, type RefObject } from "react";

export function useDismissableLayer<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onDismiss: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && ref.current?.contains(target)) {
        return;
      }
      onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("touchstart", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onDismiss, ref]);
}
