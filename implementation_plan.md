# Choice Seven Star — Invoice Web App Implementation

## 1. Core Architecture
- **Tech Stack**: HTML5, CSS3 (Vanilla + Glassmorphism), JavaScript (ES6+), Supabase (Auth + DB).
- **Design System**: Navy Blue (#0B1E3C), Black (#111111), and White (#FFFFFF).
- **SPA Layout**: Single-Page Application logic using visibility toggling for seamless navigation.

## 2. Database Schema (Supabase)
- **`clients`**: Stores client metadata (name, phone, address).
- **`invoices`**: Main invoice records with totals, paid amounts, and remaining balances.
- **`invoice_items`**: Line items for each invoice (product, price, quantity).
- **Admin Setup**: Inserted default admin user (`cssadmin@gmail.com`) with the specified password.

## 3. Key Features Implemented
- **Glassmorphic Login**: Secure admin access with session persistence.
- **Dynamic Dashboard**: Real-time stats for total clients, invoices, paid amounts, and due balances.
- **Client Management**: Full CRUD operations with search filtering and detailed profile views.
- **Smart Invoicing**: Auto-calculating product rows, discounts, and payment tracking.
- **Professional Export**: High-quality PNG download of invoices via `html2canvas`.

## 4. UI/UX Highlights
- **3D Interactive Cards**: Subtle hover lifts and shadows for a premium feel.
- **Mobile Responsive**: Sidebar collapses into a compact icon-only view on smaller screens.
- **Modern Typography**: Inter & Outfit fonts for a clean, professional look.

## 5. Next Steps
- Open `index.html` in any browser to start using the system.
- Log in with the provided credentials.
- Add your first client to begin generating invoices.
