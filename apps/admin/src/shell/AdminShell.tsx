import { NavLink, Outlet } from "react-router-dom";
import {
  ClubIcon,
  DashboardIcon,
  GiftIcon,
  MenuIcon,
  OrdersIcon,
  SettingsIcon,
  UsersIcon,
} from "@lua/ui";
import "./AdminShell.css";

const NAV_ITEMS = [
  { to: "/", label: "Дашборд", icon: DashboardIcon, end: true },
  { to: "/menu", label: "Меню", icon: MenuIcon },
  { to: "/rewards", label: "Награды", icon: GiftIcon },
  { to: "/loyalty", label: "Лояльность", icon: ClubIcon },
  { to: "/customers", label: "Клиенты", icon: UsersIcon },
  { to: "/orders", label: "Заказы", icon: OrdersIcon },
  { to: "/staff", label: "Сотрудники", icon: UsersIcon },
  { to: "/settings", label: "Настройки", icon: SettingsIcon },
] as const;

export function AdminShell() {
  return (
    <div className="lua-admin-shell">
      <aside className="lua-admin-shell__sidebar">
        <p className="lua-admin-shell__wordmark">LUA</p>
        <p className="lua-admin-shell__subtitle">Admin</p>
        <nav className="lua-admin-shell__nav" aria-label="Разделы администратора">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  `lua-admin-shell__nav-item${isActive ? " lua-admin-shell__nav-item--active" : ""}`
                }
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="lua-admin-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
