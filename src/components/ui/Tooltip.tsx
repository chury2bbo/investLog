"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

const BG = "var(--color-tooltip)";

interface TooltipProps {
  text: string;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ text, children, placement = "top", className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLSpanElement>(null);

  const calcPosition = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const gap = 8;
    switch (placement) {
      case "top":
        setStyle({ position: "fixed", left: r.left + r.width / 2, top: r.top - gap, transform: "translate(-50%, -100%)" });
        break;
      case "bottom":
        setStyle({ position: "fixed", left: r.left + r.width / 2, top: r.bottom + gap, transform: "translate(-50%, 0)" });
        break;
      case "left":
        setStyle({ position: "fixed", left: r.left - gap, top: r.top + r.height / 2, transform: "translate(-100%, -50%)" });
        break;
      case "right":
        setStyle({ position: "fixed", left: r.right + gap, top: r.top + r.height / 2, transform: "translate(0, -50%)" });
        break;
    }
  }, [placement]);

  const arrowStyle: React.CSSProperties =
    placement === "top"    ? { borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${BG}` } :
    placement === "bottom" ? { borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: `5px solid ${BG}` } :
    placement === "left"   ? { borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: `5px solid ${BG}` } :
                             { borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: `5px solid ${BG}` };

  const arrowPos: React.CSSProperties =
    placement === "top"    ? { position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)" } :
    placement === "bottom" ? { position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)" } :
    placement === "left"   ? { position: "absolute", left: "100%", top: "50%", transform: "translateY(-50%)" } :
                             { position: "absolute", right: "100%", top: "50%", transform: "translateY(-50%)" };

  return (
    <span
      ref={ref}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => { calcPosition(); setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && typeof window !== "undefined" && createPortal(
        <span
          style={{
            ...style,
            backgroundColor: BG,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg whitespace-nowrap"
        >
          {text}
          <span style={{ ...arrowPos, width: 0, height: 0, display: "block", ...arrowStyle }} />
        </span>,
        document.body
      )}
    </span>
  );
}
