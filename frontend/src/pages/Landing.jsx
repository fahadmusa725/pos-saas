import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Store,
  ArrowRight,
  UtensilsCrossed,
  Package,
  CreditCard,
  BarChart3,
  Building2,
  ShieldCheck,
  Users,
  Moon,
  Sun,
  Check,
} from 'lucide-react';

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: 'Real-time Kitchen Display & Waiter Screen',
    desc: 'Live order tickets flow straight from POS to kitchen and waiters with instant status sync.',
  },
  {
    icon: Package,
    title: 'Recipe-Based Smart Inventory',
    desc: 'Stock auto-deducts from recipes, with low-stock alerts and purchase order tracking.',
  },
  {
    icon: CreditCard,
    title: 'Multi-Payment Support',
    desc: 'Cash, Card, Split payments and Customer Credit — all handled at checkout.',
  },
  {
    icon: BarChart3,
    title: 'Comprehensive Reports & Analytics',
    desc: 'Sales trends, best sellers, payment breakdowns and profit/loss at a glance.',
  },
  {
    icon: Building2,
    title: 'Multi-Tenant Management',
    desc: 'Run multiple restaurants from one platform, each fully isolated and secure.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Staff Permissions',
    desc: 'Granular, per-user access control for admins, cashiers, waiters and kitchen staff.',
  },
  {
    icon: Users,
    title: 'Customer & Supplier Management',
    desc: 'Track customer credit history and manage supplier relationships in one place.',
  },
  {
    icon: Moon,
    title: 'Dark/Light Mode & Mobile-Responsive',
    desc: 'A polished experience on any device, day or night shift.',
  },
];

const BASIC_FEATURES = [
  'Dashboard',
  'POS Terminal',
  'Categories',
  'Menu Items',
  'Order History',
  'Reports',
  'Coupons',
];

const PRO_FEATURES = [
  'Everything in Basic +',
  'Inventory',
  'Staff Management',
  'Kitchen Display',
  'Waiter Screen',
  'Suppliers',
  'Purchase Orders',
  'Expenses',
  'Customer Credit',
  'Tables',
];

function Landing() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">DineFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition"
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <p className="text-xs font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase mb-4">
          The all-in-one restaurant OS
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
          Run your restaurant on <span className="text-amber-500">DineFlow</span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          From POS to kitchen to inventory and staff — one dark-themed platform that keeps every part of
          your restaurant in sync, in real time.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/request-demo')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            Request a Demo <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
          >
            Login to Your Restaurant
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Everything your restaurant needs</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Built for full-service restaurants, cafes, and takeaway/delivery alike.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-amber-500/40 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold mb-1.5 leading-snug">{f.title}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Simple, honest pricing</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Pick the plan that matches how you run service.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Basic */}
          <div className="p-7 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col">
            <h3 className="text-lg font-extrabold">Basic</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Perfect for Takeaway & Delivery</p>
            <p className="mt-5 text-2xl font-extrabold text-amber-500">Contact for Pricing</p>
            <ul className="mt-6 space-y-2.5 flex-1">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Check className="w-4 h-4 text-amber-500 flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="mt-7 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              Get Started
            </button>
          </div>

          {/* Pro (featured) */}
          <div className="relative p-7 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-amber-500 flex flex-col shadow-xl shadow-amber-500/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-neutral-950 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap">
              Most Popular
            </span>
            <h3 className="text-lg font-extrabold">Pro</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Perfect for Full-Service Restaurants</p>
            <p className="mt-5 text-2xl font-extrabold text-amber-500">Contact for Pricing</p>
            <ul className="mt-6 space-y-2.5 flex-1">
              {PRO_FEATURES.map((f, i) => (
                <li
                  key={f}
                  className={`flex items-center gap-2 text-sm ${i === 0 ? 'font-bold text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}
                >
                  {i !== 0 && <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />} {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/login')}
              className="mt-7 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-3xl bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 px-6 sm:px-12 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Ready to transform your restaurant?
          </h2>
          <p className="mt-3 text-sm text-neutral-400 max-w-md mx-auto">
            Join DineFlow and bring your kitchen, floor, and books into one real-time system.
          </p>
          <button
            onClick={() => navigate('/request-demo')}
            className="mt-7 px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition inline-flex items-center gap-2"
          >
            Request a Demo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2 font-bold text-neutral-700 dark:text-neutral-300">
            <Store className="w-4 h-4 text-amber-500" /> DineFlow
          </div>
          <button
            onClick={() => navigate('/request-demo')}
            className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition"
          >
            Request a Demo
          </button>
          <p>&copy; {new Date().getFullYear()} DineFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
