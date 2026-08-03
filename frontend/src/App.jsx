import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Categories from './pages/Categories';
import MenuItems from './pages/MenuItems';
import Orders from './pages/Orders';
import Tables from './pages/Tables';
import Staff from './pages/Staff';
import KitchenDisplay from './pages/KitchenDisplay';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import PurchaseOrders from './pages/PurchaseOrders';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Coupons from './pages/Coupons';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px', maxWidth: '380px' },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/kds"
          element={
            <ProtectedRoute permissionId="kds">
              <KitchenDisplay />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="categories" element={<ProtectedRoute permissionId="categories"><Categories /></ProtectedRoute>} />
          <Route path="menu-items" element={<ProtectedRoute permissionId="menu-items"><MenuItems /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute permissionId="orders"><Orders /></ProtectedRoute>} />
          <Route path="tables" element={<ProtectedRoute permissionId="tables"><Tables /></ProtectedRoute>} />
          <Route path="staff" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><Staff /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute permissionId="customers"><Customers /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><Suppliers /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><Inventory /></ProtectedRoute>} />
          <Route path="purchase-orders" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><PurchaseOrders /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><Expenses /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><Reports /></ProtectedRoute>} />
          <Route path="coupons" element={<ProtectedRoute allowedRoles={['restaurant-admin']}><Coupons /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;