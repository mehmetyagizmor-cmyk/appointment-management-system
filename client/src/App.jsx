import { Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CustomerLogin from "./pages/CustomerLogin";
import Booking from "./pages/Booking";
import MyAppointments from "./pages/MyAppointments";
import ProtectedRoute from "./components/ProtectedRoute";
import CustomerProtectedRoute from "./components/CustomerProtectedRoute";
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
      <Route path="/" element={<Landing lang="tr" />} />
      <Route path="/en" element={<Landing lang="en" />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/musteri-giris" element={<CustomerLogin />} />
      <Route path="/randevu-al" element={<Booking />} />
      <Route
        path="/randevularim"
        element={
          <CustomerProtectedRoute>
            <MyAppointments />
          </CustomerProtectedRoute>
        }
      />

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
