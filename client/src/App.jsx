import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Booking from "./pages/Booking";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Appointments from "./pages/admin/Appointments";
import Services from "./pages/admin/Services";
import Resources from "./pages/admin/Resources";
import Settings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/randevu-al" element={<Booking />} />

      <Route
        path="/panel"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="randevular" element={<Appointments />} />
        <Route path="hizmetler" element={<Services />} />
        <Route path="kaynaklar" element={<Resources />} />
        <Route path="ayarlar" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
