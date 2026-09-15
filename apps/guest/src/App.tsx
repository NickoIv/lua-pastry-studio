import { Route, Routes } from "react-router-dom";
import { GuestShell } from "./shell/GuestShell";
import { HomeScreen } from "./routes/HomeScreen";
import { MenuScreen } from "./routes/MenuScreen";
import { ClubScreen } from "./routes/ClubScreen";
import { QrScreen } from "./routes/QrScreen";
import { OrdersScreen } from "./routes/OrdersScreen";
import { OrderDetailScreen } from "./routes/OrderDetailScreen";
import { ProfileScreen } from "./routes/ProfileScreen";
import { NotFoundScreen } from "./routes/NotFoundScreen";

export function App() {
  return (
    <Routes>
      <Route element={<GuestShell />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/menu" element={<MenuScreen />} />
        <Route path="/club" element={<ClubScreen />} />
        <Route path="/qr" element={<QrScreen />} />
        <Route path="/orders" element={<OrdersScreen />} />
        <Route path="/orders/:orderId" element={<OrderDetailScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}
