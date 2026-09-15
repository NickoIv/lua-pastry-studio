import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nProvider } from "@lua/i18n";
import { App } from "./App";
import { BackendProvider } from "./backend/BackendContext";
import { SessionProvider } from "./session/SessionProvider";
import { ErrorBoundary } from "./shell/ErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider defaultLocale="ru">
        <BackendProvider>
          <SessionProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SessionProvider>
        </BackendProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);
