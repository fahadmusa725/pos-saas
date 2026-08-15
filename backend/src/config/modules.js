// IMPORTANT: Keep this module registry in sync with frontend/src/config/modules.js
// Whenever a new module is added to the SaaS application, add it here and in frontend registry.

const APP_MODULES = [
  { id: 'overview', name: 'Overview' },
  { id: 'categories', name: 'Categories' },
  { id: 'menu-items', name: 'Menu Items' },
  { id: 'orders', name: 'Orders' },
  { id: 'tables', name: 'Tables' },
  { id: 'staff', name: 'Staff Management' },
  { id: 'kds', name: 'Kitchen Display (KDS)' },
  { id: 'waiter-screen', name: 'Waiter Screen' },
  { id: 'customers', name: 'Customers' },
  { id: 'suppliers', name: 'Suppliers' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'purchase-orders', name: 'Purchase Orders' },
  { id: 'expenses', name: 'Expenses' },
  { id: 'reports', name: 'Reports & Analytics' },
  { id: 'coupons', name: 'Coupons & Discounts' },
  { id: 'settings', name: 'Settings' },
];

const DEFAULT_ROLE_PERMISSIONS = {
  // cashier: gets 'customers' access — needed for phone lookup during order creation
  cashier: ['orders', 'tables', 'customers'],
  waiter: ['orders', 'tables', 'kds', 'waiter-screen'],
  kitchen: ['kds'],
  manager: APP_MODULES.filter((m) => m.id !== 'staff').map((m) => m.id),
  // restaurant-admin always gets all modules automatically
  'restaurant-admin': APP_MODULES.map((m) => m.id),
};

const VALID_MODULE_IDS = APP_MODULES.map((m) => m.id);

module.exports = {
  APP_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  VALID_MODULE_IDS,
};
