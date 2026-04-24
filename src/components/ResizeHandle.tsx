"use client";

import { useCallback, useEffect, useRef } from "react";

type Props = {
  onResize: (deltaX: number) => void;
  onDoubleClick?: () => void;
};

export default function ResizeHandle({ onResize, onDoubleClick }: Props) {
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      onResize(delta);
    },
    [onResize]
  );

  const handleUp = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [handleMove, handleUp]);

  function start(e: React.MouseEvent) {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div
      onMouseDown={start}
      onDoubleClick={onDoubleClick}
      className="group relative w-1 shrink-0 cursor-col-resize bg-rule transition hover:bg-accent"
      role="separator"
      aria-orientation="vertical"
      title="Drag untuk resize · double-click untuk reset"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
