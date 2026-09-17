import { Route, Routes } from "react-router-dom";
import { GuestShell } from "./shell/GuestShell";
import { RequireSession } from "./shell/RequireSession";
import { LoginScreen } from "./routes/LoginScreen";
import { HomeScreen } from "./routes/HomeScreen";
import { MenuScreen } from "./routes/MenuScreen";
import { ProductDetailScreen } from "./routes/ProductDetailScreen";
import { ClubScreen } from "./routes/ClubScreen";
import { QrScreen } from "./routes/QrScreen";
import { OrdersScreen } from "./routes/OrdersScreen";
import { OrderDetailScreen } from "./routes/OrderDetailScreen";
import { ProfileScreen } from "./routes/ProfileScreen";
import { LocationSelectScreen } from "./routes/LocationSelectScreen";
import { NotificationsScreen } from "./routes/NotificationsScreen";
import { NotFoundScreen } from "./routes/NotFoundScreen";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<RequireSession />}>
        <Route element={<GuestShell />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/menu" element={<MenuScreen />} />
          <Route path="/menu/product/:productId" element={<ProductDetailScreen />} />
          <Route path="/club" element={<ClubScreen />} />
          <Route path="/qr" element={<QrScreen />} />
          <Route path="/orders" element={<OrdersScreen />} />
          <Route path="/orders/:orderId" element={<OrderDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/profile/locations" element={<LocationSelectScreen />} />
          <Route path="/profile/notifications" element={<NotificationsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Route>
    </Routes>
  );
}
