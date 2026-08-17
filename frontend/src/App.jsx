import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Categories from './pages/Categories';
import MenuItems from './pages/MenuItems';
import Orders from './pages/Orders';
import OrderHistory from './pages/OrderHistory';
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
import Settings from './pages/Settings';
import WaiterScreen from './pages/WaiterScreen';
import SuperAdminLayout from './components/SuperAdminLayout';
import SuperAdminOverview from './pages/SuperAdminOverview';
import RestaurantsList from './pages/RestaurantsList';
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
          path="/waiter"
          element={
            <ProtectedRoute permissionId="waiter-screen">
              <WaiterScreen />
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
          <Route path="order-history" element={<ProtectedRoute permissionId="order-history"><OrderHistory /></ProtectedRoute>} />
          <Route path="tables" element={<ProtectedRoute permissionId="tables"><Tables /></ProtectedRoute>} />
          <Route path="staff" element={<ProtectedRoute permissionId="staff"><Staff /></ProtectedRoute>} />
          <Route path="waiter-screen" element={<ProtectedRoute permissionId="waiter-screen"><WaiterScreen /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute permissionId="customers"><Customers /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute permissionId="suppliers"><Suppliers /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute permissionId="inventory"><Inventory /></ProtectedRoute>} />
          <Route path="purchase-orders" element={<ProtectedRoute permissionId="purchase-orders"><PurchaseOrders /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute permissionId="expenses"><Expenses /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute permissionId="reports"><Reports /></ProtectedRoute>} />
          <Route path="coupons" element={<ProtectedRoute permissionId="coupons"><Coupons /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute permissionId="settings"><Settings /></ProtectedRoute>} />
        </Route>

        {/* Super Admin Panel Routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={['super-admin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminOverview />} />
          <Route path="restaurants" element={<RestaurantsList />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;