import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation, type BottomNavigationItem } from "@lua/ui";
import { ClubIcon, HomeIcon, MenuIcon, ProfileIcon, QrIcon } from "@lua/ui";
import { useTranslation } from "@lua/i18n";
import "./GuestShell.css";

const TABS = [
  { key: "home", path: "/", icon: HomeIcon, labelKey: "nav.home" },
  { key: "menu", path: "/menu", icon: MenuIcon, labelKey: "nav.menu" },
  { key: "club", path: "/club", icon: ClubIcon, labelKey: "nav.club" },
  { key: "qr", path: "/qr", icon: QrIcon, labelKey: "nav.qr" },
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
      </main>
      <BottomNavigation items={items} />
    </div>
  );
}
