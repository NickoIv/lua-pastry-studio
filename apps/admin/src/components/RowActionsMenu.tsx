import { useEffect, useRef, useState } from "react";
import { Button, IconButton, MoreIcon } from "@lua/ui";
import "./RowActionsMenu.css";

export interface RowAction {
  key: string;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}

function DropdownMenu({ actions, label = "Действия" }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lua-row-actions" ref={ref}>
      <IconButton icon={<MoreIcon />} label={label} onClick={() => setOpen((v) => !v)} />
      {open ? (
        <div className="lua-row-actions__menu" role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className={`lua-row-actions__item${action.tone === "danger" ? " lua-row-actions__item--danger" : ""}`}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders both an inline button row (shown at wide desktop via CSS)
 * and a compact "…" dropdown (shown below the breakpoint) for the same
 * set of actions — see `RowActionsMenu.css`'s `--lua-table-actions-breakpoint`
 * media query. Picking the layout in CSS rather than by measuring the
 * viewport in JS avoids a resize-triggered re-render on every table row.
 * See product brief §2/§3 (Admin responsiveness).
 */
export function TableRowActions({ actions }: { actions: RowAction[] }) {
  return (
    <div className="lua-table-row-actions">
      <div className="lua-table-row-actions__inline">
        {actions.map((action) => (
          <Button key={action.key} variant="ghost" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
      </div>
      <div className="lua-table-row-actions__menu">
        <DropdownMenu actions={actions} />
      </div>
    </div>
  );
}
