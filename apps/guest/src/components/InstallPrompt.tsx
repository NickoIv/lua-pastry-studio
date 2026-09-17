import { useEffect, useState } from "react";
import { Button } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import "./InstallPrompt.css";

const DISMISSED_KEY = "lua-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Private browsing / storage blocked — the banner just reappears
    // next visit, which is an acceptable degradation, not a crash.
  }
}

/**
 * Low-cost distribution (product brief §21): a tasteful, dismissible
 * banner instead of the browser's own intrusive native prompt. Android
 * gets the real `beforeinstallprompt` flow; iOS Safari never fires that
 * event at all, so it gets manual "Add to Home Screen" instructions
 * instead. Never shown once already installed (standalone) or after
 * the guest dismisses it once.
 */
export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissed);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !isIOS()) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
      setDismissed(true);
      return;
    }
    setShowIosInstructions(true);
  }

  function handleDismiss() {
    dismiss();
    setDismissed(true);
  }

  return (
    <div className="lua-install-prompt">
      {showIosInstructions ? (
        <>
          <p className="lua-install-prompt__title">{t("guest.install.iosTitle")}</p>
          <p className="lua-install-prompt__subtitle">{t("guest.install.iosSteps")}</p>
          <Button variant="secondary" onClick={handleDismiss} fullWidth>
            {t("common.close")}
          </Button>
        </>
      ) : (
        <>
          <div className="lua-install-prompt__text">
            <p className="lua-install-prompt__title">{t("guest.install.title")}</p>
            <p className="lua-install-prompt__subtitle">{t("guest.install.subtitle")}</p>
          </div>
          <div className="lua-install-prompt__actions">
            <Button size="md" onClick={() => void handleInstall()}>
              {t("guest.install.installButton")}
            </Button>
            <Button size="md" variant="ghost" onClick={handleDismiss}>
              {t("guest.install.dismissButton")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
