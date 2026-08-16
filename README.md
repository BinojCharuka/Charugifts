# Lumina Gifts - E-Commerce Platform 🎁

Welcome to the **Lumina Gifts** repository. This is a modern, high-performance, and beautifully animated e-commerce platform built specifically for gifting services. It features a complete customer-facing storefront and a powerful, SaaS-ready admin dashboard for managing inventory, orders, and site content.

## 🚀 Tech Stack

This project is built using cutting-edge web technologies to ensure a fast, scalable, and delightful user experience:

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & custom CSS
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Database:** PostgreSQL (hosted on [Neon](https://neon.tech/))
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Image Hosting:** [Cloudinary](https://cloudinary.com/)
- **Email Service:** [Resend](https://resend.com/) (for password resets and notifications)
- **Icons:** Phosphor Icons & Lucide React

## ✨ Key Features

### 🛍️ Storefront (Customer Facing)
- **Dynamic Catalog:** Browse products with instant search, category filtering, and price sorting.
- **Interactive Gift Quiz:** A personalized quiz that recommends the perfect gift based on the recipient, occasion, and "vibe".
- **Gift Box Experience:** Unique "Gift Box" products that allow customers to click "What's inside?" to view a beautifully animated popup of all individual items included in the box.
- **Sliding Cart:** A smooth, slide-out cart drawer for easy review of selected items before checkout.
- **Order Tracking:** Customers can track the status of their orders directly from the site.
- **Responsive & Animated:** Fully mobile-optimized with micro-interactions and smooth page transitions using Framer Motion.

### ⚙️ Admin Dashboard (Management)
- **SaaS Architecture:** Built with a multi-tenant foundation (`tenantId`), allowing for scalable multi-store capabilities in the future.
- **Product Management:** 
  - Create, edit, and delete products.
  - One-click stock toggling (In Stock / Out of Stock).
  - **Advanced Gift Boxes:** Admins can flag a product as a "Gift Box" and dynamically add an unlimited number of sub-items, uploading specific images for each sub-item directly from the dashboard.
- **Image Uploads:** Seamless integration with Cloudinary for uploading product images, logos, and sub-item images.
- **Order Management:** View incoming orders, track customer details, and update payment/delivery statuses (Pending, Processing, Shipped, Delivered).
- **Promo Codes:** Create discount codes, set usage limits, and track how many times they have been used.
- **Content Management System (CMS):** Update the storefront's appearance without touching code:
  - Modify Hero text, badges, and background images.
  - Update Contact information, WhatsApp numbers, and footer text.
  - Manage bank account details for direct transfers.
- **Secure Authentication:** Secure seller login, session management, and a password reset flow powered by Resend emails.

## 📦 Database Schema Overview

The database is powered by Drizzle ORM and PostgreSQL. Core tables include:

- **`tenants`**: Stores shop settings, CMS content, bank details, and branding (SaaS ready).
- **`sellers`**: Admin accounts linked to a tenant, securely storing password hashes and reset tokens.
- **`products`**: Stores inventory data, pricing, stock levels, and the new `isGiftBox` and `boxItems` JSONB structure for complex products.
- **`orders` & `order_items`**: Tracks customer purchases, shipping details, applied discounts, and snapshots of product prices at the time of purchase.
- **`promo_codes`**: Manages active discount codes and their usage limits.

## 🛠️ Getting Started Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/BinojCharuka/Charugifts.git
   cd lumina-gifts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` or `.env.local` file in the root directory and configure the following required variables:
   - Database Connection String (Neon)
   - Cloudinary API Keys (for image uploads)
   - Resend API Key (for emails)
   - Authentication Secrets

4. **Run Database Migrations (if schema is updated):**
   ```bash
   npx drizzle-kit push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## 🚢 Deployment

This project is optimized for deployment on **Vercel**. 
Simply connect your GitHub repository to Vercel, ensure all your environment variables from `.env` are added to the Vercel project settings, and Vercel will automatically build and deploy the application on every push to the `main` branch.
