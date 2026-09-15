import { Route, Routes } from "react-router-dom";
import { StaffShell } from "./shell/StaffShell";
import { RequireSession } from "./shell/RequireSession";
import { LoginScreen } from "./routes/LoginScreen";
import { HomeScreen } from "./routes/HomeScreen";
import { ScanScreen } from "./routes/ScanScreen";
import { TransactionScreen } from "./routes/TransactionScreen";
import { ShiftLogScreen } from "./routes/ShiftLogScreen";
import { NotFoundScreen } from "./routes/NotFoundScreen";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<RequireSession />}>
        <Route element={<StaffShell />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/scan" element={<ScanScreen />} />
          <Route path="/transaction" element={<TransactionScreen />} />
          <Route path="/shift-log" element={<ShiftLogScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Route>
    </Routes>
  );
}
