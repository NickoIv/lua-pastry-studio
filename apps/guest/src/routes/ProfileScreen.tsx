import {
  AppHeader,
  BellIcon,
  Card,
  ChevronRightIcon,
  GlobeIcon,
  LocationIcon,
  LogOutIcon,
  Skeleton,
} from "@lua/ui";
import { useNavigate } from "react-router-dom";
import { useTranslation, SUPPORTED_LOCALES } from "@lua/i18n";
import type { LocaleCode } from "@lua/types";
import { APP_CONFIG } from "@lua/config";
import { useCustomerProfile } from "../data/hooks";
import { useSession } from "../session/useSession";
import "./ProfileScreen.css";

const LOCALE_LABEL: Record<LocaleCode, string> = {
  ru: "Русский",
  kk: "Қазақша",
  en: "English",
};

export function ProfileScreen() {
  const { t, locale, setLocale } = useTranslation();
  const profile = useCustomerProfile();
  const { signOut } = useSession();
  const navigate = useNavigate();

  function handleLogout() {
    if (APP_CONFIG.dataMode === "server") {
      signOut();
      navigate("/login");
    }
  }

  return (
    <div className="lua-profile">
      <AppHeader title={t("guest.profile.title")} />

      <div className="lua-profile__identity">
        {profile.status === "success" && profile.data ? (
          <>
            <div className="lua-profile__avatar">{profile.data.firstName.charAt(0)}</div>
            <p className="lua-profile__name">
              {profile.data.firstName} {profile.data.lastName ?? ""}
            </p>
            <p className="lua-profile__phone">{profile.data.phone}</p>
          </>
        ) : (
          <Skeleton height={80} />
        )}
      </div>

      <Card padding="none" className="lua-profile__menu">
        <button type="button" className="lua-profile__row lua-profile__row--button" onClick={() => navigate("/profile/locations")}>
          <LocationIcon className="lua-profile__row-icon" />
          <span className="lua-profile__row-label">{t("guest.profile.addresses")}</span>
          <ChevronRightIcon className="lua-profile__row-chevron" />
        </button>
        <button type="button" className="lua-profile__row lua-profile__row--button" onClick={() => navigate("/profile/notifications")}>
          <BellIcon className="lua-profile__row-icon" />
          <span className="lua-profile__row-label">
            {t("guest.profile.notifications")}
          </span>
          <ChevronRightIcon className="lua-profile__row-chevron" />
        </button>
        <div className="lua-profile__row">
          <GlobeIcon className="lua-profile__row-icon" />
          <span className="lua-profile__row-label">{t("guest.profile.language")}</span>
          <select
            className="lua-profile__locale-select"
            value={locale}
            onChange={(event) => setLocale(event.target.value as LocaleCode)}
            aria-label={t("guest.profile.language")}
          >
            {SUPPORTED_LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_LABEL[code]}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <button type="button" className="lua-profile__logout" onClick={handleLogout}>
        <LogOutIcon />
        {t("guest.profile.logout")}
      </button>
    </div>
  );
}
