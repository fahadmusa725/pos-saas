Multi-Restaurant POS System

A point of sale system built for restaurants, designed so one platform can serve multiple restaurants at once — each with its own menu, staff, orders and data, completely separate from the others.

Built with MongoDB, Express, React and Node.js, with Socket.io handling live updates to the kitchen screen.

What it does

Each restaurant that signs up gets its own isolated space — their menu, orders, staff and customers are never visible to any other restaurant on the platform.

Day-to-day operations

Menu and category management
Table tracking (available / occupied / reserved)
Order creation for dine-in, takeaway and delivery
A dedicated kitchen display screen that updates in real time as orders come in, with status tracking from pending to preparing to ready

Payments

Cash, card and split payments across multiple methods on a single order
Orders can be sent to the kitchen and paid for later (hold orders)
Per-item discounts and restaurant-wide coupon codes, validated server-side
Printable receipts

Staff

Role-based accounts (admin, manager, cashier, waiter, kitchen)
Per-staff permissions — an admin can decide exactly which sections of the dashboard each staff member can access, not just rely on their role

Back office

Customer records with order history and phone-based lookup at checkout
Supplier records and purchase orders, with stock levels updating automatically when a purchase is marked received
Expense tracking by category
A reports section with sales trends, best-selling items and a basic profit/loss view

Other things

Dark and light mode
Works reasonably well on tablets and phones, not just desktop
Stack
Backend: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT auth
Frontend: React (Vite), Tailwind CSS, Zustand, React Router, Recharts
Project layout
pos-saas/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       └── routes/
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
bash
npm run dev

Frontend

bash
cd frontend
npm install
npm run dev

The app runs on localhost:5173 and expects the backend on localhost:5000.

Getting started once it's running
Register a restaurant through the sign-up flow — this creates the restaurant and its first admin account
Log in as the admin
Add categories, then menu items, then set up your tables
Add staff accounts and choose what each one can access
Start taking orders
