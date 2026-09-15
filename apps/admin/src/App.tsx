import { Route, Routes } from "react-router-dom";
import { AdminShell } from "./shell/AdminShell";
import { RequireSession } from "./shell/RequireSession";
import { LoginScreen } from "./routes/LoginScreen";
import { DashboardScreen } from "./routes/DashboardScreen";
import { MenuScreen } from "./routes/MenuScreen";
import { RewardsScreen } from "./routes/RewardsScreen";
import { LoyaltyScreen } from "./routes/LoyaltyScreen";
import { CustomersScreen } from "./routes/CustomersScreen";
import { OrdersScreen } from "./routes/OrdersScreen";
import { StaffScreen } from "./routes/StaffScreen";
import { SettingsScreen } from "./routes/SettingsScreen";
import { NotFoundScreen } from "./routes/NotFoundScreen";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<RequireSession />}>
        <Route element={<AdminShell />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/menu" element={<MenuScreen />} />
          <Route path="/rewards" element={<RewardsScreen />} />
          <Route path="/loyalty" element={<LoyaltyScreen />} />
          <Route path="/customers" element={<CustomersScreen />} />
          <Route path="/orders" element={<OrdersScreen />} />
          <Route path="/staff" element={<StaffScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Route>
    </Routes>
  );
}
