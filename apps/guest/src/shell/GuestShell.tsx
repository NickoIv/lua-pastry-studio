import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation, type BottomNavigationItem } from "@lua/ui";
import { HomeIcon, MenuIcon, ProfileIcon } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import { InstallPrompt } from "../components/InstallPrompt";
import "./GuestShell.css";

/**
 * Three tabs, matching the owner's reference design exactly — Club and
 * QR are no longer separate tabs, but stay one tap away: the Home
 * screen's loyalty card links to /club, and its "Show QR" button (plus
 * the Club screen's own QR card) links to /qr. See BrandMark/
 * LoyaltyBalanceCard for those entry points.
 */
const TABS = [
  { key: "home", path: "/", icon: HomeIcon, labelKey: "nav.home" },
  { key: "menu", path: "/menu", icon: MenuIcon, labelKey: "nav.menu" },
  { key: "profile", path: "/profile", icon: ProfileIcon, labelKey: "nav.profile" },
] as const;

export function GuestShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const items: BottomNavigationItem[] = TABS.map((tab) => {
    const Icon = tab.icon;
    const isActive =
      tab.path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(tab.path);
    return {
      key: tab.key,
      label: t(tab.labelKey),
      icon: <Icon />,
      isActive,
      onSelect: () => navigate(tab.path),
    };
  });

  return (
    <div className="lua-guest-shell">
      <main className="lua-guest-shell__content">
        <Outlet />
        {location.pathname === "/" ? <InstallPrompt /> : null}
      </main>
      <BottomNavigation items={items} />
    </div>
  );
}
