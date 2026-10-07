import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nProvider } from "@lua/i18n";
import { App } from "./App";
import { BackendProvider } from "./backend/BackendContext";
import { SessionProvider } from "./session/SessionProvider";
import { ErrorBoundary } from "./shell/ErrorBoundary";
import { registerServiceWorker } from "./push";

// Registered eagerly (not only when the guest opens Notifications) so
// a push subscription can be created without an extra round trip, and
// so the manifest's service-worker requirement for installability is
// satisfied as soon as the app loads. A no-op on browsers without
// serviceWorker/PushManager support — see src/push.ts.
void registerServiceWorker();

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider defaultLocale="ru">
        <BackendProvider>
          <SessionProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <App />
            </BrowserRouter>
          </SessionProvider>
        </BackendProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
