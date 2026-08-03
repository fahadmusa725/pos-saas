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
  { id: 'customers', name: 'Customers' },
  { id: 'suppliers', name: 'Suppliers' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'purchase-orders', name: 'Purchase Orders' },
  { id: 'expenses', name: 'Expenses' },
  { id: 'reports', name: 'Reports & Analytics' },
  { id: 'coupons', name: 'Coupons & Discounts' },
];

const DEFAULT_ROLE_PERMISSIONS = {
  // cashier: gets 'customers' access — needed for phone lookup during order creation
  cashier: ['orders', 'tables', 'customers'],
  waiter: ['orders', 'tables', 'kds'],
  kitchen: ['kds'],
  // restaurant-admin always gets all modules automatically
  'restaurant-admin': APP_MODULES.map((m) => m.id),
};

const VALID_MODULE_IDS = APP_MODULES.map((m) => m.id);

module.exports = {
  APP_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  VALID_MODULE_IDS,
};
