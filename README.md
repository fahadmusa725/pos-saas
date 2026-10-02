DineFlow — Multi-Restaurant POS System

A point of sale platform built for restaurants, designed so one system can serve many restaurants at once — each with its own menu, staff, orders, inventory, and data, completely isolated from every other restaurant on the platform.

Built with MongoDB, Express, React, and Node.js, with Socket.io handling live updates to the kitchen and waiter screens.

What it does

Every restaurant that signs up gets its own isolated space on the platform. Their menu, orders, staff, customers, and reports are never visible to any other restaurant using the system.

Day-to-day operations
Menu and category management, with support for size/portion variants (e.g. Half/Full) at different prices
Menu item images via direct upload or a pasted image URL
Table tracking (available / occupied / reserved)
Order creation for dine-in, takeaway, and delivery
Dine-in orders support a running tab — more items can be added to an open table's order as the meal goes on (e.g. starters first, dessert later), all on a single bill, with each new round flagged clearly for the kitchen
Takeaway and delivery use a simpler, faster flow: create the order, take payment, print the receipt
A dedicated kitchen display screen that updates in real time as orders come in, with status tracking from pending through preparing to ready, and a sound alert on new orders
A real-time waiter screen that alerts staff the moment an order is ready to be served
Inventory
Menu items can have a recipe attached (the raw ingredients and quantities that go into making them)
Selling an item automatically deducts the right amount of each ingredient from stock, scaled correctly for portion size
Items are marked "Sold Out" automatically the moment an ingredient runs out, and become available again automatically once stock is replenished
Orders are blocked at checkout if there isn't enough stock to fulfill them
Payments
Cash, card, and split payments across multiple methods on a single order, with automatic change calculation
Customer credit (tab/udhar) — regular customers can be allowed to carry a balance, which is tracked and settled later
Per-item discounts and restaurant-wide coupon codes
Every financial calculation is verified on the backend — nothing the frontend sends is trusted blindly
Printable, reprintable receipts
Staff
Role-based accounts: restaurant admin, manager, cashier, waiter, kitchen staff
Per-staff permissions — an admin can choose exactly which parts of the dashboard each staff member can access, independent of their role
Back office
Customer records with order history and phone-number lookup at checkout
Supplier records and purchase orders — stock and expenses update automatically once a purchase is marked as paid/received
Expense tracking by category
A reporting section covering financial overview, cash/ledger detail, category sales, best sellers, peak hours, staff performance, customer balances, and supplier dues — all with date-range filtering and charts
Platform management
A super admin panel for onboarding new restaurants, suspending or reactivating accounts, resetting admin passwords, and managing the platform as a whole
Two subscription tiers (Basic and Pro) with different module access, plus a trial period for new signups
A public landing page with a request-a-demo form that emails a notification when someone submits it
Other things
Dark and light mode
Works reasonably well on tablets and phones, not just desktop
Stack
Backend: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT auth, Nodemailer
Frontend: React (Vite), Tailwind CSS, Zustand, React Router, Recharts, lucide-react
Project layout
pos-saas/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
└── frontend/
    └── src/
        ├── components/
        ├── pages/
        ├── context/
        ├── services/
        └── store/
Running it locally

You'll need Node.js and a MongoDB connection string (Atlas works fine).

Backend

bash
cd backend
npm install

Create a .env file in backend/:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=pick_something_random
JWT_REFRESH_SECRET=pick_something_else_random

SUPER_ADMIN_EMAIL=your_super_admin_email
SUPER_ADMIN_PASSWORD=pick_something_random

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
EMAIL_FROM_NAME=DineFlow
NOTIFY_EMAIL=where_demo_requests_should_be_sent
bash
npm run dev

Frontend

bash
cd frontend
npm install
npm run dev

The app runs on localhost:5173, and expects the backend on localhost:5000.

Getting started once it's running
Register a restaurant through the sign-up flow — this creates the restaurant and its first admin account
Log in as the admin
Add categories, then menu items (with recipes, if you want automatic inventory tracking), then set up your tables
Add staff accounts and choose what each one can access
Start taking orders

The super admin account (set via SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD) logs in separately and is used to manage restaurants on the platform, not to run a restaurant itself.