import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon, IconButton } from "@lua/ui";
import "./Modal.css";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** A centered dialog (not @lua/ui's bottom Sheet, which is styled for mobile) — Admin's own, desktop-first modal foundation. */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lua-modal-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="lua-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lua-modal__header">
          <h2 className="lua-modal__title">{title}</h2>
          <IconButton icon={<CloseIcon />} label="Закрыть" onClick={onClose} />
        </div>
        <div className="lua-modal__content">{children}</div>
        {footer ? <div className="lua-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
