import { useEffect, useRef, type ReactNode } from "react";
import "./Sheet.css";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Bottom-sheet modal foundation shared by Guest/Staff. Traps focus to
 * itself while open and returns focus to the trigger element on close,
 * which is the minimum needed for a modal to be keyboard-accessible.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lua-sheet-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="lua-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lua-sheet__grabber" aria-hidden="true" />
        {title ? <h2 className="lua-sheet__title">{title}</h2> : null}
        <div className="lua-sheet__content">{children}</div>
      </div>
    </div>
  );
}
