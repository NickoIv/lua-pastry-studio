import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, EmptyState } from "@lua/ui";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lua Admin crashed:", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "var(--lua-space-2xl)" }}>
          <EmptyState
            title="Что-то пошло не так"
            description="Попробуйте обновить страницу."
            action={
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Обновить
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}
