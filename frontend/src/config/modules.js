// IMPORTANT: Keep this module registry in sync with backend/src/config/modules.js
// Whenever a new module is added to the SaaS application, add it here and in backend registry.

export const APP_MODULES = [
  { id: 'overview', name: 'Dashboard', path: '/dashboard' },
  { id: 'categories', name: 'Categories', path: '/dashboard/categories' },
  { id: 'menu-items', name: 'Menu Items', path: '/dashboard/menu-items' },
  { id: 'orders', name: 'POS Terminal', path: '/dashboard/orders' },
  { id: 'order-history', name: 'Order History', path: '/dashboard/order-history' },
  { id: 'tables', name: 'Tables', path: '/dashboard/tables' },
  { id: 'staff', name: 'Staff Management', path: '/dashboard/staff', adminOnly: true },
  { id: 'kds', name: 'Kitchen Display', path: '/kds' },
  { id: 'waiter-screen', name: 'Waiter Screen', path: '/waiter' },
  { id: 'customers', name: 'Customers', path: '/dashboard/customers' },
  // suppliers: adminOnly — hidden from sidebar for non-admin staff even if in permissions array
  { id: 'suppliers', name: 'Suppliers', path: '/dashboard/suppliers', adminOnly: true },
  { id: 'inventory', name: 'Inventory', path: '/dashboard/inventory', adminOnly: true },
  { id: 'purchase-orders', name: 'Purchase Orders', path: '/dashboard/purchase-orders', adminOnly: true },
  { id: 'expenses', name: 'Expenses', path: '/dashboard/expenses', adminOnly: true },
  { id: 'reports', name: 'Reports & Analytics', path: '/dashboard/reports', adminOnly: true },
  { id: 'coupons', name: 'Coupons & Discounts', path: '/dashboard/coupons', adminOnly: true },
  { id: 'settings', name: 'Settings', path: '/dashboard/settings', adminOnly: true },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  // cashier: gets 'customers' access — needed for phone lookup during order creation
  cashier: ['orders', 'order-history', 'tables', 'customers'],
  waiter: ['orders', 'order-history', 'tables', 'kds', 'waiter-screen'],
  kitchen: ['kds'],
  // manager: broad access — all operational modules; create/delete staff restricted at API level
  manager: APP_MODULES.filter((m) => m.id !== 'staff').map((m) => m.id),
  'restaurant-admin': APP_MODULES.map((m) => m.id),
};

export const PLAN_MODULES = {
  basic: [
    'overview',
    'categories',
    'menu-items',
    'orders',
    'order-history',
    'reports',
    'coupons',
    'settings',
  ],
  pro: APP_MODULES.map((m) => m.id),
};
