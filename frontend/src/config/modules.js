// IMPORTANT: Keep this module registry in sync with backend/src/config/modules.js
// Whenever a new module is added to the SaaS application, add it here and in backend registry.

export const APP_MODULES = [
  { id: 'overview', name: 'Overview', path: '/dashboard' },
  { id: 'categories', name: 'Categories', path: '/dashboard/categories' },
  { id: 'menu-items', name: 'Menu Items', path: '/dashboard/menu-items' },
  { id: 'orders', name: 'Orders', path: '/dashboard/orders' },
  { id: 'tables', name: 'Tables', path: '/dashboard/tables' },
  { id: 'staff', name: 'Staff Management', path: '/dashboard/staff', adminOnly: true },
  { id: 'kds', name: 'Kitchen Display', path: '/kds' },
  { id: 'customers', name: 'Customers', path: '/dashboard/customers' },
  // suppliers: adminOnly — hidden from sidebar for non-admin staff even if in permissions array
  { id: 'suppliers', name: 'Suppliers', path: '/dashboard/suppliers', adminOnly: true },
  { id: 'inventory', name: 'Inventory', path: '/dashboard/inventory', adminOnly: true },
  { id: 'purchase-orders', name: 'Purchase Orders', path: '/dashboard/purchase-orders', adminOnly: true },
  { id: 'expenses', name: 'Expenses', path: '/dashboard/expenses', adminOnly: true },
  { id: 'reports', name: 'Reports & Analytics', path: '/dashboard/reports', adminOnly: true },
  { id: 'coupons', name: 'Coupons & Discounts', path: '/dashboard/coupons', adminOnly: true },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  // cashier: gets 'customers' access — needed for phone lookup during order creation
  cashier: ['orders', 'tables', 'customers'],
  waiter: ['orders', 'tables', 'kds'],
  kitchen: ['kds'],
  'restaurant-admin': APP_MODULES.map((m) => m.id),
};
